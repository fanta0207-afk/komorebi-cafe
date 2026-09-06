import assert from 'node:assert/strict';
import test from 'node:test';

// Exercise the actual production Worker entrypoint, including server rendering.
test('the production Worker renders the cafe game instead of the starter',async()=>{
  const {default:worker}=await import('../dist/server/index.js');
  const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{
    ASSETS:{fetch:async()=>new Response('Not found',{status:404})},
  },{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')||'',/^text\/html\b/i);
  const html=await response.text();
  assert.match(html,/<html[^>]*lang="ja"/);
  assert.match(html,/<title>こもれび喫茶/);
  assert.doesNotMatch(html,/注文ノートと店の情報を開く|<small>ノート<\/small>|cafe-menu-grid/);
  assert.match(html,/現在の在庫状況を開く/);
  assert.match(html,/<nav class="bottom-nav" aria-label="メインメニュー">/);
  const bottomNav = html.match(/<nav class="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.equal((bottomNav?.match(/<button /g) || []).length, 5);
  assert.doesNotMatch(bottomNav || '', /設備・料理/);
  assert.match(html, /class="scene-kitchen-entry"[^>]*aria-label="設備・料理を開く"/);
  assert.match(html,/所持コイン/);
  assert.match(html,/<button[^>]*class="mission-launcher"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"[^>]*aria-label="ミッションを開く"/);
  assert.equal((html.match(/class="mission-launcher"/g)||[]).length,1);
  assert.doesNotMatch(html,/class="mission-guide|class="mission-notebook"|お客さまの注文を見つけよう|手順・進捗を見る/);
  assert.match(html,/name="viewport"[^>]*device-width/);
  assert.doesNotMatch(html,/class="(?:topbar|cafe-scene-heading|cafe-action-dock)"/);
  assert.match(html,/吹き出しから注文を操作/);
  assert.equal((html.match(/data-layer=/g)||[]).length,8);
  assert.match(html,/店長（あなた）・いらっしゃいませ/);
  assert.doesNotMatch(html,/class="order-board"|class="cafe-cutaway"/);
  assert.doesNotMatch(html,/本日の営業を終了|留守中の売上|今日の残り行動/);
  assert.match(html,/出会い|街の人/);
  assert.doesNotMatch(html,/Your site is taking shape|Building your site|SkeletonPreview/);
});
