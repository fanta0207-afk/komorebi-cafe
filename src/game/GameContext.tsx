"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react";
import type { GameState } from "../types/game";
import { GAME_CONFIG } from "./config";
import { randomShopItems } from "./logic";
import { createInitialState, loadState, reducer, type Action } from "./state";

interface GameContextValue { state:GameState; dispatch:Dispatch<Action>; refreshGiftShop:(costAction?:boolean)=>void; resetGame:()=>void; }
const GameContext=createContext<GameContextValue|null>(null);

export function GameProvider({children}:{children:ReactNode}) {
  const [state,dispatch]=useReducer(reducer,undefined,createInitialState);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{dispatch({type:"HYDRATE",state:loadState()});setHydrated(true);},[]);
  const stateRef=useRef(state);stateRef.current=state;
  const [saveError,setSaveError]=useState(false);
  useEffect(()=>{
    if(!hydrated)return;
    const save=()=>{try{window.localStorage.setItem(GAME_CONFIG.saveKey,JSON.stringify({...stateRef.current,lastPlayedAt:Date.now(),notice:undefined,offlineOffer:0}));setSaveError(false);}catch{setSaveError(true);}};
    const timer=window.setInterval(save,1000);
    const onVisibility=()=>{if(document.visibilityState!=="visible")save();};
    window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",onVisibility);
    return ()=>{save();window.clearInterval(timer);window.removeEventListener("pagehide",save);document.removeEventListener("visibilitychange",onVisibility);};
  },[hydrated]);
  useEffect(()=>{
    if (!state.notice) return;
    const timer=window.setTimeout(()=>dispatch({type:"CLEAR_NOTICE"}),2200);
    return ()=>window.clearTimeout(timer);
  },[state.notice]);
  const resetGame=useCallback(()=>{
    const fresh=createInitialState();
    stateRef.current=fresh;
    try{window.localStorage.removeItem(GAME_CONFIG.saveKey);setSaveError(false);}catch{setSaveError(true);}
    dispatch({type:"HYDRATE",state:fresh});
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    let previous=performance.now();
    const timer=window.setInterval(()=>{const now=performance.now();const deltaMs=now-previous;previous=now;if(document.visibilityState==="visible")dispatch({type:"TICK",deltaMs});},100);
    const reset=()=>{previous=performance.now();};document.addEventListener("visibilitychange",reset);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",reset);};
  },[hydrated]);
  const value=useMemo(()=>({ state,dispatch,refreshGiftShop:(costAction=true)=>dispatch({type:"REFRESH_SHOP",items:randomShopItems(),costAction}),resetGame }),[state,resetGame]);
  return <GameContext.Provider value={value}>{saveError&&<div className="save-warning" role="alert">端末に保存できません。保存領域をご確認ください。</div>}{children}</GameContext.Provider>;
}

export function useGame() {
  const context=useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
