import { characters, getCharacter } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import type { GameState, IngredientDelivery } from "../types/game";
import { GAME_CONFIG } from "./config";
import { findNewRecipes } from "./logic";

export function supplyPackSize(state:GameState,ingredientId:string) {
  const supplierId=getIngredient(ingredientId)?.supplierId;
  const person=characters.find(character=>character.supplierId===supplierId);
  return person&&state.viewedGrowthEvents.includes(`${person.id}-growth1`)?GAME_CONFIG.improvedPackSize:GAME_CONFIG.ingredientPackSize;
}

/** The supplier's relationship level sets the rate for newly ordered packs only. */
export function procurementRate(state: GameState, ingredientId: string) {
  const supplierId = getIngredient(ingredientId)?.supplierId;
  const person = characters.find(character => character.supplierId === supplierId);
  const level = Math.min(10, Math.max(0, person ? state.characterProgress[person.id]?.relationshipStage || 0 : 0));
  if(level>=1&&(ingredientId==="coffeeBeans"||ingredientId==="bread"))return {level,perPackMs:GAME_CONFIG.starterProcurementMs};
  if(level>=1&&(ingredientId==="milk"||ingredientId==="chocolate"))return {level,perPackMs:Math.round(GAME_CONFIG.earlyProcurementMs-(GAME_CONFIG.earlyProcurementMs-GAME_CONFIG.minProcurementMs)*(level-1)/9)};
  return { level, perPackMs: GAME_CONFIG.procurementMs - (GAME_CONFIG.procurementMs - GAME_CONFIG.minProcurementMs) * level / 10 };
}

/** The owner and every procurement worker each have one independent procurement lane. */
export function procurementQuote(state: GameState, ingredientId: string, packs: number, now: number, staffId?:string) {
  const pending = state.deliveries.filter(delivery => delivery.arrivesAt > now&&(staffId?delivery.staffId===staffId:!delivery.staffId));
  const blocking = pending[0];
  const availableAt = Math.max(now, ...pending.map(delivery => delivery.arrivesAt));
  const rate = procurementRate(state, ingredientId);
  return { ...rate, blocking, availableAt, durationMs: rate.perPackMs * packs, arrivesAt: now + rate.perPackMs * packs };
}

export function orderSupplies(state: GameState, ingredientId: string, packs = 1, now = Date.now(), automatic = false, staffId?:string): GameState {
  const item = getIngredient(ingredientId);
  if (!item || (item.unlockEventId && !state.unlockedIngredients.includes(item.id))
    || !Number.isInteger(packs) || packs < 1 || packs > GAME_CONFIG.maxProcurementPacks || !Number.isFinite(now) || now < 0) return state;
  // Settle overdue orders before checking the lane, including after a hidden tab.
  state = receiveSupplies(state, now);
  const quote = procurementQuote(state, ingredientId, packs, now, staffId);
  if (quote.blocking) return { ...state, notice: { id: now, type: "info", text: `入荷待ち：${getIngredient(quote.blocking.ingredientId)?.name}` } };
  const servingsPerPack=supplyPackSize(state,ingredientId);
  const delivery: IngredientDelivery = { id: `supply-${now}-${state.deliveries.length}-${ingredientId}`, ingredientId, packs, servingsPerPack, ...(automatic?{automatic:true}:{}), ...(staffId?{staffId}:{}), orderedAt: now, arrivesAt: quote.arrivesAt };
  const staffName=staffId&&getCharacter(staffId)?.shortName;
  return { ...state, lastPlayedAt: now, deliveries: [...state.deliveries, delivery],
    characterProgress: Object.fromEntries(Object.entries(state.characterProgress).map(([id, progress]) => [id,
      !automatic&&!staffId&&characters.find(person => person.id === id)?.supplierId === item.supplierId && progress.met ? { ...progress, affection: progress.affection + GAME_CONFIG.procurementAffection } : progress])),
    lifetimeStats: { ...state.lifetimeStats, staffProcurementOrders:state.lifetimeStats.staffProcurementOrders+(staffId?1:0), ingredientPurchases: { ...state.lifetimeStats.ingredientPurchases,
      [item.id]: (state.lifetimeStats.ingredientPurchases[item.id] || 0) + packs } },
    notice: { id: now, type: "info", text: staffName?`${staffName}が${item.name}${packs * servingsPerPack}食分を仕入れ中`:`${item.name}${packs * servingsPerPack}食分注文` } };
}

export function requestStaffSupply(state:GameState,orderId:string,ingredientId:string,staffId:string,now=Date.now(),automatic=false):GameState {
  const order=state.orders.find(item=>item.id===orderId&&item.status==="queued"),recipe=order&&getRecipe(order.recipeId);
  const staff=state.staff.find(person=>person.characterId===staffId&&person.role==="procurement");
  if(!order||!recipe||!recipe.requiredIngredients.includes(ingredientId)||(state.ingredients[ingredientId]||0)>0||!staff||staff.returningFromSlot!==undefined)return state;
  if(state.deliveries.some(delivery=>delivery.arrivesAt>now&&delivery.staffId===staffId)||state.deliveries.some(delivery=>delivery.arrivesAt>now&&delivery.ingredientId===ingredientId))return state;
  if(automatic&&(state.characterProgress[staffId]?.relationshipStage||0)<GAME_CONFIG.autoProcurementStage)return state;
  return orderSupplies(state,ingredientId,1,now,automatic,staffId);
}

/** At relationship 9, an idle procurement worker fetches an ingredient missing from a live order. */
export function runAutoProcurement(state:GameState,now=Date.now()):GameState {
  state=receiveSupplies(state,now);
  const available=state.staff.filter(person=>person.role==="procurement"&&person.returningFromSlot===undefined&&(state.characterProgress[person.characterId]?.relationshipStage||0)>=GAME_CONFIG.autoProcurementStage&&!state.deliveries.some(delivery=>delivery.arrivesAt>now&&delivery.staffId===person.characterId));
  for(const staff of available){
    const pendingIngredients=new Set(state.deliveries.filter(delivery=>delivery.arrivesAt>now).map(delivery=>delivery.ingredientId));
    let assigned=false;
    for(const order of state.orders.filter(item=>item.status==="queued")){
      const recipe=getRecipe(order.recipeId);
      const ingredientId=recipe?.requiredIngredients.find(id=>(state.ingredients[id]||0)<1&&!pendingIngredients.has(id)&&!!getIngredient(id)&&(!getIngredient(id)!.unlockEventId||state.unlockedIngredients.includes(id)));
      if(!ingredientId)continue;
      const next=requestStaffSupply(state,order.id,ingredientId,staff.characterId,now,true);
      if(next!==state){state=next;assigned=true;break;}
    }
    if(!assigned)continue;
  }
  return state;
}

/** Real-time deliveries can finish while away; cooking and sales still require foreground play. */
export function receiveSupplies(state: GameState, now: number): GameState {
  if (!Number.isFinite(now)) return state;
  const arrived = state.deliveries.filter(item => item.arrivesAt <= now);
  if (!arrived.length) return state;
  const stock = { ...state.ingredients };
  const receivedPacks={...state.missions.receivedPacks};
  for(const delivery of arrived)receivedPacks[delivery.ingredientId]=(receivedPacks[delivery.ingredientId]||0)+delivery.packs;
  for (const delivery of arrived) stock[delivery.ingredientId] = (stock[delivery.ingredientId] || 0) + delivery.packs * delivery.servingsPerPack;
  const automaticPacks=arrived.filter(delivery=>delivery.automatic).reduce((sum,delivery)=>sum+delivery.packs,0);
  const newRecipes = findNewRecipes(stock, state.unlockedRecipes);
  const names = [...new Set(arrived.map(item => getIngredient(item.ingredientId)?.name).filter((name):name is string=>!!name))];
  const arrivalText=names.length>2?`食材${names.length}種入荷`:`${names.join("・")}入荷`;
  return { ...state, missions:{...state.missions,receivedPacks},ingredients: stock, deliveries: state.deliveries.filter(item => item.arrivesAt > now),
    lifetimeStats:{...state.lifetimeStats,automaticPacks:state.lifetimeStats.automaticPacks+automaticPacks},
    unlockedRecipes: [...state.unlockedRecipes, ...newRecipes],
    dayNews: [...state.dayNews, ...newRecipes.map(id => `${getRecipe(id)?.name}を解放しました`)],
    notice: { id: now, type: newRecipes.length ? "unlock" : "info", text: `${arrivalText}${newRecipes.length ? `・新料理${newRecipes.length}品解放` : ""}` } };
}

export function deliveryCountdown(arrivesAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((arrivesAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
