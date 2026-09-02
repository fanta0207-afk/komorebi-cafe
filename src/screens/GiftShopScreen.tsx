"use client";

import { getGift } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";

export function GiftShopScreen() {
  const {state,dispatch,refreshGiftShop}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="PETIT MARKET" title="ミモザ雑貨店"><button className="refresh-button" onClick={refreshGiftShop}>↻ 品揃え更新</button></ScreenTitle>
    <p className="intro-copy">街の小さな贈物屋さん。今日は10品だけが棚に並んでいます。</p>
    <div className="gift-grid">{state.giftShopItems.map(id=>{const item=getGift(id);if(!item)return null;const owned=state.inventory[id]||0;return <article className="gift-card" key={id}><span className="gift-icon">{item.icon}</span>{owned>0&&<em>所持 {owned}</em>}<h3>{item.name}</h3><p>{item.description}</p><div><b>● {item.price}</b><button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_GIFT",giftId:id})}>購入</button></div></article>})}</div>
  </section>;
}
