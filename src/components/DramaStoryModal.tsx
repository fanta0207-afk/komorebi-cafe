"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import type { DramaEvent } from "../types/game";
import { GameModal } from "./GameModal";
import "./story-modal.css";

export function DramaStoryModal({event,onComplete,readOnly=false}:{event:DramaEvent;onComplete:()=>void;readOnly?:boolean}) {
  const [page,setPage]=useState(0);
  const dialoguePanel=useRef<HTMLDivElement>(null);
  const line=event.dialogue[page];
  const finalPage=page===event.dialogue.length-1;
  const speaker=line.speaker==="narrator"?"物語":line.speaker==="player"?"あなた":getCharacter(line.speaker)?.name||"物語";
  const activeCharacterId=line.speaker!=="narrator"&&line.speaker!=="player"?line.speaker:undefined;
  const participants=event.participantIds.map(getCharacter).filter(Boolean);
  useEffect(()=>{dialoguePanel.current?.scrollTo({top:0});},[page]);
  const next=()=>{if(finalPage)onComplete();else setPage(value=>value+1);};

  return <GameModal className="story-modal story-player drama-story-player" labelledBy="drama-story-title" onCancel={readOnly?onComplete:undefined} layerClassName="story-modal-layer">
    {readOnly&&<button type="button" className="story-close-button" aria-label="思い出を閉じる" onClick={onComplete}>×</button>}
    <header className="story-player-heading">
      <div className="story-header"><span>{readOnly?"思い出帳から読み返す":"カフェで起きた特別な出来事"}</span></div>
      <h2 id="drama-story-title">{event.title}</h2>
      <p>{event.subtitle}</p>
    </header>
    <div className={`story-stage drama-story-stage drama-count-${participants.length} ${activeCharacterId?"has-active-speaker":"no-active-speaker"}`}>
      <div className="drama-cast" aria-label={`登場人物：${participants.map(character=>character!.name).join("、")}`}>
        {participants.map((character,index)=><div key={character!.id} data-character={character!.id} className={`drama-cast-member ${participants.length===2?(index===0?"is-left":"is-right"):""} ${activeCharacterId===character!.id?"is-active":""}`}>
          <img className="drama-standing-art" src={character!.storyImage||character!.image} alt={`${character!.name}の立ち絵`}/>
        </div>)}
      </div>
    </div>
    <div className="story-dialogue-panel" ref={dialoguePanel}>
      <div key={page} className={`story-content speaker-${line.speaker==="player"?"player":line.speaker==="narrator"?"narrator":"character"}`} aria-live="polite">
        <span className="story-speaker">{speaker}</span>
        <p>{activeCharacterId?`「${line.text}」`:line.text}</p>
      </div>
      <div className="story-footer"><button type="button" className="story-back-button" disabled={page===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>← 戻る</button><span>{page+1} / {event.dialogue.length}</span><button className="primary-button" onClick={next}>{finalPage?(readOnly?"思い出帳へ戻る":"物語を終える"):"次へ →"}</button></div>
    </div>
  </GameModal>;
}
