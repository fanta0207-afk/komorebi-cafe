"use client";

import { characters, getCharacter } from "../data/characters";
import { Portrait, ScreenTitle } from "../components/GameUI";
import { useGame } from "../game/GameContext";
import { GAME_CONFIG } from "../game/config";
import { specialties, staffBusy } from "../game/operations";
import { autoProcurementUnlocked, staffHirePrice, staffHireStage, staffRoleAvailable } from "../game/automation";
import type { StaffRole } from "../types/game";

const roles:{id:StaffRole;label:string}[]=[{id:"cook",label:"調理"},{id:"server",label:"提供"},{id:"procurement",label:"仕入れ"},{id:"rest",label:"お休み"}];
export function StaffCard({characterId}:{characterId:string}) {
  const {state,dispatch}=useGame();const character=getCharacter(characterId)!;
  const progress=state.characterProgress[characterId],person=state.staff.find(item=>item.characterId===characterId);
  const requiredStage=staffHireStage(characterId),hirePrice=staffHirePrice(characterId),eligible=progress.relationshipStage>=requiredStage,busy=staffBusy(state,characterId),skilled=progress.relationshipStage>=GAME_CONFIG.staffSpecialtyStage;
  const full=state.staff.length>=GAME_CONFIG.maxStaff;
  const specialty=specialties[characterId]||{label:"お店の仕事",tags:[]};
  const status=person?busy?"お仕事中":person.role==="rest"?"お休み中":"待機中":full?`雇用上限${GAME_CONFIG.maxStaff}人`:eligible?"雇用できます":`好感度${requiredStage}で雇用できます`;
  const stateName=person?busy?"busy":person.role==="rest"?"rest":"ready":eligible?"available":"locked";
  return <article className={`staff-card staff-${stateName}`} data-staff-state={stateName}>
    <div className="staff-heading"><Portrait character={character} small face unknown={!progress.met}/><div className="staff-identity">
      <div className="staff-meta"><span className="staff-level">♡ {progress.relationshipStage}/10</span><span className="staff-status">{status}</span></div>
      <h3>{progress.met?character.name:"まだ出会っていません"}</h3>
      <p className="staff-specialty"><span>得意</span><strong>{specialty.label}</strong><small>{skilled?"調理・提供20%短縮":"好感度8で速度UP"}</small></p>
    </div></div>
    {person?<div className="staff-assignment"><div className="staff-roles" aria-label={`${character.name}の担当`}>{roles.map(role=><button key={role.id} aria-pressed={person.role===role.id} className={person.role===role.id?"active":""} disabled={person.role!==role.id&&!staffRoleAvailable(state,role.id,characterId)} onClick={()=>dispatch({type:"ASSIGN_STAFF",characterId,role:role.id})}>{role.label}</button>)}</div>{busy&&<small className="staff-pending-note">変更は仕事後に反映</small>}</div>:<div className="staff-hire"><div className="staff-cost"><span>初回雇用</span><strong>● {hirePrice.toLocaleString()}</strong></div><div className="staff-roles">{roles.filter(role=>role.id!=="rest").map(role=><button key={role.id} disabled={full||!eligible||state.currency<hirePrice||!staffRoleAvailable(state,role.id)} onClick={()=>dispatch({type:"HIRE_STAFF",characterId,role:role.id})}>{role.label}をお願いする</button>)}</div></div>}
  </article>;
}
export function StaffScreen() {
  const {state}=useGame();
  const unlocked=autoProcurementUnlocked(state);
  const cooks=state.staff.filter(person=>person.role==="cook").length;
  const servers=state.staff.filter(person=>person.role==="server").length;
  const procurers=state.staff.filter(person=>person.role==="procurement").length;
  const automaticProcurers=state.staff.filter(person=>person.role==="procurement"&&(state.characterProgress[person.characterId]?.relationshipStage||0)>=GAME_CONFIG.autoProcurementStage).length;
  const floorStaff=cooks+servers;
  return <section className="screen staff-screen fade-in"><ScreenTitle title="一緒に働く人"><small className="staff-count">店内 <b>{floorStaff}</b>/{GAME_CONFIG.maxFloorStaff}人・仕入れ <b>{procurers}</b>/{GAME_CONFIG.maxProcurementStaff}人</small></ScreenTitle>
    <section className={`auto-procurement ${procurers?"unlocked":"locked"}`} data-auto-procurement={unlocked?"enabled":procurers?"manual":"locked"}>
      <div className="auto-procurement-head"><div><span>注文連動</span><h2>スタッフ仕入れ</h2></div><b>{unlocked?"自動対応中":procurers?"依頼できます":"担当未配置"}</b></div>
      <p>店長とは別に、仕入れ担当1人につき1件ずつ同時に任せられます。</p>
      <div className="automation-checks"><span className={cooks?"met":""}>調理 {cooks?"✓":"○"}</span><span className={servers?"met":""}>提供 {servers?"✓":"○"}</span><span className={procurers?"met":""}>仕入れ {procurers?"✓":"○"}</span></div>
      <small>{unlocked?`好感度9以上：最大${automaticProcurers}人が不足食材を自動で仕入れます`:procurers?`現在${procurers}人に依頼可能・好感度9で自動化`:"雇用したスタッフを「仕入れ」に配置してください"}</small>
    </section>
    <div className="staff-list">{characters.map(character=><StaffCard key={character.id} characterId={character.id}/>)}</div></section>;
}
