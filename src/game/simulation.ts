import { getRecipe } from "../data/recipes";
import { GAME_CONFIG } from "./config";
import { pickIncomingOrder } from "./logic";
import { normalizeCookingTimes, serveDuration, serveOrder, startCooking } from "./operations";
import type { GameState } from "../types/game";
import { tableCapacity, tableSlots } from "./seating";

// Only foreground elapsed time is supplied. Long gaps (sleep / suspended tabs) are ignored.
export function advanceGame(state:GameState,deltaMs:number):GameState {
  if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000)return state;
  let next=normalizeCookingTimes(state),remaining=deltaMs;
  while(remaining>0) {
    const step=Math.min(100,remaining);remaining-=step;
    next=assignWork(next);
    next={...next,activeMs:next.activeMs+step,spawnRemainingMs:next.spawnRemainingMs-step,
      orders:next.orders.map(order=>order.status!=="cooking"?order:{...order,remainingMs:Math.max(0,order.remainingMs-step),status:order.remainingMs<=step?"ready":"cooking"}),
      staff:next.staff.map(person=>person.servingOrderId||person.returningFromSlot!==undefined?{...person,remainingMs:Math.max(0,person.remainingMs-step)}:person)};
    for(const person of next.staff)if(person.servingOrderId&&person.remainingMs<=0)next=serveOrder(next,person.servingOrderId);
    next={...next,staff:next.staff.map(person=>person.returningFromSlot!==undefined&&person.remainingMs<=0?{...person,returningFromSlot:undefined,remainingMs:0}:person)};
    next=assignWork(next);
    if(next.spawnRemainingMs<=0) {
      const reserved=Object.keys(next.forest.sales).find(id=>next.forest.sales[id]>0);
      const useForest=!!reserved&&next.forest.serveForestNext;
      const incoming=useForest?{recipeId:reserved!,forestReserved:true}:pickIncomingOrder(next);
      const customerSlot=tableSlots(next).find(slot=>!next.orders.some(order=>order.customerSlot===slot));
      if(incoming&&customerSlot!==undefined&&next.orders.length<tableCapacity(next))next={...next,forest:{...next.forest,serveForestNext:!useForest,sales:useForest?{...next.forest.sales,[reserved!]:next.forest.sales[reserved!]-1}:next.forest.sales},nextOrderNumber:next.nextOrderNumber+1,orders:[...next.orders,{id:`order-${next.nextOrderNumber}`,customerSlot,...incoming,status:"queued",remainingMs:0,totalMs:0}]};
      next={...next,spawnRemainingMs:GAME_CONFIG.orderSpawnMinMs+Math.random()*(GAME_CONFIG.orderSpawnMaxMs-GAME_CONFIG.orderSpawnMinMs)};
    }
  }
  return next;
}

function assignWork(state:GameState):GameState {
  let next=state;
  for(const person of next.staff) {
    if(person.role==="cook"&&!person.servingOrderId&&person.returningFromSlot===undefined&&!next.orders.some(order=>order.status==="cooking"&&order.cookId===person.characterId)) {
      for(const order of next.orders.filter(order=>order.status==="queued")) {
        const started=startCooking(next,order.id,person.characterId);
        if(started!==next){next=started;break;}
      }
    }
    if(person.role==="server"&&!person.servingOrderId&&person.returningFromSlot===undefined&&!next.orders.some(order=>order.status==="cooking"&&order.cookId===person.characterId)) {
      const ready=next.orders.find(order=>order.status==="ready"&&getRecipe(order.recipeId)&&!next.staff.some(other=>other.servingOrderId===order.id));
      if(ready)next={...next,staff:next.staff.map(other=>other.characterId===person.characterId?{...other,servingOrderId:ready.id,returningFromSlot:undefined,remainingMs:serveDuration(next,person.characterId)}:other)};
    }
  }
  return next;
}
