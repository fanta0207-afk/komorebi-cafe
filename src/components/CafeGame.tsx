"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { characters, getCharacter } from "../data/characters";
import { relationshipEvents } from "../data/events";
import { getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { getRecipe } from "../data/recipes";
import { getSupplier } from "../data/suppliers";
import { GAME_CONFIG } from "../game/config";
import { tableCapacity, tableSlots } from "../game/seating";
import { GameProvider, useGame } from "../game/GameContext";
import { availableEvent, availableStaffStory, availableGrowthEvent, pickWeightedRecipe } from "../game/logic";
import type { DateEvent, GrowthEvent, RelationshipEvent } from "../types/game";
import { BottomNav, Portrait, StatusBar } from "./GameUI";
import { StoryModal } from "./StoryModal";
import { GiftReactionModal } from "./GiftReactionModal";
import { CafeScreen } from "../screens/CafeScreen";
import { ForestScreen, ForestBook } from "../screens/ForestScreen";
import { TownScreen } from "../screens/TownScreen";
import { SupplierScreen } from "../screens/SupplierScreen";
import { GiftShopScreen } from "../screens/GiftShopScreen";
import { CharacterDetail, PeopleScreen } from "../screens/PeopleScreen";
import { MenuScreen } from "../screens/MenuScreen";
import { StaffScreen } from "../screens/StaffScreen";
import { useCafeManager } from "./cafe/useCafeManager";
import { MissionGuide } from "./MissionGuide";
import type { MissionDestination } from "../game/missions";

type Screen="forest"|"forestBook"|"cafe"|"town"|"gifts"|"people"|"menu"|"supplier"|"character"|"staff";

export default function CafeGame(_props:{publicBuild?:boolean}={}) { return <GameProvider><GameContent/></GameProvider>; }

function GameContent() {
  const {state,dispatch,refreshGiftShop,resetGame}=useGame();
  const cafeManager=useCafeManager(state,dispatch);
  const [screen,setScreen]=useState<Screen>("cafe");
  const [supplierId,setSupplierId]=useState<string>();
  const [highlightIngredientId,setHighlightIngredientId]=useState<string>();
  const [characterId,setCharacterId]=useState<string>();
  const [cafePanel,setCafePanel]=useState<{page:"orders"|"inventory";nonce:number}>();
  const [menuTab,setMenuTab]=useState<"equipment"|"recipes">("equipment");
  const [devOpen,setDevOpen]=useState(false);
  const [devCharacter,setDevCharacter]=useState(characters[0].id);
  const [event,setEvent]=useState<RelationshipEvent>();
  const [replay,setReplay]=useState<RelationshipEvent>();
  const [growthEvent,setGrowthEvent]=useState<GrowthEvent>();
  const [dateEvent,setDateEvent]=useState<DateEvent>();
  const [eventPage,setEventPage]=useState(0);
  const stateRef=useRef(state); stateRef.current=state;

  const spawnOrder=useCallback(()=>{
    const current=stateRef.current;
    if(current.orders.length>=tableCapacity(current))return;
    const free=tableSlots(current).filter(slot=>!current.orders.some(order=>order.customerSlot===slot));
    if(!free.length||!current.unlockedRecipes.length)return;
    const customerSlot=free[Math.floor(Math.random()*free.length)];
    const recipeId=pickWeightedRecipe(current);
    if(!recipeId)return;
    dispatch({type:"SPAWN_ORDER",order:{id:`order-${Date.now()}-${Math.random()}`,customerSlot,recipeId,status:"queued",remainingMs:0,totalMs:0}});
  },[dispatch]);

  useEffect(()=>{
    if(state.forest.expedition||event||growthEvent||dateEvent||replay||devOpen||state.pendingGiftReaction)return;
    const next=availableStaffStory(state)||availableEvent(state,relationshipEvents);
    if(next){setEvent(next);setEventPage(0);return;}
    const growth=availableGrowthEvent(state);
    if(growth){setGrowthEvent(growth);setEventPage(0);}
  },[state,event,growthEvent,dateEvent,replay,devOpen]);

  useEffect(()=>{if(state.forest.expedition)setScreen(current=>current==="forestBook"?current:"forest");},[state.forest.expedition?.id]);
  const navigate=(id:string)=>{if(state.forest.expedition){dispatch({type:"FOREST_RETURN"});setScreen("forest");return;}setScreen(id as Screen);setSupplierId(undefined);setHighlightIngredientId(undefined);setCharacterId(undefined);setCafePanel(undefined);};
  const openSupplier=(id:string,ingredientId?:string)=>{const supplier=getSupplier(id)!;dispatch({type:"VISIT",characterId:supplier.characterId});setSupplierId(id);setHighlightIngredientId(ingredientId);setScreen("supplier");};
  const active=["forest","forestBook"].includes(screen)?"town":["supplier"].includes(screen)?"town":["character"].includes(screen)?"people":screen==="menu"?"cafe":screen;
  useEffect(()=>{
    if(screen==="town"||screen==="gifts")dispatch({type:"MISSION_VIEW",place:screen});
    if(screen==="character"&&characterId==="ren")dispatch({type:"MISSION_VIEW",place:"ren"});
  },[screen,characterId,dispatch]);
  const missionGo=(destination:MissionDestination)=>{
    if(destination==="orders"||destination==="inventory"){navigate("cafe");setCafePanel({page:destination,nonce:Date.now()});}
    else if(destination==="coffee"||destination==="bakery"||destination==="ranch"||destination==="patisserie"||destination==="chocolaterie")openSupplier(destination);
    else if(destination==="ren"){
      if(!state.characterProgress.ren.met){openSupplier("coffee");return;}
      setCharacterId("ren");setScreen("character");
    }else if(destination==="recipes"||destination==="equipment"){setMenuTab(destination);navigate("menu");}
    else navigate(destination);
  };

  const missionControl=!state.forest.expedition&&!event&&!growthEvent&&!dateEvent&&!replay&&!state.pendingGiftReaction?<MissionGuide onGo={missionGo}/>:undefined;
  const resetGameAndUi=()=>{
    resetGame();setScreen("cafe");setSupplierId(undefined);setHighlightIngredientId(undefined);setCharacterId(undefined);setCafePanel(undefined);setMenuTab("equipment");
    setEvent(undefined);setReplay(undefined);setGrowthEvent(undefined);setDateEvent(undefined);setEventPage(0);setDevOpen(false);
  };
  // 画面を切り替えるたびに表示領域ごと入れ替え、前画面の画像が一瞬残るのを防ぐ。
  const screenKey=`${screen}:${supplierId||""}:${characterId||""}`;
  return <main className={`game-shell ${screen==="cafe"?"cafe-shell":screen==="forest"?"forest-shell":""}`}>
    {screen!=="cafe"&&screen!=="forest"&&<StatusBar state={state} onDev={()=>setDevOpen(true)} missionControl={missionControl}/>}
    {(screen==="cafe"||screen==="forest")&&<button className="dev-trigger dev-trigger-floating" onClick={()=>setDevOpen(true)} aria-label="開発メニュー">⚙</button>}
    <div key={screenKey} className="screen-wrap">
      {screen==="cafe"&&<CafeScreen
        missionControl={missionControl} storyOpen={!!(event||growthEvent||dateEvent||replay||state.pendingGiftReaction)} panelRequest={cafePanel}
        onInventory={()=>dispatch({type:"MISSION_VIEW",place:"inventory"})} state={state} manager={cafeManager.manager} managerFrame={cafeManager.frame}
        onStart={id=>cafeManager.request("start",id)} onCollect={id=>cafeManager.request("serve",id)} onDecline={id=>dispatch({type:"DECLINE_ORDER",orderId:id})}
        onCharacter={id=>{setCharacterId(id);setScreen("character");}} onTown={()=>navigate("town")} onEquipment={()=>{setMenuTab("equipment");navigate("menu");}}
        onSupplier={ingredientId=>{const ingredient=getIngredient(ingredientId);if(ingredient)openSupplier(ingredient.supplierId,ingredientId);}}
        onRequestSupply={(orderId,ingredientId,staffId)=>dispatch({type:"REQUEST_STAFF_SUPPLY",orderId,ingredientId,staffId})}/>}
      {screen==="town"&&<TownScreen onOpen={openSupplier} onForest={()=>setScreen("forest")}/>}
      {screen==="supplier"&&supplierId&&<SupplierScreen supplierId={supplierId} highlightIngredientId={highlightIngredientId} onBack={()=>{setHighlightIngredientId(undefined);setScreen("town");}} onDate={setDateEvent}/>}
      {screen==="gifts"&&<GiftShopScreen/>}
      {screen==="people"&&<PeopleScreen onOpen={id=>{setCharacterId(id);setScreen("character");}}/>}
      {screen==="character"&&characterId&&<CharacterDetail key={characterId} characterId={characterId} onBack={()=>setScreen("people")} onReplay={setReplay}/>}
      {screen==="menu"&&<MenuScreen tab={menuTab} onTabChange={setMenuTab}/>}
      {screen==="forest"&&<ForestScreen onBook={()=>setScreen("forestBook")} onTown={()=>navigate("cafe")}/>}
      {screen==="forestBook"&&<ForestBook onBack={()=>setScreen("forest")}/>}
      {screen==="staff"&&<StaffScreen/>}
    </div>
    {screen!=="forest"&&<BottomNav active={active} onChange={navigate}/>}
    {state.notice&&screen!=="forest"&&<div key={state.notice.id} className={`notice notice-${state.notice.type}`}>{state.notice.text}</div>}
    {state.pendingGiftReaction&&<GiftReactionModal
      key={`${state.pendingGiftReaction.characterId}:${state.pendingGiftReaction.reaction}`}
      reaction={state.pendingGiftReaction}
      onClose={()=>{const reaction=state.pendingGiftReaction!;dispatch({type:"CLOSE_GIFT_REACTION",characterId:reaction.characterId,reaction:reaction.reaction});}}
    />}
    {event&&<StoryModal
      key={event.id}
      event={event}
      progress={state.characterProgress[event.characterId]}
      onComplete={(choiceId,route)=>{dispatch(event.kind==="staff"?{type:"COMPLETE_STAFF_STORY",eventId:event.id}:{type:"COMPLETE_EVENT",eventId:event.id,choiceId,route});setEvent(undefined);}}
    />}
    {replay&&<StoryModal key={`replay-${replay.id}`} event={replay} progress={state.characterProgress[replay.characterId]} readOnly onClose={()=>setReplay(undefined)}/>}
    {growthEvent&&<GrowthEventModal
      event={growthEvent}
      page={eventPage}
      onNext={()=>{if(eventPage<growthEvent.dialogue.length-1){setEventPage(eventPage+1);}else{dispatch({type:"COMPLETE_GROWTH_EVENT",eventId:growthEvent.eventId});setGrowthEvent(undefined);}}}
    />}
    {dateEvent&&<DateEventModal event={dateEvent} completed={state.viewedDateEvents.includes(dateEvent.id)} onClose={()=>setDateEvent(undefined)} onComplete={()=>{dispatch({type:"COMPLETE_DATE",eventId:dateEvent.id});setDateEvent(undefined);}}/>}
    {devOpen&&<DevMenu selected={devCharacter} onSelect={setDevCharacter} onClose={()=>setDevOpen(false)} onSpawn={spawnOrder} onRefresh={()=>refreshGiftShop(false)} onReset={resetGameAndUi}/>}
  </main>;
}

function DateEventModal({event,completed,onClose,onComplete}:{event:DateEvent;completed:boolean;onClose:()=>void;onComplete:()=>void}) {
  const character=getCharacter(event.characterId)!;const [page,setPage]=useState(0);const [artFailed,setArtFailed]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
  const storyImage=character.storyImage||character.image;
  const finalPage=page===event.dialogue.length-1;
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  const next=()=>{if(!finalPage)setPage(value=>value+1);else if(completed)onClose();else onComplete();};
  return <dialog ref={dialog} className="story-modal story-player date-story-player" aria-labelledby="date-story-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <button className="story-close-button" aria-label="デートを閉じる" onClick={onClose}>×</button>
    <header className="story-player-heading"><div className="story-header"><span>{completed?"デートの思い出":"DATE"} · {event.icon} {event.title}</span></div><h2 id="date-story-title">{character.shortName}と{event.title}</h2></header>
    <div className={`story-stage is-speaking date-location-${event.locationId}`} data-character={character.id}>
      {storyImage&&!artFailed?<img className="story-standing-art" src={storyImage} alt={`${character.name}の立ち絵`} onError={()=>setArtFailed(true)}/>:<div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>}
    </div>
    <div className="story-dialogue-panel"><div key={page} className="story-content speaker-character" aria-live="polite"><span className="story-speaker">{character.name}</span><p>「{event.dialogue[page]}」</p>{finalPage&&!completed&&<div className="story-reward date-reward"><strong>好感度 +{GAME_CONFIG.dateAffection}</strong><p>初めての{event.title}の思い出が増えます。</p></div>}</div>
      <div className="story-footer"><span>{page+1} / {event.dialogue.length}</span><button className="primary-button" onClick={next}>{finalPage?(completed?"閉じる":"デートを終える"):"次へ →"}</button></div>
    </div>
  </dialog>;
}

function GrowthEventModal({event,page,onNext}:{event:GrowthEvent;page:number;onNext:()=>void}) {
  const character=getCharacter(event.characterId)!;const finalPage=page===event.dialogue.length-1;
  const dialog=useRef<HTMLDialogElement>(null);
  const dialogueContent=useRef<HTMLDivElement>(null);
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  useEffect(()=>{dialogueContent.current?.scrollTo({top:0});},[page]);
  const storyImage=character.storyImage||character.image;
  const [artFailed,setArtFailed]=useState(false);
  const rewardNames=[...(event.routeStage===1?["仕入れ効率アップ"]:[]),...(event.rewards.ingredientIds || []).map(id=>getIngredient(id)?.name),...(event.rewards.recipeIds || []).map(id=>getRecipe(id)?.name),...(event.rewards.equipmentIds || []).map(id=>getEquipment(id)?.name)].filter(Boolean);
  return <dialog ref={dialog} className="story-modal story-player growth-event-overlay" aria-label={`${event.title}のイベント`} onCancel={event=>event.preventDefault()}><div className="event-scene story-player growth-story-scene">
    <div className="story-stage is-speaking" data-character={character.id}>
      {storyImage&&!artFailed
        ?<img className="story-standing-art" src={storyImage} alt={`${character.name}の立ち絵`} onError={()=>setArtFailed(true)}/>
        :<div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>}
    </div>
    <div className="story-dialogue-panel growth-story-dialogue">
      <div ref={dialogueContent} className="story-content speaker-character" aria-live="polite"><span className="story-speaker">{character.name}</span><p>「{event.dialogue[page]}」</p>{finalPage&&<div className="story-reward growth-reward"><strong>{rewardNames.join("・")}</strong><small>{event.rewards.note}</small></div>}</div>
      <div className="story-footer"><span>{page+1} / {event.dialogue.length}</span><button type="button" className="primary-button" onClick={onNext}>{finalPage?"完了":"次へ →"}</button></div>
    </div>
  </div></dialog>;
}

function DevMenu({selected,onSelect,onClose,onSpawn,onRefresh,onReset}:{selected:string;onSelect:(id:string)=>void;onClose:()=>void;onSpawn:()=>void;onRefresh:()=>void;onReset:()=>void}) {
  const {state,dispatch}=useGame();
  const [confirmingReset,setConfirmingReset]=useState(false);
  const hasDeliveries=state.deliveries.length>0;
  const hasCooking=state.orders.some(order=>order.status==="cooking");
  return <div className="modal-backdrop" onClick={onClose}><div className="dev-panel" onClick={e=>e.stopPropagation()}><div className="dev-head"><div><h2>DEVメニュー</h2></div><button onClick={onClose}>×</button></div><div className="dev-grid"><button onClick={()=>dispatch({type:"DEV_COINS"})}>+10,000コイン</button><button onClick={onSpawn}>注文を即発生</button><button onClick={onRefresh}>ギフトショップ更新</button><button onClick={()=>dispatch({type:"DEV_UNLOCK_ALL"})}>料理全解放</button><button onClick={()=>dispatch({type:"DEV_FOREST_ENERGY"})}>こもれび体力 全回復</button><button disabled={!hasDeliveries} onClick={()=>dispatch({type:"DEV_COMPLETE_DELIVERIES"})}>即仕入れ完了</button><button disabled={!hasCooking} onClick={()=>dispatch({type:"DEV_COMPLETE_COOKING"})}>即調理完了</button></div><label>好感度を上げる人物<select value={selected} onChange={e=>onSelect(e.target.value)}>{characters.map(c=><option value={c.id} key={c.id}>{c.name}（{c.occupation}）</option>)}</select></label><button className="dev-affection" onClick={()=>dispatch({type:"DEV_AFFECTION",characterId:selected})}>好感度 +1,000・物語条件を解放</button>{confirmingReset?<div className="dev-reset-confirm" role="alert"><p>セーブデータを初期化して、最初からやり直しますか？</p><div><button type="button" onClick={()=>setConfirmingReset(false)}>キャンセル</button><button type="button" className="danger-button" onClick={onReset}>初期化する</button></div></div>:<button className="danger-button" onClick={()=>setConfirmingReset(true)}>セーブデータ初期化</button>}</div></div>;
}
