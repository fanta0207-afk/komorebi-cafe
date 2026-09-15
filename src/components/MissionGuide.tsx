"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../game/GameContext";
import { activeMissionChapter, activeSideMissions, missionChapters, sortedMissions, missionRank, type MissionDestination } from "../game/missions";

const destinations:Record<MissionDestination,string>={orders:"注文ノートへ",inventory:"在庫を開く",town:"街へ",forest:"森の入口へ",coffee:"蓮のお店へ",bakery:"太陽のお店へ",ranch:"牧のお店へ",patisserie:"アールのお店へ",chocolaterie:"カカオのお店へ",gifts:"ギフトのお店へ",ren:"蓮の人物ページへ",recipes:"料理一覧へ",equipment:"設備を見る",people:"人物一覧へ",staff:"スタッフへ"};

export function MissionGuide({onGo}:{onGo:(destination:MissionDestination)=>void}) {
  const {state}=useGame();
  const [open,setOpen]=useState(false);
  const done=sortedMissions(state).some(m=>missionRank(state,m)===0)||activeSideMissions(state).some(m=>m.value(state)>=m.target);
  return <>
    <button type="button" className={`mission-launcher${done?" mission-ready":""}`} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={done?"ミッションを開く・受け取れる報酬があります":"ミッションを開く"}>
      <span className="mission-launcher-label"><span aria-hidden="true">☑</span> ミッション</span>
      {done&&<>
        <span className="mission-ready-shine" aria-hidden="true"/>
        <span className="mission-ready-sparkles" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></span>
        <span className="mission-badge" aria-hidden="true">!</span>
      </>}
    </button>
    {open&&createPortal(<MissionNotebook onClose={()=>setOpen(false)} onGo={destination=>{setOpen(false);onGo(destination);}}/>,document.body)}
  </>;
}

function MissionNotebook({onClose,onGo}:{onClose:()=>void;onGo:(destination:MissionDestination)=>void}) {
  const {state,dispatch}=useGame();
  const ref=useRef<HTMLDialogElement>(null);
  const celebrationButtonRef=useRef<HTMLButtonElement>(null);
  const [celebration,setCelebration]=useState<{step:number;isFinal:boolean}|null>(null);
  const list=sortedMissions(state);
  const chapter=activeMissionChapter(state);
  const chapterIndex=chapter?missionChapters.findIndex(item=>item.id===chapter.id):-1;
  const ready=list.filter(m=>missionRank(state,m)===0).length;
  const side=activeSideMissions(state);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return ()=>dialog?.close();},[]);
  useEffect(()=>{if(celebration)celebrationButtonRef.current?.focus();},[celebration]);
  const claim=(missionId:string)=>{
    const finishesChapter=!!chapter&&chapter.missions.every(mission=>mission.id===missionId||state.missions.claimed.includes(mission.id));
    if(finishesChapter)setCelebration({step:chapterIndex+1,isFinal:chapterIndex===missionChapters.length-1});
    dispatch({type:"CLAIM_MISSION",missionId});
  };
  return <dialog ref={ref} tabIndex={-1} className="mission-notebook" onClose={onClose} aria-labelledby="mission-title">
    {celebration?<div className="mission-celebration" role="status" aria-live="polite">
      <div className="mission-sparkles" aria-hidden="true">
        <span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span><span>✧</span>
      </div>
      <div className="mission-seal" aria-hidden="true"><span>✓</span></div>
      <p className="mission-celebration-step">STEP {celebration.step} COMPLETE</p>
      <h2 id="mission-title">ミッション達成！</h2>
      <p>{celebration.isFinal?"すべての目標を達成しました。":"次のミッションへ進めます。"}</p>
      <button ref={celebrationButtonRef} type="button" onClick={()=>setCelebration(null)}>閉じる</button>
    </div>:<>
    <header><div><h2 id="mission-title">ミッション</h2>{chapter&&<span>ステップ {chapterIndex+1} / {missionChapters.length}</span>}</div><button onClick={onClose} aria-label="ミッションを閉じる">×</button></header>
    <div className="mission-scroll">
    {chapter?<><p className="mission-total" aria-live="polite">この3つを達成すると次へ進みます · 受取可能 {ready}件</p>
    <ol>{list.map(mission=>{
      const claimed=state.missions.claimed.includes(mission.id),done=state.missions.completed.includes(mission.id);
      const value=done?mission.target:Math.max(0,Math.min(mission.target,mission.value(state)));
      const rank=missionRank(state,mission);
      return <li key={mission.id} data-mission-id={mission.id} data-mission-status={rank} className={`${done&&!claimed?"mission-active":""} ${claimed?"mission-claimed":""}`}>
        <article>
          <h3>{mission.title}</h3>
          {!done&&mission.hint&&<p className="mission-hint"><strong>達成条件</strong><span>{mission.hint}</span></p>}
          {!done&&mission.target>1&&<progress max={mission.target} value={value} aria-label={mission.title}/>}
          <div className="mission-footer">
          <div className="mission-status"><span>{claimed?"✓ 受取済み":done?"✓ 達成":`${value} / ${mission.target}`}</span><b>+{mission.reward} コイン</b></div>
          {!claimed&&<div className="mission-actions">{done?<button className="mission-claim" onClick={()=>claim(mission.id)}>報酬を受け取る</button>:<button className="mission-go" onClick={()=>onGo(mission.destination)}>{destinations[mission.destination]} →</button>}</div>}
          </div>
        </article>
      </li>;
    })}</ol></>:<div className="mission-complete"><span>✓</span><h3>すべてのミッション達成</h3><p>全員との物語と、全自動のカフェが完成しました。</p></div>}
    {side.length>0&&<section className="side-missions" aria-labelledby="side-mission-title"><header><div><small>ストーリー進行には影響しません</small><h3 id="side-mission-title">サブミッション</h3></div></header><ul>{side.map(mission=>{const value=Math.min(mission.target,mission.value(state)),done=value>=mission.target;return <li key={mission.id} className={done?"side-mission-ready":""}><div><b>{mission.title}</b><span>{value.toLocaleString()} / {mission.target.toLocaleString()}</span></div><progress max={mission.target} value={value}/><footer><strong>+{mission.reward} コイン</strong>{done&&<button className="mission-claim" onClick={()=>dispatch({type:"CLAIM_SIDE_MISSION",missionId:mission.id})}>受け取る</button>}</footer></li>})}</ul></section>}
    </div>
    </>}
  </dialog>;
}
