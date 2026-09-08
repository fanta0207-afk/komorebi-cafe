"use client";

import { getGift, sortGiftIdsByRarity } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";

export function GiftShopScreen() {
  const {state,dispatch,refreshGiftShop}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="ミモザ雑貨店"><button className="refresh-button" onClick={()=>refreshGiftShop(true)}>↻ 品揃えを更新</button></ScreenTitle>
    <div className="gift-grid">{sortGiftIdsByRarity(state.giftShopItems).map(id=>{const item=getGift(id);if(!item)return null;const owned=state.inventory[id]||0;return <article className={`gift-card gift-rarity-${item.rarity}`} key={id}>
      {owned>0&&<em>所持 {owned}</em>}
      <span className="gift-icon">{item.icon}</span><h3>{item.name}</h3>
      <div className="gift-card-actions"><b>● {item.price.toLocaleString()}</b><button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_GIFT",giftId:id})}>購入</button></div>
    </article>})}</div>
  </section>;
}
