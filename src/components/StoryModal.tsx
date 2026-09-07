"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import type { CharacterProgress, RelationshipEvent, RelationshipRoute } from "../types/game";
import "./story-modal.css";

export function StoryModal({event,progress,readOnly=false,onComplete,onClose}:{
  event:RelationshipEvent; progress:CharacterProgress; readOnly?:boolean;
  onComplete?:(choiceId?:string,route?:Exclude<RelationshipRoute,"undecided">)=>void;
  onClose?:()=>void;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [page,setPage]=useState(0);
  const [artFailed,setArtFailed]=useState(false);
  const dialoguePanel=useRef<HTMLDivElement>(null);
  const [route,setRoute]=useState<RelationshipRoute>(progress.route);
  const [choiceId,setChoiceId]=useState<string|undefined>(readOnly?progress.eventChoices[event.id]:undefined);
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  const character=getCharacter(event.characterId)!;
  const choosingRoute=event.toStage===9 && route==="undecided";
  const friendship=route==="friendship" && event.toStage>=9;
  const title=friendship?event.friendshipTitle || event.title:event.title;
  const baseLines=friendship?event.friendshipDialogue || event.dialogue:event.dialogue;
  const choice=event.choices?.find(item=>item.id===choiceId);
  const lines=[...baseLines,...(choice?.response || [])];
  const line=lines[Math.min(page,lines.length-1)];
  const finalPage=page>=lines.length-1;
  const choosingResponse=!!event.choices && !choice && page>=baseLines.length-1;
  useEffect(()=>{dialoguePanel.current?.scrollTo({top:0});},[page,route,choiceId]);
  const next=()=>{
    if (!finalPage) setPage(value=>value+1);
    else if (readOnly) onClose?.();
    else onComplete?.(choiceId,route==="undecided"?undefined:route);
  };

  return <dialog ref={dialog} className="story-modal story-player" aria-labelledby="story-title" onCancel={e=>{if(readOnly)onClose?.();else e.preventDefault();}}>
    {readOnly&&<button className="story-close-button" aria-label="思い出を閉じる" onClick={onClose}>×</button>}
    <header className="story-player-heading">
      <div className="story-header"><span>{readOnly?"思い出を読み返す":"ふたりの物語"} · 好感度 {event.toStage}/10</span></div>
      <h2 id="story-title">{choosingRoute?"これからのふたり":title}</h2>
    </header>
    <div className={`story-stage ${!choosingRoute&&line.speaker==="character"?"is-speaking":""}`} data-character={character.id}>
      {character.image&&!artFailed
        ?<img className="story-standing-art" src={character.image} alt={`${character.name}の立ち絵`} onError={()=>setArtFailed(true)}/>
        :<div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>}
    </div>
    <div className="story-dialogue-panel" ref={dialoguePanel}>
    {choosingRoute?<div className="story-content">
      <p>一緒に過ごすうちに、大切な存在になった。この先、どんな関係で歩んでいきたい？</p>
      <div className="story-choices"><button onClick={()=>setRoute("romance")}>♡ 恋愛として進める</button><button onClick={()=>setRoute("friendship")}>大切な仕事仲間として進める</button></div>
      <p className="story-note">どちらを選んでも、仕入れやメニューは同じように解放されます。</p>
    </div>:<>
      <div key={`${page}-${route}`} className={`story-content speaker-${line.speaker}`} aria-live="polite">
        <span className="story-speaker">{line.speaker==="character"?character.name:line.speaker==="player"?"あなた":"物語"}</span>
        <p>{line.speaker==="character"?`「${line.text}」`:line.text}</p>
        {choosingResponse&&<div className="story-choices" aria-label="返事を選ぶ">{event.choices!.map(item=><button key={item.id} onClick={()=>{setChoiceId(item.id);setPage(baseLines.length);}}>{item.label}</button>)}</div>}
        {finalPage&&!choosingResponse&&event.reward&&<div className="story-reward"><strong>解放</strong><p>{event.reward.note}</p></div>}
      </div>
      {!choosingResponse&&<div className="story-footer"><span>{page+1} / {lines.length}</span><button className="primary-button" onClick={next}>{finalPage?(readOnly?"閉じる":"完了"):"次へ →"}</button></div>}
    </>}
    </div>
  </dialog>;
}
