import type { GameState } from "../types/game";

// Kept as the first manual focus for the manager animation. Every cooking order
// advances concurrently; each physical station still accepts only one dish.
export const activeCookingOrder = (state: GameState) => state.orders.find(order => order.status === "cooking");
export const stationOccupied = (state: GameState, stationId: string) => state.orders.some(order => order.stationId === stationId && order.status !== "queued");

export function stationActivity(state: GameState, stationId: string) {
  const cooking = state.orders.find(order => order.stationId === stationId && order.status === "cooking");
  if (cooking) return { status: "cooking", label: "調理中", order: cooking } as const;
  const ready = state.orders.find(order => order.stationId === stationId && order.status === "ready");
  if (ready) return { status: "ready", label: "提供待ち", order: ready } as const;
  return { status: "idle", label: "待機中", order: undefined } as const;
}
