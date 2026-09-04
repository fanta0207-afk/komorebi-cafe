import { characters } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import type { GameState, IngredientDelivery } from "../types/game";
import { GAME_CONFIG } from "./config";
import { findNewRecipes } from "./logic";

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

export function orderSupplies(state: GameState, ingredientId: string, packs = 1, now = Date.now()): GameState {
  const item = getIngredient(ingredientId);
  if (!item || (item.unlockEventId && !state.unlockedIngredients.includes(item.id))
    || !Number.isInteger(packs) || packs < 1 || packs > GAME_CONFIG.maxProcurementPacks || !Number.isFinite(now) || now < 0) return state;
  // Settle overdue paid orders before checking the lane, including after a hidden tab.
  state = receiveSupplies(state, now);
  const quote = procurementQuote(state, ingredientId, packs, now);
  if (quote.blocking) return { ...state, notice: { id: now, type: "info", text: `${getIngredient(quote.blocking.ingredientId)?.name}の入荷待ちです。同じ食材も追加発注できません。すべて入荷してから次の数量を指定してください` } };
  const cost = item.price * packs;
  if (state.currency < cost) return { ...state, notice: { id: now, type: "info", text: "コインが足りません" } };
  const delivery: IngredientDelivery = { id: `supply-${now}-${state.deliveries.length}-${ingredientId}`, ingredientId, packs, orderedAt: now, arrivesAt: quote.arrivesAt };
  return { ...state, lastPlayedAt: now, currency: state.currency - cost, deliveries: [...state.deliveries, delivery],
    characterProgress: Object.fromEntries(Object.entries(state.characterProgress).map(([id, progress]) => [id,
      characters.find(person => person.id === id)?.supplierId === item.supplierId && progress.met ? { ...progress, affection: progress.affection + 2 * packs } : progress])),
    lifetimeStats: { ...state.lifetimeStats, ingredientPurchases: { ...state.lifetimeStats.ingredientPurchases,
      [item.id]: (state.lifetimeStats.ingredientPurchases[item.id] || 0) + packs } },
    notice: { id: now, type: "info", text: `${item.name}を${packs}パック発注。あと${deliveryCountdown(quote.arrivesAt, now)}で${packs * GAME_CONFIG.ingredientPackSize}食分がまとめて届きます` } };
}

/** Real-time deliveries can finish while away; cooking and sales still require foreground play. */
export function receiveSupplies(state: GameState, now: number): GameState {
  if (!Number.isFinite(now)) return state;
  const arrived = state.deliveries.filter(item => item.arrivesAt <= now);
  if (!arrived.length) return state;
  const stock = { ...state.ingredients };
  for (const delivery of arrived) stock[delivery.ingredientId] = (stock[delivery.ingredientId] || 0) + delivery.packs * GAME_CONFIG.ingredientPackSize;
  const newRecipes = findNewRecipes(stock, state.unlockedRecipes);
  const names = [...new Set(arrived.map(item => getIngredient(item.ingredientId)?.name))].join("・");
  return { ...state, ingredients: stock, deliveries: state.deliveries.filter(item => item.arrivesAt > now),
    unlockedRecipes: [...state.unlockedRecipes, ...newRecipes],
    dayNews: [...state.dayNews, ...newRecipes.map(id => `${getRecipe(id)?.name}を解放しました`)],
    notice: { id: now, type: newRecipes.length ? "unlock" : "info", text: `${names}が入荷しました${newRecipes.length ? `！ ${newRecipes.map(id => getRecipe(id)?.name).join("・")}を解放` : ""}` } };
}

export function deliveryCountdown(arrivesAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((arrivesAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
