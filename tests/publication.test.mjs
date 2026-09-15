import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const output = new URL('../dist-public/', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    return entry.isDirectory() ? files(child) : [child];
  });
}

test('Vercel builds only the static client, with an asset-safe SPA fallback', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.framework, 'vite');
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.equal(config.outputDirectory, 'dist-public');
  const rewrite = config.rewrites[0];
  assert.equal(rewrite.destination, '/index.html');
  const matcher = new RegExp('^' + rewrite.source + '$');
  for (const path of ['/', '/town', '/gifts', '/people/ren', '/forest/']) assert.ok(matcher.test(path), path);
  for (const path of ['/assets/missing.png', '/_static/missing.js', '/favicon.svg']) assert.ok(!matcher.test(path), path);
  const html = readFileSync(new URL('index.html', output), 'utf8');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /name="viewport"[^>]*device-width[^>]*viewport-fit=cover/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="こもれび喫茶"/);
  assert.match(html, /name="apple-mobile-web-app-status-bar-style" content="black"/);
  assert.match(html, /<title>こもれび喫茶<\/title>/);
  for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
    assert.ok(existsSync(new URL(match[1].slice(1), output)), match[1]);
  }
  assert.match(read('src/main.tsx'), /<CafeGame \/>/);
  assert.match(read('src/components/CafeGame.tsx'), /screen==="forest"&&<button[^>]*dev-trigger-floating/);
  assert.match(read('src/components/CafeGame.tsx'), /onMenu=\{openGameMenu\} menuLabel=\{gameMenuLabel\}/);
  assert.match(read('src/screens/CafeScreen.tsx'), /className="cafe-menu-toggle cafe-settings-toggle"/);
  assert.match(read('app/globals.css'), /\.cafe-hud-right\s*\{[^}]*flex-direction:column;[^}]*gap:8px;/);
  assert.match(read('app/globals.css'), /\.dev-trigger-floating\s*\{[^}]*position:absolute;[^}]*right:8px;/);
  assert.match(read('src/components/CafeGame.tsx'), /import\.meta\.env\.DEV/);
  assert.match(read('src/components/CafeGame.tsx'), /showDev&&devOpen&&<DevMenu/);
  assert.match(read('src/components/CafeGame.tsx'), /!showDev&&settingsOpen&&<SettingsMenu/);
  const bundledJs=files(output).filter(file=>/\.js$/.test(file.pathname)).map(file=>readFileSync(file,'utf8')).join('\n');
  assert.match(bundledJs,/セーブデータを初期化/);
  assert.doesNotMatch(bundledJs,/DEVメニュー/);
});

test('all supplied public media are copied; documentation and development files are not published', () => {
  const extensions = /\.(?:png|jpe?g|webp|avif|gif|svg|mp3|ogg|wav|m4a|woff2?|ttf|otf)$/i;
  const sourceDir = new URL('public/assets/', root);
  for (const file of files(sourceDir).filter(file => extensions.test(file.pathname))) {
    const relative = fileURLToPath(file).slice(fileURLToPath(new URL('public/', root)).length);
    assert.deepEqual(readFileSync(new URL(relative, output)), readFileSync(file), relative);
  }
  for (const file of files(output)) {
    assert.ok(/\.(?:html|js|css|png|jpe?g|webp|avif|gif|svg|mp3|ogg|wav|m4a|woff2?|ttf|otf)$/i.test(file.pathname), file.pathname);
    assert.ok(!/\/(?:node_modules|examples|docs|worker|db|outputs|work)\//.test(file.pathname));
    if (/\.(?:js|css|html)$/i.test(file.pathname)) {
      const content = readFileSync(file, 'utf8');
      assert.doesNotMatch(content, /\/Users\/|localhost:|127\.0\.0\.1:|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
    }
  }
});

test('CSS backgrounds and character portraits resolve in the static output without external font or audio dependencies', () => {
  for (const file of files(new URL('app/', root)).filter(file => /\.css$/.test(file.pathname))) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/url\(["']?(\/assets\/[^)"'?#]+)/g)) {
      assert.ok(existsSync(new URL(match[1].slice(1), output)), match[1]);
    }
    assert.doesNotMatch(css, /@font-face|fonts\.googleapis|url\(["']?https?:/);
  }
  const characters = read('src/data/characters.ts');
  for (const match of characters.matchAll(/"(?:image|storyImage)":\s*"(\/assets\/[^"?#]+)"/g)) {
    assert.ok(existsSync(new URL(match[1].slice(1), output)), match[1]);
  }
});
