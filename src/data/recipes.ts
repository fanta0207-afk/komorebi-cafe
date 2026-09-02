import type { Recipe } from "../types/game";

export const recipes: Recipe[] = [
  { id:"coffee", name:"深煎りコーヒー", icon:"☕", price:180, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true, tags:["coffee","drink","warm"] },
  { id:"toast", name:"バタートースト", icon:"🍞", price:150, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true, tags:["bread","breakfast","warm"] },
  { id:"latte", name:"カフェラテ", icon:"🥛", price:260, requiredIngredients:["milk"], unlockHint:"牛乳を仕入れると作れそう", tags:["coffee","drink","milk","warm"] },
  { id:"pancake", name:"ふんわりパンケーキ", icon:"🥞", price:360, requiredIngredients:["flour","egg","milk"], unlockHint:"小麦粉・卵・牛乳があれば…", tags:["sweet","breakfast","family"] },
  { id:"veggieSandwich", name:"野菜サンド", icon:"🥪", price:320, requiredIngredients:["bread","tomato","lettuce"], unlockHint:"パンと新鮮な野菜を揃えよう", tags:["bread","lunch","vegetable"] },
  { id:"strawberryCake", name:"苺のショートケーキ", icon:"🍰", price:420, requiredIngredients:["strawberry","sugar","flour"], unlockHint:"苺・砂糖・小麦粉で作れそう", tags:["sweet","dessert","family"] },
  { id:"tea", name:"香りの紅茶", icon:"🫖", price:220, requiredIngredients:["teaLeaves"], unlockHint:"紅茶葉を仕入れると作れそう", tags:["tea","drink","calm"] },
  { id:"moonLatte", name:"月明かりのカフェオレ", icon:"🌙", price:520, requiredIngredients:["moonRoast","milk"], unlockHint:"蓮との思い出から生まれる限定メニュー", tags:["coffee","drink","limited","calm"], limited:true, unlockEventId:"ren-stage3" },
  { id:"honeyFrenchToast", name:"朝焼けフレンチトースト", icon:"🍯", price:540, requiredIngredients:["goldenHoney","bread","egg"], unlockHint:"陽との思い出から生まれる限定メニュー", tags:["bread","sweet","limited","breakfast"], limited:true, unlockEventId:"haru-stage3" },
  { id:"cloverPudding", name:"四つ葉ミルクプリン", icon:"🍮", price:550, requiredIngredients:["cloverCream","milk","egg"], unlockHint:"蒼太との思い出から生まれる限定メニュー", tags:["milk","sweet","limited","family"], limited:true, unlockEventId:"sota-stage3" },
  { id:"sunriseSandwich", name:"陽だまり畑サンド", icon:"🌞", price:560, requiredIngredients:["sunTomato","bread","lettuce"], unlockHint:"秋生との思い出から生まれる限定メニュー", tags:["bread","vegetable","limited","lunch"], limited:true, unlockEventId:"aki-stage3" },
  { id:"vanillaCustard", name:"秘密のバニラカスタード", icon:"✨", price:590, requiredIngredients:["vanillaSugar","milk","egg"], unlockHint:"樹との思い出から生まれる限定メニュー", tags:["sweet","dessert","limited","elegant"], limited:true, unlockEventId:"itsuki-stage3" },
  { id:"mimosaTea", name:"春待ちミモザティー", icon:"🌼", price:500, requiredIngredients:["mimosaHerb","teaLeaves"], unlockHint:"凪との思い出から生まれる限定メニュー", tags:["tea","drink","limited","calm"], limited:true, unlockEventId:"nagisa-stage3" },
];

export const getRecipe = (id:string) => recipes.find(item => item.id === id);
