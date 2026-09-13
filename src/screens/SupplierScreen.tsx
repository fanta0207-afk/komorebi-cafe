"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { deliveryCountdown, procurementQuote, supplyPackSize } from "../game/procurement";
import { GAME_CONFIG } from "../game/config";
import type { Ingredient } from "../types/game";
import { getCharacter } from "../data/characters";
import { ingredients } from "../data/ingredients";
import { getSupplier } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Hearts, Portrait } from "../components/GameUI";
import { relationshipLabel } from "../game/config";
import { getCharacterDates } from "../data/dates";
import type { DateEvent } from "../types/game";

export function SupplierScreen({supplierId,highlightIngredientId,onBack,onDate}:{supplierId:string;highlightIngredientId?:string;onBack:()=>void;onDate:(event:DateEvent)=>void}) {
  const {state}=useGame(); const supplier=getSupplier(supplierId)!; const character=getCharacter(supplier.characterId)!;
  const targetRef=useRef<HTMLElement>(null);
  const progress=state.characterProgress[character.id]; const stock=ingredients.filter(item=>item.supplierId===supplierId&&(!item.unlockEventId||state.unlockedIngredients.includes(item.id)));
  const dates=getCharacterDates(character.id);const datesUnlocked=progress.relationshipStage>=GAME_CONFIG.dateUnlockStage;
  const greeting=progress.route==="romance"?character.greetings.romance:progress.route==="friendship"?character.greetings.friendship:progress.visits<=1?character.greetings.first:progress.relationshipStage>=4?character.greetings.close:character.greetings.familiar;
  useEffect(()=>{if(highlightIngredientId)targetRef.current?.scrollIntoView({block:"center"});},[supplierId,highlightIngredientId]);
  return <section className="screen fade-in">
    <button className="back-button" onClick={onBack}>← 街へ戻る</button>
    <div className="supplier-hero"><Portrait character={character} face/><div className="supplier-sign"><span>{supplier.icon} {supplier.name}</span><h1>{character.name}</h1><Hearts stage={progress.relationshipStage} route={progress.route}/><small>好感度 {progress.relationshipStage}/10 · {relationshipLabel(progress.relationshipStage,progress.route)}</small></div></div>
    <div className="dialogue-box"><b>{character.name}</b><p>「{greeting}」</p></div>
    <div className="section-heading"><div><h2>食材の仕入れ</h2></div><small>1パック = {supplyPackSize(state,stock[0]?.id||"")}食分・無料</small></div>
    <div className="shop-list">{stock.map(item => <SupplyItem key={item.id} item={item} highlighted={item.id===highlightIngredientId} targetRef={targetRef}/>)}</div>
    <section className={`date-invitation ${datesUnlocked?"":"locked"}`} aria-labelledby={`${character.id}-date-title`}>
      <header><div><span>{datesUnlocked?"♡ DATE":"LOCKED"}</span><h2 id={`${character.id}-date-title`}>デートに誘う</h2></div><b>{state.viewedDateEvents.filter(id=>id.startsWith(`${character.id}-date-`)).length}/3</b></header>
      {datesUnlocked?<div className="date-destinations">{dates.map(event=>{const viewed=state.viewedDateEvents.includes(event.id);return <button type="button" key={event.id} onClick={()=>onDate(event)}><span>{event.icon}</span><strong>{event.title}</strong><small>{viewed?"思い出を見る":"誘う"} →</small></button>})}</div>:<p>好感度Lv.{GAME_CONFIG.dateUnlockStage}で、行き先を選んで誘えるようになります。</p>}
    </section>
  </section>;
}

function SupplyItem({ item, highlighted, targetRef }: { item: Ingredient; highlighted: boolean; targetRef: RefObject<HTMLElement | null> }) {
  const { state, dispatch } = useGame();
  const [packs, setPacks] = useState(1);
  const pending = state.deliveries.filter(delivery => delivery.ingredientId === item.id);
  const servings=supplyPackSize(state,item.id);
  const quote = procurementQuote(state, item.id, packs, state.lastPlayedAt);
  return <article ref={highlighted?targetRef:undefined} className={`supply-item ${item.limited ? "limited-item" : ""} ${highlighted ? "supply-item-highlight" : ""}`}>
    <div className="supply-item-heading"><span className="item-icon">{item.icon}</span><div>{item.limited && <em>STORY LIMITED</em>}<h3>{item.name}</h3><small>在庫 {state.ingredients[item.id] || 0}食分{pending.length ? ` · 入荷待ち ${pending.reduce((sum, delivery) => sum + delivery.packs * delivery.servingsPerPack, 0)}食分` : ""}</small></div>{highlighted && <b className="supply-target-badge">この食材です</b>}</div>
    {!quote.blocking && <p className="supply-estimate">入荷まで {deliveryCountdown(quote.durationMs, 0)}</p>}
    {quote.blocking && <p className="supply-blocked">{ingredients.find(ingredient => ingredient.id === quote.blocking!.ingredientId)?.name}を入荷待ち（あと {deliveryCountdown(quote.availableAt, state.lastPlayedAt)}）</p>}
    <div className="supply-order-controls"><div className="supply-quantity" role="group" aria-label={`${item.name}の発注数`}>
      <button type="button" disabled={!!quote.blocking || packs <= 1} onClick={() => setPacks(value => value - 1)} aria-label={`${item.name}を1パック減らす`}>−</button>
      <span>{packs}<small>パック</small></span>
      <button type="button" disabled={!!quote.blocking || packs >= GAME_CONFIG.maxProcurementPacks} onClick={() => setPacks(value => value + 1)} aria-label={`${item.name}を1パック増やす`}>＋</button>
    </div><button className={`supply-order-button ${highlighted ? "supply-order-highlight" : ""}`} type="button" disabled={!!quote.blocking} onClick={() => dispatch({ type: "BUY_INGREDIENT", ingredientId: item.id, packs })}>{quote.blocking ? "入荷待ち" : <>{packs * servings}食分を発注</>}</button></div>
    {pending.map(delivery => <p className="supply-delivery" key={delivery.id}><span><strong>{delivery.staffId?getCharacter(delivery.staffId)?.shortName||"スタッフ":"店長"}</strong>が {delivery.packs * delivery.servingsPerPack}食分を仕入れ中{delivery.automatic?"・自動":""}</span><b>あと {deliveryCountdown(delivery.arrivesAt, state.lastPlayedAt)}</b></p>)}
  </article>;
}
