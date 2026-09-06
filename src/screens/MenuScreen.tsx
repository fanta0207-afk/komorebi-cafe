"use client";

import { useEffect } from "react";
import { getCharacter } from "../data/characters";
import { equipment, getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { recipes } from "../data/recipes";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";
import { GAME_CONFIG } from "../game/config";
import { missions } from "../game/missions";
import { nextTableUpgrade, tableCapacity, tableUpgradeUnlocked } from "../game/seating";
import { ingredientCost, isRecipeUsable, salePrice } from "../game/logic";
import { stationActivity, stationOccupied } from "../game/kitchen";
import { equipmentPrice, hasIngredients, preparation, upgradePrice } from "../game/operations";

export function MenuScreen({tab="equipment",onTabChange:setTab}:{tab?:"recipes"|"equipment";onTabChange:(tab:"recipes"|"equipment")=>void}) {
  const {state,dispatch}=useGame();
  useEffect(()=>{dispatch({type:"MISSION_VIEW",place:tab});},[tab,dispatch]);
  return <section className="screen fade-in"><ScreenTitle title="設備と料理"/>
    <div className="menu-tabs"><button className={tab==="equipment"?"active":""} onClick={()=>setTab("equipment")}>設備</button><button className={tab==="recipes"?"active":""} onClick={()=>setTab("recipes")}>料理</button></div>
    {tab==="equipment"&&<SeatingUpgrade/>}
    {tab==="recipes"?<div className="recipe-list">{recipes.map(recipe=>{const unlocked=state.unlockedRecipes.includes(recipe.id),usable=isRecipeUsable(recipe.id,state),stock=hasIngredients(state,recipe),prep=preparation(recipe);return <article key={recipe.id} className={`recipe-card ${!unlocked?"locked":""} ${recipe.limited?"limited-recipe":""}`}><span className="recipe-icon">{unlocked?recipe.icon:recipe.hidden?"✦":"?"}</span><div><small>{recipe.hidden?"SECRET RECIPE":recipe.limited?"STORY RECIPE":"RECIPE"}</small><h3>{recipe.hidden&&!unlocked?"？？？ 隠し料理":recipe.name}</h3>{unlocked?<><p>売上 {salePrice(recipe.id)}コイン · 基本{prep.seconds}秒 · {getEquipment(prep.equipmentId)?.name}</p><p>食材代 {ingredientCost(recipe.id)} ／ 利益 {salePrice(recipe.id)-ingredientCost(recipe.id)}コイン（通常注文）</p><p>1品につき各1食分：{recipe.requiredIngredients.map(id=>`${getIngredient(id)?.name}（在庫${state.ingredients[id]||0}）`).join("・")}</p>{!usable&&<p>必要な設備を購入すると販売できます。</p>}</>:<p>{recipe.unlockHint}</p>}</div><em>{usable?stock?"注文受付中":"食材待ち":unlocked?"設備待ち":"未解放"}</em></article>})}</div>:
    <div className="equipment-list">{equipment.map(item=>{const unlocked=state.unlockedEquipment.includes(item.id),stations=state.stations.filter(station=>station.equipmentId===item.id),price=equipmentPrice(state,item.id);return <article key={item.id} className={`equipment-group ${!unlocked?"locked":""}`}><div className="equipment-card"><div className="equipment-icon">{unlocked?item.icon:"?"}</div><div className="equipment-info"><small>{unlocked?`設置 ${stations.length}/${GAME_CONFIG.maxStationsPerType}台`:"STORY LOCKED"}</small><h3>{unlocked?item.name:"まだ知らない設備"}</h3><p>{unlocked?item.effectText:`${getCharacter(item.characterId)?.name}との物語を進めると相談できそう`}</p></div></div>{unlocked&&<div className="station-list">{stations.map((station,index)=>{const activity=stationActivity(state,station.id),busy=stationOccupied(state,station.id),max=station.level>=GAME_CONFIG.maxStationLevel,cost=upgradePrice(station);return <div className="station-row" key={station.id}><div><b>{index+1}号機 · Lv.{station.level}</b><small>調理時間 {Math.round(Math.pow(0.85,station.level-1)*100)}% · {activity.label}{activity.status==="cooking"?` · あと${Math.ceil(activity.order.remainingMs/1000)}秒`:""}</small></div><button disabled={max||busy||state.currency<cost} onClick={()=>dispatch({type:"UPGRADE_EQUIPMENT",stationId:station.id})}>{max?"最大レベル":busy?"提供後に強化":`強化 ● ${cost.toLocaleString()}`}</button></div>})}{stations.length<GAME_CONFIG.maxStationsPerType&&<button className="secondary-button add-station" disabled={state.currency<price} onClick={()=>dispatch({type:"BUY_EQUIPMENT",equipmentId:item.id})}>{stations.length?"もう1台増設":"設置する"} ● {price.toLocaleString()}</button>}</div>}</article>})}</div>}
  </section>;
}

function SeatingUpgrade() {
  const {state,dispatch}=useGame();
  const count=tableCapacity(state),offer=nextTableUpgrade(state);
  const unlocked=!!offer&&tableUpgradeUnlocked(state,offer.missionId);
  const required=missions.find(mission=>mission.id===offer?.missionId);
  return <article className="equipment-group seating-upgrade">
    <div className="equipment-card"><div className="equipment-icon">🪑</div><div className="equipment-info">
      <small>設置 {count}/{GAME_CONFIG.maxOrders}セット</small><h3>客席（机・椅子）</h3>
      <p>{!offer?"最大6セット":unlocked?`${offer.count}セット目を購入できます`:`「${required?.title}」達成で${offer.count}セット目を解放`}</p>
    </div></div>
    {offer&&<div className="station-list"><button className="secondary-button add-station" disabled={!unlocked||state.currency<offer.price} onClick={()=>dispatch({type:"BUY_TABLE",expectedCount:count})}>
      {unlocked?"増設する":"ミッションで解放"} ● {offer.price.toLocaleString()}
    </button></div>}
  </article>;
}
