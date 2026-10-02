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
        &&["drama-private-name","drama-spare-key","drama-collapse","drama-engagement-rumor","drama-birthday"].every(id=>state.viewedDramaEvents.includes(id));
    case "drama-shared-umbrella":
      return ["aki","sae"].every(id=>stageAtLeast(state,id,7));
    case "drama-usual-order":
      return ["ren","itsuki"].every(id=>stageAtLeast(state,id,8));
    case "drama-borrowed-jacket":
      return ["haru","nagisa"].every(id=>stageAtLeast(state,id,8))&&["haru","nagisa"].some(id=>romance(state,id));
    case "drama-two-reservations":
      return ["sota","cacao"].every(id=>stageAtLeast(state,id,8))&&["sota","cacao"].some(id=>romance(state,id));
    case "drama-practice-confession":
      return ["aki","itsuki"].every(id=>stageAtLeast(state,id,9))&&["aki","itsuki"].some(id=>romance(state,id))&&state.viewedDramaEvents.includes("drama-private-name");
    default:return false;
  }
}

export function availableDramaEvent(state:GameState) {
  if(state.pendingGiftReaction)return;
  return dramaEvents.find(event=>!state.viewedDramaEvents.includes(event.id)&&dramaRequirementsMet(event,state));
}

export function dramaUnlockHint(event:DramaEvent) {
  switch(event.id) {
    case "drama-private-name":return "葵・アールとも好感度7以上＋二人を雇用";
    case "drama-spare-key":return "蓮・カカオとも好感度8以上＋どちらかが恋愛ルート";
    case "drama-collapse":return "牧・太陽とも好感度8以上＋累計注文100件以上";
    case "drama-engagement-rumor":return "静・冴とも好感度8以上＋どちらかが恋愛ルート＋店づくり物語を2人分最終話まで読了";
    case "drama-birthday":return "好感度7以上の人物が4人以上";
    case "drama-dont-go":return "蓮・カカオとも恋愛ルート＋「呼び方を間違えた午後」「鍵の音がした夜」「灯りが消えなかった夜」「祝福にはまだ早い」「八つの贈り物」を読了（スキップ可）";
    case "drama-shared-umbrella":return "葵・冴とも好感度7以上";
    case "drama-usual-order":return "蓮・アールとも好感度8以上";
    case "drama-borrowed-jacket":return "太陽・静とも好感度8以上＋どちらかが恋愛ルート";
    case "drama-two-reservations":return "牧・カカオとも好感度8以上＋どちらかが恋愛ルート";
    case "drama-practice-confession":return "葵・アールとも好感度9以上＋どちらかが恋愛ルート＋「呼び方を間違えた午後」を読了（スキップ可）";
    default:return "物語を進めると解放";
  }
}
