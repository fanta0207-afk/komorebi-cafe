"use client";

import { useState } from "react";
import { characters, getCharacter } from "../data/characters";
import { relationshipEvents } from "../data/events";
import { getGift } from "../data/gifts";
import { useGame } from "../game/GameContext";
import { giftReaction, relationshipRequirements, growthRequirements, nextGrowthEvent } from "../game/logic";
import { relationshipLabel, relationshipNames } from "../game/config";
import type { RelationshipEvent } from "../types/game";
import { StaffCard } from "./StaffScreen";
import { EmptyState, Hearts, Portrait, ScreenTitle } from "../components/GameUI";

export function PeopleScreen({onOpen}:{onOpen:(id:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="出会った人々"/>
    <div className="people-list">{characters.map(character=>{
      const p=state.characterProgress[character.id];
      return <button key={character.id} className={`person-row ${!p.met?"locked":""}`} disabled={!p.met} onClick={()=>onOpen(character.id)}>
        <Portrait character={character} small unknown={!p.met}/>
        <div><span>{p.met?`${character.age}歳 · ${character.occupation}`:"まだ出会っていません"}</span><strong>{p.met?character.name:"？？？"}</strong>{p.met&&<Hearts stage={p.relationshipStage} route={p.route}/>}</div>
        <em>{p.met?`${p.relationshipStage}/10 · ${relationshipLabel(p.relationshipStage,p.route)}`:"街で会えるかも"}</em><b>›</b>
      </button>;
    })}</div>
  </section>;
}

export function CharacterDetail({characterId,onBack,onReplay}:{characterId:string;onBack:()=>void;onReplay:(event:RelationshipEvent)=>void}) {
  const {state,dispatch}=useGame();
  const character=getCharacter(characterId)!; const p=state.characterProgress[characterId];
  const nextGrowth=nextGrowthEvent(characterId,state);
  const routeProgress=state.viewedGrowthEvents.filter(id=>id.startsWith(`${characterId}-growth`)).length;
  const requirements=nextGrowth?growthRequirements(nextGrowth,state):[];
  const stories=relationshipEvents.filter(event=>event.characterId===characterId);
  const nextStory=stories.find(event=>event.toStage===p.relationshipStage+1);
  const [choosing,setChoosing]=useState(false); const [reaction,setReaction]=useState<string>();
  const inventory=Object.entries(state.inventory).filter(([,count])=>count>0);
  const give=(giftId:string)=>{
    const gift=getGift(giftId)!; const result=giftReaction(character,gift);
    dispatch({type:"GIVE_GIFT",characterId,giftId,reaction:result});
    setReaction(`「${character.giftResponses[result]}」`);setChoosing(false);
  };
  return <section className="screen fade-in"><button className="back-button" onClick={onBack}>← 人物一覧へ</button>
    <div className="profile-card"><Portrait character={character}/><span className="tiny-label">PROFILE</span><h1>{character.name}</h1><p className="name-reading">{character.nameReading}</p>
      <p className="occupation">{character.age}歳 · {character.occupation}</p><Hearts stage={p.relationshipStage} route={p.route}/><strong>好感度 {p.relationshipStage}/10 · {relationshipLabel(p.relationshipStage,p.route)}</strong>
      <p className="route-theme">{character.routeTheme}</p><p className="profile-copy">{character.profile}</p>
      <div className="profile-notes">
        {p.relationshipStage>=5&&<details><summary>話してくれた過去</summary><p>{character.backstory}</p></details>}
        {p.relationshipStage>=7&&<details><summary>分かち合った悩み</summary><p>{character.concern}</p></details>}
        {p.relationshipStage>=9&&<details><summary>{p.route==="romance"?"あなたに惹かれた理由":"あなたを信頼する理由"}</summary><p>{character.attraction}</p></details>}
      </div>
      <div className="hint-box"><b>好きなもののヒント</b><p>仕事にまつわるものや、{character.favoriteGiftTags.includes("nature")?"自然を感じるもの":"丁寧に作られたもの"}が好きそう。</p></div>
      {reaction&&<div className="gift-reaction"><b>{character.name}</b><p>{reaction}</p></div>}
      <button className="primary-button" onClick={()=>setChoosing(true)}>プレゼントを渡す</button>
      <StaffCard characterId={characterId}/>
      <div className="relationship-card">
        <h2>ふたりの物語 <span>{p.relationshipStage}/10</span></h2>
        {nextStory?<div className="next-story"><strong>次は好感度{nextStory.toStage}「{nextStory.title}」</strong>
          <progress max={Math.max(1,nextStory.requiredAffection)} value={Math.min(p.affection,nextStory.requiredAffection)} aria-label="次の物語までの交流ポイント"/>
          <p>{p.affection>=nextStory.requiredAffection?"交流ポイント達成":`あと${nextStory.requiredAffection-p.affection}交流ポイント`}</p>
          {relationshipRequirements(nextStory,state).map(item=><p key={item.label}>{item.met?"✓":"○"} {item.label}：{item.current}/{item.target}</p>)}
        </div>:<p className="story-complete">10の思い出を重ねました。これからも、{p.route==="friendship"?"大切な仕事仲間":"恋人"}として。</p>}
        <ol className="memory-list">{stories.map(story=>{
          const viewed=p.viewedEvents.includes(story.id);
          const title=p.route==="friendship"&&story.toStage>=9?story.friendshipTitle:story.title;
          return <li key={story.id}><button disabled={!viewed} onClick={()=>onReplay(story)} aria-label={`好感度${story.toStage} ${title}${viewed?"を読み返す":" 未解放"}`}>
            <span className="memory-level">{story.toStage}</span><span>{title}</span><small>{viewed?"読み返す ›":"未解放"}</small>
          </button></li>;
        })}</ol>
      </div>
      <div className="growth-route-card"><div className="growth-route-head"><div><span className="tiny-label">CAFE PARTNERS</span><h2>共同成長 {routeProgress}/5</h2></div><div className="route-pips">{[1,2,3,4,5].map(stage=><i key={stage} className={stage<=routeProgress?"done":""}/>)}</div></div>
        {nextGrowth?<><span className="next-story-label">次の共同開発</span><h3>「{nextGrowth.title}」</h3><p className="story-hint">{nextGrowth.hint}</p><div className="growth-requirements">{requirements.map((item,index)=><div key={`${item.label}-${index}`} className={item.met?"met":""}><b>{item.met?"✓":"○"}</b><span>{item.label.startsWith("関係：")?`関係：${relationshipNames[item.target]}`:item.label}</span>{item.target>1&&<em>{Math.min(item.current,item.target)} / {item.target}</em>}</div>)}</div></>:<div className="route-complete"><span>✦</span><b>共同成長ルート達成</b><p>一緒に開発した料理が、店の定番になりました。</p></div>}
      </div>
    </div>
    {choosing&&<div className="modal-backdrop" onClick={()=>setChoosing(false)}><div className="modal-card gift-picker" role="dialog" aria-modal="true" aria-label="贈物を選ぶ" onClick={event=>event.stopPropagation()}><span className="tiny-label">YOUR BAG</span><h2>どれを渡しますか？</h2>{inventory.length===0?<EmptyState icon="♧" title="贈物を持っていません" text="贈物のお店で買ってきましょう。"/>:<div className="inventory-list">{inventory.map(([id,count])=>{const gift=getGift(id);return gift&&<button key={id} onClick={()=>give(id)}><span>{gift.icon}</span><div><strong>{gift.name}</strong><small>所持 {count}</small></div><b>渡す</b></button>})}</div>}<button className="secondary-button" onClick={()=>setChoosing(false)}>閉じる</button></div></div>}
  </section>;
}
