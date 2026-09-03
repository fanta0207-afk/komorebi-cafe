"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { characters, getCharacter } from "../data/characters";
import { relationshipEvents } from "../data/events";
import { getDecoration } from "../data/decorations";
import { getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import { getSupplier } from "../data/suppliers";
import { GAME_CONFIG } from "../game/config";
import { GameProvider, useGame } from "../game/GameContext";
import { availableEvent, availableGrowthEvent, pickWeightedRecipe } from "../game/logic";
import type { GrowthEvent, RelationshipEvent } from "../types/game";
import { BottomNav, Portrait, StatusBar } from "./GameUI";
import { StoryModal } from "./StoryModal";
import { CafeScreen } from "../screens/CafeScreen";
import { TownScreen } from "../screens/TownScreen";
import { SupplierScreen } from "../screens/SupplierScreen";
import { GiftShopScreen } from "../screens/GiftShopScreen";
import { CharacterDetail, PeopleScreen } from "../screens/PeopleScreen";
import { MenuScreen } from "../screens/MenuScreen";
import { StaffScreen } from "../screens/StaffScreen";
import { useCafeManager } from "./cafe/useCafeManager";

type Screen="cafe"|"town"|"gifts"|"people"|"menu"|"supplier"|"character"|"staff";

export default function CafeGame() { return <GameProvider><GameContent/></GameProvider>; }

function GameContent() {
  const {state,dispatch,refreshGiftShop}=useGame();
  const cafeManager=useCafeManager(state,dispatch);
  const [screen,setScreen]=useState<Screen>("cafe");
  const [supplierId,setSupplierId]=useState<string>();
  const [characterId,setCharacterId]=useState<string>();
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
    dispatch({type:"SPAWN_ORDER",order:{id:`order-${Date.now()}-${Math.random()}`,customerSlot,recipeId,status:"queued",remainingMs:0,totalMs:0}});
  },[dispatch]);

  useEffect(()=>{
    if(event||growthEvent||replay||devOpen)return;
    const next=availableEvent(state,relationshipEvents);
    if(next){setEvent(next);setEventPage(0);return;}
    const growth=availableGrowthEvent(state);
    if(growth){setGrowthEvent(growth);setEventPage(0);}
  },[state,event,growthEvent,replay,devOpen]);

  const navigate=(id:string)=>{setScreen(id as Screen);setSupplierId(undefined);setCharacterId(undefined);};
  const openSupplier=(id:string)=>{const supplier=getSupplier(id)!;dispatch({type:"VISIT",characterId:supplier.characterId});setSupplierId(id);setScreen("supplier");};
  const active=["supplier"].includes(screen)?"town":["character"].includes(screen)?"people":screen;

  return <main className={`game-shell ${screen==="cafe"?"cafe-shell":""}`}>
    <StatusBar state={state} onDev={()=>setDevOpen(true)}/>
    <div className="screen-wrap">
      {screen==="cafe"&&<CafeScreen state={state} manager={cafeManager.manager} managerFrame={cafeManager.frame} onStart={id=>cafeManager.request("start",id)} onCollect={id=>cafeManager.request("serve",id)} onCharacter={id=>{setCharacterId(id);setScreen("character");}} onTown={()=>navigate("town")} onEquipment={()=>navigate("menu")}/>}
      {screen==="town"&&<TownScreen onOpen={openSupplier}/>}
      {screen==="supplier"&&supplierId&&<SupplierScreen supplierId={supplierId} onBack={()=>setScreen("town")}/>}
      {screen==="gifts"&&<GiftShopScreen/>}
      {screen==="people"&&<PeopleScreen onOpen={id=>{setCharacterId(id);setScreen("character");}}/>}
      {screen==="character"&&characterId&&<CharacterDetail key={characterId} characterId={characterId} onBack={()=>setScreen("people")} onReplay={setReplay}/>}
      {screen==="menu"&&<MenuScreen/>}
      {screen==="staff"&&<StaffScreen/>}
    </div>
    <BottomNav active={active} onChange={navigate}/>
    {state.notice&&<div key={state.notice.id} className={`notice notice-${state.notice.type}`}>{state.notice.text}</div>}
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

function DevMenu({selected,onSelect,onClose,onSpawn,onRefresh}:{selected:string;onSelect:(id:string)=>void;onClose:()=>void;onSpawn:()=>void;onRefresh:()=>void}) {
  const {dispatch}=useGame();
  const reset=()=>{if(window.confirm("セーブデータを初期化します。最初からやり直しますか？")){window.localStorage.removeItem(GAME_CONFIG.saveKey);dispatch({type:"RESET"});onClose();}};
  return <div className="modal-backdrop" onClick={onClose}><div className="dev-panel" onClick={e=>e.stopPropagation()}><div className="dev-head"><div><span className="tiny-label">FOR TESTING</span><h2>DEVメニュー</h2></div><button onClick={onClose}>×</button></div><div className="dev-grid"><button onClick={()=>dispatch({type:"DEV_COINS"})}>+10,000コイン</button><button onClick={onSpawn}>注文を即発生</button><button onClick={onRefresh}>贈物ショップ更新</button><button onClick={()=>dispatch({type:"DEV_UNLOCK_ALL"})}>料理全解放</button></div><label>好感度を上げる人物<select value={selected} onChange={e=>onSelect(e.target.value)}>{characters.map(c=><option value={c.id} key={c.id}>{c.name}（{c.occupation}）</option>)}</select></label><button className="dev-affection" onClick={()=>dispatch({type:"DEV_AFFECTION",characterId:selected})}>選択キャラクターの好感度 +100</button><button className="danger-button" onClick={reset}>セーブデータ初期化</button><p>※ 開発確認用です。通常プレイでは使わなくても遊べます。</p></div></div>;
}
