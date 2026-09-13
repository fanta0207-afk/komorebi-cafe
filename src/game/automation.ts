import type { GameState, StaffRole } from "../types/game";
import { GAME_CONFIG } from "./config";

export function staffHireStage(characterId:string) {
  return characterId==="ren"?GAME_CONFIG.renHireStage:GAME_CONFIG.staffHireStage;
}

export function staffHirePrice(characterId:string) {
  return characterId==="ren"?GAME_CONFIG.renHirePrice:GAME_CONFIG.hirePrice;
}

export function staffRoleAvailable(state:GameState,role:StaffRole,excludeCharacterId?:string) {
  const staff=state.staff.filter(person=>person.characterId!==excludeCharacterId);
  if(role==="procurement")return staff.filter(person=>person.role==="procurement").length<GAME_CONFIG.maxProcurementStaff;
  if(role==="cook"||role==="server")return staff.filter(person=>person.role==="cook"||person.role==="server").length<GAME_CONFIG.maxFloorStaff;
  return true;
}

export function autoProcurementUnlocked(state:GameState) {
  return state.staff.some(person=>person.role==="procurement"&&(state.characterProgress[person.characterId]?.relationshipStage||0)>=GAME_CONFIG.autoProcurementStage);
}
