import { sortGiftIdsByRarity } from "../data/gifts";
import type { GameState } from "../types/game";
import { GAME_CONFIG } from "./config";
import { randomShopItems } from "./logic";

const dayMs=24*60*60*1000;
const japanOffsetMs=9*60*60*1000;

// Calendar limits and six-hour shelves follow Japanese time, including offline time.
export const giftShopDay=(now:number)=>Math.floor((now+japanOffsetMs)/dayMs);
export const giftShopAutoSlot=(now:number)=>Math.floor((now+japanOffsetMs)/GAME_CONFIG.giftShopAutoRefreshMs)*GAME_CONFIG.giftShopAutoRefreshMs-japanOffsetMs;
export const giftShopNextRefreshAt=(state:GameState)=>state.giftShopAutoRefreshAt+GAME_CONFIG.giftShopAutoRefreshMs;
export const giftShopRefreshesLeft=(state:GameState)=>Math.max(0,GAME_CONFIG.giftShopDailyRefreshLimit-state.giftShopManualRefreshes);

export function replaceGiftShop(state:GameState,items:string[],now:number):GameState {
  const selected=state.characterProgress.ren.relationshipStage<2?[...new Set(["book",...items])]:items;
  return {...state,giftShopItems:sortGiftIdsByRarity(selected.slice(0,GAME_CONFIG.giftShopSize)),giftShopSoldOut:[],giftShopRefreshAt:now};
}

export function updateGiftShopClock(state:GameState,now:number,draw=()=>randomShopItems()):GameState {
  if(!Number.isFinite(now))return state;
  let next=state;
  const day=giftShopDay(now);
  if(day>state.giftShopRefreshDay)next={...next,giftShopRefreshDay:day,giftShopManualRefreshes:0};
  const slot=giftShopAutoSlot(now);
  if(slot>state.giftShopAutoRefreshAt) {
    // Missed shelves do not accumulate rerolls, stock, or manual refresh credits.
    next={...replaceGiftShop(next,draw(),now),giftShopAutoRefreshAt:slot};
  }
  return next;
}
