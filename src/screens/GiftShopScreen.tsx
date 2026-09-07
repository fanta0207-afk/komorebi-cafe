"use client";

import { getGift } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";

export function GiftShopScreen() {
  const {state,dispatch,refreshGiftShop}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="ミモザ雑貨店"><button className="refresh-button" onClick={()=>refreshGiftShop(true)}>↻ 品揃えを更新</button></ScreenTitle>
    <div className="gift-grid">{state.giftShopItems.map(id=>{const item=getGift(id);if(!item)return null;const owned=state.inventory[id]||0;return <article className="gift-card" key={id}><span className="gift-icon">{item.icon}</span>{owned>0&&<em>所持 {owned}</em>}<h3>{item.name}</h3><div><b>● {item.price}</b><button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_GIFT",giftId:id})}>購入</button>{owned>0&&<button onClick={()=>dispatch({type:"RETURN_GIFT",giftId:id})}>1個返品</button>}</div></article>})}</div>
  </section>;
}
