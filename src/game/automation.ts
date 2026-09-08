import { characters } from "../data/characters";
import type { GameState } from "../types/game";

export function autoProcurementUnlocked(state:GameState) {
  const required=Math.min(3,characters.length);
  const trusted=characters.filter(character=>(state.characterProgress[character.id]?.relationshipStage||0)>=6).length;
  return state.staff.length>=required&&trusted>=required;
}
