import type { Order } from "../../types/game";

// Presentation only. These coordinates and visits are never written to the save.
export const TABLE_POSITIONS = [
  { x: 29, y: 52 }, { x: 71, y: 52 },
  { x: 29, y: 73 }, { x: 71, y: 73 },
] as const;
export const VISIT_TIMING = { enter: 1400, enjoy: 1500, leave: 1700 };
export type VisitPhase = "entering" | "seated" | "enjoying" | "leaving";
export interface CafeVisit {
  id: string;
  slot: number;
  recipeId: string;
  look: string;
  arrivedAt: number;
  servedAt?: number;
}
export const CUSTOMER_LOOKS = ["moss", "rose", "navy", "ochre"];

export function makeVisit(order: Order, now: number): CafeVisit {
  // Stable across reloads, without changing the game's recipe/customer random draws.
  const hash = Array.from(order.id).reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return { id: order.id, slot: order.customerSlot, recipeId: order.recipeId,
    look: CUSTOMER_LOOKS[hash % CUSTOMER_LOOKS.length], arrivedAt: now };
}

export function reconcileVisits(visits: CafeVisit[], previous: Order[], orders: Order[], now: number): CafeVisit[] {
  const current = new Set(orders.map(order => order.id));
  const ready = new Set(previous.filter(order => order.status === "ready").map(order => order.id));
  const result = visits.flatMap(visit => {
    if (current.has(visit.id)) return [visit];
    // A reset or removal of an unserved order must not create a reward animation.
    if (visit.servedAt === undefined && !ready.has(visit.id)) return [];
    const servedAt = visit.servedAt ?? now;
    return now - servedAt < VISIT_TIMING.enjoy + VISIT_TIMING.leave ? [{ ...visit, servedAt }] : [];
  });
  for (const order of orders) if (!result.some(visit => visit.id === order.id)) result.push(makeVisit(order, now));
  return result;
}

export function visitPhase(visit: CafeVisit, now: number): VisitPhase | undefined {
  if (visit.servedAt === undefined) return now - visit.arrivedAt < VISIT_TIMING.enter ? "entering" : "seated";
  const elapsed = now - visit.servedAt;
  if (elapsed < VISIT_TIMING.enjoy) return "enjoying";
  if (elapsed < VISIT_TIMING.enjoy + VISIT_TIMING.leave) return "leaving";
  return undefined;
}

export const cafeAsset = {
  background: (id: string) => `/assets/cafe/backgrounds/${id}.png`,
  furniture: (id: string) => `/assets/cafe/furniture/${id}.png`,
  equipment: (id: string) => `/assets/cafe/equipment/${id}.png`,
  customer: (look: string, phase?: VisitPhase) => `/assets/customers/${look}${phase ? `-${phase}` : ""}.png`,
  character: (id: string, role?: string) => `/assets/characters/${id}${role ? `-${role}` : ""}.png`,
  food: (id: string) => `/assets/foods/${id}.png`,
  effect: (id: string) => `/assets/effects/${id}.png`,
};
