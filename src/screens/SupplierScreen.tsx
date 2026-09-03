"use client";

import { getCharacter } from "../data/characters";
import { ingredients } from "../data/ingredients";
import { getSupplier } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Hearts, Portrait } from "../components/GameUI";
import { relationshipLabel } from "../game/config";

export function SupplierScreen({supplierId,onBack}:{supplierId:string;onBack:()=>void}) {
  const {state,dispatch}=useGame(); const supplier=getSupplier(supplierId)!; const character=getCharacter(supplier.characterId)!;
  const progress=state.characterProgress[character.id]; const stock=ingredients.filter(item=>item.supplierId===supplierId&&(!item.unlockEventId||state.unlockedIngredients.includes(item.id)));
  const greeting=progress.route==="romance"?character.greetings.romance:progress.route==="friendship"?character.greetings.friendship:progress.visits<=1?character.greetings.first:progress.relationshipStage>=4?character.greetings.close:character.greetings.familiar;
  return <section className="screen fade-in">
    <button className="back-button" onClick={onBack}>← 街へ戻る</button>
    <div className="supplier-hero"><Portrait character={character}/><div className="supplier-sign"><span>{supplier.icon} {supplier.name}</span><h1>{character.name}</h1><p>{character.age}歳 · {character.occupation}</p><Hearts stage={progress.relationshipStage} route={progress.route}/><small>好感度 {progress.relationshipStage}/10 · {relationshipLabel(progress.relationshipStage,progress.route)}</small></div></div>
    <div className="dialogue-box"><b>{character.name}</b><p>「{greeting}」</p></div>
    <div className="section-heading"><div><span className="tiny-label">WHOLESALE</span><h2>食材の仕入れ</h2></div><small>1パック = 5食分 · 仕入れで交流 +2</small></div>
    <div className="shop-list">{stock.map(item=><div className={`shop-row ${item.limited?"limited-item":""}`} key={item.id}><span className="item-icon">{item.icon}</span><div>{item.limited&&<em>STORY LIMITED</em>}<strong>{item.name}</strong><small>在庫 {state.ingredients[item.id]||0}食分</small></div><div className="price"><b>● {item.price}</b><button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_INGREDIENT",ingredientId:item.id})}>5食分仕入れ</button></div></div>)}</div>
  </section>;
}
