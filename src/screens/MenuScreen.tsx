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
import "./equipment-shop.css";

export function MenuScreen({tab="equipment",onTabChange:setTab}:{tab?:"recipes"|"equipment";onTabChange:(tab:"recipes"|"equipment")=>void}) {
  const {state,dispatch}=useGame();
  useEffect(()=>{dispatch({type:"MISSION_VIEW",place:tab});},[tab,dispatch]);
  return <section className="screen fade-in"><ScreenTitle title="設備と料理"/>
    <div className="menu-tabs"><button className={tab==="equipment"?"active":""} onClick={()=>setTab("equipment")}>設備</button><button className={tab==="recipes"?"active":""} onClick={()=>setTab("recipes")}>料理</button></div>
    {tab==="equipment"&&<SeatingUpgrade/>}
    {tab==="recipes"?<RecipeCatalog/>:
    <div className="equipment-list">{equipment.map(item=>{
      const unlocked=state.unlockedEquipment.includes(item.id);
      const stations=state.stations.filter(station=>station.equipmentId===item.id);
      const hasSlot=stations.length<GAME_CONFIG.maxStationsPerType;
      const price=equipmentPrice(state,item.id);
      const shortfall=Math.max(0,price-state.currency);
      const buyable=unlocked&&hasSlot&&!shortfall;
      const availability=!unlocked?"is-locked":!hasSlot?"is-complete":buyable?"is-affordable":"is-short";
      return <article key={item.id} data-equipment-id={item.id} className={`equipment-group ${availability}`}>
        <div className="equipment-card"><div className="equipment-icon">{unlocked?item.icon:"?"}</div><div className="equipment-info">
          <div className="equipment-meta"><small>{unlocked?`設置 ${stations.length}/${GAME_CONFIG.maxStationsPerType}台`:"未解放"}</small><span className="equipment-buy-state">{!unlocked?"物語で解放":!hasSlot?"設置上限":buyable?"✦ 購入OK":`あと ${shortfall.toLocaleString()}コイン`}</span></div>
          <h3>{unlocked?item.name:"まだ知らない設備"}</h3><p>{unlocked?item.effectText:`${getCharacter(item.characterId)?.name}の物語で解放`}</p>
        </div></div>
        {unlocked&&<div className="station-list">
          {stations.map((station,index)=>{
            const activity=stationActivity(state,station.id),busy=stationOccupied(state,station.id),max=station.level>=GAME_CONFIG.maxStationLevel,cost=upgradePrice(station);
            const upgradeShortfall=Math.max(0,cost-state.currency),canUpgrade=!max&&!busy&&!upgradeShortfall;
            return <div className="station-row" key={station.id}><div><b>{index+1}号機 · Lv.{station.level}</b><small>{Math.round(Math.pow(0.85,station.level-1)*100)}% · {activity.label}{activity.status==="cooking"?` · あと${Math.ceil(activity.order.remainingMs/1000)}秒`:""}</small></div><div className="station-upgrade-action"><button className={`station-upgrade ${canUpgrade?"is-ready":"is-unavailable"}`} disabled={!canUpgrade} onClick={()=>dispatch({type:"UPGRADE_EQUIPMENT",stationId:station.id})}>{max?"最大レベル":busy?"提供後に強化":`強化 ● ${cost.toLocaleString()}`}</button>{!max&&!busy&&!!upgradeShortfall&&<small>あと {upgradeShortfall.toLocaleString()}コイン</small>}</div></div>;
          })}
          {hasSlot&&<div className="equipment-purchase-area"><button className="secondary-button add-station equipment-purchase" disabled={!buyable} onClick={()=>dispatch({type:"BUY_EQUIPMENT",equipmentId:item.id})}><span>{buyable?"✦ ":""}{stations.length?"増設する":"設置する"}</span><strong>● {price.toLocaleString()}</strong></button>{!buyable&&<p>あと {shortfall.toLocaleString()}コインで{stations.length?"増設":"設置"}できます</p>}</div>}
        </div>}
      </article>;
    })}</div>}
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
  const shortfall=offer?Math.max(0,offer.price-state.currency):0;
  const buyable=!!offer&&unlocked&&!shortfall;
  return <article data-equipment-id="seating" className={`equipment-group seating-upgrade ${!offer?"is-complete":!unlocked?"is-locked":buyable?"is-affordable":"is-short"}`}>
    <div className="equipment-card"><div className="equipment-icon">🪑</div><div className="equipment-info">
      <div className="equipment-meta"><small>設置 {count}/{GAME_CONFIG.maxOrders}セット</small><span className="equipment-buy-state">{!offer?"設置上限":!unlocked?"ミッションで解放":buyable?"✦ 購入OK":`あと ${shortfall.toLocaleString()}コイン`}</span></div><h3>客席（机・椅子）</h3>
      <p>{!offer?"最大6セット":unlocked?`${offer.count}セット目を購入できます`:`「${required?.title}」達成で${offer.count}セット目を解放`}</p>
    </div></div>
    {offer&&<div className="station-list equipment-purchase-area"><button className="secondary-button add-station equipment-purchase" disabled={!buyable} onClick={()=>dispatch({type:"BUY_TABLE",expectedCount:count})}><span>{!unlocked?"ミッションで解放":`${buyable?"✦ ":""}増設する`}</span><strong>● {offer.price.toLocaleString()}</strong></button>{unlocked&&!buyable&&<p>あと {shortfall.toLocaleString()}コインで増設できます</p>}</div>}
  </article>;
}
