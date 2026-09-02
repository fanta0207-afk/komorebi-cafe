"use client";

import { useState } from "react";
import { characters, getCharacter } from "../data/characters";
import { getGift } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { giftReaction } from "../game/logic";
import { relationshipNames } from "../game/config";
import type { GiftReaction } from "../types/game";
import { EmptyState, Hearts, Portrait, ScreenTitle } from "../components/GameUI";

export function PeopleScreen({onOpen}:{onOpen:(id:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="TOWN PEOPLE" title="出会った人々"/><p className="intro-copy">仕入れ先へ通うと、街の人のことが少しずつ分かってきます。</p>
    <div className="people-list">{characters.map(character=>{const p=state.characterProgress[character.id];return <button key={character.id} className={`person-row ${!p.met?"locked":""}`} disabled={!p.met} onClick={()=>onOpen(character.id)}><Portrait character={character} small unknown={!p.met}/><div><span>{p.met?character.occupation:"まだ出会っていません"}</span><strong>{p.met?character.name:"？？？"}</strong>{p.met&&<Hearts stage={p.relationshipStage}/>}</div><em>{p.met?relationshipNames[p.relationshipStage]:"街で会えるかも"}</em><b>›</b></button>})}</div>
  </section>;
}

const reactionCopy:Record<GiftReaction,string>={love:"これ、すごく好きなんだ。ありがとう。",like:"ありがとう。嬉しいよ。",normal:"ありがとう。大事にするよ。",dislike:"ありがとう……気持ちは嬉しいよ。"};

export function CharacterDetail({characterId,onBack}:{characterId:string;onBack:()=>void}) {
  const {state,dispatch}=useGame(); const character=getCharacter(characterId)!; const p=state.characterProgress[characterId];
  const [choosing,setChoosing]=useState(false); const [reaction,setReaction]=useState<string>();
  const inventory=Object.entries(state.inventory).filter(([,count])=>count>0);
  const give=(giftId:string)=>{const gift=getGift(giftId)!;const result=giftReaction(character,gift);dispatch({type:"GIVE_GIFT",characterId,giftId,reaction:result});setReaction(`「${reactionCopy[result]}」`);setChoosing(false);};
  return <section className="screen fade-in"><button className="back-button" onClick={onBack}>← 人物一覧へ</button>
    <div className="profile-card"><Portrait character={character}/><span className="tiny-label">PROFILE</span><h1>{character.name}</h1><p className="occupation">{character.age}歳 ・ {character.occupation}</p><Hearts stage={p.relationshipStage}/><strong>{relationshipNames[p.relationshipStage]}</strong><p className="profile-copy">{character.profile}</p><div className="hint-box"><b>好きなもののヒント</b><p>仕事にまつわるものや、{character.favoriteGiftTags.includes("nature")?"自然を感じるもの":"丁寧に作られたもの"}が好きそう。</p></div>
      {reaction&&<div className="gift-reaction"><b>{character.name}</b><p>{reaction}</p></div>}
      <button className="primary-button" disabled={state.dailyGiftStatus[characterId]} onClick={()=>setChoosing(true)}>{state.dailyGiftStatus[characterId]?"今日は贈物を渡しました":"プレゼントを渡す"}</button>
    </div>
    {choosing&&<div className="modal-backdrop" onClick={()=>setChoosing(false)}><div className="modal-card gift-picker" onClick={event=>event.stopPropagation()}><span className="tiny-label">YOUR BAG</span><h2>どれを渡しますか？</h2>{inventory.length===0?<EmptyState icon="♧" title="贈物を持っていません" text="贈物のお店で買ってきましょう。"/>:<div className="inventory-list">{inventory.map(([id,count])=>{const gift=getGift(id);return gift&&<button key={id} onClick={()=>give(id)}><span>{gift.icon}</span><div><strong>{gift.name}</strong><small>所持 {count}</small></div><b>渡す</b></button>})}</div>}<button className="secondary-button" onClick={()=>setChoosing(false)}>閉じる</button></div></div>}
  </section>;
}
