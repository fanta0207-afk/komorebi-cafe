"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_SETTINGS, KomorebiAudioEngine, normalizeAudioSettings, type AudioScene, type AudioSettings, type SoundEffect } from "./audioEngine";

interface AudioContextValue {
  settings:AudioSettings;
  updateSettings:(patch:Partial<AudioSettings>)=>void;
  play:(effect:SoundEffect)=>void;
  setScene:(scene:AudioScene)=>void;
}

const GameAudioContext=createContext<AudioContextValue|null>(null);

function buttonSound(button:HTMLButtonElement):SoundEffect {
  const explicit=button.dataset.sound as SoundEffect|undefined;
  if(explicit)return explicit;
  const className=button.className,copy=(button.textContent||"").trim();
  if(/bottom-nav|back-button|forest-dock/.test(className)||/^(街|店|ギフト|人物|スタッフ)$/.test(copy))return "navigate";
  if(/story-|prologue-/.test(className)||/^(次へ|つづける|戻る)/.test(copy))return "page";
  if(/danger|decline/.test(className)||/断る|破棄|初期化/.test(copy))return "cancel";
  if(/purchase|supply-order|mission-claim/.test(className)||/購入|発注|受け取る|強化/.test(copy))return "confirm";
  if(/forest-gather|forest-next-action|forest-main-action/.test(className))return "forest";
  if(/primary|main-action/.test(className)||/完了|決定|出発|提供|作る/.test(copy))return "confirm";
  return "tap";
}

export function AudioProvider({children}:{children:ReactNode}) {
  const engineRef=useRef<KomorebiAudioEngine|null>(null);
  const [settings,setSettings]=useState(()=>{
    if(typeof window==="undefined")return DEFAULT_AUDIO_SETTINGS;
    try{return normalizeAudioSettings(JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_KEY)||"null"));}catch{return {...DEFAULT_AUDIO_SETTINGS};}
  });
  const engine=useCallback(()=>engineRef.current||(engineRef.current=new KomorebiAudioEngine()),[]);

  useEffect(()=>{
    const unlock=()=>{void engine().unlock();};
    const click=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const button=target.closest("button");
      if(button instanceof HTMLButtonElement&&!button.disabled)engine().play(buttonSound(button));
    };
    const visibility=()=>engineRef.current?.setSuspended(document.visibilityState!=="visible");
    window.addEventListener("pointerdown",unlock,{capture:true});window.addEventListener("keydown",unlock,{capture:true});
    document.addEventListener("click",click);document.addEventListener("visibilitychange",visibility);
    return ()=>{
      window.removeEventListener("pointerdown",unlock,{capture:true});window.removeEventListener("keydown",unlock,{capture:true});
      document.removeEventListener("click",click);document.removeEventListener("visibilitychange",visibility);
      engineRef.current?.destroy();engineRef.current=null;
    };
  },[engine]);

  useEffect(()=>{
    engine().setSettings(settings);
    try{window.localStorage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(settings));}catch{/* The game can continue with session-only audio settings. */}
  },[engine,settings]);

  const updateSettings=useCallback((patch:Partial<AudioSettings>)=>setSettings(current=>normalizeAudioSettings({...current,...patch})),[]);
  const value=useMemo<AudioContextValue>(()=>({
    settings,updateSettings,
    play:(effect)=>engine().play(effect),
    setScene:(scene)=>engine().setScene(scene),
  }),[engine,settings,updateSettings]);
  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useAudio() {
  const context=useContext(GameAudioContext);
  if(!context)throw new Error("useAudio must be used inside AudioProvider");
  return context;
}
