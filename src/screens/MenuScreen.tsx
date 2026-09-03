"use client";

import { useState } from "react";
import { getCharacter } from "../data/characters";
import { equipment, getEquipment } from "../data/equipment";
import { recipes } from "../data/recipes";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";
import { isRecipeUsable } from "../game/logic";

export function MenuScreen() {
  const {state,dispatch}=useGame();const [tab,setTab]=useState<"recipes"|"equipment">("recipes");
  return <section className="screen fade-in"><ScreenTitle kicker="CAFE GROWTH" title="料理と設備"/><p className="intro-copy">物語で相談した料理や設備が、少しずつ店の選択肢になります。</p>
    <div className="menu-tabs"><button className={tab==="recipes"?"active":""} onClick={()=>setTab("recipes")}>料理</button><button className={tab==="equipment"?"active":""} onClick={()=>setTab("equipment")}>設備</button></div>
    {tab==="recipes"?<div className="recipe-list">{recipes.map(recipe=>{const unlocked=state.unlockedRecipes.includes(recipe.id);const usable=isRecipeUsable(recipe.id,state);const displayName=recipe.hidden&&!unlocked?"？？？ 隠し料理":recipe.name;return <article key={recipe.id} className={`recipe-card ${!unlocked?"locked":""} ${recipe.limited?"limited-recipe":""}`}><span className="recipe-icon">{unlocked?recipe.icon:recipe.hidden?"✦":recipe.limited?"♡":"?"}</span><div><small>{recipe.hidden?"SECRET RECIPE":recipe.limited?"STORY RECIPE":unlocked?"AVAILABLE":"RECIPE HINT"}</small><h3>{displayName}</h3><p>{usable?`${recipe.price}コインで販売中`:unlocked?`「${(recipe.requiredEquipmentIds || []).filter(id=>!state.ownedEquipment.includes(id)).map(id=>getEquipment(id)?.name).join("・")}」を設備タブで購入すると販売できます`:recipe.unlockHint}</p></div><em>{usable?"販売中":unlocked?"設備待ち":recipe.hidden?"隠し条件":"未解放"}</em></article>})}</div>:
    <div className="equipment-list">{equipment.map(item=>{const unlocked=state.unlockedEquipment.includes(item.id);const owned=state.ownedEquipment.includes(item.id);const character=getCharacter(item.characterId);return <article key={item.id} className={`equipment-card ${!unlocked?"locked":""} ${owned?"owned":""}`}><div className="equipment-icon">{unlocked?item.icon:"?"}</div><div className="equipment-info"><small>{owned?"INSTALLED":unlocked?"AVAILABLE":"STORY LOCKED"}</small><h3>{unlocked?item.name:"まだ知らない設備"}</h3><p>{unlocked?item.effectText:`${character?.name || "街の人"}との共同イベントで相談できそう`}</p>{unlocked&&!owned&&<span>● {item.price.toLocaleString()}</span>}</div>{owned?<em>設置済み</em>:unlocked?<button disabled={state.currency<item.price} onClick={()=>dispatch({type:"BUY_EQUIPMENT",equipmentId:item.id})}>購入</button>:<em>物語を進める</em>}</article>})}</div>}
  </section>;
}
