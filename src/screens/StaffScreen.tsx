"use client";

import { characters, getCharacter } from "../data/characters";
import { Portrait, ScreenTitle } from "../components/GameUI";
import { useGame } from "../game/GameContext";
import { GAME_CONFIG } from "../game/config";
import { specialties, staffBusy } from "../game/operations";
import { autoProcurementUnlocked } from "../game/automation";
import type { StaffRole } from "../types/game";

const roles:{id:StaffRole;label:string}[]=[{id:"cook",label:"調理"},{id:"server",label:"提供"},{id:"rest",label:"お休み"}];
export function StaffCard({characterId}:{characterId:string}) {
  const {state,dispatch}=useGame();const character=getCharacter(characterId)!;
  const progress=state.characterProgress[characterId],person=state.staff.find(item=>item.characterId===characterId);
  const eligible=progress.relationshipStage>=3,busy=staffBusy(state,characterId),skilled=progress.relationshipStage>=6;
  const specialty=specialties[characterId]||{label:"お店の仕事",tags:[]};
  const status=person?busy?"お仕事中":person.role==="rest"?"お休み中":"待機中":eligible?"雇用できます":"好感度3で雇用できます";
  const stateName=person?busy?"busy":person.role==="rest"?"rest":"ready":eligible?"available":"locked";
  return <article className={`staff-card staff-${stateName}`} data-staff-state={stateName}>
    <div className="staff-heading"><Portrait character={character} small face unknown={!progress.met}/><div className="staff-identity">
      <div className="staff-meta"><span className="staff-level">♡ {progress.relationshipStage}/10</span><span className="staff-status">{status}</span></div>
      <h3>{progress.met?character.name:"まだ出会っていません"}</h3>
      <p className="staff-specialty"><span>得意</span><strong>{specialty.label}</strong><small>{skilled?"調理・提供20%短縮":"好感度6で速度UP"}</small></p>
    </div></div>
    {person?<div className="staff-assignment"><div className="staff-roles" aria-label={`${character.name}の担当`}>{roles.map(role=><button key={role.id} aria-pressed={person.role===role.id} className={person.role===role.id?"active":""} onClick={()=>dispatch({type:"ASSIGN_STAFF",characterId,role:role.id})}>{role.label}</button>)}</div>{busy&&<small className="staff-pending-note">変更は仕事後に反映</small>}</div>:<div className="staff-hire"><div className="staff-cost"><span>初回雇用</span><strong>● {GAME_CONFIG.hirePrice.toLocaleString()}</strong></div><div className="staff-roles">{roles.filter(role=>role.id!=="rest").map(role=><button key={role.id} disabled={!eligible||state.currency<GAME_CONFIG.hirePrice} onClick={()=>dispatch({type:"HIRE_STAFF",characterId,role:role.id})}>{role.label}をお願いする</button>)}</div></div>}
  </article>;
}
export function StaffScreen() {
  const {state,dispatch}=useGame();
  const unlocked=autoProcurementUnlocked(state);
  const cooks=state.staff.filter(person=>person.role==="cook").length;
  const servers=state.staff.filter(person=>person.role==="server").length;
  const trusted=characters.filter(character=>(state.characterProgress[character.id]?.relationshipStage||0)>=6).length;
  return <section className="screen staff-screen fade-in"><ScreenTitle title="一緒に働く人"><small className="staff-count">雇用 <b>{state.staff.length}</b>/{characters.length}人</small></ScreenTitle>
    <section className={`auto-procurement ${unlocked?"unlocked":"locked"}`} data-auto-procurement={state.autoProcurementEnabled?"enabled":unlocked?"disabled":"locked"}>
      <div className="auto-procurement-head"><div><span>全自動営業</span><h2>仕入れの自動化</h2></div><b>{state.autoProcurementEnabled?"稼働中":unlocked?"停止中":"未解放"}</b></div>
      <p>在庫が2食以下になると、必要な食材を1パックずつ自動発注します。</p>
      <div className="automation-checks"><span className={cooks?"met":""}>調理 {cooks?"✓":"○"}</span><span className={servers?"met":""}>提供 {servers?"✓":"○"}</span><span className={unlocked?"met":""}>仕入れ {unlocked?"✓":"○"}</span></div>
      {!unlocked?<small>スタッフ3人を雇用し、3人と好感度6になると解放（現在 雇用{state.staff.length}人・好感度6が{trusted}人）</small>:<button type="button" aria-pressed={state.autoProcurementEnabled} onClick={()=>dispatch({type:"TOGGLE_AUTO_PROCUREMENT",enabled:!state.autoProcurementEnabled})}>{state.autoProcurementEnabled?"自動仕入れを停止":"自動仕入れを開始"}</button>}
    </section>
    <div className="staff-list">{characters.map(character=><StaffCard key={character.id} characterId={character.id}/>)}</div></section>;
}
