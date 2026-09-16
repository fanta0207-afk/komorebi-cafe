import { emptyForest, recoverForest, reduceForest, syncForestRecipes, handmadeAmount, migrateForest, type ForestAction } from './forest';
import { giftShopAutoSlot, giftShopDay, giftShopRefreshesLeft, replaceGiftShop, updateGiftShopClock } from "./giftShop";
import { getGift, sortGiftIdsByRarity } from "../data/gifts";
import { getCharacter } from "../data/characters";
import { getIngredient, ingredients } from "../data/ingredients";
import { getRecipe, recipes } from "../data/recipes";
import { baseEquipmentIds, initialEquipmentIds, equipment, getEquipment } from "../data/equipment";
import { getDecoration } from "../data/decorations";
import { getGrowthEvent } from "../data/growthEvents";
import { getRelationshipEvent, getStaffStoryEvent, relationshipEvents } from "../data/events";
import { getDateEvent } from "../data/dates";
import { conditionForDay } from "../data/dailyConditions";
import type { CharacterProgress, EventReward, GameState, GiftReaction, MissionPlace, Order, RelationshipRoute, StaffRole } from "../types/game";
import { claimMission, claimSideMission, emptyMissions, missions, milestoneMissions, restoreOngoing, updateMissions } from "./missions";
import { startCooking, serveOrder, equipmentPrice, upgradePrice, normalizeCookingTimes } from "./operations";
import { advanceGame, advanceOfflineProgress } from "./simulation";
import { nextTableUpgrade, tableCapacity, tableUpgradeUnlocked } from "./seating";
import { orderSupplies, receiveSupplies, requestStaffSupply, runAutoProcurement } from "./procurement";
import { autoProcurementUnlocked, staffHirePrice, staffHireStage, staffRoleAvailable } from "./automation";
import { stationOccupied } from "./kitchen";
import { GAME_CONFIG, giftRequirementTargets, relationshipLabel } from "./config";
import { characterGiftResponse } from "./conversation";
import { availableEvent, availableStaffStory, createCharacterProgress, growthRequirements, hiddenRecipeRewards, initialRecipeIds, giftAffectionAmount, giftReaction, relationshipRequirementTargets } from "./logic";

export type Action = ForestAction
  | {type:"FINISH_PROLOGUE"}
  | {type:"FINISH_ONBOARDING"}
  | {type:"BUY_TABLE"; expectedCount:number}
  | {type:"MISSION_VIEW"; place:MissionPlace}
  | {type:"CLAIM_MISSION"; missionId:string}
  | {type:"CLAIM_SIDE_MISSION"; missionId:string}
  | {type:"HYDRATE"; state:GameState}
  | {type:"VISIT"; characterId:string}
  | {type:"BUY_INGREDIENT"; ingredientId:string; packs?:number; now?:number}
  | {type:"BUY_GIFT"; giftId:string}
  | {type:"GIVE_GIFT"; characterId:string; giftId:string; reaction:GiftReaction}
  | {type:"CLOSE_GIFT_REACTION"; characterId:string; reaction:GiftReaction}
  | {type:"SPAWN_ORDER"; order:Order}
  | {type:"DECLINE_ORDER"; orderId:string}
  | {type:"COLLECT_ORDER"; orderId:string}
  | {type:"START_COOKING"; orderId:string}
  | {type:"TICK"; deltaMs:number; now?:number}
  | {type:"CATCH_UP"; now?:number}
  | {type:"REFRESH_SHOP"; items:string[]; costAction:boolean; now?:number}
  | {type:"COMPLETE_EVENT"; eventId:string; route?:Exclude<RelationshipRoute,"undecided">; choiceId?:string}
  | {type:"COMPLETE_STAFF_STORY"; eventId:string}
  | {type:"COMPLETE_GROWTH_EVENT"; eventId:string}
  | {type:"COMPLETE_DATE"; eventId:string}
  | {type:"BUY_EQUIPMENT"; equipmentId:string}
  | {type:"UPGRADE_EQUIPMENT"; stationId:string}
  | {type:"HIRE_STAFF"; characterId:string; role:StaffRole}
  | {type:"ASSIGN_STAFF"; characterId:string; role:StaffRole}
  | {type:"REQUEST_STAFF_SUPPLY"; orderId:string; ingredientId:string; staffId:string; now?:number}
  | {type:"TOGGLE_AUTO_PROCUREMENT"; enabled:boolean}
  | {type:"CLAIM_OFFLINE"}
  | {type:"NEXT_DAY"}
  | {type:"CLEAR_NOTICE"}
  | {type:"DEV_COINS"}
  | {type:"DEV_AFFECTION"; characterId:string}
  | {type:"DEV_UNLOCK_ALL"}
  | {type:"DEV_COMPLETE_DELIVERIES"}
  | {type:"DEV_COMPLETE_COOKING"}
  | {type:"DEV_FOREST_ENERGY"}
  | {type:"DEV_ACTIONS"}
  | {type:"RESET"};

const handmadeResponses:Record<string,string>={ren:'手で作ったものって、一杯のコーヒーと似てる。君の気持ちが伝わるよ。',sota:'作ってくれたんだね。あたたかい気持ちまで届いたよ。',aki:'森の恵みをこんなふうに使ってくれるなんて、うれしいな。',itsuki:'ひとつずつ仕上げたんだね。その丁寧さが好きだよ。',haru:'これ、君が作ったの？ 一緒に味わう時間も楽しみだな。',nagisa:'森の香りがするね。君の手作り、大事にするよ。',sae:'手作りか。……選んで、作ってくれた時間もうれしい。',cacao:'素材の組み合わせに君らしさが出てる。大切に味わうよ。'};
const emptyStats = () => ({ sales:0, orders:0, recipeSales:{} });
const emptyLifetimeStats = () => ({recipeSales:{},ingredientPurchases:{},tagSales:{},totalOrders:0,totalRevenue:0,giftPurchases:0,staffProcurementOrders:0,automaticPacks:0,automatedOrders:0});

export function createInitialState(now=Date.now()):GameState {
  const condition=conditionForDay(1);
  return {
    onboardingStage:"prologue",
    forest:emptyForest(),
    tableCount:1,
    missions:emptyMissions(),
    saveVersion:GAME_CONFIG.saveVersion, season:"春", day:1, currency:GAME_CONFIG.initialCurrency,
    stations:initialEquipmentIds.map(id=>({id:`${id}-1`,equipmentId:id,level:1})),staff:[],activeMs:0,spawnRemainingMs:1000,nextOrderNumber:1,
    deliveries:[], ingredients:{}, unlockedRecipes:initialRecipeIds, unlockedIngredients:[], characterProgress:createCharacterProgress(), inventory:{},
    giftShopItems:giftsForFirstDay(), giftShopSoldOut:[], giftShopRefreshAt:now,
    giftShopAutoRefreshAt:giftShopAutoSlot(now),giftShopRefreshDay:giftShopDay(now),giftShopManualRefreshes:0,
    dailyTalkStatus:{}, dailyGiftStatus:{},
    lastPlayedAt:Date.now(), dailyStats:emptyStats(), dayNews:[], orders:[], offlineOffer:0,
    maxActions:0, actionsRemaining:0,
    dailyWeatherId:condition.weatherId,dailyCustomerGroupId:condition.customerGroupId,dailyEventId:condition.dailyEventId,
    lifetimeStats:emptyLifetimeStats(),viewedGrowthEvents:[],viewedDateEvents:[],unlockedEquipment:[...baseEquipmentIds],ownedEquipment:[...initialEquipmentIds],unlockedDecorations:[],autoProcurementEnabled:false,
  };
}

function giftsForFirstDay() {
  return sortGiftIdsByRarity(["bouquet","cookies","book","handkerchief","earlGrey","plant","mintCandy","poundCake"]);
}

export function loadState():GameState {
  const fresh=createInitialState();
  if (typeof window === "undefined") return fresh;
  try {
    const raw=window.localStorage.getItem(GAME_CONFIG.saveKey);
    if (!raw) return fresh;
    const saved=JSON.parse(raw) as Partial<GameState>;
    return migrateSavedState(saved);
  } catch { return fresh; }
}

export function applyStoryReward(state:GameState, reward?:EventReward):GameState {
  if (!reward) return state;
  return {...state,
    unlockedIngredients:[...new Set([...state.unlockedIngredients,...(reward.ingredientIds || [])])],
    unlockedRecipes:[...new Set([...state.unlockedRecipes,...(reward.recipeIds || [])])],
    unlockedEquipment:[...new Set([...state.unlockedEquipment,...(reward.equipmentIds || [])])],
  };
}

export function migrateSavedState(saved:Partial<GameState>, now=Date.now()):GameState {
    const fresh=createInitialState(now);
    if (!saved || typeof saved!=="object") return fresh;
    const savedDay=saved.day || 1;
    const condition=conditionForDay(savedDay);

    const characterProgress:Record<string,CharacterProgress>=Object.fromEntries(Object.entries(fresh.characterProgress).map(([id,initial])=>{
      const old=saved.characterProgress?.[id];
      if (!old) return [id,initial];
      const legacy=(saved.saveVersion || 1)<4;
      const stage=old.met?Math.max(legacy?1:0,Math.min(10,old.relationshipStage || 0)):0;
      const viewed=legacy?relationshipEvents.filter(event=>event.characterId===id && event.toStage<=stage).map(event=>event.id):(old.viewedEvents || []);
      const giftReactions=old.giftReactions || {};
      const viewedGiftReactions=[...new Set((Array.isArray(old.viewedGiftReactions)?old.viewedGiftReactions:[]).filter(reaction=>["love","like","normal","dislike"].includes(reaction)))];
      const giftsGiven=Number.isInteger(old.giftsGiven)?Math.max(0,old.giftsGiven):Math.max(Object.keys(giftReactions).length,giftRequirementTargets[stage]);
      return [id,{...initial,...old,relationshipStage:stage,viewedEvents:viewed,giftsGiven,route:old.route || "undecided",eventChoices:old.eventChoices || {},giftReactions,viewedGiftReactions}];
    }));
    const ongoing=restoreOngoing(saved.missions?.ongoing);
    const missionIds=new Set([...missions,...milestoneMissions,...ongoing].map(m=>m.id));
    const savedVersion=saved.saveVersion || 1;
    const validSavedOrders=(saved.orders||[]).filter(order=>Number.isInteger(order.customerSlot)&&order.customerSlot>=0&&order.customerSlot<GAME_CONFIG.maxOrders);
    // Versions before v10 could silently turn the old four-seat layout into four
    // purchased table sets. Reset that inferred capacity once; only BUY_TABLE may
    // increase it from now on. Preserve the most progressed in-flight order.
    const previousTables=savedVersion<10?1:Number.isInteger(saved.tableCount)?Math.max(1,Math.min(GAME_CONFIG.maxOrders,saved.tableCount!)):1;
    const orderPriority=(order:Order)=>order.status==="ready"?2:order.status==="cooking"?1:0;
    const legacyOrder=savedVersion<10?[...validSavedOrders].sort((a,b)=>orderPriority(b)-orderPriority(a))[0]:undefined;
    const savedOrders=savedVersion<10?(legacyOrder?[{...legacyOrder,customerSlot:0}]:[]):validSavedOrders.filter(order=>order.customerSlot<previousTables);
    const keptOrderIds=new Set(savedOrders.map(order=>order.id));
    const discardedOrders=validSavedOrders.filter(order=>!keptOrderIds.has(order.id));
    const pending=saved.pendingGiftReaction;
    const pendingGiftReaction=pending&&getCharacter(pending.characterId)&&getGift(pending.giftId)
      && ["love","like","normal","dislike"].includes(pending.reaction)
      && pending.reaction===giftReaction(getCharacter(pending.characterId)!,getGift(pending.giftId)!)
      && typeof pending.response==="string"&&pending.response.length>0
      && !characterProgress[pending.characterId].viewedGiftReactions.includes(pending.reaction)?pending:undefined;
    const savedLastPlayedAt=Number.isFinite(saved.lastPlayedAt)&&saved.lastPlayedAt!<=now?saved.lastPlayedAt!:now;
    let migrated:GameState={
      ...fresh, ...saved, saveVersion:GAME_CONFIG.saveVersion,
      onboardingStage:savedVersion>=25&&(saved.onboardingStage==="prologue"||saved.onboardingStage==="mission"||saved.onboardingStage==="complete")?saved.onboardingStage:"complete",
      forest:recoverForest({...emptyForest(now),...saved.forest},now),
      tableCount:previousTables,
      missions:{...emptyMissions(),...saved.missions,
        ongoing,
        completed:[...new Set((saved.missions?.completed||[]).filter(id=>missionIds.has(id)))],
        claimed:[...new Set((saved.missions?.claimed||[]).filter(id=>missionIds.has(id)))],
        visited:(saved.missions?.visited||[]).filter(id=>["town","inventory","gifts","ren","recipes","equipment"].includes(id)),
        receivedPacks:saved.missions?.receivedPacks||{},
        sideClaimed:(saved.missions?.sideClaimed||[]).filter(id=>id.startsWith("side-")),
      },
      characterProgress,
      pendingGiftReaction,
      giftShopItems:sortGiftIdsByRarity((saved.giftShopItems || fresh.giftShopItems).filter(id=>!!getGift(id)).slice(0,GAME_CONFIG.giftShopSize)),
      giftShopSoldOut:(saved.giftShopSoldOut||[]).filter(id=>(saved.giftShopItems||fresh.giftShopItems).includes(id)&&!!getGift(id)),
      giftShopRefreshAt:Number.isFinite(saved.giftShopRefreshAt)?saved.giftShopRefreshAt!:now,
      giftShopAutoRefreshAt:giftShopAutoSlot(Number.isFinite(saved.giftShopAutoRefreshAt)?saved.giftShopAutoRefreshAt!:Number.isFinite(saved.giftShopRefreshAt)?saved.giftShopRefreshAt!:now),
      giftShopRefreshDay:Number.isInteger(saved.giftShopRefreshDay)?saved.giftShopRefreshDay!:giftShopDay(now),
      giftShopManualRefreshes:Number.isInteger(saved.giftShopManualRefreshes)?Math.max(0,Math.min(GAME_CONFIG.giftShopDailyRefreshLimit,saved.giftShopManualRefreshes!)):0,
      dailyStats:{ ...emptyStats(), ...(saved.dailyStats || {}) },
      lifetimeStats:{...emptyLifetimeStats(),...(saved.lifetimeStats || {}),recipeSales:saved.lifetimeStats?.recipeSales || {},ingredientPurchases:saved.lifetimeStats?.ingredientPurchases || {},tagSales:saved.lifetimeStats?.tagSales || {}},
      unlockedIngredients:saved.unlockedIngredients || [],
      viewedGrowthEvents:saved.viewedGrowthEvents || [],
      viewedDateEvents:saved.viewedDateEvents || [],
      unlockedEquipment:saved.unlockedEquipment || [],ownedEquipment:saved.ownedEquipment || [],unlockedDecorations:saved.unlockedDecorations || [],
      maxActions:0,
      actionsRemaining:0,
      dailyWeatherId:saved.dailyWeatherId || condition.weatherId,
      dailyCustomerGroupId:saved.dailyCustomerGroupId || condition.customerGroupId,
      dailyEventId:saved.dailyEventId || condition.dailyEventId,
      deliveries:Array.isArray(saved.deliveries) ? saved.deliveries.filter(item => item && getIngredient(item.ingredientId)
        && typeof item.id === "string" && Number.isInteger(item.packs) && item.packs > 0 && item.packs <= GAME_CONFIG.maxProcurementPacks
        && Number.isFinite(item.orderedAt) && Number.isFinite(item.arrivesAt) && item.arrivesAt >= item.orderedAt)
        .map(item=>({...item,servingsPerPack:Number.isInteger(item.servingsPerPack)&&item.servingsPerPack>0?item.servingsPerPack:5})) : [],
      orders:savedOrders,
      staff:(saved.staff||[]).slice(0,GAME_CONFIG.maxStaff).map(person=>{
        const role:StaffRole=["cook","server","procurement","rest"].includes(person.role)?person.role:"rest";
        const {returningFromSlot:savedReturnSlot,...base}=person;
        const returningFromSlot=typeof savedReturnSlot==="number"&&Number.isInteger(savedReturnSlot)&&savedReturnSlot>=0&&savedReturnSlot<GAME_CONFIG.maxOrders?savedReturnSlot:undefined;
        if(person.servingOrderId&&!keptOrderIds.has(person.servingOrderId))return {...base,role,servingOrderId:undefined,remainingMs:0};
        if(person.servingOrderId)return {...base,role,remainingMs:Number.isFinite(person.remainingMs)?Math.max(0,person.remainingMs):0};
        return returningFromSlot!==undefined?{...base,role,servingOrderId:undefined,returningFromSlot,remainingMs:Number.isFinite(person.remainingMs)?Math.max(0,person.remainingMs):0}:{...base,role,remainingMs:0};
      }),
      lastPlayedAt:savedLastPlayedAt,
      autoProcurementEnabled:!!saved.autoProcurementEnabled,
      offlineOffer:0, notice:undefined,
    };
    // Old saves retain their earned stages; make the newly authored memories and rewards available.
    if (savedVersion<4) {
      for (const event of relationshipEvents) {
        if (characterProgress[event.characterId].viewedEvents.includes(event.id)) migrated=applyStoryReward(migrated,event.reward);
      }
    }
    if (savedVersion<5) {
      migrated.ingredients={...Object.fromEntries(Object.entries(saved.ingredients || {}).map(([id,count])=>[id,count*5]))};
      for(const id of ["coffeeBeans","bread"])migrated.ingredients[id]=(migrated.ingredients[id]||0)+10;
      migrated.ownedEquipment=[...new Set([...baseEquipmentIds,...migrated.ownedEquipment])];
      migrated.unlockedEquipment=[...new Set([...baseEquipmentIds,...migrated.unlockedEquipment])];
      migrated.stations=migrated.ownedEquipment.map(id=>({id:`${id}-1`,equipmentId:id,level:1}));
      migrated.staff=[];
      migrated.orders=migrated.orders.map(order=>({...order,status:"queued",remainingMs:0,totalMs:0}));
    }
    if(savedVersion>=5&&savedVersion<10) {
      // Orders removed with the inferred seats never charged when queued. Return
      // ingredients for any cooking or completed dishes that had already charged.
      const ingredients={...migrated.ingredients};
      for(const order of discardedOrders)if(order.status!=="queued")for(const id of getRecipe(order.recipeId)?.requiredIngredients||[])ingredients[id]=(ingredients[id]||0)+1;
      migrated.ingredients=ingredients;
    }
    if(savedVersion<7) {
      // Paid purchases minus pending packs are evidence of already completed deliveries.
      migrated.missions.receivedPacks=Object.fromEntries(Object.entries(migrated.lifetimeStats.ingredientPurchases).map(([id,packs])=>[id,Math.max(0,packs-migrated.deliveries.filter(d=>d.ingredientId===id).reduce((sum,d)=>sum+d.packs,0))]));
    }
    migrated=migrateForest(migrated,savedVersion,now);
    migrated=normalizeCookingTimes(migrated);
    migrated=advanceOfflineProgress(migrated,now);
    migrated={...migrated,lastPlayedAt:now};
    return updateMissions(syncForestRecipes(updateGiftShopClock(receiveSupplies(migrated, now),now)));
}

const notice = (type:NonNullable<GameState["notice"]>["type"], text:string) => ({ id:Date.now()+Math.random(), type, text });

function rewardNotice(reward:EventReward) {
  const groups=[
    {ids:reward.ingredientIds||[],label:"食材",unit:"種",name:(id:string)=>getIngredient(id)?.name,verb:"仕入れ解放"},
    {ids:reward.recipeIds||[],label:"料理",unit:"品",name:(id:string)=>getRecipe(id)?.name,verb:"解放"},
    {ids:reward.equipmentIds||[],label:"設備",unit:"台",name:(id:string)=>getEquipment(id)?.name,verb:"購入解放"},
    {ids:reward.decorationIds||[],label:"飾り",unit:"点",name:(id:string)=>getDecoration(id)?.name,verb:"解放"},
  ].filter(group=>group.ids.length);
  if(groups.length>1)return `${groups.map(group=>group.label).join("・")}を解放`;
  const group=groups[0];
  if(group?.ids.length>1)return `${group.label}${group.ids.length}${group.unit}を解放`;
  if(group){
    const name=group.name(group.ids[0])||group.label;
    return group.verb==="解放"?`${name}を解放`:`${name}の${group.verb}`;
  }
  return reward.note.includes("1パック5食分")?"仕入れ量：1パック5食分":"物語を読了";
}

export function reducer(state:GameState, action:Action):GameState {
  const next=action.type.startsWith("FOREST_")||action.type==="USE_SUPPLY_TICKET"?reduceForest(state,action as ForestAction):reduceAction(state,action);
  return next===state||action.type==="RESET"?next:updateMissions(syncForestRecipes(next));
}

function reduceAction(state:GameState, action:Action):GameState {
  switch(action.type) {
    case "FINISH_PROLOGUE": return state.onboardingStage==="prologue"?{...state,onboardingStage:"mission"}:state;
    case "FINISH_ONBOARDING": return state.onboardingStage!=="complete"?{...state,onboardingStage:"complete"}:state;
    case "CLAIM_MISSION": return claimMission(state,action.missionId);
    case "CLAIM_SIDE_MISSION": return claimSideMission(state,action.missionId);
    case "MISSION_VIEW": {
      if(!["town","inventory","gifts","ren","recipes","equipment"].includes(action.place)||state.missions.visited.includes(action.place))return state;
      return {...state,missions:{...state.missions,visited:[...state.missions.visited,action.place]}};
    }
    case "HYDRATE": return action.state;
    case "VISIT": {
      const current=state.characterProgress[action.characterId];
      if (!current) return state;
      const firstToday=!current.talkedStages.includes(current.relationshipStage);
      return {
        ...state,
        characterProgress:{ ...state.characterProgress, [action.characterId]:{ ...current, met:true, visits:current.visits+1, talkedStages:firstToday?[...current.talkedStages,current.relationshipStage]:current.talkedStages, affection:current.affection+(firstToday?GAME_CONFIG.talkAffection:0) } },
        dailyTalkStatus:{ ...state.dailyTalkStatus, [action.characterId]:true },
        notice:firstToday?notice("heart","会話で好感度アップ ♡"):notice("info",action.characterId==="ren"?"蓮と話しました":action.characterId==="sota"?"牧と話しました":action.characterId==="aki"?"葵と話しました":action.characterId==="itsuki"?"アールと話しました":action.characterId==="haru"?"太陽と話しました":action.characterId==="nagisa"?"静と話しました":action.characterId==="sae"?"冴と話しました":action.characterId==="cacao"?"カカオと話しました":"会話しました"),
      };
    }
    case "BUY_INGREDIENT": return orderSupplies(state, action.ingredientId, action.packs, action.now);
    case "BUY_GIFT": {
      const item=getGift(action.giftId);
      if(!item||!state.giftShopItems.includes(item.id)||state.giftShopSoldOut.includes(item.id))return {...state,notice:notice("info","このギフトは売り切れです")};
      if(state.currency<item.price)return { ...state, notice:notice("info","コインが足りません") };
      return { ...state, missions:{...state.missions,boughtBook:state.missions.boughtBook||item.id==="book"},currency:state.currency-item.price,
        giftShopSoldOut:[...state.giftShopSoldOut,item.id],inventory:{ ...state.inventory,[item.id]:(state.inventory[item.id]||0)+1 },
        lifetimeStats:{...state.lifetimeStats,giftPurchases:state.lifetimeStats.giftPurchases+1},notice:notice("info",`${item.name}を購入`) };
    }
    case "GIVE_GIFT": {
      const item=getGift(action.giftId); const current=state.characterProgress[action.characterId];
      if (!item || !current || !(state.inventory[item.id]>0) || state.pendingGiftReaction) return state;
      const reaction=giftReaction(getCharacter(action.characterId)!,item);
      const amount=item.handmade?handmadeAmount(item,reaction,current):giftAffectionAmount(item,reaction);
      const nextCount=state.inventory[item.id]-1;
      const nextInventory={ ...state.inventory, [item.id]:nextCount };
      return {
        ...state,
        pendingGiftReaction:current.viewedGiftReactions.includes(reaction)?undefined:{characterId:action.characterId,giftId:item.id,reaction,response:(item.handmade?handmadeResponses[action.characterId]+' ':'')+characterGiftResponse(getCharacter(action.characterId)!,current,item,reaction)},
        missions:{...state.missions,gaveBook:state.missions.gaveBook||(action.characterId==="ren"&&item.id==="book")},inventory:nextInventory, dailyGiftStatus:{ ...state.dailyGiftStatus,[action.characterId]:true },
        characterProgress:{ ...state.characterProgress,[action.characterId]:{ ...current,lastGiftId:item.id,giftStreak:current.lastGiftId===item.id?(current.giftStreak||0)+1:1,handmadeFirst:item.handmade&&(reaction==='love'||reaction==='like')?[...new Set([...(current.handmadeFirst||[]),item.id])]:(current.handmadeFirst||[]),affection:Math.max(0,current.affection+amount),giftsGiven:current.giftsGiven+1,giftReactions:{...current.giftReactions,[item.id]:reaction} } },
        notice:notice("heart",amount>0?`好感度 +${amount} ♡`:`好感度 ${amount}・好みではない`),
      };
    }
    case "CLOSE_GIFT_REACTION": {
      const pending=state.pendingGiftReaction;
      if(!pending || pending.characterId!==action.characterId || pending.reaction!==action.reaction)return state;
      const current=state.characterProgress[pending.characterId];
      return {...state,pendingGiftReaction:undefined,characterProgress:{...state.characterProgress,[pending.characterId]:{
        ...current,viewedGiftReactions:[...new Set([...current.viewedGiftReactions,pending.reaction])],
      }}};
    }
    case "SPAWN_ORDER": {
      if (state.orders.length>=tableCapacity(state) || state.orders.some(order=>order.customerSlot===action.order.customerSlot||order.id===action.order.id)||getRecipe(action.order.recipeId)?.forest||!getRecipe(action.order.recipeId)||!Number.isInteger(action.order.customerSlot)||action.order.customerSlot<0||action.order.customerSlot>=tableCapacity(state)) return state;
      return { ...state, orders:[...state.orders,{...action.order,status:"queued",remainingMs:0,totalMs:0,stationId:undefined,cookId:undefined}] };
    }
    case "DECLINE_ORDER": {
      const order=state.orders.find(item=>item.id===action.orderId);
      if(!order || (order.status!=="queued"&&!(order.forestPrepared&&order.status==="ready")))return state;
      return {...state,forest:order.forestReserved?{...state.forest,dishes:{...state.forest.dishes,[order.recipeId]:(state.forest.dishes[order.recipeId]||0)+1}}:state.forest,orders:state.orders.filter(item=>item.id!==order.id),notice:notice("info","注文をお断りしました")};
    }
    case "START_COOKING": return startCooking(state,action.orderId);
    case "TICK": {
      if(!Number.isFinite(action.deltaMs)||action.deltaMs<=0||action.deltaMs>1000)return state;
      const now=action.now ?? Date.now();
      const next=advanceGame(runAutoProcurement(receiveSupplies(updateGiftShopClock({...state,forest:recoverForest(state.forest,now)},now),now),now),action.deltaMs);
      return next===state?state:{...next,lastPlayedAt:now};
    }
    case "CATCH_UP": {
      const now=action.now ?? Date.now();
      if(!Number.isFinite(now))return state;
      const progressed=advanceOfflineProgress(state,now);
      const next=runAutoProcurement(receiveSupplies(updateGiftShopClock({...progressed,forest:recoverForest(progressed.forest,now)},now),now),now);
      return {...next,lastPlayedAt:now};
    }
    case "COLLECT_ORDER": return serveOrder(state,action.orderId);
    case "REFRESH_SHOP": {
      const now=action.now ?? Date.now();
      if(!Number.isFinite(now))return state;
      const current=updateGiftShopClock(state,now);
      // The existing DEV menu passes false; ordinary shop updates use the daily limit.
      if(action.costAction&&!giftShopRefreshesLeft(current))return {...current,notice:notice("info","手動更新は本日終了（3回まで）")};
      return {...replaceGiftShop(current,action.items,now),giftShopManualRefreshes:current.giftShopManualRefreshes+(action.costAction?1:0),notice:notice("info","品揃えを更新")};
    }
    case "COMPLETE_EVENT": {
      const event=getRelationshipEvent(action.eventId);
      if (!event || !availableEvent(state,[event])) return state;
      const current=state.characterProgress[event.characterId];
      if (event.toStage===9 && action.route!=="romance" && action.route!=="friendship") return state;
      if (event.toStage===10 && current.route==="undecided") return state;
      if (event.choices && !event.choices.some(choice=>choice.id===action.choiceId)) return state;
      const route=event.toStage===9?action.route!:current.route;
      const rewarded=applyStoryReward(state,event.reward);
      return { ...rewarded,
        characterProgress:{ ...state.characterProgress,[event.characterId]:{ ...current,route,relationshipStage:event.toStage,viewedEvents:[...current.viewedEvents,event.id],eventChoices:{...current.eventChoices,...(action.choiceId?{[event.id]:action.choiceId}:{})} } },
        dayNews:[...state.dayNews,`${getCharacter(event.characterId)?.name}との好感度が${event.toStage}「${relationshipLabel(event.toStage,route)}」になりました`,...(event.reward?[event.reward.note]:[])],
        notice:notice(event.reward?"unlock":"heart",event.reward?rewardNotice(event.reward):"関係が深まりました ♡") };
    }
    case "COMPLETE_STAFF_STORY": {
      const event=getStaffStoryEvent(action.eventId);
      if(!event || !availableStaffStory(state,[event]))return state;
      const current=state.characterProgress[event.characterId];
      return {...state,characterProgress:{...state.characterProgress,[event.characterId]:{
        ...current,viewedEvents:[...current.viewedEvents,event.id],
      }}};
    }
    case "COMPLETE_GROWTH_EVENT": {
      const event=getGrowthEvent(action.eventId);if(!event||state.viewedGrowthEvents.includes(event.eventId))return state;
      if (!state.characterProgress[event.characterId]?.met || !growthRequirements(event,state).every(item=>item.met)) return state;
      const nextViewed=[...state.viewedGrowthEvents,event.eventId];
      const baseRecipes=[...new Set([...state.unlockedRecipes,...(event.rewards.recipeIds || [])])];
      const hidden=hiddenRecipeRewards(nextViewed,baseRecipes);
      const nextRecipes=[...new Set([...baseRecipes,...hidden.map(item=>item.recipeId)])];
      const news=[event.rewards.note,...hidden.map(item=>item.note)];
      return {...state,viewedGrowthEvents:nextViewed,
        unlockedIngredients:[...new Set([...state.unlockedIngredients,...(event.rewards.ingredientIds || [])])],
        unlockedRecipes:nextRecipes,
        unlockedEquipment:[...new Set([...state.unlockedEquipment,...(event.rewards.equipmentIds || [])])],
        dayNews:[...state.dayNews,...news],notice:notice("unlock",hidden[0]?`隠し料理：${getRecipe(hidden[0].recipeId)?.name}を解放`:rewardNotice(event.rewards))};
    }
    case "COMPLETE_DATE": {
      const event=getDateEvent(action.eventId);if(!event||state.viewedDateEvents.includes(event.id))return state;
      const current=state.characterProgress[event.characterId];
      if(!current?.met||current.relationshipStage<GAME_CONFIG.dateUnlockStage)return state;
      return {...state,viewedDateEvents:[...state.viewedDateEvents,event.id],
        characterProgress:{...state.characterProgress,[event.characterId]:{...current,affection:current.affection+GAME_CONFIG.dateAffection}},
        dayNews:[...state.dayNews,`${getCharacter(event.characterId)?.shortName}と${event.title}へ行きました`],
        notice:notice("heart","デートで好感度アップ ♡")};
    }
    case "BUY_TABLE": {
      const offer=nextTableUpgrade(state);
      if(!offer||action.expectedCount!==tableCapacity(state)||!tableUpgradeUnlocked(state,offer.missionId)||state.currency<offer.price)return state;
      return {...state,tableCount:offer.count,currency:state.currency-offer.price,notice:notice("unlock",`客席${offer.count}セットに増設`)};
    }
    case "BUY_EQUIPMENT": {
      const item=getEquipment(action.equipmentId);
      if(!item||!state.unlockedEquipment.includes(item.id)||state.stations.filter(station=>station.equipmentId===item.id).length>=GAME_CONFIG.maxStationsPerType)return state;
      const price=equipmentPrice(state,item.id);
      if(state.currency<price)return {...state,notice:notice("info","コインが足りません")};
      const number=state.stations.filter(station=>station.equipmentId===item.id).length+1;
      return {...state,currency:state.currency-price,stations:[...state.stations,{id:`${item.id}-${number}`,equipmentId:item.id,level:1}],ownedEquipment:[...new Set([...state.ownedEquipment,item.id])],notice:notice("unlock",`${item.name}を設置`)};
    }
    case "UPGRADE_EQUIPMENT": {
      const station=state.stations.find(item=>item.id===action.stationId);
      if(!station||station.level>=GAME_CONFIG.maxStationLevel||stationOccupied(state,station.id))return state;
      const price=upgradePrice(station);if(state.currency<price)return state;
      return {...state,currency:state.currency-price,stations:state.stations.map(item=>item.id===station.id?{...item,level:item.level+1}:item),notice:notice("unlock",`設備Lv.${station.level+1}に強化`)};
    }
    case "HIRE_STAFF": {
      const current=state.characterProgress[action.characterId];
      const price=staffHirePrice(action.characterId);
      if(!current||current.relationshipStage<staffHireStage(action.characterId)||state.staff.length>=GAME_CONFIG.maxStaff||state.staff.some(person=>person.characterId===action.characterId)||state.currency<price||!["cook","server","procurement","rest"].includes(action.role)||!staffRoleAvailable(state,action.role))return state;
      return {...state,currency:state.currency-price,staff:[...state.staff,{characterId:action.characterId,role:action.role,remainingMs:0}],notice:notice("heart",`${getCharacter(action.characterId)?.shortName}がスタッフに加入`)};
    }
    case "ASSIGN_STAFF": {
      if(!["cook","server","procurement","rest"].includes(action.role)||!staffRoleAvailable(state,action.role,action.characterId))return state;
      return {...state,staff:state.staff.map(person=>person.characterId===action.characterId?{...person,role:action.role}:person)};
    }
    case "REQUEST_STAFF_SUPPLY": return requestStaffSupply(state,action.orderId,action.ingredientId,action.staffId,action.now);
    case "TOGGLE_AUTO_PROCUREMENT": {
      if(action.enabled&&!autoProcurementUnlocked(state))return state;
      return {...state,autoProcurementEnabled:action.enabled,notice:notice("info",action.enabled?"自動仕入れ開始":"自動仕入れ停止")};
    }
    // Retained action names let older development tools fail safely after migration.
    case "CLAIM_OFFLINE": case "NEXT_DAY": case "DEV_ACTIONS": return state;
    case "CLEAR_NOTICE": return { ...state,notice:undefined };
    case "DEV_COINS": return { ...state,currency:state.currency+10000,notice:notice("coin","+10,000 コイン") };
    case "DEV_AFFECTION": {
      const current=state.characterProgress[action.characterId],character=getCharacter(action.characterId); if(!current||!character)return state;
      const supplierIngredient=ingredients.find(item=>item.supplierId===character.supplierId&&!item.unlockEventId);
      const {orderTarget,purchaseTarget,giftTarget}=relationshipRequirementTargets(10);
      const ingredientPurchases=supplierIngredient?{...state.lifetimeStats.ingredientPurchases,[supplierIngredient.id]:Math.max(state.lifetimeStats.ingredientPurchases[supplierIngredient.id]||0,purchaseTarget)}:state.lifetimeStats.ingredientPurchases;
      return { ...state,
        characterProgress:{...state.characterProgress,[action.characterId]:{...current,met:true,affection:current.affection+1000,giftsGiven:Math.max(current.giftsGiven,giftTarget)}},
        lifetimeStats:{...state.lifetimeStats,totalOrders:Math.max(state.lifetimeStats.totalOrders,orderTarget),ingredientPurchases},
        notice:notice("heart","好感度 +1,000・物語解放") };
    }
    case "DEV_UNLOCK_ALL": return {...state,unlockedRecipes:recipes.map(item=>item.id),unlockedEquipment:equipment.map(item=>item.id),ownedEquipment:equipment.map(item=>item.id),stations:equipment.map(item=>({id:`${item.id}-1`,equipmentId:item.id,level:1})),notice:notice("unlock","料理・設備を全解放")};
    case "DEV_COMPLETE_DELIVERIES": {
      if(!state.deliveries.length)return state;
      return receiveSupplies(state,Math.max(...state.deliveries.map(delivery=>delivery.arrivesAt)));
    }
    case "DEV_COMPLETE_COOKING": {
      if(!state.orders.some(order=>order.status==="cooking"))return state;
      return {...state,orders:state.orders.map(order=>order.status==="cooking"?{...order,status:"ready",remainingMs:0}:order),notice:notice("info","調理中の料理を全完成")};
    }
    case "DEV_FOREST_ENERGY": return {...state,forest:{...state.forest,energy:70,recoveredAt:Date.now()},notice:notice("info","こもれび体力を全回復")};
    case "RESET": return createInitialState();
    default:return state;
  }
}
