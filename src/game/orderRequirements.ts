import { getCharacter } from "../data/characters";
import { getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import { getSupplier } from "../data/suppliers";
import type { GameState, Order } from "../types/game";
import { cookingMs, equipmentPrice, preparation, stationFor } from "./operations";
import { deliveryCountdown } from "./procurement";

export interface OrderRequirement { id: string; label: string; met: boolean; detail: string; }

/** Describe every requirement, including materials already consumed by this order. */
export function orderRequirements(state: GameState, order: Order): OrderRequirement[] {
  const recipe = getRecipe(order.recipeId);
  if (!recipe) return [];
  const started = order.status !== "queued" || !!order.forestReserved;
  const unlocked = state.unlockedRecipes.includes(recipe.id);
  const requirements: OrderRequirement[] = [{ id: "recipe", label: "レシピの解放", met: unlocked,
    detail: unlocked ? "解放済み" : recipe.unlockEventId ? recipe.unlockHint : "必要な食材をすべて在庫にそろえる（入荷時に解放）" }];
  for (const id of recipe.requiredIngredients) {
    const ingredient = getIngredient(id)!;
    const stock = state.ingredients[id] || 0;
    const pending = state.deliveries.filter(delivery => delivery.ingredientId === id);
    const runners=[...new Set(pending.map(delivery=>delivery.staffId?getCharacter(delivery.staffId)?.shortName||"スタッフ":"店長"))].join("・");
    const incoming = pending.length ? ` · ${runners}が仕入れ中・あと ${deliveryCountdown(Math.min(...pending.map(delivery => delivery.arrivesAt)), state.lastPlayedAt)}` : "";
    requirements.push({ id: `ingredient-${id}`, label: `${ingredient.name} ×1食分`, met: started || stock >= 1,
      detail: started ? "この料理に使用済み" : `在庫 ${stock}食分${stock < 1 ? ` · ${getSupplier(ingredient.supplierId)?.name}で仕入れ` : ""}${incoming}` });
  }
  for (const id of new Set([preparation(recipe).equipmentId, ...(recipe.requiredEquipmentIds || [])])) {
    const equipment = getEquipment(id)!;
    const installed = state.stations.some(station => station.equipmentId === id) && state.ownedEquipment.includes(id);
    requirements.push({ id: `equipment-${id}`, label: equipment.name, met: installed,
      detail: installed ? "設置済み" : state.unlockedEquipment.includes(id) ? `設備・料理から設置 · ${equipmentPrice(state, id)}コイン` : `${getCharacter(equipment.characterId)?.name}との物語で解放し、設備・料理から設置` });
  }
  const station = stationFor(state, recipe);
  requirements.push({ id: "cooking", label: "調理を完了する", met: order.status === "ready", detail:
    order.status === "ready" ? "完成！「提供する」で客席へ運びます" : order.status === "cooking" ? `調理中 · あと${Math.ceil(order.remainingMs / 1000)}秒` :
      !station ? "使用中です。別の設備なら同時に調理できます" : `上の条件をそろえて「調理開始」 · 約${Math.ceil(cookingMs(state, recipe, station) / 1000)}秒` });
  return requirements;
}
