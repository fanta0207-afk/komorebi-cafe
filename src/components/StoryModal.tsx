"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import type { CharacterProgress, RelationshipEvent, RelationshipRoute } from "../types/game";
import { Portrait } from "./GameUI";

export function StoryModal({event,progress,readOnly=false,onComplete,onClose}:{
  event:RelationshipEvent; progress:CharacterProgress; readOnly?:boolean;
  onComplete?:(choiceId?:string,route?:Exclude<RelationshipRoute,"undecided">)=>void;
  onClose?:()=>void;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [page,setPage]=useState(0);
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
  const next=()=>{
    if (!finalPage) setPage(value=>value+1);
    else if (readOnly) onClose?.();
    else onComplete?.(choiceId,route==="undecided"?undefined:route);
  };

  return <dialog ref={dialog} className="story-modal" aria-labelledby="story-title" onCancel={e=>{if(readOnly)onClose?.();else e.preventDefault();}}>
    <div className="story-header"><span>{readOnly?"思い出を読み返す":"ふたりの物語"} · 好感度 {event.toStage}/10</span>{readOnly&&<button aria-label="思い出を閉じる" onClick={onClose}>×</button>}</div>
    <h2 id="story-title">{choosingRoute?"これからのふたり":title}</h2>
    <div className="story-person"><Portrait character={character} small/><div><strong>{character.name}</strong><span>{character.routeTheme}</span></div></div>
    {choosingRoute?<div className="story-content">
      <p>一緒に過ごすうちに、大切な存在になった。この先、どんな関係で歩んでいきたい？</p>
      <div className="story-choices"><button onClick={()=>setRoute("romance")}>♡ 恋愛として進める</button><button onClick={()=>setRoute("friendship")}>大切な仕事仲間として進める</button></div>
      <p className="story-note">どちらを選んでも、仕入れやメニューは同じように解放されます。</p>
    </div>:<>
      <div className={`story-content speaker-${line.speaker}`} aria-live="polite">
        <span className="story-speaker">{line.speaker==="character"?character.name:line.speaker==="player"?"あなた":"物語"}</span>
        <p>{line.speaker==="character"?`「${line.text}」`:line.text}</p>
        {choosingResponse&&<div className="story-choices" aria-label="返事を選ぶ">{event.choices!.map(item=><button key={item.id} onClick={()=>{setChoiceId(item.id);setPage(baseLines.length);}}>{item.label}</button>)}</div>}
        {finalPage&&!choosingResponse&&event.reward&&<div className="story-reward"><strong>{readOnly?"この思い出で解放したもの":"✦ 新しい楽しみ"}</strong><p>{event.reward.note}</p></div>}
      </div>
      {!choosingResponse&&<div className="story-footer"><span>{page+1} / {lines.length}</span><button className="primary-button" onClick={next}>{finalPage?(readOnly?"思い出を閉じる":"この時間を心に刻む"):"次へ →"}</button></div>}
    </>}
  </dialog>;
}
