"use client";

import { useEffect, useRef } from "react";
import { forestIngredients } from "../../data/forest";
import { SupplyTicketButton } from "../SupplyTicketButton";
import { ingredients } from "../../data/ingredients";
import { suppliers } from "../../data/suppliers";
import { deliveryCountdown } from "../../game/procurement";
import type { GameState } from "../../types/game";

export function InventoryModal({ state, onClose, onTown }: {
  state: GameState; onClose: () => void; onTown: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const visible = ingredients.filter(item => !item.unlockEventId || state.unlockedIngredients.includes(item.id)
    || (state.ingredients[item.id] || 0) > 0 || state.deliveries.some(delivery => delivery.ingredientId === item.id));
  return <dialog ref={dialogRef} className="cafe-notebook cafe-inventory" aria-labelledby="inventory-title" onClose={onClose}>
    <div className="notebook-handle"/>
    <header className="notebook-header"><div><h2 id="inventory-title">在庫</h2></div><button type="button" onClick={onClose} aria-label="在庫を閉じて店内に戻る">×</button></header>
    {suppliers.map(supplier => {
      const items = visible.filter(item => item.supplierId === supplier.id);
      if (!items.length) return null;
      return <section className="inventory-group" key={supplier.id} aria-labelledby={`inventory-${supplier.id}`}>
        <h3 id={`inventory-${supplier.id}`}>{supplier.name}</h3>
        <dl>{items.map(item => {
          const stock = state.ingredients[item.id] || 0;
          const pending = state.deliveries.filter(delivery => delivery.ingredientId === item.id);
          const incoming = pending.reduce((sum, delivery) => sum + delivery.packs * delivery.servingsPerPack, 0);
          return <div className={`inventory-row ${stock === 0 ? "inventory-empty" : ""}`} key={item.id}>
            <dt><span aria-hidden="true">{item.icon}</span>{item.name}</dt>
            <dd className="inventory-count"><b>{stock.toLocaleString()}</b> 食分</dd>
            {incoming > 0 && <dd className="inventory-incoming">入荷待ち {incoming}食分 · {pending.length > 1 ? "すべて届くまで" : "あと"} {deliveryCountdown(Math.max(...pending.map(delivery => delivery.arrivesAt)), state.lastPlayedAt)}</dd>}
          </div>;
        })}</dl>
      </section>;
    })}
    <section className="inventory-group"><h3>森の素材</h3><dl>{forestIngredients.filter(i=>(state.ingredients[i.id]||0)>0).map(i=><div className="inventory-row" key={i.id}><dt>{i.icon} {i.name}</dt><dd>{state.ingredients[i.id]}個</dd></div>)}</dl></section>
    <section className="inventory-group"><h3>🎟 調達券 {state.forest.tickets}枚</h3><p>1枚で選んだ入荷1件がすべて届きます。</p>{state.deliveries.map(delivery=><div key={delivery.id}><p>{visible.find(i=>i.id===delivery.ingredientId)?.name}</p><SupplyTicketButton delivery={delivery}/></div>)}</section>
    <div className="notebook-stock"><button type="button" onClick={() => { onClose(); onTown(); }}>街へ仕入れに行く →</button></div>
  </dialog>;
}
