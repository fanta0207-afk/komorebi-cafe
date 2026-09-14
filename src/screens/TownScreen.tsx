"use client";

import { characters } from "../data/characters";
import { suppliers } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Portrait, ScreenTitle } from "../components/GameUI";

export function TownScreen({onOpen,onForest}:{onOpen:(supplierId:string)=>void;onForest:()=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle title="春風通り"/>
    <button className="forest-entry" onClick={onForest}><div>🌲 こもれびの森<small>{state.lifetimeStats.totalOrders>=1?`体力 ${state.forest.energy}/70 · 食材を探しに行く`:"最初の料理を提供すると解放"}</small></div><span>→</span></button><div className="town-map">{suppliers.map((supplier,index)=>{const character=characters.find(item=>item.id===supplier.characterId)!;const met=state.characterProgress[character.id].met;return <button key={supplier.id} className={`supplier-tile tile-${index}`} onClick={()=>onOpen(supplier.id)}>
      <span className="supplier-icon">{supplier.icon}</span><div><strong>{supplier.name}</strong>{met&&<em>{character.name}</em>}</div><Portrait character={character} small face unknown={!met}/>
    </button>})}</div>
  </section>;
}
