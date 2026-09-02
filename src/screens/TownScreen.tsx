"use client";

import { characters } from "../data/characters";
import { suppliers } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Portrait, ScreenTitle } from "../components/GameUI";

export function TownScreen({onOpen}:{onOpen:(supplierId:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="OLD TOWN" title="春風通り"><div className="screen-action-count">⚡ 残り {state.actionsRemaining}</div></ScreenTitle><p className="intro-copy">仕入れ先への訪問は1行動。今日は誰のところへ行くか、ゆっくり選びましょう。</p>
    <div className="town-map">{suppliers.map((supplier,index)=>{const character=characters.find(item=>item.id===supplier.characterId)!;const met=state.characterProgress[character.id].met;return <button key={supplier.id} disabled={state.actionsRemaining<=0} className={`supplier-tile tile-${index}`} onClick={()=>onOpen(supplier.id)}>
      <span className="supplier-icon">{supplier.icon}</span><div><strong>{supplier.name}</strong><small>{supplier.description}</small>{met&&<em>{character.name}がいます</em>}</div><Portrait character={character} small unknown={!met}/>
    </button>})}</div>{state.actionsRemaining<=0&&<div className="day-limit-message">🌙 今日はもう十分に歩きました。店へ戻って営業を終えましょう。</div>}
  </section>;
}
