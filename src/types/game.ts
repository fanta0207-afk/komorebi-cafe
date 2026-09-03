export type Season = "春" | "夏" | "秋" | "冬";
export type Gender = "male" | "female" | "nonbinary";
export type GiftReaction = "love" | "like" | "normal" | "dislike";

export interface Ingredient { id:string; name:string; icon:string; price:number; supplierId:string; limited?:boolean; unlockEventId?:string; }
export interface Recipe { id:string; name:string; icon:string; price:number; requiredIngredients:string[]; requiredEquipmentIds?:string[]; unlockHint:string; initiallyUnlocked?:boolean; tags:string[]; limited?:boolean; hidden?:boolean; unlockEventId?:string; }
export interface Gift { id:string; name:string; icon:string; price:number; tags:string[]; description:string; }
export interface Supplier { id:string; name:string; icon:string; description:string; characterId:string; }
export interface Character {
  id:string; name:string; gender:Gender; age:number; occupation:string; supplierId:string;
  profile:string; image:string; silhouette:string; favoriteGiftTags:string[]; dislikedGiftTags:string[];
}
export interface EventReward { ingredientIds?:string[]; recipeIds?:string[]; note:string; }
export interface RelationshipEvent { id:string; characterId:string; fromStage:number; toStage:number; requiredAffection:number; title:string; dialogue:string[]; reward?:EventReward; }
export type GrowthStatType = "recipeSales"|"ingredientPurchases"|"tagSales"|"totalOrders"|"totalRevenue";
export interface GrowthStatRequirement { type:GrowthStatType; id?:string; target:number; label:string; }
export interface GrowthRewards { recipeIds?:string[]; ingredientIds?:string[]; equipmentIds?:string[]; decorationIds?:string[]; note:string; }
export interface GrowthEvent {
  eventId:string; characterId:string; routeStage:number; title:string;
  requiredRelationshipStage:number; requiredStats:GrowthStatRequirement[];
  requiredPreviousEvents:string[]; requiredEquipmentIds?:string[];
  rewards:GrowthRewards; dialogue:string[]; hint:string;
}
export interface Equipment { id:string; name:string; icon:string; price:number; characterId:string; description:string; effectText:string; }
export interface Decoration { id:string; name:string; icon:string; characterId:string; placement:"wall"|"shelf"|"counter"|"floor"; }
export interface HiddenUnlock { id:string; requiredEvents:string[]; recipeId:string; note:string; }
export interface CharacterProgress { affection:number; relationshipStage:number; viewedEvents:string[]; met:boolean; visits:number; }
export interface Order { id:string; customerSlot:number; recipeId:string; }
export interface DailyStats { sales:number; orders:number; recipeSales:Record<string,number>; }
export interface LifetimeStats { recipeSales:Record<string,number>; ingredientPurchases:Record<string,number>; tagSales:Record<string,number>; totalOrders:number; totalRevenue:number; }
export interface DaySummary extends DailyStats { day:number; topRecipeId?:string; news:string[]; weatherId:string; customerGroupId:string; dailyEventId:string; actionsUsed:number; }
export interface Notice { id:number; type:"coin"|"unlock"|"heart"|"info"|"day"; text:string; }

export interface DailyWeather { id:string; name:string; icon:string; description:string; favoredTags:string[]; }
export interface CustomerGroup { id:string; name:string; icon:string; description:string; favoredTags:string[]; }
export interface TownDailyEvent { id:string; name:string; icon:string; description:string; favoredTags:string[]; saleMultiplier:number; }
export interface DailyCondition { weatherId:string; customerGroupId:string; dailyEventId:string; }

export interface GameState {
  saveVersion:number; season:Season; day:number; currency:number;
  ingredients:Record<string,number>; unlockedRecipes:string[]; unlockedIngredients:string[];
  characterProgress:Record<string,CharacterProgress>; inventory:Record<string,number>;
  giftShopItems:string[]; giftShopRefreshAt:number;
  dailyTalkStatus:Record<string,boolean>; dailyGiftStatus:Record<string,boolean>;
  lastPlayedAt:number; dailyStats:DailyStats; dayNews:string[]; orders:Order[];
  notice?:Notice; offlineOffer:number; maxActions:number; actionsRemaining:number;
  dailyWeatherId:string; dailyCustomerGroupId:string; dailyEventId:string;
  lifetimeStats:LifetimeStats; viewedGrowthEvents:string[];
  unlockedEquipment:string[]; ownedEquipment:string[]; unlockedDecorations:string[];
}
