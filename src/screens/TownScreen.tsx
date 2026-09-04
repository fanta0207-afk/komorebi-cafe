"use client";

import { characters } from "../data/characters";
import { suppliers } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Portrait, ScreenTitle } from "../components/GameUI";

export function TownScreen({onOpen}:{onOpen:(supplierId:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="OLD TOWN" title="春風通り"></ScreenTitle><p className="intro-copy">仕入れた食材は3分後にお店へ届きます。同じ食材はまとめて発注できます。新しい会話や仕入れ、贈物で少しずつ距離を縮めましょう。</p>
    <div className="town-map">{suppliers.map((supplier,index)=>{const character=characters.find(item=>item.id===supplier.characterId)!;const met=state.characterProgress[character.id].met;return <button key={supplier.id} className={`supplier-tile tile-${index}`} onClick={()=>onOpen(supplier.id)}>
      <span className="supplier-icon">{supplier.icon}</span><div><strong>{supplier.name}</strong><small>{supplier.description}</small>{met&&<em>{character.name}がいます</em>}</div><Portrait character={character} small unknown={!met}/>
    </button>})}</div>
  </section>;
}
