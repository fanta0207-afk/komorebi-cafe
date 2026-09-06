import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Guard the overflow fix without altering a player's browser or saved progress.
const css=postcss.parse(readFileSync(new URL('../src/components/missions.css',import.meta.url),'utf8'));
const declarations=selector=>{
  const values={};
  css.walkRules(selector,rule=>rule.walkDecls(decl=>{values[decl.prop]=decl.value;}));
  return values;
};

test('mission dialog is explicitly centered inside the 430px game and safe viewport height',()=>{
  const dialog=declarations('.mission-notebook');
  assert.equal(dialog.position,'fixed');
  assert.equal(dialog.inset,'0');
  assert.equal(dialog.margin,'auto');
  assert.equal(dialog['box-sizing'],'border-box');
  assert.equal(dialog.width,'calc(min(100vw,430px) - 24px)');
  assert.equal(dialog['max-width'],'calc(100vw - 24px)');
  assert.match(dialog['max-height'],/100dvh.*safe-area-inset-top.*safe-area-inset-bottom/);
  assert.equal(dialog.overflow,'hidden');
  assert.equal(dialog['overflow-wrap'],'anywhere');
});

test('only the mission list scrolls; the close button cannot shrink or scroll out of view',()=>{
  assert.equal(declarations('.mission-notebook[open]').display,'flex');
  assert.equal(declarations('.mission-notebook>header').flex,'none');
  assert.equal(declarations('.mission-notebook>header button').flex,'none');
  assert.equal(declarations('.mission-scroll')['min-height'],'0');
  assert.equal(declarations('.mission-scroll')['overflow-y'],'auto');
  assert.equal(declarations('.mission-notebook ol')['grid-template-columns'],'minmax(0,1fr)');
  assert.equal(declarations('.mission-notebook .mission-actions button')['white-space'],'normal');
  const component=readFileSync(new URL('../src/components/MissionGuide.tsx',import.meta.url),'utf8');
  assert.match(component,/createPortal\(<MissionNotebook[\s\S]*?document\.body/);
  assert.match(component,/className="mission-scroll"/);
});

test('mission cards keep readable text and touch targets while sharing a compact footer',()=>{
  assert.equal(declarations('.mission-notebook li').padding,'10px');
  assert.equal(declarations('.mission-notebook ol').gap,'8px');
  assert.equal(declarations('.mission-notebook h3')['font-size'],'16px');
  assert.equal(declarations('.mission-actions button')['min-height'],'44px');
  assert.equal(declarations('.mission-footer').display,'flex');
  assert.equal(declarations('.mission-footer')['flex-wrap'],'wrap');
  assert.equal(declarations('.mission-actions')['max-width'],'100%');
});

test('bottom navigation has one shared theme and a common reserved height on every screen',()=>{
  const globalCss=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  const cafeCss=readFileSync(new URL('../src/components/cafe/cafe-scene.css',import.meta.url),'utf8');
  const navCss=readFileSync(new URL('../src/components/bottom-nav.css',import.meta.url),'utf8');
  assert.match(globalCss,/@import "\.\.\/src\/components\/bottom-nav\.css"/);
  for(const source of [globalCss,cafeCss])postcss.parse(source).walkRules(rule=>{
    assert.ok(!rule.selector.includes('.bottom-nav'),`screen-specific navigation style: ${rule.selector}`);
  });
  const rules=postcss.parse(navCss);
  rules.walkRules(rule=>assert.ok(!rule.selector.includes('cafe-shell')));
  assert.match(navCss,/--bottom-nav-height:calc\(66px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(globalCss,/height:calc\(100dvh - 70px - var\(--bottom-nav-height\)/);
  assert.match(globalCss,/height:calc\(100% - var\(--bottom-nav-height\)\)/);
});
