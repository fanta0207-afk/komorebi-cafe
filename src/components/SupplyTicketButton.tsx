"use client";

import { useEffect, useRef, useState } from "react";
import { GameModal } from "./GameModal";
import { getIngredient } from "../data/ingredients";
import { useGame } from "../game/GameContext";
import { ForestIcon } from "./ForestArt";
import type { IngredientDelivery } from "../types/game";
import "./supply-ticket.css";

export function SupplyTicketButton({ delivery }: { delivery: IngredientDelivery }) {
  const { state, dispatch } = useGame();
  const [confirming, setConfirming] = useState(false);
  const ingredient = getIngredient(delivery.ingredientId);
  const current = state.deliveries.find(item => item.id === delivery.id);
  const disabled = !current || state.forest.tickets < 1 || current.arrivesAt <= state.lastPlayedAt;
  const availableNow = () => {
    const now = Date.now();
    return !!current && state.forest.tickets > 0 && current.arrivesAt > now && current.orderedAt <= now;
  };
  const useTicket = () => {
    setConfirming(false);
    if (!availableNow()) return;
    dispatch({ type: "USE_SUPPLY_TICKET", deliveryId: delivery.id, now: Date.now() });
  };
  return <>
    <button className="secondary-button supply-ticket-button" type="button" disabled={disabled}
      onClick={() => { if (availableNow()) setConfirming(true); }} aria-haspopup="dialog"
      aria-label={`${ingredient?.name}の調達を調達券1枚で即完了`}>
      🎟 調達券で即完了 · 1枚
    </button>
    {confirming && current && !disabled && <TicketConfirmation delivery={current} tickets={state.forest.tickets}
      onCancel={() => setConfirming(false)} onConfirm={useTicket}/>}
  </>;
}

function TicketConfirmation({ delivery, tickets, onCancel, onConfirm }: {
  delivery: IngredientDelivery; tickets: number; onCancel: () => void; onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);
  return <GameModal className="supply-ticket-confirm" label="調達券を使いますか？" onCancel={onCancel} layerClassName="supply-ticket-modal-layer">
    <div className="supply-ticket-confirm-icon"><ForestIcon name="ticket"/></div>
    <h2>調達券を使いますか？</h2>
    <p className="supply-ticket-confirm-food"><strong>{getIngredient(delivery.ingredientId)?.name}</strong><br/>
      {delivery.packs * delivery.servingsPerPack}食分をすぐ受け取れます</p>
    <p className="supply-ticket-confirm-cost">使用 1枚 · 所持 {tickets}枚</p>
    <div className="supply-ticket-confirm-actions">
      <button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>やめる</button>
      <button className="primary-button" type="button" onClick={onConfirm}>1枚使って受け取る</button>
    </div>
  </GameModal>;
}
