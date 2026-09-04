import { characters } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import type { GameState, IngredientDelivery } from "../types/game";
import { GAME_CONFIG } from "./config";
import { findNewRecipes } from "./logic";

export function orderSupplies(state: GameState, ingredientId: string, packs = 1, now = Date.now()): GameState {
  const item = getIngredient(ingredientId);
  if (!item || (item.unlockEventId && !state.unlockedIngredients.includes(item.id))
    || !Number.isInteger(packs) || packs < 1 || packs > GAME_CONFIG.maxProcurementPacks || !Number.isFinite(now) || now < 0) return state;
  const cost = item.price * packs;
  if (state.currency < cost) return { ...state, notice: { id: now, type: "info", text: "コインが足りません" } };
  const delivery: IngredientDelivery = { id: `supply-${now}-${state.deliveries.length}-${ingredientId}`, ingredientId, packs, orderedAt: now, arrivesAt: now + GAME_CONFIG.procurementMs };
  return { ...state, lastPlayedAt: now, currency: state.currency - cost, deliveries: [...state.deliveries, delivery],
    characterProgress: Object.fromEntries(Object.entries(state.characterProgress).map(([id, progress]) => [id,
      characters.find(person => person.id === id)?.supplierId === item.supplierId && progress.met ? { ...progress, affection: progress.affection + 2 * packs } : progress])),
    lifetimeStats: { ...state.lifetimeStats, ingredientPurchases: { ...state.lifetimeStats.ingredientPurchases,
      [item.id]: (state.lifetimeStats.ingredientPurchases[item.id] || 0) + packs } },
    notice: { id: now, type: "info", text: `${item.name}を${packs}パック発注。3分後に${packs * GAME_CONFIG.ingredientPackSize}食分が届きます` } };
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
