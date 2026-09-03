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
  assert.match(html,/注文とキッチン/);
  assert.match(html,/吹き出しから注文を操作/);
  assert.equal((html.match(/data-layer=/g)||[]).length,8);
  assert.doesNotMatch(html,/class="order-board"|class="cafe-cutaway"/);
  assert.match(html,/スタッフ/);
  assert.doesNotMatch(html,/本日の営業を終了|留守中の売上|今日の残り行動/);
  assert.match(html,/メインメニュー/);
  assert.match(html,/出会い|街の人/);
  assert.doesNotMatch(html,/Your site is taking shape|Building your site|SkeletonPreview/);
});
