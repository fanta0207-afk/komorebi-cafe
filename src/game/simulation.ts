import { getRecipe } from "../data/recipes";
import { conditionForDay } from "../data/dailyConditions";
import { GAME_CONFIG } from "./config";
import { pickWeightedRecipe } from "./logic";
import { serveDuration, serveOrder, startCooking } from "./operations";
import type { GameState } from "../types/game";

// Only foreground elapsed time is supplied. Long gaps (sleep / suspended tabs) are ignored.
export function advanceGame(state:GameState,deltaMs:number):GameState {
  if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000)return state;
  let next=state,remaining=deltaMs;
  while(remaining>0) {
    const step=Math.min(100,remaining);remaining-=step;
    next=assignWork(next);
    next={...next,activeMs:next.activeMs+step,spawnRemainingMs:next.spawnRemainingMs-step,
      orders:next.orders.map(order=>order.status!=="cooking"?order:{...order,remainingMs:Math.max(0,order.remainingMs-step),status:order.remainingMs<=step?"ready":"cooking"}),
      staff:next.staff.map(person=>person.servingOrderId?{...person,remainingMs:Math.max(0,person.remainingMs-step)}:person)};
    for(const person of next.staff)if(person.servingOrderId&&person.remainingMs<=0)next=serveOrder(next,person.servingOrderId);
    next=assignWork(next);
    if(next.spawnRemainingMs<=0) {
      const recipeId=pickWeightedRecipe(next);
      const customerSlot=[0,1,2,3].find(slot=>!next.orders.some(order=>order.customerSlot===slot));
      if(recipeId&&customerSlot!==undefined&&next.orders.length<GAME_CONFIG.maxOrders)next={...next,nextOrderNumber:next.nextOrderNumber+1,orders:[...next.orders,{id:`order-${next.nextOrderNumber}`,customerSlot,recipeId,status:"queued",remainingMs:0,totalMs:0}]};
      next={...next,spawnRemainingMs:GAME_CONFIG.orderSpawnMinMs+Math.random()*(GAME_CONFIG.orderSpawnMaxMs-GAME_CONFIG.orderSpawnMinMs)};
    }
  }
  const oldPeriod=Math.floor(state.activeMs/300000),newPeriod=Math.floor(next.activeMs/300000);
  if(oldPeriod!==newPeriod){const condition=conditionForDay(newPeriod+1);next={...next,dailyWeatherId:condition.weatherId,dailyCustomerGroupId:condition.customerGroupId,dailyEventId:condition.dailyEventId};}
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
