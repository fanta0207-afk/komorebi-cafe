export type Season = "春" | "夏" | "秋" | "冬";
export type Gender = "male" | "female" | "nonbinary";
export type GiftReaction = "love" | "like" | "normal" | "dislike";
export type GiftRarity = "common" | "rare" | "superRare" | "ultraRare";
export type MenuRarity = "normal" | "rare" | "superRare" | "secret";
export type RelationshipRoute = "undecided" | "romance" | "friendship";
export type DateLocationId = "amusement" | "walk" | "home";
export interface StoryLine { speaker:"narrator"|"character"|"player"; text:string; }
export interface StoryChoice { id:string; label:string; response:StoryLine[]; }

export interface Ingredient { id:string; name:string; icon:string; price:number; supplierId:string; limited?:boolean; unlockEventId?:string; }
export interface Recipe { forest?:boolean; cookingSeconds?:number; id:string; name:string; icon:string; price:number; requiredIngredients:string[]; requiredEquipmentIds?:string[]; unlockHint:string; initiallyUnlocked?:boolean; tags:string[]; rarity:MenuRarity; limited?:boolean; hidden?:boolean; unlockEventId?:string; }
export interface Gift { handmade?:boolean; materials?:Record<string,number>; lovedBy?:string[]; id:string; name:string; icon:string; price:number; rarity:GiftRarity; tags:string[]; description:string; }
export interface Supplier { id:string; name:string; icon:string; description:string; characterId:string; }
export interface Character {
  id:string; name:string; gender:Gender; occupation:string; supplierId:string;
  profile:string; image:string; storyImage?:string; silhouette:string; favoriteGiftTags:string[]; dislikedGiftTags:string[];
  shortName:string; nameReading:string; routeTheme:string; voice:string;
  backstory:string; concern:string; attraction:string;
  greetings:{ first:string; familiar:string; close:string; romance:string; friendship:string; };
  giftResponses:Record<GiftReaction,string>;
}
export interface EventReward { ingredientIds?:string[]; recipeIds?:string[]; equipmentIds?:string[]; decorationIds?:string[]; note:string; }
export interface RelationshipEvent {
  kind?:"staff";
  id:string; characterId:string; fromStage:number; toStage:number; requiredAffection:number;
  title:string; dialogue:StoryLine[]; reward?:EventReward; choices?:StoryChoice[];
  friendshipDialogue?:StoryLine[]; friendshipTitle?:string;
}
export interface StaffStoryEvent extends RelationshipEvent { kind:"staff"; requiredRelationshipStage:number; }
export type GrowthStatType = "recipeSales"|"ingredientPurchases"|"tagSales"|"totalOrders"|"totalRevenue";
export interface GrowthStatRequirement { type:GrowthStatType; id?:string; target:number; label:string; }
export interface GrowthRewards { recipeIds?:string[]; ingredientIds?:string[]; equipmentIds?:string[]; note:string; }
export interface GrowthEvent {
  eventId:string; characterId:string; routeStage:number; title:string;
  requiredRelationshipStage:number; requiredStats:GrowthStatRequirement[];
  requiredPreviousEvents:string[]; requiredEquipmentIds?:string[];
  rewards:GrowthRewards; dialogue:string[]; hint:string;
}
export interface DateEvent { id:string; characterId:string; locationId:DateLocationId; title:string; icon:string; dialogue:string[]; }
export interface Equipment { id:string; name:string; icon:string; price:number; characterId:string; description:string; effectText:string; }
export interface Decoration { id:string; name:string; icon:string; characterId:string; placement:"wall"|"shelf"|"counter"|"floor"; }
export interface HiddenUnlock { id:string; requiredEvents:string[]; recipeId:string; note:string; }
export interface CharacterProgress { lastGiftId?:string; giftStreak?:number; handmadeFirst?:string[]; affection:number; relationshipStage:number; viewedEvents:string[]; met:boolean; visits:number; giftsGiven:number; route:RelationshipRoute; eventChoices:Record<string,string>; talkedStages:number[]; giftReactions:Record<string,GiftReaction>; viewedGiftReactions:GiftReaction[]; }
export interface GiftReactionPopup { characterId:string; giftId:string; reaction:GiftReaction; response:string; }
export interface Station { id:string; equipmentId:string; level:number; }
export type StaffRole = "cook"|"server"|"procurement"|"rest";
export interface Staff { characterId:string; role:StaffRole; servingOrderId?:string; returningFromSlot?:number; remainingMs:number; }
export interface Order { forestPrepared?:boolean; forestReserved?:boolean; request?:boolean; id:string; customerSlot:number; recipeId:string; status:"queued"|"cooking"|"ready"; stationId?:string; cookId?:string; remainingMs:number; totalMs:number; }
export interface IngredientDelivery { id:string; ingredientId:string; packs:number; servingsPerPack:number; automatic?:boolean; staffId?:string; orderedAt:number; arrivesAt:number; }
export interface DailyStats { sales:number; orders:number; recipeSales:Record<string,number>; }
export interface LifetimeStats { recipeSales:Record<string,number>; ingredientPurchases:Record<string,number>; tagSales:Record<string,number>; totalOrders:number; totalRevenue:number; giftPurchases:number; staffProcurementOrders:number; automaticPacks:number; automatedOrders:number; }
export interface DaySummary extends DailyStats { day:number; topRecipeId?:string; news:string[]; weatherId:string; customerGroupId:string; dailyEventId:string; actionsUsed:number; }
export interface Notice { id:number; type:"coin"|"unlock"|"heart"|"info"|"day"; text:string; }

export interface DailyWeather { id:string; name:string; icon:string; description:string; favoredTags:string[]; }
export interface CustomerGroup { id:string; name:string; icon:string; description:string; favoredTags:string[]; }
export interface TownDailyEvent { id:string; name:string; icon:string; description:string; favoredTags:string[]; saleMultiplier:number; }
export interface DailyCondition { weatherId:string; customerGroupId:string; dailyEventId:string; }

export interface GameState {
  onboardingStage:"prologue"|"mission"|"complete";
  forest:ForestState;
  pendingGiftReaction?:GiftReactionPopup;
  tableCount:number;
  missions:MissionProgress;
  stations:Station[]; staff:Staff[]; activeMs:number; spawnRemainingMs:number; nextOrderNumber:number;
  saveVersion:number; season:Season; day:number; currency:number;
  deliveries:IngredientDelivery[];
  ingredients:Record<string,number>; unlockedRecipes:string[]; unlockedIngredients:string[];
  characterProgress:Record<string,CharacterProgress>; inventory:Record<string,number>;
  giftShopItems:string[]; giftShopSoldOut:string[]; giftShopRefreshAt:number;
  giftShopAutoRefreshAt:number; giftShopRefreshDay:number; giftShopManualRefreshes:number;
  dailyTalkStatus:Record<string,boolean>; dailyGiftStatus:Record<string,boolean>;
  lastPlayedAt:number; dailyStats:DailyStats; dayNews:string[]; orders:Order[];
  notice?:Notice; offlineOffer:number; maxActions:number; actionsRemaining:number;
  dailyWeatherId:string; dailyCustomerGroupId:string; dailyEventId:string;
  lifetimeStats:LifetimeStats; viewedGrowthEvents:string[];
  viewedDateEvents:string[];
  unlockedEquipment:string[]; ownedEquipment:string[]; unlockedDecorations:string[];
  autoProcurementEnabled:boolean;
}

export type MissionPlace = "town" | "inventory" | "gifts" | "ren" | "recipes" | "equipment";
export interface OngoingMission {
  id:string;
  kind:"service"|"special"|"supply";
  round:number;
  start:number;
  tag?:string;
}
export interface MissionProgress {
  ongoing:OngoingMission[];
  completed:string[];
  claimed:string[];
  visited:MissionPlace[];
  receivedPacks:Record<string,number>;
  boughtBook:boolean;
  gaveBook:boolean;
  sideClaimed:string[];
}

export interface ForestLoot { food:string[]; coins:number; tickets:number; fragment?:string; fragments?:Record<string,number>; floor?:number; energySpent?:number; }
export type ForestSpotKind = 'berries'|'herbs'|'flowers'|'mushrooms'|'roots'|'leaves'|'box';
export interface ForestSpot { id:number; cell:number; x:number; y:number; kind:ForestSpotKind; food:string[]; coins:number; tickets:number; fragment?:string; emptyHint:boolean; }
export interface ForestMeal { recipeId:string; kind:'foot'|'luck'; rarity:'normal'|'special'|'rare'; level:number; pathReduction:number; rareBonus:number; obstacleSkip:number; emptyHints:number; }
export interface ForestLayer { floor:number; spots:ForestSpot[]; used:number[]; pathSpot:number; pathLimit:number; pathFound:boolean; obstacleTotal:number; obstacleRemaining:number; obstacleSkipped:number; }
export interface ForestFind extends ForestLoot { spot:number; path:boolean; }
export interface ForestExpedition { id:number; seed:number; startFloor:number; layer:ForestLayer; basket:string[]; coins:number; tickets:number; fragments:Record<string,number>; harvested:boolean; energySpent:number; meal?:ForestMeal; tutorial:boolean; lastFind?:ForestFind; }
export interface ForestState { tutorialDone?:boolean; energy:number; recoveredAt:number; nextId:number; returns:number; fragments:Record<string,number>; discovered:string[]; crafted:string[]; cookedRecipes:string[]; tickets:number; dishes:Record<string,number>; serveForestNext:boolean; deepestFloor:number; checkpoints:number[]; legacyBasketLevel?:number; expedition?:ForestExpedition; lastReturn?:ForestLoot; }
