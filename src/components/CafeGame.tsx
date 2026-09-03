"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { characters, getCharacter } from "../data/characters";
import { relationshipEvents } from "../data/events";
import { getDecoration } from "../data/decorations";
import { getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import { getSupplier } from "../data/suppliers";
import { conditionForDay, getCustomerGroup, getTownDailyEvent, getWeather } from "../data/dailyConditions";
import { GAME_CONFIG } from "../game/config";
import { GameProvider, useGame } from "../game/GameContext";
import { availableEvent, availableGrowthEvent, bestSeller, pickWeightedRecipe } from "../game/logic";
import type { DaySummary, GrowthEvent, RelationshipEvent } from "../types/game";
import { BottomNav, Portrait, StatusBar } from "./GameUI";
import { StoryModal } from "./StoryModal";
import { CafeScreen } from "../screens/CafeScreen";
import { TownScreen } from "../screens/TownScreen";
import { SupplierScreen } from "../screens/SupplierScreen";
import { GiftShopScreen } from "../screens/GiftShopScreen";
import { CharacterDetail, PeopleScreen } from "../screens/PeopleScreen";
import { MenuScreen } from "../screens/MenuScreen";

type Screen="cafe"|"town"|"gifts"|"people"|"menu"|"supplier"|"character"|"result";

export default function CafeGame() { return <GameProvider><GameContent/></GameProvider>; }

function GameContent() {
  const {state,dispatch,refreshGiftShop}=useGame();
  const [screen,setScreen]=useState<Screen>("cafe");
  const [supplierId,setSupplierId]=useState<string>();
  const [characterId,setCharacterId]=useState<string>();
  const [summary,setSummary]=useState<DaySummary>();
  const [devOpen,setDevOpen]=useState(false);
  const [devCharacter,setDevCharacter]=useState(characters[0].id);
  const [event,setEvent]=useState<RelationshipEvent>();
  const [replay,setReplay]=useState<RelationshipEvent>();
  const [growthEvent,setGrowthEvent]=useState<GrowthEvent>();
  const [eventPage,setEventPage]=useState(0);
  const stateRef=useRef(state); stateRef.current=state;

  const spawnOrder=useCallback(()=>{
    const current=stateRef.current;
    if(current.orders.length>=GAME_CONFIG.maxOrders)return;
    const free=[0,1,2,3].filter(slot=>!current.orders.some(order=>order.customerSlot===slot));
    if(!free.length||!current.unlockedRecipes.length)return;
    const customerSlot=free[Math.floor(Math.random()*free.length)];
    const recipeId=pickWeightedRecipe(current);
    if(!recipeId)return;
    dispatch({type:"SPAWN_ORDER",order:{id:`order-${Date.now()}-${Math.random()}`,customerSlot,recipeId}});
  },[dispatch]);

  useEffect(()=>{
    let timer:number; let live=true;
    const schedule=()=>{const delay=GAME_CONFIG.orderSpawnMinMs+Math.random()*(GAME_CONFIG.orderSpawnMaxMs-GAME_CONFIG.orderSpawnMinMs);timer=window.setTimeout(()=>{if(live){spawnOrder();schedule();}},delay);};
    schedule(); return()=>{live=false;window.clearTimeout(timer);};
  },[spawnOrder]);

  useEffect(()=>{
    if(event||growthEvent||replay||devOpen||state.offlineOffer>0)return;
    const next=availableEvent(state,relationshipEvents);
    if(next){setEvent(next);setEventPage(0);return;}
    const growth=availableGrowthEvent(state);
    if(growth){setGrowthEvent(growth);setEventPage(0);}
  },[state,event,growthEvent,replay,devOpen]);

  const navigate=(id:string)=>{setScreen(id as Screen);setSupplierId(undefined);setCharacterId(undefined);};
  const openSupplier=(id:string)=>{const supplier=getSupplier(id)!;dispatch({type:"VISIT",characterId:supplier.characterId});if(state.actionsRemaining<=0)return;setSupplierId(id);setScreen("supplier");};
  const endDay=()=>{setSummary({...state.dailyStats,day:state.day,topRecipeId:bestSeller(state.dailyStats.recipeSales),news:[...state.dayNews],weatherId:state.dailyWeatherId,customerGroupId:state.dailyCustomerGroupId,dailyEventId:state.dailyEventId,actionsUsed:state.maxActions-state.actionsRemaining});setScreen("result");};
  const nextDay=()=>{dispatch({type:"NEXT_DAY"});setSummary(undefined);setScreen("cafe");};
  const active=["supplier"].includes(screen)?"town":["character"].includes(screen)?"people":screen;

  return <main className="game-shell">
    <StatusBar state={state} onDev={()=>setDevOpen(true)}/>
    <div className="screen-wrap">
      {screen==="cafe"&&<CafeScreen state={state} onCollect={id=>dispatch({type:"COLLECT_ORDER",orderId:id})} onEndDay={endDay}/>} 
      {screen==="town"&&<TownScreen onOpen={openSupplier}/>} 
      {screen==="supplier"&&supplierId&&<SupplierScreen supplierId={supplierId} onBack={()=>setScreen("town")}/>} 
      {screen==="gifts"&&<GiftShopScreen/>}
      {screen==="people"&&<PeopleScreen onOpen={id=>{setCharacterId(id);setScreen("character");}}/>}
      {screen==="character"&&characterId&&<CharacterDetail key={characterId} characterId={characterId} onBack={()=>setScreen("people")} onReplay={setReplay}/>}
      {screen==="menu"&&<MenuScreen/>}
      {screen==="result"&&summary&&<DayResult summary={summary} onNext={nextDay}/>} 
    </div>
    {screen!=="result"&&<BottomNav active={active} onChange={navigate}/>}
    {state.notice&&<div key={state.notice.id} className={`notice notice-${state.notice.type}`}>{state.notice.text}</div>}
    {state.offlineOffer>0&&<div className="modal-backdrop"><div className="modal-card offline-card"><span className="sun-icon">☀</span><span className="tiny-label">WELCOME BACK</span><h2>留守中の売上</h2><strong>● {state.offlineOffer.toLocaleString()}</strong><p>店を離れている間も、常連さんが立ち寄ってくれました。ゲーム内の日付は進んでいません。</p><button className="primary-button" onClick={()=>dispatch({type:"CLAIM_OFFLINE"})}>受け取る</button></div></div>}
    {event&&<StoryModal
      key={event.id}
      event={event}
      progress={state.characterProgress[event.characterId]}
      onComplete={(choiceId,route)=>{dispatch({type:"COMPLETE_EVENT",eventId:event.id,choiceId,route});setEvent(undefined);}}
    />}
    {replay&&<StoryModal key={`replay-${replay.id}`} event={replay} progress={state.characterProgress[replay.characterId]} readOnly onClose={()=>setReplay(undefined)}/>}
    {growthEvent&&<GrowthEventModal
      event={growthEvent}
      page={eventPage}
      onNext={()=>{if(eventPage<growthEvent.dialogue.length-1){setEventPage(eventPage+1);}else{dispatch({type:"COMPLETE_GROWTH_EVENT",eventId:growthEvent.eventId});setGrowthEvent(undefined);}}}
    />}
    {devOpen&&<DevMenu selected={devCharacter} onSelect={setDevCharacter} onClose={()=>setDevOpen(false)} onSpawn={spawnOrder} onRefresh={()=>refreshGiftShop(false)}/>}
  </main>;
}

function GrowthEventModal({event,page,onNext}:{event:GrowthEvent;page:number;onNext:()=>void}) {
  const character=getCharacter(event.characterId)!;const finalPage=page===event.dialogue.length-1;
  const rewardNames=[...(event.rewards.ingredientIds || []).map(id=>getIngredient(id)?.name),...(event.rewards.recipeIds || []).map(id=>getRecipe(id)?.name),...(event.rewards.equipmentIds || []).map(id=>getEquipment(id)?.name),...(event.rewards.decorationIds || []).map(id=>getDecoration(id)?.name)].filter(Boolean);
  return <div className="event-overlay growth-event-overlay"><div className="event-scene"><div className="event-banner"><span>CAFE GROWTH STORY · {event.routeStage}/5</span><h2>{event.title}</h2></div><Portrait character={character}/><div className="event-dialogue"><b>{character.name}</b><p>「{event.dialogue[page]}」</p>{finalPage&&<div className="event-reward growth-reward"><span>✦ CAFE GROWTH</span><strong>{rewardNames.join("・")}</strong><small>{event.rewards.note}</small></div>}<button onClick={onNext}>{finalPage?"店の新しい一歩へ":"次へ"} →</button></div><div className="page-dots">{event.dialogue.map((_,i)=><i className={i===page?"active":""} key={i}/>)}</div></div></div>;
}

function DayResult({summary,onNext}:{summary:DaySummary;onNext:()=>void}) {
  const top=getRecipe(summary.topRecipeId||"");
  const weather=getWeather(summary.weatherId);const crowd=getCustomerGroup(summary.customerGroupId);const dailyEvent=getTownDailyEvent(summary.dailyEventId);const tomorrow=conditionForDay(Math.min(GAME_CONFIG.daysPerSeason,summary.day+1));const tomorrowWeather=getWeather(tomorrow.weatherId);
  return <section className="result-screen fade-in"><span className="result-flower">{weather.icon}</span><span className="tiny-label">CLOSE OF BUSINESS</span><h1>春 {summary.day}日<br/>営業結果</h1><div className="result-context"><span>{weather.icon} {weather.name}</span><span>{crowd.icon} {crowd.name}</span><span>{dailyEvent.icon} {dailyEvent.name}</span></div><div className="receipt"><div><span>本日の売上</span><strong>● {summary.sales.toLocaleString()}</strong></div><div><span>注文件数</span><strong>{summary.orders}件</strong></div><div><span>使った行動</span><strong>⚡ {summary.actionsUsed}/{GAME_CONFIG.maxDailyActions}</strong></div><div><span>一番売れた料理</span><strong>{top?`${top.icon} ${top.name}`:"—"}</strong></div></div><div className="news-box"><b>新しい出来事</b>{summary.news.length?summary.news.map((item,i)=><p key={i}>♡ {item}</p>):<p>今日は穏やかな一日でした。</p>}</div><div className="tomorrow-card"><span>明日の予報</span><strong>{tomorrowWeather.icon} {tomorrowWeather.name}</strong><p>客層と街の出来事も明日の朝に変わります。</p></div><button className="primary-button" onClick={onNext}>もう1日だけ　→</button></section>;
}

function DevMenu({selected,onSelect,onClose,onSpawn,onRefresh}:{selected:string;onSelect:(id:string)=>void;onClose:()=>void;onSpawn:()=>void;onRefresh:()=>void}) {
  const {dispatch}=useGame();
  const reset=()=>{if(window.confirm("セーブデータを初期化します。最初からやり直しますか？")){window.localStorage.removeItem(GAME_CONFIG.saveKey);dispatch({type:"RESET"});onClose();}};
  return <div className="modal-backdrop" onClick={onClose}><div className="dev-panel" onClick={e=>e.stopPropagation()}><div className="dev-head"><div><span className="tiny-label">FOR TESTING</span><h2>DEVメニュー</h2></div><button onClick={onClose}>×</button></div><div className="dev-grid"><button onClick={()=>dispatch({type:"DEV_COINS"})}>+10,000コイン</button><button onClick={onSpawn}>注文を即発生</button><button onClick={()=>dispatch({type:"NEXT_DAY"})}>翌日へ</button><button onClick={onRefresh}>贈物ショップ更新</button><button onClick={()=>dispatch({type:"DEV_UNLOCK_ALL"})}>料理全解放</button><button onClick={()=>dispatch({type:"DEV_ACTIONS"})}>行動力を全回復</button></div><label>好感度を上げる人物<select value={selected} onChange={e=>onSelect(e.target.value)}>{characters.map(c=><option value={c.id} key={c.id}>{c.name}（{c.occupation}）</option>)}</select></label><button className="dev-affection" onClick={()=>dispatch({type:"DEV_AFFECTION",characterId:selected})}>選択キャラクターの好感度 +100</button><button className="danger-button" onClick={reset}>セーブデータ初期化</button><p>※ 開発確認用です。通常プレイでは使わなくても遊べます。</p></div></div>;
}
