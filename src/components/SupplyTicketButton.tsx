"use client";

import { getIngredient } from "../data/ingredients";
import { useGame } from "../game/GameContext";
import { deliveryCountdown } from "../game/procurement";
import type { IngredientDelivery } from "../types/game";

export function SupplyTicketButton({ delivery }: { delivery: IngredientDelivery }) {
  const { state, dispatch } = useGame();
  const ingredient = getIngredient(delivery.ingredientId);
  const disabled = state.forest.tickets < 1 || delivery.arrivesAt <= state.lastPlayedAt;
  const useTicket = () => {
    const now = Date.now();
    const current = state.deliveries.find(item => item.id === delivery.id);
    if (!current || state.forest.tickets < 1 || current.arrivesAt <= now || current.orderedAt > now) return;
    if (window.confirm(`${ingredient?.name} ${current.packs}パック（${current.packs * current.servingsPerPack}食分）、あと${deliveryCountdown(current.arrivesAt, now)}の調達を即完了します。調達券1枚を使いますか？`)) {
      dispatch({ type: "USE_SUPPLY_TICKET", deliveryId: current.id, now: Date.now() });
    }
  };
  return <button className="secondary-button supply-ticket-button" type="button" disabled={disabled} onClick={useTicket}
    aria-label={`${ingredient?.name}の調達を調達券1枚で即完了`}>
    🎟 調達券で即完了 · 1枚
  </button>;
}
