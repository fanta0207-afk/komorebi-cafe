"use client";

import { getGift, sortGiftIdsByRarity } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";
import { GAME_CONFIG } from "../game/config";
import { giftShopNextRefreshAt, giftShopRefreshesLeft } from "../game/giftShop";

export function GiftShopScreen() {
  const {state,dispatch,refreshGiftShop}=useGame();
  const remaining=giftShopRefreshesLeft(state);
  const nextRefresh=new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(giftShopNextRefreshAt(state));
  return <section className="screen gift-shop-screen fade-in"><ScreenTitle title="雑貨屋"><button className="refresh-button" disabled={!remaining} onClick={()=>refreshGiftShop(true)}>{remaining?"↻ 品揃えを更新":"本日の更新は終了"}</button></ScreenTitle>
    <div className="gift-shop-refresh-status"><span>手動更新 あと<b>{remaining}</b>/{GAME_CONFIG.giftShopDailyRefreshLimit}回<small>毎日0時に回復</small></span><span>次の自動更新 <b>{nextRefresh}</b><small>{GAME_CONFIG.giftShopAutoRefreshMs/3600000}時間ごと・日本時間</small></span></div>
    <div className="gift-grid">{sortGiftIdsByRarity(state.giftShopItems).map(id=>{const item=getGift(id);if(!item)return null;const owned=state.inventory[id]||0,soldOut=state.giftShopSoldOut.includes(id);return <article className={`gift-card gift-rarity-${item.rarity} ${soldOut?"gift-sold-out":""}`} key={id}>
      {owned>0&&<em>所持 {owned}</em>}
      <span className="gift-icon">{item.icon}</span><h3>{item.name}</h3>
      <div className="gift-card-actions"><b>● {item.price.toLocaleString()}</b><button disabled={soldOut||state.currency<item.price} onClick={()=>dispatch({type:"BUY_GIFT",giftId:id})}>{soldOut?"売り切れ":"購入"}</button></div>
    </article>})}</div>
  </section>;
}
