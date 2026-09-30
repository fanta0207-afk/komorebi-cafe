"use client";

import { GameModal } from "./GameModal";
import { getCharacter } from "../data/characters";
import { getGift, giftReactionLabels } from "../data/gifts";
import type { GiftReactionPopup } from "../types/game";
import "./story-modal.css";
import { StoryStandingArt } from "./StoryStandingArt";

export function GiftReactionModal({reaction,onClose}:{reaction:GiftReactionPopup;onClose:()=>void}) {
  const character=getCharacter(reaction.characterId)!;
  const gift=getGift(reaction.giftId)!;
  return <GameModal className="story-modal story-player gift-reaction-popup" labelledBy="gift-reaction-title" onCancel={onClose} layerClassName="story-modal-layer">
    <button type="button" className="story-close-button" aria-label="プレゼントのリアクションを閉じる" onClick={onClose}>×</button>
    <header className="story-player-heading">
      <div className="story-header"><span>{gift.icon} {gift.name}をプレゼント</span></div>
      <h2 id="gift-reaction-title">{giftReactionLabels[reaction.reaction]}</h2>
    </header>
    <div className="story-stage is-speaking" data-character={character.id}>
      <StoryStandingArt character={character} expression={reaction.expression}/>
    </div>
    <div className="story-dialogue-panel">
      <div className="story-content speaker-character"><span className="story-speaker">{character.name}</span><p>「{reaction.response}」</p></div>
      <div className="story-footer"><button type="button" className="primary-button" onClick={onClose}>閉じる</button></div>
    </div>
  </GameModal>;
}
