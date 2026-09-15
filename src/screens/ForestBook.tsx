'use client';

import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { forestAreas, forestIngredients, forestRecipes, handmadeGifts } from '../data/forest';
import { getIngredient } from '../data/ingredients';
import { canCookForestDish } from '../game/forest';
import { salePrice } from '../game/logic';
import { ScreenTitle } from '../components/GameUI';

export function ForestBook({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useGame(), f = state.forest;
  const [tab, setTab] = useState('food'), [amount, setAmount] = useState(1);
  const materials = (items: Record<string, number>, count = 1) => <ul className="forest-book-materials">{Object.entries(items).map(([id, n]) => {
    const owned = state.ingredients[id] || 0, needed = n * count;
    return <li key={id}><span>{getIngredient(id)?.name} ×{needed}</span><small className={owned < needed ? 'is-short' : ''}>所持 {owned}</small></li>;
  })}</ul>;

  return <section className="screen forest-screen forest-book"><ScreenTitle title="森の手帳"/>
    <div className="forest-book-tabs">{[['food', '食材'], ['secret', '秘密のレシピ'], ['recipes', '限定料理'], ['gifts', '手作り']].map(([id, label]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'food' && <>
      <p className="forest-book-summary">発見 {forestIngredients.filter(i => f.discovered.includes(i.id)).length}/{forestIngredients.length} · 最深 {f.deepestFloor}層</p>
      {forestIngredients.map(i => <article className="forest-card" key={i.id}>
        <h3>{i.icon} {i.name}<small>{f.discovered.includes(i.id) ? '✓' : '未発見'}</small></h3>
        <p>在庫 {state.ingredients[i.id] || 0}</p>
      </article>)}
      <details className="forest-book-help"><summary>食材の場所</summary><ul>{forestIngredients.map(i => <li key={i.id}><strong>{i.name}</strong><small>{forestAreas.filter(a => a.bonus[i.id]).map(a => a.name).join('・')}</small></li>)}</ul></details>
    </>}
    {tab === 'secret' && <>
      <p className="forest-book-summary">切れ端 3枚で解放</p>
      {forestRecipes.filter(r => r.hidden).map(r => <article className="forest-card" key={r.id}>
        <h3>{r.icon} {r.name}<small>{f.fragments[r.id] || 0}/3</small></h3>
        <small>{forestAreas.find(area => area.secret === r.id)?.name}</small>
        <progress aria-label={`${r.name}の切れ端`} value={f.fragments[r.id] || 0} max={3}/>
      </article>)}
      <details className="forest-book-help"><summary>深い森の解放条件</summary><dl className="forest-book-conditions"><dt>持ち帰り</dt><dd>{Math.min(5, f.returns)}/5回</dd><dt>料理提供</dt><dd>{Math.min(20, state.lifetimeStats.totalOrders)}/20皿</dd></dl></details>
    </>}
    {tab === 'recipes' && <>
      <p className="forest-book-summary">作って所持 → お客さんが来店</p>
      <div className="forest-book-sales"><label>皿数 <select value={amount} onChange={e => setAmount(Number(e.target.value))}>{[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}</select></label></div>
      {forestRecipes.map(r => {
        const unlocked = state.unlockedRecipes.includes(r.id), reserved = f.dishes[r.id] || 0;
        const inFlight = state.orders.filter(o => o.forestReserved && o.recipeId === r.id).length;
        const can = canCookForestDish(state,r.id,amount);
        if (!unlocked) return <article className="forest-card forest-card-locked" key={r.id}>
          <h3>❔ ？？？</h3>
          <p>レシピ未完成</p>
          <button className="primary-button" disabled>未解放</button>
        </article>;
        return <article className={`forest-card menu-rarity-${r.rarity}`} key={r.id}>
          <h3>{r.icon} {r.name}</h3>
          <p>● {salePrice(r.id, state)} コイン</p>
          {materials(Object.fromEntries(r.requiredIngredients.map(id => [id, 1])), amount)}
          <small>所持 {reserved}/3皿{inFlight > 0 && ` · お客さん ${inFlight}`}</small>
          <button className="primary-button" disabled={!can} onClick={() => dispatch({ type: 'FOREST_COOK', recipeId: r.id, count: amount })}>{unlocked ? `${amount}皿作る` : '未解放'}</button>
        </article>;
      })}
    </>}
    {tab === 'gifts' && <>{handmadeGifts.map(g => <article className="forest-card" key={g.id}>
      <h3>{g.icon} {g.name}<small>{f.crafted.includes(g.id) && '✓'}</small></h3>
      {materials(g.materials!)}
      {(state.inventory[g.id] || 0) > 0 && <small>完成品 {state.inventory[g.id]}</small>}
      <button className="primary-button" disabled={state.currency < 100 || !Object.entries(g.materials!).every(([id, n]) => (state.ingredients[id] || 0) >= n)} onClick={() => dispatch({ type: 'FOREST_CRAFT', giftId: g.id })}>作る · 100コイン</button>
    </article>)}</>}
    <button className="secondary-button" onClick={onBack}>戻る</button>
  </section>;
}
