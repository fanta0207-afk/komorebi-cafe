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
    <div className="staff-heading"><Portrait character={character} small face unknown={!progress.met}/><div><small>好感度 {progress.relationshipStage}/10</small><h3>{progress.met?character.name:"まだ出会っていません"}</h3><span>{person?busy?"お仕事中":person.role==="rest"?"お休み中":"お手伝いを待っています":eligible?"お手伝いをお願いできます":"好感度3で雇用できます"}</span></div></div>
    <p>得意：{specialties[characterId].label} · {skilled?"調理・提供20%短縮":"好感度6で速度20%アップ"}</p>
    {person?<><div className="staff-roles" aria-label={`${character.name}の担当`}>{roles.map(role=><button key={role.id} aria-pressed={person.role===role.id} className={person.role===role.id?"active":""} onClick={()=>dispatch({type:"ASSIGN_STAFF",characterId,role:role.id})}>{role.label}</button>)}</div>{busy&&<small>変更は仕事後に反映</small>}</>:<><span className="staff-cost">● {GAME_CONFIG.hirePrice.toLocaleString()}（初回）</span><div className="staff-roles">{roles.filter(role=>role.id!=="rest").map(role=><button key={role.id} disabled={!eligible||state.currency<GAME_CONFIG.hirePrice} onClick={()=>dispatch({type:"HIRE_STAFF",characterId,role:role.id})}>{role.label}をお願いする</button>)}</div></>}
  </article>;
}
export function StaffScreen() {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="一緒に働く人"><small>雇用 {state.staff.length}/{characters.length}人</small></ScreenTitle><div className="staff-list">{characters.map(character=><StaffCard key={character.id} characterId={character.id}/>)}</div></section>;
}
