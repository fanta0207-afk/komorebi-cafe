import type { Recipe } from "../types/game";

export const recipes: Recipe[] = [
  { id:"coffee", name:"深煎りコーヒー", icon:"☕", price:180, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true },
  { id:"toast", name:"バタートースト", icon:"🍞", price:150, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true },
  { id:"latte", name:"カフェラテ", icon:"🥛", price:260, requiredIngredients:["milk"], unlockHint:"牛乳を仕入れると作れそう" },
  { id:"pancake", name:"ふんわりパンケーキ", icon:"🥞", price:360, requiredIngredients:["flour","egg","milk"], unlockHint:"小麦粉・卵・牛乳があれば…" },
  { id:"veggieSandwich", name:"野菜サンド", icon:"🥪", price:320, requiredIngredients:["bread","tomato","lettuce"], unlockHint:"パンと新鮮な野菜を揃えよう" },
  { id:"strawberryCake", name:"苺のショートケーキ", icon:"🍰", price:420, requiredIngredients:["strawberry","sugar","flour"], unlockHint:"苺・砂糖・小麦粉で作れそう" },
  { id:"tea", name:"香りの紅茶", icon:"🫖", price:220, requiredIngredients:["teaLeaves"], unlockHint:"紅茶葉を仕入れると作れそう" },
];

export const getRecipe = (id:string) => recipes.find(item => item.id === id);
