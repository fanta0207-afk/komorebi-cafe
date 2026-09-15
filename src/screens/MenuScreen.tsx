"use client";

import { useEffect } from "react";
import { getCharacter } from "../data/characters";
import { equipment, getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { allRecipes as recipes } from "../data/recipes";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";
import { GAME_CONFIG } from "../game/config";
import { missions } from "../game/missions";
import { nextTableUpgrade, tableCapacity, tableUpgradeUnlocked } from "../game/seating";
import { isRecipeUsable, salePrice } from "../game/logic";
import { menuCatalogProgress, menuMastery } from "../game/menuMastery";
import { stationActivity, stationOccupied } from "../game/kitchen";
import { equipmentPrice, hasIngredients, preparation, upgradePrice } from "../game/operations";

export function MenuScreen({tab="equipment",onTabChange:setTab}:{tab?:"recipes"|"equipment";onTabChange:(tab:"recipes"|"equipment")=>void}) {
  const {state,dispatch}=useGame();
  useEffect(()=>{dispatch({type:"MISSION_VIEW",place:tab});},[tab,dispatch]);
  return <section className="screen fade-in"><ScreenTitle title="設備と料理"/>
    <div className="menu-tabs"><button className={tab==="equipment"?"active":""} onClick={()=>setTab("equipment")}>設備</button><button className={tab==="recipes"?"active":""} onClick={()=>setTab("recipes")}>料理</button></div>
    {tab==="equipment"&&<SeatingUpgrade/>}
    {tab==="recipes"?<RecipeCatalog/>:
    <div className="equipment-list">{equipment.map(item=>{const unlocked=state.unlockedEquipment.includes(item.id),stations=state.stations.filter(station=>station.equipmentId===item.id),price=equipmentPrice(state,item.id);return <article key={item.id} className={`equipment-group ${!unlocked?"locked":""}`}><div className="equipment-card"><div className="equipment-icon">{unlocked?item.icon:"?"}</div><div className="equipment-info"><small>{unlocked?`設置 ${stations.length}/${GAME_CONFIG.maxStationsPerType}台`:"未解放"}</small><h3>{unlocked?item.name:"まだ知らない設備"}</h3><p>{unlocked?item.effectText:`${getCharacter(item.characterId)?.name}の物語で解放`}</p></div></div>{unlocked&&<div className="station-list">{stations.map((station,index)=>{const activity=stationActivity(state,station.id),busy=stationOccupied(state,station.id),max=station.level>=GAME_CONFIG.maxStationLevel,cost=upgradePrice(station);return <div className="station-row" key={station.id}><div><b>{index+1}号機 · Lv.{station.level}</b><small>{Math.round(Math.pow(0.85,station.level-1)*100)}% · {activity.label}{activity.status==="cooking"?` · あと${Math.ceil(activity.order.remainingMs/1000)}秒`:""}</small></div><button disabled={max||busy||state.currency<cost} onClick={()=>dispatch({type:"UPGRADE_EQUIPMENT",stationId:station.id})}>{max?"最大レベル":busy?"提供後に強化":`強化 ● ${cost.toLocaleString()}`}</button></div>})}{stations.length<GAME_CONFIG.maxStationsPerType&&<button className="secondary-button add-station" disabled={state.currency<price} onClick={()=>dispatch({type:"BUY_EQUIPMENT",equipmentId:item.id})}>{stations.length?"増設":"設置"} ● {price.toLocaleString()}</button>}</div>}</article>})}</div>}
  </section>;
}

function RecipeCatalog() {
  const {state}=useGame();
  const catalog=menuCatalogProgress(state);
  return <><section className="recipe-catalog-summary" aria-label="メニュー解放率">
    <div><span>メニュー図鑑</span><strong>{catalog.unlocked} / {catalog.total}</strong></div>
    <div className="catalog-rate"><b>解放率 {catalog.percent}%</b><progress max={100} value={catalog.percent}/></div>
  </section><div className="recipe-list">{recipes.map(recipe=>{
    const unlocked=state.unlockedRecipes.includes(recipe.id),usable=isRecipeUsable(recipe.id,state),stock=hasIngredients(state,recipe),prep=preparation(recipe),mastery=menuMastery(recipe.id,state);
    const price=salePrice(recipe.id,state);
    const showRarity=unlocked||!recipe.hidden;
    return <article key={recipe.id} className={`recipe-card ${!unlocked?"locked":""} ${recipe.limited?"limited-recipe":""} ${showRarity?`menu-rarity-${recipe.rarity}`:""}`}>
      <span className="recipe-icon">{unlocked?recipe.icon:recipe.hidden?"✦":"?"}</span><div className="recipe-info">
        <div className="recipe-title-row"><h3>{recipe.hidden&&!unlocked?"？？？ 隠し料理":recipe.name}</h3>{unlocked&&<span className="recipe-level">Lv.{mastery.current.level}</span>}</div>
        {unlocked?<><p>● {price} · {prep.seconds}秒 · {getEquipment(prep.equipmentId)?.name}</p><p>利益 {price} · {recipe.requiredIngredients.map(id=>`${getIngredient(id)?.name} ${state.ingredients[id]||0}`).join(" / ")}</p>
          <div className="recipe-mastery"><div><span>累計 {mastery.sales.toLocaleString()}品提供</span><b>熟練売上 +{Math.round(mastery.current.bonus*100)}%</b></div>{mastery.next?<><progress max={mastery.next.sales} value={mastery.sales}/><small>次のLv.まで {Math.min(mastery.sales,mastery.next.sales)} / {mastery.next.sales}</small></>:<strong>MASTER</strong>}</div>
        </>:<p>{recipe.unlockHint}</p>}</div><em>{usable?stock?"受付中":"食材待ち":unlocked?"設備待ち":"未解放"}</em>
    </article>;
  })}</div></>;
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
