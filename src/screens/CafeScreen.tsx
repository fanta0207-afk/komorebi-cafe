"use client";

import { getRecipe } from "../data/recipes";
import type { GameState } from "../types/game";
import { ScreenTitle } from "../components/GameUI";
import { getCustomerGroup, getTownDailyEvent, getWeather } from "../data/dailyConditions";
import { salePrice } from "../game/logic";

const customerLooks=["customer-green","customer-rose","customer-blue","customer-gold"];

export function CafeScreen({state,onCollect,onEndDay}:{state:GameState;onCollect:(id:string)=>void;onEndDay:()=>void}) {
  const weather=getWeather(state.dailyWeatherId);const crowd=getCustomerGroup(state.dailyCustomerGroupId);const dailyEvent=getTownDailyEvent(state.dailyEventId);
  return <section className="screen fade-in">
    <ScreenTitle kicker="TODAY'S CAFE" title="こもれび喫茶"><div className="open-sign">OPEN</div></ScreenTitle>
    <p className="intro-copy">今日も、ゆっくり開店です。注文の吹き出しをタップしましょう。</p>
    <div className="daily-briefing"><div className="brief-main"><span>{weather.icon}</span><div><small>今日の天気</small><strong>{weather.name}</strong><p>{weather.description}</p></div></div><div className="brief-chips"><span>{crowd.icon} {crowd.name}</span><span>{dailyEvent.icon} {dailyEvent.name} <b>売上×{dailyEvent.saleMultiplier}</b></span></div><p className="brief-event-copy">{dailyEvent.description}。{crowd.description}。</p></div>
    <div className="cafe-cutaway" aria-label="喫茶店の断面図">
      <div className="awning"><i/><i/><i/><i/><i/><i/></div>
      <div className="cafe-wall">
        <div className="window"><span>☁</span><b>♧</b></div>
        <div className="shelf"><span>☕</span><span>▰</span><span>🫖</span></div>
        {[0,1,2,3].map(slot=>{
          const order=state.orders.find(item=>item.customerSlot===slot); const recipe=order&&getRecipe(order.recipeId);
          return <div className={`customer slot-${slot} ${customerLooks[slot]}`} key={slot}>
            {order&&recipe&&<button onClick={()=>onCollect(order.id)} aria-label={`${recipe.name}の注文を渡す`}><span>{recipe.icon}</span><small>{salePrice(recipe.id,state)}</small></button>}
          </div>;
        })}
        <div className="counter"><span className="cake">🍰</span><span className="register">▣</span><em>COFFEE</em></div>
        <div className="floor-lines" />
      </div>
    </div>
    <div className="today-stats"><div><span>本日の売上</span><strong>{state.dailyStats.sales.toLocaleString()}</strong></div><div><span>注文件数</span><strong>{state.dailyStats.orders}件</strong></div></div>
    <div className="action-guide"><div><span>今日の行動</span><strong>{"●".repeat(state.actionsRemaining)}<i>{"○".repeat(state.maxActions-state.actionsRemaining)}</i></strong></div><p>仕入れ先への訪問・贈物・品揃え更新で1つ使います。注文の受け取りは使いません。</p></div>
    <button className={`close-day ${state.actionsRemaining===0?"ready":""}`} type="button" onClick={onEndDay}>{state.actionsRemaining===0?"今日はよく頑張りました — 営業終了":"本日の営業を終了"} <span>→</span></button>
  </section>;
}
