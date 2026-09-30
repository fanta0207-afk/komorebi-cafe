import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("audio settings are normalized and clamped without a browser",()=>{
  const source=readFileSync(new URL("../src/audio/audioEngine.ts",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  new Function("exports",compiled)(exports);
  const {DEFAULT_AUDIO_SETTINGS,normalizeAudioSettings}=exports;
  assert.deepEqual(normalizeAudioSettings(null),DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(normalizeAudioSettings({bgmEnabled:false,sfxEnabled:false,bgmVolume:9,sfxVolume:-2}),{bgmEnabled:false,sfxEnabled:false,bgmVolume:1,sfxVolume:0});
  assert.deepEqual(normalizeAudioSettings({bgmVolume:"loud"}),DEFAULT_AUDIO_SETTINGS);
});

test("the game provides scene music, result sounds, and persistent independent controls",()=>{
  const engine=readFileSync(new URL("../src/audio/audioEngine.ts",import.meta.url),"utf8");
  const provider=readFileSync(new URL("../src/audio/AudioProvider.tsx",import.meta.url),"utf8");
  const game=readFileSync(new URL("../src/components/CafeGame.tsx",import.meta.url),"utf8");
  const settings=readFileSync(new URL("../src/components/SettingsMenu.tsx",import.meta.url),"utf8");
  for(const scene of ["cafe","town","forest","story","drama"])assert.match(engine,new RegExp(`${scene}:\\{bpm:`));
  for(const effect of ["coin","heart","success","error","forest","order","ready"])assert.match(engine,new RegExp(`effect===\\"${effect}\\"`));
  assert.match(engine,/\[\[1760,\.13,\.058\],\[2860,\.105,\.038\],\[4370,\.075,\.019\]\]/);
  assert.match(provider,/localStorage\.setItem\(AUDIO_SETTINGS_KEY/);
  assert.match(game,/screen==="cafe"\?"cafe":"town"/);
  assert.match(game,/current\.ready>prior\.ready/);
  assert.match(game,/state\.lifetimeStats\.totalOrders/);
  assert.match(game,/if\(saleSoundPlayed\.current\)playSound\("coin"\)/);
  assert.match(game,/onSound=\{\(\)=>\{setDevOpen\(false\);setSettingsOpen\(true\);\}\}/);
  assert.match(settings,/label="BGM"/);
  assert.match(settings,/label="効果音"/);
  assert.match(settings,/type="range"/);
});
