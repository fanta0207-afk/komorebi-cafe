"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { getGift } from "../data/gifts";
import { getCharacter } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe, recipes } from "../data/recipes";
import type { GameState, GiftReaction, Order } from "../types/game";
import { GAME_CONFIG } from "./config";
import { createCharacterProgress, findNewRecipes, initialRecipeIds, randomShopItems } from "./logic";

type Action =
  | {type:"HYDRATE"; state:GameState}
  | {type:"VISIT"; characterId:string}
  | {type:"BUY_INGREDIENT"; ingredientId:string}
  | {type:"BUY_GIFT"; giftId:string}
  | {type:"GIVE_GIFT"; characterId:string; giftId:string; reaction:GiftReaction}
  | {type:"SPAWN_ORDER"; order:Order}
  | {type:"COLLECT_ORDER"; orderId:string}
  | {type:"REFRESH_SHOP"; items:string[]}
  | {type:"COMPLETE_EVENT"; eventId:string; characterId:string; toStage:number}
  | {type:"CLAIM_OFFLINE"}
  | {type:"NEXT_DAY"}
  | {type:"CLEAR_NOTICE"}
  | {type:"DEV_COINS"}
  | {type:"DEV_AFFECTION"; characterId:string}
  | {type:"DEV_UNLOCK_ALL"}
  | {type:"RESET"};

const emptyStats = () => ({ sales:0, orders:0, recipeSales:{} });

export function createInitialState():GameState {
  return {
    saveVersion:GAME_CONFIG.saveVersion, season:"春", day:1, currency:GAME_CONFIG.initialCurrency,
    ingredients:{}, unlockedRecipes:initialRecipeIds, characterProgress:createCharacterProgress(), inventory:{},
    giftShopItems:giftsForFirstDay(), giftShopRefreshAt:Date.now(), dailyTalkStatus:{}, dailyGiftStatus:{},
    lastPlayedAt:Date.now(), dailyStats:emptyStats(), dayNews:[], orders:[], offlineOffer:0,
  };
}

function giftsForFirstDay() {
  return ["bouquet","cookies","book","mug","handkerchief","earlGrey","chocolateBox","plant","scarf","animalCharm"];
}

function loadState():GameState {
  const fresh=createInitialState();
  if (typeof window === "undefined") return fresh;
  try {
    const raw=window.localStorage.getItem(GAME_CONFIG.saveKey);
    if (!raw) return fresh;
    const saved=JSON.parse(raw) as Partial<GameState>;
    const elapsed=Math.max(0,Date.now()-(saved.lastPlayedAt || Date.now()));
    const minutes=Math.min(GAME_CONFIG.maxOfflineMinutes,Math.floor(elapsed/60000));
    return {
      ...fresh, ...saved, saveVersion:GAME_CONFIG.saveVersion,
      characterProgress:{ ...fresh.characterProgress, ...(saved.characterProgress || {}) },
      dailyStats:{ ...emptyStats(), ...(saved.dailyStats || {}) },
      orders:saved.orders || [], lastPlayedAt:Date.now(),
      offlineOffer:minutes*GAME_CONFIG.offlineCoinsPerMinute, notice:undefined,
    };
  } catch { return fresh; }
}

const notice = (type:NonNullable<GameState["notice"]>["type"], text:string) => ({ id:Date.now()+Math.random(), type, text });

function reducer(state:GameState, action:Action):GameState {
  switch(action.type) {
    case "HYDRATE": return action.state;
    case "VISIT": {
      const current=state.characterProgress[action.characterId];
      if (!current) return state;
      const firstToday=!state.dailyTalkStatus[action.characterId];
      return {
        ...state,
        characterProgress:{ ...state.characterProgress, [action.characterId]:{ ...current, met:true, visits:current.visits+1, affection:current.affection+(firstToday?GAME_CONFIG.talkAffection:0) } },
        dailyTalkStatus:{ ...state.dailyTalkStatus, [action.characterId]:true },
        notice:firstToday?notice("heart","会話を楽しみました ♡"):undefined,
      };
    }
    case "BUY_INGREDIENT": {
      const item=getIngredient(action.ingredientId);
      if (!item || state.currency<item.price) return { ...state, notice:notice("info","コインが足りません") };
      const nextIngredients={ ...state.ingredients, [item.id]:(state.ingredients[item.id]||0)+1 };
      const newRecipes=findNewRecipes(nextIngredients,state.unlockedRecipes);
      return {
        ...state, currency:state.currency-item.price, ingredients:nextIngredients,
        unlockedRecipes:[...state.unlockedRecipes,...newRecipes],
        dayNews:newRecipes.length?[...state.dayNews,...newRecipes.map(id=>`${getRecipe(id)?.name}を解放しました`)].flat():state.dayNews,
        notice:newRecipes.length?notice("unlock",`新メニュー解放！ ${newRecipes.map(id=>getRecipe(id)?.name).join("・")}`):notice("info",`${item.name}を仕入れました`),
      };
    }
    case "BUY_GIFT": {
      const item=getGift(action.giftId);
      if (!item || state.currency<item.price) return { ...state, notice:notice("info","コインが足りません") };
      return { ...state, currency:state.currency-item.price, inventory:{ ...state.inventory,[item.id]:(state.inventory[item.id]||0)+1 }, notice:notice("info",`${item.name}を購入しました`) };
    }
    case "GIVE_GIFT": {
      const item=getGift(action.giftId); const current=state.characterProgress[action.characterId];
      if (!item || !current || !state.inventory[item.id] || state.dailyGiftStatus[action.characterId]) return state;
      const amount=GAME_CONFIG.giftAffection[action.reaction];
      const nextCount=state.inventory[item.id]-1;
      const nextInventory={ ...state.inventory, [item.id]:nextCount };
      return {
        ...state, inventory:nextInventory, dailyGiftStatus:{ ...state.dailyGiftStatus,[action.characterId]:true },
        characterProgress:{ ...state.characterProgress,[action.characterId]:{ ...current,affection:Math.max(0,current.affection+amount) } },
        notice:notice("heart",amount>0?`気持ちが少し近づきました ♡`:`少し好みと違ったようです`),
      };
    }
    case "SPAWN_ORDER": {
      if (state.orders.length>=GAME_CONFIG.maxOrders || state.orders.some(order=>order.customerSlot===action.order.customerSlot)) return state;
      return { ...state, orders:[...state.orders,action.order] };
    }
    case "COLLECT_ORDER": {
      const order=state.orders.find(item=>item.id===action.orderId); const recipe=order&&getRecipe(order.recipeId);
      if (!order || !recipe) return state;
      return {
        ...state, currency:state.currency+recipe.price, orders:state.orders.filter(item=>item.id!==action.orderId),
        dailyStats:{ sales:state.dailyStats.sales+recipe.price, orders:state.dailyStats.orders+1, recipeSales:{ ...state.dailyStats.recipeSales,[recipe.id]:(state.dailyStats.recipeSales[recipe.id]||0)+1 } },
        notice:notice("coin",`+${recipe.price} コイン`),
      };
    }
    case "REFRESH_SHOP": return { ...state,giftShopItems:action.items,giftShopRefreshAt:Date.now(),notice:notice("info","贈物が入れ替わりました") };
    case "COMPLETE_EVENT": {
      const current=state.characterProgress[action.characterId]; if (!current) return state;
      return { ...state,characterProgress:{ ...state.characterProgress,[action.characterId]:{ ...current,relationshipStage:action.toStage,viewedEvents:[...current.viewedEvents,action.eventId] } },dayNews:[...state.dayNews,`${getCharacter(action.characterId)?.name || "街の人"}との関係が「${action.toStage===2?"顔なじみ":"気になる人"}」になりました`],notice:notice("heart","関係が深まりました ♡") };
    }
    case "CLAIM_OFFLINE": return { ...state,currency:state.currency+state.offlineOffer,offlineOffer:0,notice:notice("coin","留守中の売上を受け取りました") };
    case "NEXT_DAY": return { ...state,day:Math.min(GAME_CONFIG.daysPerSeason,state.day+1),dailyTalkStatus:{},dailyGiftStatus:{},dailyStats:emptyStats(),dayNews:[],orders:[],notice:notice("info","新しい朝が来ました") };
    case "CLEAR_NOTICE": return { ...state,notice:undefined };
    case "DEV_COINS": return { ...state,currency:state.currency+10000,notice:notice("coin","+10,000 コイン") };
    case "DEV_AFFECTION": {
      const current=state.characterProgress[action.characterId]; if(!current)return state;
      return { ...state,characterProgress:{...state.characterProgress,[action.characterId]:{...current,met:true,affection:current.affection+100}},notice:notice("heart","好感度 +100") };
    }
    case "DEV_UNLOCK_ALL": return { ...state,unlockedRecipes:recipes.map(item=>item.id),notice:notice("unlock","料理をすべて解放しました") };
    case "RESET": return createInitialState();
    default:return state;
  }
}

interface GameContextValue { state:GameState; dispatch:Dispatch<Action>; refreshGiftShop:()=>void; }
const GameContext=createContext<GameContextValue|null>(null);

export function GameProvider({children}:{children:ReactNode}) {
  const [state,dispatch]=useReducer(reducer,undefined,createInitialState);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{dispatch({type:"HYDRATE",state:loadState()});setHydrated(true);},[]);
  useEffect(()=>{
    if(!hydrated)return;
    const save={ ...state,lastPlayedAt:Date.now(),notice:undefined,offlineOffer:0 };
    window.localStorage.setItem(GAME_CONFIG.saveKey,JSON.stringify(save));
  },[state,hydrated]);
  useEffect(()=>{
    if (!state.notice) return;
    const timer=window.setTimeout(()=>dispatch({type:"CLEAR_NOTICE"}),2200);
    return ()=>window.clearTimeout(timer);
  },[state.notice]);
  const value=useMemo(()=>({ state,dispatch,refreshGiftShop:()=>dispatch({type:"REFRESH_SHOP",items:randomShopItems()}) }),[state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context=useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
