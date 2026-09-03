import { getGift } from "../data/gifts";
import { characters, getCharacter } from "../data/characters";
import { getIngredient } from "../data/ingredients";
import { getRecipe, recipes } from "../data/recipes";
import { baseEquipmentIds, equipment, getEquipment } from "../data/equipment";
import { getGrowthEvent } from "../data/growthEvents";
import { getRelationshipEvent, relationshipEvents } from "../data/events";
import { conditionForDay } from "../data/dailyConditions";
import type { CharacterProgress, EventReward, GameState, GiftReaction, Order, RelationshipRoute, StaffRole } from "../types/game";
import { startCooking, serveOrder, equipmentPrice, upgradePrice } from "./operations";
import { advanceGame } from "./simulation";
import { stationOccupied } from "./kitchen";
import { GAME_CONFIG, relationshipLabel } from "./config";
import { availableEvent, createCharacterProgress, findNewRecipes, growthRequirements, hiddenRecipeRewards, initialRecipeIds, giftReaction } from "./logic";

export type Action =
  | {type:"HYDRATE"; state:GameState}
  | {type:"VISIT"; characterId:string}
  | {type:"BUY_INGREDIENT"; ingredientId:string}
  | {type:"BUY_GIFT"; giftId:string}
  | {type:"GIVE_GIFT"; characterId:string; giftId:string; reaction:GiftReaction}
  | {type:"SPAWN_ORDER"; order:Order}
  | {type:"COLLECT_ORDER"; orderId:string}
  | {type:"START_COOKING"; orderId:string}
  | {type:"TICK"; deltaMs:number}
  | {type:"REFRESH_SHOP"; items:string[]; costAction:boolean}
  | {type:"COMPLETE_EVENT"; eventId:string; route?:Exclude<RelationshipRoute,"undecided">; choiceId?:string}
  | {type:"COMPLETE_GROWTH_EVENT"; eventId:string}
  | {type:"BUY_EQUIPMENT"; equipmentId:string}
  | {type:"UPGRADE_EQUIPMENT"; stationId:string}
  | {type:"HIRE_STAFF"; characterId:string; role:StaffRole}
  | {type:"ASSIGN_STAFF"; characterId:string; role:StaffRole}
  | {type:"RETURN_GIFT"; giftId:string}
  | {type:"CLAIM_OFFLINE"}
  | {type:"NEXT_DAY"}
  | {type:"CLEAR_NOTICE"}
  | {type:"DEV_COINS"}
  | {type:"DEV_AFFECTION"; characterId:string}
  | {type:"DEV_UNLOCK_ALL"}
  | {type:"DEV_ACTIONS"}
  | {type:"RESET"};

const emptyStats = () => ({ sales:0, orders:0, recipeSales:{} });
const emptyLifetimeStats = () => ({recipeSales:{},ingredientPurchases:{},tagSales:{},totalOrders:0,totalRevenue:0});

export function createInitialState():GameState {
  const condition=conditionForDay(1);
  return {
    saveVersion:GAME_CONFIG.saveVersion, season:"春", day:1, currency:GAME_CONFIG.initialCurrency,
    stations:baseEquipmentIds.map(id=>({id:`${id}-1`,equipmentId:id,level:1})),staff:[],activeMs:0,spawnRemainingMs:1000,nextOrderNumber:1,
    ingredients:{coffeeBeans:10,bread:10}, unlockedRecipes:initialRecipeIds, unlockedIngredients:[], characterProgress:createCharacterProgress(), inventory:{},
    giftShopItems:giftsForFirstDay(), giftShopRefreshAt:Date.now(), dailyTalkStatus:{}, dailyGiftStatus:{},
    lastPlayedAt:Date.now(), dailyStats:emptyStats(), dayNews:[], orders:[], offlineOffer:0,
    maxActions:0, actionsRemaining:0,
    dailyWeatherId:condition.weatherId,dailyCustomerGroupId:condition.customerGroupId,dailyEventId:condition.dailyEventId,
    lifetimeStats:emptyLifetimeStats(),viewedGrowthEvents:[],unlockedEquipment:[...baseEquipmentIds],ownedEquipment:[...baseEquipmentIds],unlockedDecorations:[],
  };
}

function giftsForFirstDay() {
  return ["bouquet","cookies","book","mug","handkerchief","earlGrey","chocolateBox","plant","scarf","animalCharm"];
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
    unlockedDecorations:[...new Set([...state.unlockedDecorations,...(reward.decorationIds || [])])],
  };
}

export function migrateSavedState(saved:Partial<GameState>, now=Date.now()):GameState {
    const fresh=createInitialState();
    if (!saved || typeof saved!=="object") return fresh;
    const savedDay=saved.day || 1;
    const condition=conditionForDay(savedDay);

    const characterProgress:Record<string,CharacterProgress>=Object.fromEntries(Object.entries(fresh.characterProgress).map(([id,initial])=>{
      const old=saved.characterProgress?.[id];
      if (!old) return [id,initial];
      const legacy=(saved.saveVersion || 1)<4;
      const stage=old.met?Math.max(legacy?1:0,Math.min(10,old.relationshipStage || 0)):0;
      const viewed=legacy?relationshipEvents.filter(event=>event.characterId===id && event.toStage<=stage).map(event=>event.id):(old.viewedEvents || []);
      return [id,{...initial,...old,relationshipStage:stage,viewedEvents:viewed,route:old.route || "undecided",eventChoices:old.eventChoices || {}}];
    }));
    let migrated:GameState={
      ...fresh, ...saved, saveVersion:GAME_CONFIG.saveVersion,
      characterProgress,
      dailyStats:{ ...emptyStats(), ...(saved.dailyStats || {}) },
      lifetimeStats:{...emptyLifetimeStats(),...(saved.lifetimeStats || {}),recipeSales:saved.lifetimeStats?.recipeSales || {},ingredientPurchases:saved.lifetimeStats?.ingredientPurchases || {},tagSales:saved.lifetimeStats?.tagSales || {}},
      unlockedIngredients:saved.unlockedIngredients || [],
      viewedGrowthEvents:saved.viewedGrowthEvents || [],
      unlockedEquipment:saved.unlockedEquipment || [],ownedEquipment:saved.ownedEquipment || [],unlockedDecorations:saved.unlockedDecorations || [],
      maxActions:0,
      actionsRemaining:0,
      dailyWeatherId:saved.dailyWeatherId || condition.weatherId,
      dailyCustomerGroupId:saved.dailyCustomerGroupId || condition.customerGroupId,
      dailyEventId:saved.dailyEventId || condition.dailyEventId,
      orders:saved.orders || [], lastPlayedAt:now,
      offlineOffer:0, notice:undefined,
    };
    // Old saves retain their earned stages; make the newly authored memories and rewards available.
    if ((saved.saveVersion || 1)<4) {
      for (const event of relationshipEvents) {
        if (characterProgress[event.characterId].viewedEvents.includes(event.id)) migrated=applyStoryReward(migrated,event.reward);
      }
    }
    if ((saved.saveVersion || 1)<5) {
      migrated.ingredients={...Object.fromEntries(Object.entries(saved.ingredients || {}).map(([id,count])=>[id,count*GAME_CONFIG.ingredientPackSize]))};
      for(const id of ["coffeeBeans","bread"])migrated.ingredients[id]=(migrated.ingredients[id]||0)+10;
      migrated.ownedEquipment=[...new Set([...baseEquipmentIds,...migrated.ownedEquipment])];
      migrated.unlockedEquipment=[...new Set([...baseEquipmentIds,...migrated.unlockedEquipment])];
      migrated.stations=migrated.ownedEquipment.map(id=>({id:`${id}-1`,equipmentId:id,level:1}));
      migrated.staff=[];
      migrated.orders=migrated.orders.map(order=>({...order,status:"queued",remainingMs:0,totalMs:0}));
    }
    return migrated;
}

const notice = (type:NonNullable<GameState["notice"]>["type"], text:string) => ({ id:Date.now()+Math.random(), type, text });

export function reducer(state:GameState, action:Action):GameState {
  switch(action.type) {
    case "HYDRATE": return action.state;
    case "VISIT": {
      const current=state.characterProgress[action.characterId];
      if (!current) return state;
      const firstToday=!current.talkedStages.includes(current.relationshipStage);
      return {
        ...state,
        characterProgress:{ ...state.characterProgress, [action.characterId]:{ ...current, met:true, visits:current.visits+1, talkedStages:firstToday?[...current.talkedStages,current.relationshipStage]:current.talkedStages, affection:current.affection+(firstToday?GAME_CONFIG.talkAffection:0) } },
        dailyTalkStatus:{ ...state.dailyTalkStatus, [action.characterId]:true },
        notice:firstToday?notice("heart","新しい会話で気持ちが近づきました ♡"):notice("info","いつでも仕入れに来てくださいね"),
      };
    }
    case "BUY_INGREDIENT": {
      const item=getIngredient(action.ingredientId);
      if (!item || (item.unlockEventId && !state.unlockedIngredients.includes(item.id))) return state;
      if (!item || state.currency<item.price) return { ...state, notice:notice("info","コインが足りません") };
      const nextIngredients={ ...state.ingredients, [item.id]:(state.ingredients[item.id]||0)+GAME_CONFIG.ingredientPackSize };
      const newRecipes=findNewRecipes(nextIngredients,state.unlockedRecipes);
      return {
        ...state, currency:state.currency-item.price, ingredients:nextIngredients,
        unlockedRecipes:[...state.unlockedRecipes,...newRecipes],
        characterProgress:Object.fromEntries(Object.entries(state.characterProgress).map(([id,progress])=>[id,characters.find(person=>person.id===id)?.supplierId===item.supplierId&&progress.met?{...progress,affection:progress.affection+2}:progress])),
        dayNews:newRecipes.length?[...state.dayNews,...newRecipes.map(id=>`${getRecipe(id)?.name}を解放しました`)].flat():state.dayNews,
        lifetimeStats:{...state.lifetimeStats,ingredientPurchases:{...state.lifetimeStats.ingredientPurchases,[item.id]:(state.lifetimeStats.ingredientPurchases[item.id]||0)+1}},
        notice:newRecipes.length?notice("unlock",`新メニュー解放！ ${newRecipes.map(id=>getRecipe(id)?.name).join("・")}`):notice("info",`${item.name}を5食分仕入れました ♡ +2`),
      };
    }
    case "BUY_GIFT": {
      const item=getGift(action.giftId);
      if (!item || state.currency<item.price) return { ...state, notice:notice("info","コインが足りません") };
      return { ...state, currency:state.currency-item.price, inventory:{ ...state.inventory,[item.id]:(state.inventory[item.id]||0)+1 }, notice:notice("info",`${item.name}を購入しました`) };
    }
    case "GIVE_GIFT": {
      const item=getGift(action.giftId); const current=state.characterProgress[action.characterId];
      if (!item || !current || !state.inventory[item.id]) return state;
      const amount=GAME_CONFIG.giftAffection[giftReaction(getCharacter(action.characterId)!,item)];
      const nextCount=state.inventory[item.id]-1;
      const nextInventory={ ...state.inventory, [item.id]:nextCount };
      return {
        ...state, inventory:nextInventory, dailyGiftStatus:{ ...state.dailyGiftStatus,[action.characterId]:true },
        characterProgress:{ ...state.characterProgress,[action.characterId]:{ ...current,affection:Math.max(0,current.affection+amount) } },
        notice:notice("heart",amount>0?`気持ちが少し近づきました ♡`:`少し好みと違ったようです`),
      };
    }
    case "SPAWN_ORDER": {
      if (state.orders.length>=GAME_CONFIG.maxOrders || state.orders.some(order=>order.customerSlot===action.order.customerSlot||order.id===action.order.id)||!getRecipe(action.order.recipeId)||action.order.customerSlot<0||action.order.customerSlot>3) return state;
      return { ...state, orders:[...state.orders,{...action.order,status:"queued",remainingMs:0,totalMs:0,stationId:undefined,cookId:undefined}] };
    }
    case "START_COOKING": return startCooking(state,action.orderId);
    case "TICK": return advanceGame(state,action.deltaMs);
    case "COLLECT_ORDER": return serveOrder(state,action.orderId);
    case "REFRESH_SHOP": return {...state,giftShopItems:action.items,giftShopRefreshAt:Date.now(),notice:notice("info","贈物が入れ替わりました")};
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
        notice:notice(event.reward?"unlock":"heart",event.reward?.note || "関係が深まりました ♡") };
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
        unlockedDecorations:[...new Set([...state.unlockedDecorations,...(event.rewards.decorationIds || [])])],
        dayNews:[...state.dayNews,...news],notice:notice("unlock",hidden[0]?.note || event.rewards.note)};
    }
    case "BUY_EQUIPMENT": {
      const item=getEquipment(action.equipmentId);
      if(!item||!state.unlockedEquipment.includes(item.id)||state.stations.filter(station=>station.equipmentId===item.id).length>=GAME_CONFIG.maxStationsPerType)return state;
      const price=equipmentPrice(state,item.id);
      if(state.currency<price)return {...state,notice:notice("info","コインが足りません")};
      const number=state.stations.filter(station=>station.equipmentId===item.id).length+1;
      return {...state,currency:state.currency-price,stations:[...state.stations,{id:`${item.id}-${number}`,equipmentId:item.id,level:1}],ownedEquipment:[...new Set([...state.ownedEquipment,item.id])],notice:notice("unlock",`${item.name}を設置しました`)};
    }
    case "UPGRADE_EQUIPMENT": {
      const station=state.stations.find(item=>item.id===action.stationId);
      if(!station||station.level>=GAME_CONFIG.maxStationLevel||stationOccupied(state,station.id))return state;
      const price=upgradePrice(station);if(state.currency<price)return state;
      return {...state,currency:state.currency-price,stations:state.stations.map(item=>item.id===station.id?{...item,level:item.level+1}:item),notice:notice("unlock","設備を強化しました。調理時間が15%短くなります")};
    }
    case "HIRE_STAFF": {
      const current=state.characterProgress[action.characterId];
      if(!current||current.relationshipStage<3||state.staff.some(person=>person.characterId===action.characterId)||state.currency<GAME_CONFIG.hirePrice||!["cook","server","rest"].includes(action.role))return state;
      return {...state,currency:state.currency-GAME_CONFIG.hirePrice,staff:[...state.staff,{characterId:action.characterId,role:action.role,remainingMs:0}],notice:notice("heart",`${getCharacter(action.characterId)?.name}が店を手伝ってくれます`)};
    }
    case "ASSIGN_STAFF": {
      if(!["cook","server","rest"].includes(action.role))return state;
      return {...state,staff:state.staff.map(person=>person.characterId===action.characterId?{...person,role:action.role}:person)};
    }
    case "RETURN_GIFT": {
      const item=getGift(action.giftId);if(!item||!(state.inventory[item.id]>0))return state;
      return {...state,currency:state.currency+item.price,inventory:{...state.inventory,[item.id]:state.inventory[item.id]-1},notice:notice("info","未使用の贈物を返品しました")};
    }
    // Retained action names let older development tools fail safely after migration.
    case "CLAIM_OFFLINE": case "NEXT_DAY": case "DEV_ACTIONS": return state;
    case "CLEAR_NOTICE": return { ...state,notice:undefined };
    case "DEV_COINS": return { ...state,currency:state.currency+10000,notice:notice("coin","+10,000 コイン") };
    case "DEV_AFFECTION": {
      const current=state.characterProgress[action.characterId]; if(!current)return state;
      return { ...state,characterProgress:{...state.characterProgress,[action.characterId]:{...current,met:true,affection:current.affection+100}},notice:notice("heart","好感度 +100") };
    }
    case "DEV_UNLOCK_ALL": return {...state,unlockedRecipes:recipes.map(item=>item.id),unlockedEquipment:equipment.map(item=>item.id),ownedEquipment:equipment.map(item=>item.id),stations:equipment.map(item=>({id:`${item.id}-1`,equipmentId:item.id,level:1})),notice:notice("unlock","料理と設備をすべて解放しました")};
    case "RESET": return createInitialState();
    default:return state;
  }
}
