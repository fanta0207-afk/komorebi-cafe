"use client";

import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import type { GameState } from "../types/game";
import { ScreenTitle } from "../components/GameUI";
import { getCustomerGroup, getTownDailyEvent, getWeather } from "../data/dailyConditions";
import { hasIngredients, startProblem } from "../game/operations";
import { isRecipeUsable, salePrice } from "../game/logic";
import { decorations } from "../data/decorations";
import { equipment, getEquipment } from "../data/equipment";

const customerLooks=["customer-green","customer-rose","customer-blue","customer-gold"];

export function CafeScreen({state,onCollect,onStart}:{state:GameState;onStart:(id:string)=>void;onCollect:(id:string)=>void}) {
  const weather=getWeather(state.dailyWeatherId);const crowd=getCustomerGroup(state.dailyCustomerGroupId);const dailyEvent=getTownDailyEvent(state.dailyEventId);
  const visibleDecorations=state.unlockedDecorations.slice(-8).flatMap(id=>decorations.filter(item=>item.id===id));
  const visibleEquipment=equipment.filter(item=>state.ownedEquipment.includes(item.id)).slice(0,4);
  const stocked=recipes.some(recipe=>isRecipeUsable(recipe.id,state)&&hasIngredients(state,recipe));
  return <section className="screen fade-in">
    <ScreenTitle kicker="TODAY'S CAFE" title="こもれび喫茶"><div className="open-sign">OPEN</div></ScreenTitle>
    <p className="intro-copy">注文を選んで調理開始 → 完成を待つ → タップして提供。お客さまは時間を気にせず待ってくれます。</p>
    <div className="daily-briefing"><div className="brief-main"><span>{weather.icon}</span><div><small>街の天気</small><strong>{weather.name}</strong><p>{weather.description}</p></div></div><div className="brief-chips"><span>{crowd.icon} {crowd.name}</span><span>{dailyEvent.icon} {dailyEvent.name} <b>売上×{dailyEvent.saleMultiplier}</b></span></div><p className="brief-event-copy">{dailyEvent.description}。{crowd.description}。</p></div>
    <div className="order-board"><h2>注文とキッチン <small>{state.orders.length}/4</small></h2>{state.orders.length===0&&<p>{stocked?"まもなくお客さまが来店します。コーヒーは10秒で完成します。":"食材を仕入れると、注文の受付を再開します。"}</p>}{state.orders.map(order=>{const recipe=getRecipe(order.recipeId)!;const problem=startProblem(state,recipe);return <article className={`order-card order-${order.status}`} key={order.id}><span className="order-food">{recipe.icon}</span><div className="order-info"><small>テーブル {order.customerSlot+1} · {salePrice(recipe.id,state)}コイン</small><h3>{recipe.name}</h3>{order.stationId&&<small>{getEquipment(state.stations.find(station=>station.id===order.stationId)?.equipmentId||"")?.name}{order.cookId?` · ${getCharacter(order.cookId)?.shortName}`:""}</small>}{order.status==="cooking"?<><progress max={order.totalMs} value={order.totalMs-order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>調理中 · あと{Math.ceil(order.remainingMs/1000)}秒</p></>:<p>{order.status==="ready"?state.staff.some(person=>person.servingOrderId===order.id)?"スタッフが提供中です（タップで先に提供もできます）":"できたてです。提供できます！":problem||"注文が入りました"}</p>}</div><button className="primary-button" disabled={order.status==="cooking"||(order.status==="queued"&&!!problem)} onClick={()=>order.status==="ready"?onCollect(order.id):onStart(order.id)}>{order.status==="ready"?"提供する":order.status==="cooking"?"調理中":"調理開始"}</button></article>})}</div>
    {!stocked&&<p className="empty-stock">食材が足りません。「街」で食材を仕入れましょう。仕入れは1パック5食分です。</p>}
    <div className="kitchen-status" aria-label="設備の使用状況">{state.stations.map(station=>{const busy=state.orders.some(order=>order.stationId===station.id&&order.status==="cooking");return <span key={station.id} className={busy?"busy":""}>{getEquipment(station.equipmentId)?.icon} {getEquipment(station.equipmentId)?.name} Lv.{station.level} · {busy?"調理中":"空き"}</span>})}</div>
    <div className="crew-at-work">{state.staff.filter(person=>person.role!=="rest").map(person=><span key={person.characterId}>♡ {getCharacter(person.characterId)?.shortName} · {person.role==="cook"?"調理担当":"提供担当"}</span>)}</div>
    <div className="cafe-cutaway" aria-label="喫茶店の断面図">
      <div className="awning"><i/><i/><i/><i/><i/><i/></div>
      <div className="cafe-wall">
        <div className="window"><span>☁</span><b>♧</b></div>
        <div className="shelf"><span>☕</span><span>▰</span><span>🫖</span></div>
        <div className="cafe-memories" aria-label={`${visibleDecorations.length}個の物語の思い出`}>
          {visibleDecorations.map((item,index)=><span key={item.id} className={`cafe-memory memory-${item.placement} memory-${index}`} title={item.name}>{item.icon}</span>)}
        </div>
        <div className="cafe-equipment" aria-label={`${visibleEquipment.length}個の設備`}>
          {visibleEquipment.map((item,index)=><span key={item.id} className={`installed-equipment equipment-${index}`} title={item.name}><i>{item.icon}</i><small>{item.name}</small></span>)}
        </div>
        {[0,1,2,3].map(slot=>{
          const order=state.orders.find(item=>item.customerSlot===slot); const recipe=order&&getRecipe(order.recipeId);
          return <div className={`customer slot-${slot} ${customerLooks[slot]}`} key={slot}>
            {order&&recipe&&<button disabled={order.status==="cooking"} onClick={()=>order.status==="ready"?onCollect(order.id):onStart(order.id)} aria-label={`${recipe.name}を${order.status==="ready"?"提供":"調理"}`}><span>{recipe.icon}</span><small>{salePrice(recipe.id,state)}</small></button>}
          </div>;
        })}
        <div className="counter"><span className="cake">🍰</span><span className="register">▣</span><em>COFFEE</em></div>
        <div className="floor-lines" />
      </div>
    </div>
    {(visibleDecorations.length>0||visibleEquipment.length>0)&&<div className="cafe-growth-note"><span>✦ 店に残った思い出 {visibleDecorations.length}</span><span>設置設備 {state.stations.length}</span></div>}
    <div className="today-stats"><div><span>累計の売上</span><strong>{state.lifetimeStats.totalRevenue.toLocaleString()}</strong></div><div><span>注文件数</span><strong>{state.lifetimeStats.totalOrders}件</strong></div></div>
  </section>;
}
