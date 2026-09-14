'use client';
import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { FOREST_CONFIG, forestArea, forestRecipes } from '../data/forest';
import { getIngredient } from '../data/ingredients';
import { basketCapacity, basketWeight, forestDeepUnlocked, forestSecret, forestRandom, foodWeight } from '../game/forest';
import { ForestIcon, ForestObject } from '../components/ForestArt';
import { ForestSheet } from '../components/ForestSheet';
export { ForestBook } from './ForestBook';
const counts = (items: string[]) => Object.entries(items.reduce<Record<string, number>>((out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }), {}));
function FoodList({ items }: {
    items: string[];
}) { return <ul className="forest-items">{counts(items).map(([id, n]) => <li key={id}><span className="forest-food-token"><ForestIcon name={id.startsWith('forest') ? 'leaf' : 'food'}/></span><span>{getIngredient(id)?.name}<small>{foodWeight(id)}枠 / 個</small></span><b>×{n}</b></li>)}</ul>; }
export function ForestScreen({ onBook, onTown, onClaimReturn }: {
    onBook: () => void;
    onTown: () => void;
    onClaimReturn?: () => void;
}) {
    const { state, dispatch } = useGame(), f = state.forest, e = f.expedition;
    const [selection, setSelection] = useState<{
        spot: number;
        area: string;
    }>(), [basketOpen, setBasketOpen] = useState(false), [noteOpen, setNoteOpen] = useState(false);
    const area = forestArea(e?.area || 'entrance'), capacity = basketCapacity(f), used = basketWeight(e?.basket || []), free = capacity - used;
    const secret = forestSecret(f), pending = e?.pending;
    const backdrop = ['river', 'pond'].includes(area.id) ? 'river' : ['stone', 'spring'].includes(area.id) ? 'spring' : 'clearing';
    const move = (id: string) => { setSelection(undefined); setBasketOpen(false); dispatch({ type: 'FOREST_MOVE', area: id }); };
    const gather = (careful: boolean) => { if (!selection)
        return; setSelection(undefined); dispatch({ type: 'FOREST_GATHER', spot: selection.spot, careful }); };
    const anchors = [{ x: 24, y: 51 }, { x: 76, y: 55 }, { x: 48, y: 70 }].sort((a, b) => forestRandom(e?.seed || 1, area.id + ':place:' + a.x)() - forestRandom(e?.seed || 1, area.id + ':place:' + b.x)());
    const canGather = !!e && Object.keys(area.normal).length > 0 && !e.returning;
    const refill = Math.max(1, Math.ceil((FOREST_CONFIG.recoveryMs - (state.lastPlayedAt - f.recoveredAt)) / 1000));
    return <section className={`forest-adventure forest-view-${backdrop}`} aria-label="こもれびの森の探索">
    <img className="forest-backdrop" src={`/assets/forest/${backdrop}.jpg`} alt=""/>
    <div className="forest-vignette"/>
    <header className="forest-heading"><span>こもれびの森</span><h1>{e?.returning ? '帰り道' : area.name}</h1></header>
    <div className="forest-hud">
      <div className="forest-energy" role="meter" aria-label="残り体力" aria-valuenow={f.energy} aria-valuemin={0} aria-valuemax={FOREST_CONFIG.maxEnergy}>
        <ForestIcon name="leaf"/><div><div className="forest-energy-numbers"><strong>{f.energy}<small> / {FOREST_CONFIG.maxEnergy}</small></strong><small>{f.energy < FOREST_CONFIG.maxEnergy ? `+1 ${refill}秒` : '満タン'}</small></div><span className="forest-energy-track"><i style={{ width: `${f.energy / FOREST_CONFIG.maxEnergy * 100}%` }}/></span></div>
      </div>
      <button className={`forest-basket-hud ${free === 0 ? 'is-full' : ''}`} onClick={() => setBasketOpen(true)} aria-label={`かごの中を開く、空き${free}枠、全${capacity}枠`}><ForestIcon name="basket"/><span>空き <b>{free}</b><small> / {capacity}</small></span></button>
    </div>
    {!!e && !e.returning && <div className="forest-cafe-peek"><ForestIcon name="home"/><span>店 完成 {state.orders.filter(o => o.status === 'ready').length}皿<span> · 入荷待ち {state.deliveries.length}</span></span></div>}
    <div key={`${e?.id || 0}:${area.id}`} className="forest-landscape">
      {e && !e.returning && area.next.map(([id, cost], index) => { const locked = ['stone', 'spring'].includes(id) && !forestDeepUnlocked(state), left = area.next.length === 1 ? 55 : index === 0 ? 28 : 73; return <button key={id} className={`forest-waypost ${locked ? 'is-locked' : ''} ${area.next.length > 1 && index === 0 ? 'points-left' : ''}`} style={{ left: `${left}%`, top: `max(190px, ${area.next.length === 1 ? 28 : 29 + index * 5}%)` }} disabled={locked || f.energy < cost || !!pending} onClick={() => move(id)} aria-label={`${forestArea(id).name}へ進む、体力${cost}${locked ? '、持ち帰り5回・料理提供20皿で解放' : ''}`}><span>{locked ? <ForestIcon name="lock"/> : <ForestIcon name="arrow"/>}<b>{forestArea(id).name}</b></span><small>{locked ? '持帰5回・提供20皿' : <><ForestIcon name="leaf"/>−{cost}</>}</small></button>; })}
      {canGather && [0, 1, 2].map(spot => { const spent = e!.used.includes(`${area.id}:${spot}`), pos = anchors[spot]; return <button key={spot} className={`forest-gather ${spent ? 'is-spent' : ''}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} disabled={spent || f.energy < 2 || !!pending} onClick={() => setSelection({ spot, area: area.id })} aria-label={spent ? `採集場所${spot + 1}、採集済み` : `採集場所${spot + 1}を調べる`}><ForestObject kind={spot === 0 ? 'box' : spot === 1 ? 'herbs' : 'mushrooms'} spent={spent}/>{spent ? <span className="forest-spent-mark"><ForestIcon name="check"/>採集済み</span> : <><span className="forest-glint"><ForestIcon name="spark"/></span><span className="forest-target-label">調べる</span></>}</button>; })}
      {!!e && !e.returning && secret && <button className="forest-secret-object" disabled={f.energy < 2 || !!pending} onClick={() => { dispatch({ type: 'FOREST_FRAGMENT' }); setNoteOpen(true); }} aria-label="レシピの切れ端を拾う、体力2"><ForestObject kind="note"/><span><ForestIcon name="spark"/>切れ端 <ForestIcon name="leaf"/>−2</span></button>}
      {!e && <div className="forest-departure"><p>{f.lastReturn ? '森のおみやげを持ち帰りました' : '寄り道で、今日のひとしな。'}</p><button className="forest-main-action" disabled={state.lifetimeStats.totalOrders < 1 || f.energy < 1} onClick={() => dispatch({ type: 'FOREST_ENTER' })}>森へ出かける<ForestIcon name="arrow"/></button>{state.lifetimeStats.totalOrders < 1 && <small>最初の料理を提供すると解放</small>}{f.lastReturn && <button className="forest-text-action" onClick={() => setBasketOpen(true)}>持ち帰ったものを見る</button>}</div>}
      {!!e && !e.returning && canGather && e.used.filter(key => key.startsWith(area.id + ':')).length === 3 && <p className="forest-scene-message">ここはひと通り探したみたい。<br />道標から、次の場所へ。</p>}
      {!!e && !e.returning && f.energy < 2 && <p className="forest-rest-message">ひとやすみしよう。<br />体力0でも店へ帰れます。</p>}
    </div>
    <footer className="forest-dock"><button disabled={!!pending || !!e?.returning} onClick={() => e ? dispatch({ type: 'FOREST_RETURN' }) : onTown()} aria-label="店へ帰る、体力を使わず帰還"><ForestIcon name="home"/><span>店へ帰る</span></button><button className="forest-dock-basket" onClick={() => setBasketOpen(true)} aria-label="かごの中を見る"><ForestIcon name="basket"/><span>かご <b>{used}/{capacity}</b></span><div className="forest-basket-slots" aria-hidden="true">{Array.from({ length: capacity }, (_, i) => <i className={i < used ? 'filled' : ''} key={i}/>)}</div></button><button onClick={onBook} disabled={!!pending || !!e?.returning} aria-label="森の手帳を開く"><ForestIcon name="book"/><span>手帳</span></button></footer>
    {selection && selection.area === area.id && !pending && !e?.returning && <ForestSheet title="何か見つかりそう" onClose={() => setSelection(undefined)}><div className="forest-pick-preview"><ForestObject kind={selection.spot === 0 ? 'box' : selection.spot === 1 ? 'herbs' : 'mushrooms'}/><p>分け合い箱と、森の恵み</p></div><div className="forest-pick-actions"><button className="forest-main-action" disabled={f.energy < 2} onClick={() => gather(false)}><span>採る<small><ForestIcon name="leaf"/>体力 −2</small></span></button><button className="forest-careful-action" disabled={f.energy < 3} onClick={() => gather(true)}><span>丁寧に採る<small><ForestIcon name="leaf"/>体力 −3 · レア +5%</small></span></button></div></ForestSheet>}
    {pending && <ForestSheet title="見つけた！" className={used + basketWeight(pending.food) > capacity ? "forest-sheet-has-swap" : ""}><FoodList items={pending.food}/>{(pending.coins > 0 || pending.tickets > 0) && <div className="forest-find-bonuses">{pending.coins > 0 && <span><ForestIcon name="coin"/>+{pending.coins}</span>}{pending.tickets > 0 && <span><ForestIcon name="ticket"/>+{pending.tickets}枚</span>}</div>}<div className="forest-space-meter"><ForestIcon name="basket"/>空き {free}枠 <span>今回 {basketWeight(pending.food)}枠</span></div>{used + basketWeight(pending.food) > capacity && <><p className="forest-full-message">かごがいっぱい。置くものを選んでね。</p><ul className="forest-swap-list">{e!.basket.map((id, index) => <li key={index}><span>{getIngredient(id)?.name}<small>{foodWeight(id)}枠</small></span><button onClick={() => dispatch({ type: 'FOREST_DROP', index })} aria-label={`${getIngredient(id)?.name}を1個置いて空きを作る`}>1個置く</button></li>)}</ul></>}<div className="forest-sheet-actions"><button className="forest-main-action" disabled={used + basketWeight(pending.food) > capacity} onClick={() => dispatch({ type: 'FOREST_TAKE' })}><ForestIcon name="basket"/>かごに入れる</button><button className="forest-text-action" onClick={() => dispatch({ type: 'FOREST_DISCARD' })}>食材を置いていく</button></div></ForestSheet>}
    {noteOpen && e?.fragment && !pending && !e.returning && <ForestSheet title="切れ端を見つけた" onClose={() => setNoteOpen(false)}><div className="forest-note-preview"><ForestObject kind="note"/><p>{forestRecipes.find(r => r.id === e.fragment)?.name}</p><strong>{(f.fragments[e.fragment] || 0) + 1} / 3枚</strong></div><button className="forest-main-action" onClick={() => setNoteOpen(false)}>手帳にしまう<ForestIcon name="book"/></button></ForestSheet>}
    {e?.returning && <ForestSheet title="森からのおみやげ"><FoodList items={e.basket}/><div className="forest-find-bonuses"><span><ForestIcon name="coin"/>{e.coins.toLocaleString()}</span><span><ForestIcon name="ticket"/>{e.tickets}枚</span></div>{e.fragment && <p className="forest-return-note"><ForestIcon name="book"/>{forestRecipes.find(r => r.id === e.fragment)?.name}の切れ端 {(f.fragments[e.fragment] || 0) + 1}/3</p>}<div className="forest-sheet-actions"><button className="forest-main-action" onClick={() => { setBasketOpen(false); if (onClaimReturn)
        onClaimReturn();
    else
        dispatch({ type: 'FOREST_CLAIM' }); }}>受け取る<ForestIcon name="check"/></button></div></ForestSheet>}
    {basketOpen && !pending && !e?.returning && <ForestSheet title={!e && f.lastReturn ? '持ち帰ったもの' : 'かごの中'} onClose={() => setBasketOpen(false)}><FoodList items={e?.basket || f.lastReturn?.food || []}/>{!(e?.basket || f.lastReturn?.food || []).length && <p className="forest-empty-basket">かごはまだ空っぽ。<br />光っている場所を調べてみよう。</p>}<div className="forest-find-bonuses"><span><ForestIcon name="coin"/>{e?.coins ?? f.lastReturn?.coins ?? 0}</span><span><ForestIcon name="ticket"/>{e?.tickets ?? f.lastReturn?.tickets ?? 0}枚</span></div>{e?.fragment && <p>レシピの切れ端を1枚見つけました</p>}<button className="forest-main-action" onClick={() => setBasketOpen(false)}>森に戻る</button></ForestSheet>}
  </section>;
}
