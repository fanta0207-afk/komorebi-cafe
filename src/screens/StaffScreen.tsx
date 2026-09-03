"use client";

import { characters, getCharacter } from "../data/characters";
import { Portrait, ScreenTitle } from "../components/GameUI";
import { useGame } from "../game/GameContext";
import { GAME_CONFIG } from "../game/config";
import { specialties, staffBusy } from "../game/operations";
import type { StaffRole } from "../types/game";

const roles:{id:StaffRole;label:string}[]=[{id:"cook",label:"調理"},{id:"server",label:"提供"},{id:"rest",label:"お休み"}];
export function StaffCard({characterId}:{characterId:string}) {
  const {state,dispatch}=useGame();const character=getCharacter(characterId)!;
  const progress=state.characterProgress[characterId],person=state.staff.find(item=>item.characterId===characterId);
  const eligible=progress.relationshipStage>=3,busy=staffBusy(state,characterId),skilled=progress.relationshipStage>=6;
  return <article className={`staff-card ${!eligible?"staff-locked":""}`}>
    <div className="staff-heading"><Portrait character={character} small unknown={!progress.met}/><div><small>好感度 {progress.relationshipStage}/10</small><h3>{progress.met?character.name:"まだ出会っていません"}</h3><span>{person?busy?"お仕事中":person.role==="rest"?"お休み中":"お手伝いを待っています":eligible?"お手伝いをお願いできます":"好感度3で雇用できます"}</span></div></div>
    <p>{skilled?"✦ 得意な仕事が上達しました":"好感度6で能力アップ"}<br/>{specialties[characterId].label}の調理時間20%短縮・提供時間2秒 → 1.6秒</p>
    {person?<><div className="staff-roles" aria-label={`${character.name}の担当`}>{roles.map(role=><button key={role.id} aria-pressed={person.role===role.id} className={person.role===role.id?"active":""} onClick={()=>dispatch({type:"ASSIGN_STAFF",characterId,role:role.id})}>{role.label}</button>)}</div>{busy&&<small>担当を変更しても、今のお仕事を終えてから移ります。</small>}</>:<><span className="staff-cost">お礼 ● {GAME_CONFIG.hirePrice.toLocaleString()}（初回のみ）</span><div className="staff-roles">{roles.filter(role=>role.id!=="rest").map(role=><button key={role.id} disabled={!eligible||state.currency<GAME_CONFIG.hirePrice} onClick={()=>dispatch({type:"HIRE_STAFF",characterId,role:role.id})}>{role.label}をお願いする</button>)}</div></>}
  </article>;
}
export function StaffScreen() {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="CAFE PARTNERS" title="一緒に働く人"/><p className="intro-copy">仕入れ先のみんなが、本業の合間にお手伝い。調理と提供をそれぞれ任せられます。仕入れはあなたが担当します。</p><div className="staff-guide"><b>調理担当 + 提供担当で、自動営業へ</b><p>調理は店長・スタッフを合わせて店全体で1品ずつ。調理担当は前の料理の完成を待ち、対応する設備で基本30秒かけて作ります。提供担当は完成品を運びます。食材がなくなったら街へ仕入れに行きましょう。</p><small>雇用 {state.staff.length}/6人 · 継続のお給料なし · 友人ルートでも働けます</small></div><div className="staff-list">{characters.map(character=><StaffCard key={character.id} characterId={character.id}/>)}</div></section>;
}
