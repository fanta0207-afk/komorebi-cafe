"use client";

import { useState } from "react";
import type { Character, GameState } from "../types/game";
import { relationshipNames } from "../game/config";

export function StatusBar({state,onDev}:{state:GameState;onDev:()=>void}) {
  return <header className="topbar">
    <div className="date-lockup"><span className="eyebrow">SPRING</span><strong>{state.season} {state.day}日</strong></div>
    <div className="status-actions"><button className="dev-trigger" onClick={onDev} aria-label="開発メニュー">⚙</button><div className="coin-pill"><span>●</span> {state.currency.toLocaleString()}</div></div>
  </header>;
}

export const navItems = [
  {id:"cafe",icon:"▣",label:"店"},{id:"town",icon:"⌂",label:"街"},{id:"gifts",icon:"♧",label:"贈物"},{id:"people",icon:"♡",label:"人物"},{id:"menu",icon:"☰",label:"メニュー"},
] as const;

export function BottomNav({active,onChange}:{active:string;onChange:(id:string)=>void}) {
  return <nav className="bottom-nav" aria-label="メインメニュー">{navItems.map(item=><button type="button" className={active===item.id?"active":""} key={item.id} onClick={()=>onChange(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>;
}

export function Portrait({character,small=false,unknown=false}:{character:Character;small?:boolean;unknown?:boolean}) {
  const [failed,setFailed]=useState(false);
  return <div className={`portrait ${small?"portrait-small":""} ${unknown?"unknown":""}`}>
    {!unknown&&!failed&&<img src={character.image} alt="" onError={()=>setFailed(true)}/>}<span>{unknown?"?":character.silhouette}</span>
  </div>;
}

export function Hearts({stage}:{stage:number}) {
  const filled=Math.min(5,Math.ceil(stage/2));
  return <span className="hearts" aria-label={`${relationshipNames[stage]}の関係`}>{Array.from({length:5},(_,i)=><i key={i}>{i<filled?"♥":"♡"}</i>)}</span>;
}

export function ScreenTitle({kicker,title,children}:{kicker:string;title:string;children?:React.ReactNode}) {
  return <div className="screen-title"><div><span className="tiny-label">{kicker}</span><h1>{title}</h1></div>{children}</div>;
}

export function EmptyState({icon,title,text}:{icon:string;title:string;text:string}) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}
