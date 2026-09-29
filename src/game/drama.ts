import { dramaEvents } from "../data/dramaEvents";
import type { DramaEvent, GameState } from "../types/game";

const progress=(state:GameState,id:string)=>state.characterProgress[id];
const stageAtLeast=(state:GameState,id:string,stage:number)=>(progress(state,id)?.relationshipStage||0)>=stage;
const romance=(state:GameState,id:string)=>progress(state,id)?.route==="romance";
const hired=(state:GameState,id:string)=>state.staff.some(person=>person.characterId===id);

export function dramaRequirementsMet(event:DramaEvent,state:GameState) {
  switch(event.id) {
    case "drama-private-name":
      return ["aki","itsuki"].every(id=>stageAtLeast(state,id,7)&&hired(state,id));
    case "drama-spare-key":
      return ["ren","cacao"].every(id=>stageAtLeast(state,id,8))&&["ren","cacao"].some(id=>romance(state,id));
    case "drama-collapse":
      return state.lifetimeStats.totalOrders>=100&&["sota","haru"].every(id=>stageAtLeast(state,id,8));
    case "drama-engagement-rumor":
      return ["nagisa","sae"].every(id=>stageAtLeast(state,id,8))
        &&["nagisa","sae"].some(id=>romance(state,id))
        &&state.viewedGrowthEvents.filter(id=>id.endsWith("-growth5")).length>=2;
    case "drama-birthday":
      return Object.values(state.characterProgress).filter(item=>item.relationshipStage>=7).length>=4;
    case "drama-dont-go":
      return ["ren","cacao"].every(id=>romance(state,id))
        &&dramaEvents.filter(item=>item.id!==event.id).every(item=>state.viewedDramaEvents.includes(item.id));
    default:return false;
  }
}

export function availableDramaEvent(state:GameState) {
  if(state.pendingGiftReaction)return;
  return dramaEvents.find(event=>!state.viewedDramaEvents.includes(event.id)&&dramaRequirementsMet(event,state));
}
