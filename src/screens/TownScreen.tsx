"use client";

import { characters } from "../data/characters";
import { suppliers } from "../data/suppliers";
import { useGame } from "../game/GameContext";
import { Portrait, ScreenTitle } from "../components/GameUI";

export function TownScreen({onOpen}:{onOpen:(supplierId:string)=>void}) {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="OLD TOWN" title="春風通り"/><p className="intro-copy">仕入れたいものを探しに行きましょう。通ううちに、店の人とも顔なじみになるかも。</p>
    <div className="town-map">{suppliers.map((supplier,index)=>{const character=characters.find(item=>item.id===supplier.characterId)!;const met=state.characterProgress[character.id].met;return <button key={supplier.id} className={`supplier-tile tile-${index}`} onClick={()=>onOpen(supplier.id)}>
      <span className="supplier-icon">{supplier.icon}</span><div><strong>{supplier.name}</strong><small>{supplier.description}</small>{met&&<em>{character.name}がいます</em>}</div><Portrait character={character} small unknown={!met}/>
    </button>})}</div>
  </section>;
}
