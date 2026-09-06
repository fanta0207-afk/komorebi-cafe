import { GAME_CONFIG } from "./config";
import type { GameState } from "../types/game";

export const tableUpgrades = [
  { count: 2, price: 300, missionId: "first-serve" },
  { count: 3, price: 450, missionId: "coffee-three" },
  { count: 4, price: 650, missionId: "coffee-ten" },
  { count: 5, price: 900, missionId: "serve-mocha" },
  { count: 6, price: 1200, missionId: "first-investment" },
] as const;

export const tableCapacity = (state: GameState) => Math.min(GAME_CONFIG.maxOrders, Math.max(1, state.tableCount));
export const tableSlots = (state: GameState) => Array.from({ length: tableCapacity(state) }, (_, i) => i);
export const nextTableUpgrade = (state: GameState) => tableUpgrades.find(offer => offer.count === tableCapacity(state) + 1);
export const tableUpgradeUnlocked = (state: GameState, missionId: string) => state.missions.completed.includes(missionId) || state.missions.claimed.includes(missionId);
