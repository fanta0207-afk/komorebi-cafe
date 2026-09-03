import type { GameState } from "../types/game";

// Older saves can contain several already-paid cooking orders. Resume those in
// array order, without refunding/recharging stock or losing their remaining time.
export const activeCookingOrder = (state: GameState) => state.orders.find(order => order.status === "cooking");
export const stationOccupied = (state: GameState, stationId: string) => state.orders.some(order => order.stationId === stationId && order.status !== "queued");

export function stationActivity(state: GameState, stationId: string) {
  const active = activeCookingOrder(state);
  if (active?.stationId === stationId) return { status: "cooking", label: "調理中", order: active } as const;
  const paused = state.orders.find(order => order.stationId === stationId && order.status === "cooking");
  if (paused) return { status: "waiting", label: "順番待ち", order: paused } as const;
  const ready = state.orders.find(order => order.stationId === stationId && order.status === "ready");
  if (ready) return { status: "ready", label: "提供待ち", order: ready } as const;
  return { status: "idle", label: "待機中", order: undefined } as const;
}
