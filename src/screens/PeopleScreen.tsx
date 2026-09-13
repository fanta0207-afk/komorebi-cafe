"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { characters, getCharacter } from "../data/characters";
import { relationshipEvents, staffStoryEvents } from "../data/events";
import { compareGiftIds, getGift, gifts } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { giftReaction, relationshipRequirements } from "../game/logic";
import { relationshipLabel } from "../game/config";
import type { GiftReaction, RelationshipEvent } from "../types/game";
import { EmptyState, Hearts, Portrait, ScreenTitle } from "../components/GameUI";

const reactionGroups:{id:GiftReaction;label:string;mark:string}[]=[
  {id:"love",label:"大好物",mark:"♥"},{id:"like",label:"好き",mark:"♡"},
  {id:"normal",label:"ふつう",mark:"○"},{id:"dislike",label:"苦手",mark:"△"},
];

export function PeopleScreen({onOpen}:{onOpen:(id:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="出会った人々"/>
    <div className="people-list">{characters.map(character=>{
      const p=state.characterProgress[character.id];
      return <button key={character.id} className={`person-row ${!p.met?"locked":""}`} disabled={!p.met} onClick={()=>onOpen(character.id)}>
        <Portrait character={character} small face unknown={!p.met}/>
        <div><span>{p.met?relationshipLabel(p.relationshipStage,p.route):"未遭遇"}</span><strong>{p.met?character.name:"？？？"}</strong>{p.met&&<Hearts stage={p.relationshipStage} route={p.route}/>}</div>
        <em>{p.met?relationshipLabel(p.relationshipStage,p.route):"街で会う"}</em><b>›</b>
      </button>;
    })}</div>
  </section>;
}

export function CharacterDetail({characterId,onBack,onReplay}:{characterId:string;onBack:()=>void;onReplay:(event:RelationshipEvent)=>void}) {
  const {state,dispatch}=useGame();
  const character=getCharacter(characterId)!; const p=state.characterProgress[characterId];
  const stories=relationshipEvents.filter(event=>event.characterId===characterId);
  const staffStories=staffStoryEvents.filter(event=>event.characterId===characterId);
  const nextStory=stories.find(event=>event.toStage===p.relationshipStage+1);
  const [choosing,setChoosing]=useState(false); const [reaction,setReaction]=useState<string>();
  const inventory=Object.entries(state.inventory).filter(([,count])=>count>0).sort(([left],[right])=>compareGiftIds(left,right));
  const give=(giftId:string)=>{
    const gift=getGift(giftId)!; const result=giftReaction(character,gift);
    dispatch({type:"GIVE_GIFT",characterId,giftId,reaction:result});
    setReaction(`「${character.giftResponses[result]}」`);setChoosing(false);
  };
  return <section className="screen fade-in"><button className="back-button" onClick={onBack}>← 人物一覧へ</button>
    <div className="profile-card"><div className="person-summary"><Portrait character={character} face/><div><h1>{character.name}</h1><Hearts stage={p.relationshipStage} route={p.route}/><strong>好感度 {p.relationshipStage}/10</strong><span>{relationshipLabel(p.relationshipStage,p.route)}</span></div></div>
      {reaction&&<div className="gift-reaction"><b>{character.name}</b><p>{reaction}</p></div>}
      <button className="primary-button" onClick={()=>setChoosing(true)}>ギフトを渡す</button>
      <div className="relationship-card">
        <h2>ふたりの物語 <span>{p.relationshipStage}/10</span></h2>
        {nextStory?<div className="next-story"><strong>好感度{nextStory.toStage}「{nextStory.title}」</strong>
          <progress max={Math.max(1,nextStory.requiredAffection)} value={Math.min(p.affection,nextStory.requiredAffection)} aria-label="次の物語までの交流ポイント"/>
          <p>{p.affection>=nextStory.requiredAffection?"交流ポイント達成":`あと${nextStory.requiredAffection-p.affection}交流ポイント`}</p>
          {relationshipRequirements(nextStory,state).map(item=><p key={item.label}>{item.met?"✓":"○"} {item.label}：{item.current}/{item.target}</p>)}
        </div>:<p className="story-complete">全話達成</p>}
        <ol className="memory-list">{stories.map(story=>{
          const viewed=p.viewedEvents.includes(story.id);
          const title=p.route==="friendship"&&story.toStage>=9?story.friendshipTitle:story.title;
          return <li key={story.id}><button disabled={!viewed} onClick={()=>onReplay(story)} aria-label={`好感度${story.toStage} ${title}${viewed?"を読み返す":" 未解放"}`}>
            <span className="memory-level">{story.toStage}</span><span>{title}</span><small>{viewed?"読み返す ›":"未解放"}</small>
          </button></li>;
        })}</ol>
        {staffStories.length>0&&<>
          <h2>カフェを手伝う物語</h2>
          <ol className="memory-list">{staffStories.map(story=>{
            const viewed=p.viewedEvents.includes(story.id);
            const title=p.route==="friendship"?story.friendshipTitle||story.title:story.title;
            return <li key={story.id}><button disabled={!viewed} onClick={()=>onReplay(story)} aria-label={`${title}${viewed?"を読み返す":" 未解放"}`}>
              <span className="memory-level">＋</span><span>{title}</span><small>{viewed?"読み返す ›":`好感度${story.requiredRelationshipStage}・雇用後`}</small>
            </button></li>;
          })}</ol>
        </>}
      </div>
      <section className="gift-tastes" aria-labelledby="gift-tastes-title"><header><h2 id="gift-tastes-title">ギフトの好み</h2><span>{Object.keys(p.giftReactions).length}/{gifts.length}</span></header>
        <div className="gift-taste-grid">{reactionGroups.map(group=>{const discovered=gifts.filter(gift=>p.giftReactions[gift.id]===group.id);return <article className={`gift-taste taste-${group.id}`} key={group.id}><h3><span>{group.mark}</span>{group.label}</h3>{discovered.length?<ul>{discovered.map(gift=><li key={gift.id}><span>{gift.icon}</span>{gift.name}</li>)}</ul>:<p>未発見</p>}</article>})}</div>
      </section>
    </div>
    {choosing&&createPortal(<div className="modal-backdrop gift-backdrop" onClick={()=>setChoosing(false)}><div className="modal-card gift-picker" role="dialog" aria-modal="true" aria-label="ギフトを選ぶ" onClick={event=>event.stopPropagation()}><h2>ギフトを選ぶ</h2>{inventory.length===0?<EmptyState icon="♧" title="ギフトがありません" text="雑貨店で購入できます。"/>:<div className="inventory-list">{inventory.map(([id,count])=>{const gift=getGift(id);if(!gift)return null;return <button className={`gift-rarity-${gift.rarity}`} key={id} onClick={()=>give(id)}><span>{gift.icon}</span><div><strong>{gift.name}</strong><small>所持 {count}</small></div><b>渡す</b></button>})}</div>}<button className="secondary-button" onClick={()=>setChoosing(false)}>閉じる</button></div></div>,document.body)}
  </section>;
}
