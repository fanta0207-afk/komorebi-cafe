"use client";

import { useState } from "react";
import { deliveryCountdown } from "../game/procurement";
import { GAME_CONFIG } from "../game/config";
import type { Ingredient } from "../types/game";
import { getCharacter } from "../data/characters";
import { ingredients } from "../data/ingredients";
import { getSupplier } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Hearts, Portrait } from "../components/GameUI";
import { relationshipLabel } from "../game/config";

export function SupplierScreen({supplierId,onBack}:{supplierId:string;onBack:()=>void}) {
  const {state}=useGame(); const supplier=getSupplier(supplierId)!; const character=getCharacter(supplier.characterId)!;
  const progress=state.characterProgress[character.id]; const stock=ingredients.filter(item=>item.supplierId===supplierId&&(!item.unlockEventId||state.unlockedIngredients.includes(item.id)));
  const greeting=progress.route==="romance"?character.greetings.romance:progress.route==="friendship"?character.greetings.friendship:progress.visits<=1?character.greetings.first:progress.relationshipStage>=4?character.greetings.close:character.greetings.familiar;
  return <section className="screen fade-in">
    <button className="back-button" onClick={onBack}>← 街へ戻る</button>
    <div className="supplier-hero"><Portrait character={character}/><div className="supplier-sign"><span>{supplier.icon} {supplier.name}</span><h1>{character.name}</h1><p>{character.age}歳 · {character.occupation}</p><Hearts stage={progress.relationshipStage} route={progress.route}/><small>好感度 {progress.relationshipStage}/10 · {relationshipLabel(progress.relationshipStage,progress.route)}</small></div></div>
    <div className="dialogue-box"><b>{character.name}</b><p>「{greeting}」</p></div>
    <div className="section-heading"><div><span className="tiny-label">WHOLESALE</span><h2>食材の仕入れ</h2></div><small>1パック = 5食分 · 入荷まで3分</small></div>
    <p className="procurement-guide">同じ食材は一度に20パックまで発注できます。代金は発注時にお支払い。画面を閉じていても3分後に届きます。</p>
    <div className="shop-list">{stock.map(item => <SupplyItem key={item.id} item={item}/>)}</div>
  </section>;
}

function SupplyItem({ item }: { item: Ingredient }) {
  const { state, dispatch } = useGame();
  const [packs, setPacks] = useState(1);
  const pending = state.deliveries.filter(delivery => delivery.ingredientId === item.id);
  const cost = item.price * packs;
  return <article className={`supply-item ${item.limited ? "limited-item" : ""}`}>
    <div className="supply-item-heading"><span className="item-icon">{item.icon}</span><div>{item.limited && <em>STORY LIMITED</em>}<h3>{item.name}</h3><small>在庫 {state.ingredients[item.id] || 0}食分{pending.length ? ` · 入荷待ち ${pending.reduce((sum, delivery) => sum + delivery.packs * GAME_CONFIG.ingredientPackSize, 0)}食分` : ""}</small></div></div>
    <div className="supply-order-controls"><div className="supply-quantity" role="group" aria-label={`${item.name}の発注数`}>
      <button type="button" disabled={packs <= 1} onClick={() => setPacks(value => value - 1)} aria-label={`${item.name}を1パック減らす`}>−</button>
      <span>{packs}<small>パック</small></span>
      <button type="button" disabled={packs >= GAME_CONFIG.maxProcurementPacks} onClick={() => setPacks(value => value + 1)} aria-label={`${item.name}を1パック増やす`}>＋</button>
    </div><button className="supply-order-button" type="button" disabled={state.currency < cost} onClick={() => dispatch({ type: "BUY_INGREDIENT", ingredientId: item.id, packs })}>{packs * GAME_CONFIG.ingredientPackSize}食分 発注 <b>● {cost.toLocaleString()}</b></button></div>
    {pending.map(delivery => <p className="supply-delivery" key={delivery.id}><span>{delivery.packs * GAME_CONFIG.ingredientPackSize}食分を配達中</span><b>あと {deliveryCountdown(delivery.arrivesAt, state.lastPlayedAt)}</b></p>)}
  </article>;
}
