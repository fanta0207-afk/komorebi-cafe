import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const output = mkdtempSync(join(tmpdir(), 'komorebi-scene-test-'));
after(() => rmSync(output, { recursive: true, force: true }));
writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }));
symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(output, 'node_modules'), 'dir');
for (const folder of ['data', 'game', 'components/cafe']) {
  mkdirSync(join(output, folder), { recursive: true });
  const source = new URL(`../src/${folder}/`, import.meta.url);
  for (const file of readdirSync(source).filter(name => /\.tsx?$/.test(name))) {
    const compiled = ts.transpileModule(readFileSync(new URL(file, source), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    writeFileSync(join(output, folder, file.replace(/\.tsx?$/, '.js')), compiled);
  }
}
const require = createRequire(import.meta.url);
const { makeVisit, reconcileVisits, visitPhase, VISIT_TIMING, cafeAsset } = require(join(output, 'components/cafe/sceneModel.js'));
const { CafeScene } = require(join(output, 'components/cafe/CafeScene.js'));
const { CafeAsset } = require(join(output, 'components/cafe/CafeAsset.js'));
const { createInitialState, reducer, migrateSavedState } = require(join(output, 'game/state.js'));
const { equipment } = require(join(output, 'data/equipment.js'));
const { decorations } = require(join(output, 'data/decorations.js'));
const { characters } = require(join(output, 'data/characters.js'));
const order = (id = 'one', slot = 0, status = 'queued') => ({ id, customerSlot: slot, recipeId: 'coffee', status, totalMs: 10000, remainingMs: status === 'ready' ? 0 : 5000 });

test('arrivals, seating, enjoying and departure use foreground game time only', () => {
  const queued = order();
  const visits = reconcileVisits([], [], [queued], 500);
  assert.equal(visitPhase(visits[0], 500), 'entering');
  assert.equal(visitPhase(visits[0], 500 + VISIT_TIMING.enter), 'seated');
  const ready = { ...queued, status: 'ready' };
  const served = reconcileVisits(visits, [ready], [], 11000);
  assert.equal(visitPhase(served[0], 11000), 'enjoying');
  // A hidden tab cannot advance a visual phase without advancing activeMs.
  assert.equal(visitPhase(served[0], 11000), 'enjoying');
  assert.equal(visitPhase(served[0], 11000 + VISIT_TIMING.enjoy), 'leaving');
  assert.equal(visitPhase(served[0], 11000 + VISIT_TIMING.enjoy + VISIT_TIMING.leave), undefined);
  assert.equal(reconcileVisits(served, [], [], 20000).length, 0);
});

test('slot reuse has separate identities and never converts an unserved removal into a reward', () => {
  const first = order('first');
  const visit = makeVisit(first, 0);
  assert.equal(reconcileVisits([visit], [first], [], 500).length, 0);
  const ready = { ...first, status: 'ready' };
  const second = order('second');
  const concurrent = reconcileVisits([visit], [ready], [second], 10000);
  assert.equal(concurrent.length, 2);
  assert.equal(visitPhase(concurrent[0], 10000), 'enjoying');
  assert.equal(visitPhase(concurrent[1], 10000), 'entering');
  assert.notEqual(concurrent[0].id, concurrent[1].id);
});

test('all four customers keep their appearance when recipes become ready or the view remounts', () => {
  const orders = [0, 1, 2, 3].map(slot => order(`guest-${slot}`, slot));
  const before = orders.map(item => makeVisit(item, 0));
  const ready = orders.map(item => ({ ...item, status: 'ready' }));
  const after = reconcileVisits(before, orders, ready, 10000);
  assert.deepEqual(after, before);
  assert.deepEqual(ready.map(item => makeVisit(item, 50000).look), before.map(item => item.look));
});

test('missing asset markup keeps a visible fallback and uses the documented filename', () => {
  const html = renderToStaticMarkup(React.createElement(CafeAsset, { src: cafeAsset.equipment('espressoMachine') }, '☕'));
  assert.match(html, /data-asset-state="fallback"/);
  assert.match(html, /class="cafe-asset-fallback">☕/);
  assert.match(html, /src="\/assets\/cafe\/equipment\/espressoMachine\.png"/);
  assert.doesNotMatch(html, /hidden=/);
});

test('a fully developed cafe renders all equipment, memories, staff and 4 usable order bubbles without mutating the save', () => {
  const state = {
    ...createInitialState(), activeMs: 5000,
    orders: [order('a', 0), order('b', 1, 'cooking'), order('c', 2, 'ready'), order('d', 3)],
    ownedEquipment: equipment.map(item => item.id),
    stations: equipment.map(item => ({ id: `station-${item.id}`, equipmentId: item.id, level: 3 })),
    unlockedDecorations: decorations.map(item => item.id),
    staff: characters.map((character, index) => ({ characterId: character.id, role: index % 2 ? 'server' : 'cook', remainingMs: 0 })),
  };
  const before = JSON.stringify(state);
  const html = renderToStaticMarkup(React.createElement(CafeScene, { state, onOrder() {}, onCharacter() {}, onEquipment() {} }));
  assert.deepEqual([...html.matchAll(/data-layer="([^"]+)"/g)].map(match => match[1]), ['background', 'furniture', 'equipment', 'seating', 'customers', 'characters', 'bubbles', 'effects']);
  for (const item of equipment) assert.ok(html.includes(`data-equipment="${item.id}"`));
  for (const item of decorations) assert.ok(html.includes(`data-decoration="${item.id}"`));
  for (const character of characters) assert.ok(html.includes(`aria-label="${character.name}・`));
  assert.equal((html.match(/class="scene-order /g) || []).length, 4);
  assert.match(html, /あと5秒/);
  assert.match(html, /提供する/);
  assert.equal(JSON.stringify(state), before);
});

test('presentation does not alter v5 round trips, ingredient consumption or manual serving rewards', () => {
  let state = createInitialState();
  const queued = order();
  state = reducer(state, { type: 'SPAWN_ORDER', order: queued });
  const visits = reconcileVisits([], [], state.orders, state.activeMs);
  const beans = state.ingredients.coffeeBeans;
  state = reducer(state, { type: 'START_COOKING', orderId: queued.id });
  assert.equal(state.ingredients.coffeeBeans, beans - 1);
  for (let i = 0; i < 10; i++) state = reducer(state, { type: 'TICK', deltaMs: 1000 });
  const ready = state.orders.find(item => item.id === queued.id);
  assert.equal(ready.status, 'ready');
  const previous = state.orders;
  const coins = state.currency;
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: queued.id });
  assert.ok(state.currency > coins);
  assert.equal(state.lifetimeStats.totalOrders, 1);
  const json = JSON.stringify(state);
  reconcileVisits(visits, previous, state.orders, state.activeMs);
  assert.equal(JSON.stringify(state), json);
  const restored = migrateSavedState(JSON.parse(json));
  for (const key of ['currency', 'ingredients', 'orders', 'stations', 'staff', 'lifetimeStats', 'characterProgress', 'saveVersion']) assert.deepEqual(restored[key], state[key]);
});
