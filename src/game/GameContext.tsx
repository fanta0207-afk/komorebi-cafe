"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from "react";
import type { GameState } from "../types/game";
import { GAME_CONFIG } from "./config";
import { randomShopItems } from "./logic";
import { createInitialState, loadState, reducer, type Action } from "./state";

interface GameContextValue { state:GameState; dispatch:Dispatch<Action>; refreshGiftShop:(costAction?:boolean)=>void; }
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
  const value=useMemo(()=>({ state,dispatch,refreshGiftShop:(costAction=true)=>dispatch({type:"REFRESH_SHOP",items:randomShopItems(),costAction}) }),[state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context=useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
