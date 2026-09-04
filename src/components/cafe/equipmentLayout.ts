import { equipment } from "../../data/equipment";
import { getRecipe } from "../../data/recipes";
import { preparation } from "../../game/operations";
import { stationActivity } from "../../game/kitchen";
import type { GameState, Order } from "../../types/game";

/** One shared map owns both the drawn equipment and every worker's destination. */
export function equipmentLayout(state: GameState) {
  const visible = equipment.filter(item => state.unlockedEquipment.includes(item.id)
    || state.ownedEquipment.includes(item.id) || state.stations.some(station => station.equipmentId === item.id));
  return visible.map((item, index) => {
    const row = Math.floor(index / 5);
    const count = Math.min(5, visible.length - row * 5);
    const position = { x: 40 + (index % 5 + .5) * 43 / count, y: visible.length > 5 ? 27.5 + row * 6 : 33.5 };
    const stations = state.stations.filter(station => station.equipmentId === item.id);
    const activities = stations.map(station => ({ station, ...stationActivity(state, station.id) }));
    const activity = activities.find(entry => entry.status === "cooking") ?? activities.find(entry => entry.status === "waiting")
      ?? activities.find(entry => entry.status === "ready") ?? activities.find(() => true);
    return { item, position, workPosition: { x: position.x - 3, y: 43.5 }, stations, activities,
      status: activity?.status ?? "uninstalled", label: activity?.label ?? "未設置", order: activity?.order };
  });
}

export function equipmentWorkPosition(state: GameState, order: Order) {
  const recipe = getRecipe(order.recipeId);
  const id = state.stations.find(station => station.id === order.stationId)?.equipmentId
    ?? (recipe ? preparation(recipe).equipmentId : "coffeeCounter");
  return equipmentLayout(state).find(entry => entry.item.id === id)?.workPosition ?? { x: 40, y: 44 };
}
