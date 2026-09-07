"use client";

import { useState, type ReactNode } from "react";
import type { Character, GameState } from "../types/game";
import { relationshipLabel } from "../game/config";

export function StatusBar({state,onDev,missionControl}:{state:GameState;onDev:()=>void;missionControl?:ReactNode}) {
  return <header className="topbar">
    <div className={`date-lockup ${missionControl?"with-mission":""}`}><span className="eyebrow">KOMOREBI CAFE</span>{missionControl}</div>
    <div className="status-actions"><div className="action-pill" title="お手伝い中のスタッフ"><span>♧</span><b>{state.staff.filter(person=>person.role!=="rest").length}</b><small>人</small></div><button className="dev-trigger" onClick={onDev} aria-label="開発メニュー">⚙</button><div className="coin-pill"><span>●</span> {state.currency.toLocaleString()}</div></div>
  </header>;
}

export const navItems = [
  {id:"cafe",icon:"▣",label:"店"},{id:"town",icon:"⌂",label:"街"},{id:"gifts",icon:"♧",label:"贈物"},{id:"people",icon:"♡",label:"人物"},{id:"staff",icon:"♧",label:"スタッフ"},
] as const;

export function BottomNav({active,onChange}:{active:string;onChange:(id:string)=>void}) {
  return <nav className="bottom-nav" aria-label="メインメニュー">{navItems.map(item=><button type="button" className={active===item.id?"active":""} key={item.id} onClick={()=>onChange(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>;
}

export function Portrait({character,small=false,face=false,unknown=false}:{character:Character;small?:boolean;face?:boolean;unknown?:boolean}) {
  const [failed,setFailed]=useState(false);
  return <div className={`portrait ${small?"portrait-small":""} ${face?"portrait-face":""} ${unknown?"unknown":""}`} data-character={character.id}>
    {!unknown&&!failed&&character.image
      ?<img src={character.image} alt="" onError={()=>setFailed(true)}/>
      :<span>{unknown?"?":character.silhouette}</span>}
  </div>;
}

export function Hearts({stage,route="undecided"}:{stage:number;route?:string}) {
  return <span className="hearts" aria-label={`好感度${stage}/10・${relationshipLabel(stage,route)}`}>{Array.from({length:10},(_,i)=><i key={i}>{i<stage?"♥":"♡"}</i>)}</span>;
}

export function ScreenTitle({title,children}:{title:string;children?:React.ReactNode}) {
  return <div className="screen-title"><div><h1>{title}</h1></div>{children}</div>;
}

export function EmptyState({icon,title,text}:{icon:string;title:string;text:string}) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}
