"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameContext";
import { currentMission, missions, type MissionDestination } from "../game/missions";

const destinations:Record<MissionDestination,string>={orders:"注文ノートへ",inventory:"在庫を開く",town:"街へ",coffee:"蓮のお店へ",ranch:"牧のお店へ",patisserie:"アールのお店へ",gifts:"贈物のお店へ",ren:"蓮の人物ページへ",recipes:"料理一覧へ",equipment:"設備を見る"};

export function MissionGuide({onGo}:{onGo:(destination:MissionDestination)=>void}) {
  const {state,dispatch}=useGame();
  const [open,setOpen]=useState(false);
  const mission=currentMission(state);
  const done=!!mission&&state.missions.completed.includes(mission.id);
  return <>
    <aside className={`mission-guide ${done?"mission-ready":""}`} aria-label="次のミッション">
      <div className="mission-guide-heading"><button onClick={()=>setOpen(true)}>開店ミッション <span>{state.missions.claimed.length}/{missions.length} ›</span></button><span>報酬は各1回</span></div>
      {mission?<><div className="mission-current"><span className="mission-number">{state.missions.claimed.length+1}</span><strong>{mission.title}</strong><b>+{mission.reward} <small>コイン</small></b></div>
        <div className="mission-actions"><button className="mission-detail" onClick={()=>setOpen(true)}>手順・進捗を見る</button>{done?<button className="mission-claim" onClick={()=>dispatch({type:"CLAIM_MISSION",missionId:mission.id})}>達成！ 報酬を受け取る</button>:<button className="mission-go" onClick={()=>onGo(mission.destination)}>{destinations[mission.destination]} →</button>}</div>
      </>:<p className="mission-finished">最初の共同開発と設備投資を達成！ <button onClick={()=>setOpen(true)}>記録を見る</button></p>}
    </aside>
    {open&&<MissionNotebook onClose={()=>setOpen(false)} onGo={destination=>{setOpen(false);onGo(destination);}}/>}
  </>;
}

function MissionNotebook({onClose,onGo}:{onClose:()=>void;onGo:(destination:MissionDestination)=>void}) {
  const {state,dispatch}=useGame();
  const ref=useRef<HTMLDialogElement>(null);
  const currentRef=useRef<HTMLElement>(null);
  const current=currentMission(state);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();currentRef.current?.scrollIntoView({block:"nearest"});return ()=>dialog?.close();},[]);
  return <dialog ref={ref} className="mission-notebook" onClose={onClose} aria-labelledby="mission-title">
    <header><div><h2 id="mission-title">開店ミッション</h2><p>最初の一皿から、蓮との共同開発へ</p></div><button onClick={onClose} aria-label="ミッションを閉じる">×</button></header>
    <p className="mission-intro">達成したらコインを受け取り、次の一歩へ。先に済ませた行動も記録されます。好きな寄り道をしても大丈夫。報酬と進捗はこの端末に保存されます。</p>
    <progress max={missions.length} value={state.missions.claimed.length} aria-label="開店ミッションの受取済み件数"/>
    <ol>{missions.map((mission,index)=>{
      const claimed=state.missions.claimed.includes(mission.id),done=state.missions.completed.includes(mission.id),active=current?.id===mission.id;
      const value=done?mission.target:Math.max(0,Math.min(mission.target,mission.value(state)));
      return <li key={mission.id} className={`${active?"mission-active":""} ${claimed?"mission-claimed":""}`}>
        <article ref={active?currentRef:undefined} aria-current={active?"step":undefined}>
          <span className="mission-chapter">{mission.chapter}</span><h3>{index+1}. {mission.title}</h3>
          <p>{mission.hint}</p><div className="mission-status"><span>{claimed?"✓ 受取済み":done?active?"✓ 達成！":"✓ 達成済み（前の報酬受取後に受取可）":`${value} / ${mission.target}`}</span><b>+{mission.reward} コイン</b></div>
          {!done&&mission.target>1&&<progress max={mission.target} value={value} aria-label={mission.title}/>}
          {active&&<div className="mission-actions">{done?<button className="mission-claim" onClick={()=>dispatch({type:"CLAIM_MISSION",missionId:mission.id})}>報酬を受け取る +{mission.reward}</button>:<button className="mission-go" onClick={()=>onGo(mission.destination)}>{destinations[mission.destination]} →</button>}</div>}
        </article>
      </li>;
    })}</ol>
  </dialog>;
}
