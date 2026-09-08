import { characters } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe, recipes } from "../data/recipes";
import type { GameState, IngredientDelivery } from "../types/game";
import { GAME_CONFIG } from "./config";
import { findNewRecipes, isRecipeUsable } from "./logic";
import { autoProcurementUnlocked } from "./automation";

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
  return { level, perPackMs: GAME_CONFIG.procurementMs - (GAME_CONFIG.procurementMs - GAME_CONFIG.minProcurementMs) * level / 10 };
}

/** One outstanding purchase for the whole cafe; choose all packs before ordering. */
export function procurementQuote(state: GameState, ingredientId: string, packs: number, now: number) {
  const pending = state.deliveries.filter(delivery => delivery.arrivesAt > now);
  const blocking = pending[0];
  const availableAt = Math.max(now, ...pending.map(delivery => delivery.arrivesAt));
  const rate = procurementRate(state, ingredientId);
  return { ...rate, blocking, availableAt, durationMs: rate.perPackMs * packs, arrivesAt: now + rate.perPackMs * packs };
}

export function orderSupplies(state: GameState, ingredientId: string, packs = 1, now = Date.now(), automatic = false): GameState {
  const item = getIngredient(ingredientId);
  if (!item || (item.unlockEventId && !state.unlockedIngredients.includes(item.id))
    || !Number.isInteger(packs) || packs < 1 || packs > GAME_CONFIG.maxProcurementPacks || !Number.isFinite(now) || now < 0) return state;
  // Settle overdue paid orders before checking the lane, including after a hidden tab.
  state = receiveSupplies(state, now);
  const quote = procurementQuote(state, ingredientId, packs, now);
  if (quote.blocking) return { ...state, notice: { id: now, type: "info", text: `${getIngredient(quote.blocking.ingredientId)?.name}の入荷待ちです。同じ食材も追加発注できません。すべて入荷してから次の数量を指定してください` } };
  const cost = item.price * packs;
  if (state.currency < cost) return { ...state, notice: { id: now, type: "info", text: "コインが足りません" } };
  const servingsPerPack=supplyPackSize(state,ingredientId);
  const delivery: IngredientDelivery = { id: `supply-${now}-${state.deliveries.length}-${ingredientId}`, ingredientId, packs, servingsPerPack, ...(automatic?{automatic:true}:{}), orderedAt: now, arrivesAt: quote.arrivesAt };
  return { ...state, lastPlayedAt: now, currency: state.currency - cost, deliveries: [...state.deliveries, delivery],
    characterProgress: Object.fromEntries(Object.entries(state.characterProgress).map(([id, progress]) => [id,
      !automatic&&characters.find(person => person.id === id)?.supplierId === item.supplierId && progress.met ? { ...progress, affection: progress.affection + GAME_CONFIG.procurementAffection } : progress])),
    lifetimeStats: { ...state.lifetimeStats, ingredientPurchases: { ...state.lifetimeStats.ingredientPurchases,
      [item.id]: (state.lifetimeStats.ingredientPurchases[item.id] || 0) + packs } },
    notice: { id: now, type: "info", text: `${automatic?"自動仕入れ：":""}${item.name}を${packs}パック発注。あと${deliveryCountdown(quote.arrivesAt, now)}で${packs * servingsPerPack}食分がまとめて届きます` } };
}

/** Automatically replenish one usable ingredient at a time without inventing stock or credit. */
export function runAutoProcurement(state:GameState,now=Date.now()):GameState {
  if(!state.autoProcurementEnabled||!autoProcurementUnlocked(state)||state.deliveries.some(delivery=>delivery.arrivesAt>now))return state;
  const needed=[...new Set(recipes.filter(recipe=>isRecipeUsable(recipe.id,state)).flatMap(recipe=>recipe.requiredIngredients))]
    .map(id=>getIngredient(id)).filter(item=>item&&(!item.unlockEventId||state.unlockedIngredients.includes(item.id)))
    .filter(item=>(state.ingredients[item!.id]||0)<=GAME_CONFIG.autoProcurementThreshold&&state.currency>=item!.price)
    .sort((a,b)=>(state.ingredients[a!.id]||0)-(state.ingredients[b!.id]||0)||a!.price-b!.price)[0];
  return needed?orderSupplies(state,needed.id,1,now,true):state;
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
  const names = [...new Set(arrived.map(item => getIngredient(item.ingredientId)?.name))].join("・");
  return { ...state, missions:{...state.missions,receivedPacks},ingredients: stock, deliveries: state.deliveries.filter(item => item.arrivesAt > now),
    lifetimeStats:{...state.lifetimeStats,automaticPacks:state.lifetimeStats.automaticPacks+automaticPacks},
    unlockedRecipes: [...state.unlockedRecipes, ...newRecipes],
    dayNews: [...state.dayNews, ...newRecipes.map(id => `${getRecipe(id)?.name}を解放しました`)],
    notice: { id: now, type: newRecipes.length ? "unlock" : "info", text: `${names}が入荷しました${newRecipes.length ? `！ ${newRecipes.map(id => getRecipe(id)?.name).join("・")}を解放` : ""}` } };
}

export function deliveryCountdown(arrivesAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((arrivesAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
