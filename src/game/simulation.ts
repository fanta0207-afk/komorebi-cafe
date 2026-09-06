import { getRecipe } from "../data/recipes";
import { GAME_CONFIG } from "./config";
import { pickIncomingOrder } from "./logic";
import { serveDuration, serveOrder, startCooking } from "./operations";
import type { GameState } from "../types/game";
import { activeCookingOrder } from "./kitchen";
import { tableCapacity, tableSlots } from "./seating";

// Only foreground elapsed time is supplied. Long gaps (sleep / suspended tabs) are ignored.
export function advanceGame(state:GameState,deltaMs:number):GameState {
  if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000)return state;
  let next=state,remaining=deltaMs;
  while(remaining>0) {
    const step=Math.min(100,remaining);remaining-=step;
    next=assignWork(next);
    const cookingId=activeCookingOrder(next)?.id;
    next={...next,activeMs:next.activeMs+step,spawnRemainingMs:next.spawnRemainingMs-step,
      orders:next.orders.map(order=>order.id!==cookingId?order:{...order,remainingMs:Math.max(0,order.remainingMs-step),status:order.remainingMs<=step?"ready":"cooking"}),
      staff:next.staff.map(person=>person.servingOrderId?{...person,remainingMs:Math.max(0,person.remainingMs-step)}:person)};
    for(const person of next.staff)if(person.servingOrderId&&person.remainingMs<=0)next=serveOrder(next,person.servingOrderId);
    next=assignWork(next);
    if(next.spawnRemainingMs<=0) {
      const incoming=pickIncomingOrder(next);
      const customerSlot=tableSlots(next).find(slot=>!next.orders.some(order=>order.customerSlot===slot));
      if(incoming&&customerSlot!==undefined&&next.orders.length<tableCapacity(next))next={...next,nextOrderNumber:next.nextOrderNumber+1,orders:[...next.orders,{id:`order-${next.nextOrderNumber}`,customerSlot,...incoming,status:"queued",remainingMs:0,totalMs:0}]};
      next={...next,spawnRemainingMs:GAME_CONFIG.orderSpawnMinMs+Math.random()*(GAME_CONFIG.orderSpawnMaxMs-GAME_CONFIG.orderSpawnMinMs)};
    }
  }
  return next;
}

function assignWork(state:GameState):GameState {
  let next=state;
  for(const person of next.staff) {
    if(person.role==="cook"&&!person.servingOrderId&&!next.orders.some(order=>order.status==="cooking"&&order.cookId===person.characterId)) {
      for(const order of next.orders.filter(order=>order.status==="queued")) {
        const started=startCooking(next,order.id,person.characterId);
        if(started!==next){next=started;break;}
      }
    }
    if(person.role==="server"&&!person.servingOrderId&&!next.orders.some(order=>order.status==="cooking"&&order.cookId===person.characterId)) {
      const ready=next.orders.find(order=>order.status==="ready"&&getRecipe(order.recipeId)&&!next.staff.some(other=>other.servingOrderId===order.id));
      if(ready)next={...next,staff:next.staff.map(other=>other.characterId===person.characterId?{...other,servingOrderId:ready.id,remainingMs:serveDuration(next,person.characterId)}:other)};
    }
  }
  return next;
}
