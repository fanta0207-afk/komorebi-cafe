"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import { getGift, giftReactionLabels } from "../data/gifts";
import type { GiftReactionPopup } from "../types/game";
import "./story-modal.css";

export function GiftReactionModal({reaction,onClose}:{reaction:GiftReactionPopup;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [artFailed,setArtFailed]=useState(false);
  const character=getCharacter(reaction.characterId)!;
  const gift=getGift(reaction.giftId)!;
  const standingArt=character.storyImage||character.image;
  useEffect(()=>{
    const element=dialog.current;
    element?.showModal();
    return()=>element?.close();
  },[]);

  return <dialog ref={dialog} className="story-modal story-player gift-reaction-popup" aria-labelledby="gift-reaction-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <button type="button" className="story-close-button" aria-label="プレゼントのリアクションを閉じる" onClick={onClose}>×</button>
    <header className="story-player-heading">
      <div className="story-header"><span>{gift.icon} {gift.name}をプレゼント</span></div>
      <h2 id="gift-reaction-title">{giftReactionLabels[reaction.reaction]}</h2>
    </header>
    <div className="story-stage is-speaking" data-character={character.id}>
      {standingArt&&!artFailed
        ?<img className="story-standing-art" src={standingArt} alt={`${character.name}の立ち絵`} onError={()=>setArtFailed(true)}/>
        :<div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>}
    </div>
    <div className="story-dialogue-panel">
      <div className="story-content speaker-character"><span className="story-speaker">{character.name}</span><p>「{reaction.response}」</p></div>
      <div className="story-footer"><button type="button" className="primary-button" onClick={onClose}>閉じる</button></div>
    </div>
  </dialog>;
}
