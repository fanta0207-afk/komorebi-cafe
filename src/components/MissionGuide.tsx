"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../game/GameContext";
import { sortedMissions, missionRank, type MissionDestination } from "../game/missions";

const destinations:Record<MissionDestination,string>={orders:"注文ノートへ",inventory:"在庫を開く",town:"街へ",coffee:"蓮のお店へ",ranch:"牧のお店へ",patisserie:"アールのお店へ",gifts:"贈物のお店へ",ren:"蓮の人物ページへ",recipes:"料理一覧へ",equipment:"設備を見る",people:"人物一覧へ",staff:"スタッフへ"};

export function MissionGuide({onGo}:{onGo:(destination:MissionDestination)=>void}) {
  const {state}=useGame();
  const [open,setOpen]=useState(false);
  const done=sortedMissions(state).some(m=>missionRank(state,m)===0);
  return <>
    <button type="button" className="mission-launcher" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={done?"ミッションを開く・受け取れる報酬があります":"ミッションを開く"}>
      <span aria-hidden="true">☑</span> ミッション
      {done&&<span className="mission-badge" aria-hidden="true">!</span>}
    </button>
    {open&&createPortal(<MissionNotebook onClose={()=>setOpen(false)} onGo={destination=>{setOpen(false);onGo(destination);}}/>,document.body)}
  </>;
}

function MissionNotebook({onClose,onGo}:{onClose:()=>void;onGo:(destination:MissionDestination)=>void}) {
  const {state,dispatch}=useGame();
  const ref=useRef<HTMLDialogElement>(null);
  const list=sortedMissions(state);
  const ready=list.filter(m=>missionRank(state,m)===0).length;
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return ()=>dialog?.close();},[]);
  return <dialog ref={ref} tabIndex={-1} className="mission-notebook" onClose={onClose} aria-labelledby="mission-title">
    <header><div><h2 id="mission-title">ミッション</h2></div><button onClick={onClose} aria-label="ミッションを閉じる">×</button></header>
    <div className="mission-scroll">
    <p className="mission-total" aria-live="polite">受取可能 {ready}件 · 受取済み {state.missions.claimed.length}件</p>
    <ol>{list.map((mission,index)=>{
      const claimed=state.missions.claimed.includes(mission.id),done=state.missions.completed.includes(mission.id);
      const value=done?mission.target:Math.max(0,Math.min(mission.target,mission.value(state)));
      const rank=missionRank(state,mission);
      return <li key={mission.id} data-mission-id={mission.id} data-mission-status={rank} className={`${done&&!claimed?"mission-active":""} ${claimed?"mission-claimed":""}`}>
        <article>
          {(index===0||missionRank(state,list[index-1])!==rank)&&<b className="mission-group">{["受け取れるミッション","挑戦中","受取済み"][rank]}</b>}
          <h3>{mission.title}</h3>
          {!done&&mission.target>1&&<progress max={mission.target} value={value} aria-label={mission.title}/>}
          <div className="mission-footer">
          <div className="mission-status"><span>{claimed?"✓ 受取済み":done?"✓ 達成":`${value} / ${mission.target}`}</span><b>+{mission.reward} コイン</b></div>
          {!claimed&&<div className="mission-actions">{done?<button className="mission-claim" onClick={()=>{ref.current?.focus({preventScroll:true});dispatch({type:"CLAIM_MISSION",missionId:mission.id});}}>報酬を受け取る</button>:<button className="mission-go" onClick={()=>onGo(mission.destination)}>{destinations[mission.destination]} →</button>}</div>}
          </div>
        </article>
      </li>;
    })}</ol>
    </div>
  </dialog>;
}
