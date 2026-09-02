"use client";

import { getCharacter } from "../data/characters";
import { ingredients } from "../data/ingredients";
import { getSupplier } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Hearts, Portrait } from "../components/GameUI";
import { relationshipNames } from "../game/config";

function dialogue(visits:number,stage:number,name:string) {
  if(visits<=1)return `いらっしゃい。初めて見る顔だね。${name}っていうんだ。`;
  if(stage>=3)return `今日は店の方、どうだった？ 君の話を聞くのを楽しみにしてた。`;
  if(visits>=3)return `最近よく来てくれるね。君の喫茶店、少し気になってる。`;
  return `また会ったね。今日は何を探しに来たの？`;
}

export function SupplierScreen({supplierId,onBack}:{supplierId:string;onBack:()=>void}) {
  const {state,dispatch}=useGame(); const supplier=getSupplier(supplierId)!; const character=getCharacter(supplier.characterId)!;
  const progress=state.characterProgress[character.id]; const stock=ingredients.filter(item=>item.supplierId===supplierId);
  return <section className="screen fade-in">
    <button className="back-button" onClick={onBack}>← 街へ戻る</button>
    <div className="supplier-hero"><Portrait character={character}/><div className="supplier-sign"><span>{supplier.icon} {supplier.name}</span><h1>{character.name}</h1><p>{character.occupation}</p><Hearts stage={progress.relationshipStage}/><small>{relationshipNames[progress.relationshipStage]}</small></div></div>
    <div className="dialogue-box"><b>{character.name}</b><p>「{dialogue(progress.visits,progress.relationshipStage,character.name)}」</p></div>
    <div className="section-heading"><div><span className="tiny-label">WHOLESALE</span><h2>今日の仕入れ</h2></div><small>所持数も表示しています</small></div>
    <div className="shop-list">{stock.map(item=><div className="shop-row" key={item.id}><span className="item-icon">{item.icon}</span><div><strong>{item.name}</strong><small>所持 {state.ingredients[item.id]||0}</small></div><div className="price"><b>● {item.price}</b><button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_INGREDIENT",ingredientId:item.id})}>仕入れる</button></div></div>)}</div>
  </section>;
}
