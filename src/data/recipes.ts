import type { Recipe } from "../types/game";

export const recipes: Recipe[] = [
  { id:"coffee", name:"深煎りコーヒー", icon:"☕", price:180, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true, tags:["coffee","drink","warm"] },
  { id:"toast", name:"バタートースト", icon:"🍞", price:150, requiredIngredients:[], unlockHint:"最初から作れます", initiallyUnlocked:true, tags:["bread","breakfast","warm"] },
  { id:"latte", name:"カフェラテ", icon:"🥛", price:260, requiredIngredients:["milk"], unlockHint:"牛乳を仕入れると作れそう", tags:["coffee","drink","milk","warm"] },
  { id:"pancake", name:"ふんわりパンケーキ", icon:"🥞", price:360, requiredIngredients:["flour","egg","milk"], unlockHint:"小麦粉・卵・牛乳があれば…", tags:["sweet","breakfast","family"] },
  { id:"veggieSandwich", name:"野菜サンド", icon:"🥪", price:320, requiredIngredients:["bread","tomato","lettuce"], unlockHint:"パンと新鮮な野菜を揃えよう", tags:["bread","lunch","vegetable"] },
  { id:"strawberryCake", name:"苺のショートケーキ", icon:"🍰", price:420, requiredIngredients:["strawberry","sugar","flour"], unlockHint:"苺・砂糖・小麦粉で作れそう", tags:["sweet","dessert","family"] },
  { id:"tea", name:"香りの紅茶", icon:"🫖", price:220, requiredIngredients:["teaLeaves"], unlockHint:"紅茶葉を仕入れると作れそう", tags:["tea","drink","calm"] },
  { id:"cafeMocha", name:"街角カフェモカ", icon:"🍫", price:410, requiredIngredients:["coffeeBeans","chocolate","milk"], unlockHint:"蓮と店の新商品を考えると作れそう", tags:["coffee","drink","sweet","warm"], limited:true, unlockEventId:"ren-growth3" },
  { id:"honeyCroissant", name:"はちみつクロワッサン", icon:"🥐", price:420, requiredIngredients:["flour","goldenHoney"], unlockHint:"陽と焼きたてメニューを考えると作れそう", tags:["bread","sweet","breakfast"], limited:true, unlockEventId:"haru-growth3" },
  { id:"creamSoup", name:"牧場の白いクリームスープ", icon:"🥣", price:430, requiredIngredients:["milk","cloverCream"], unlockHint:"蒼太と牛乳の使い方を考えると作れそう", tags:["milk","warm","lunch"], limited:true, unlockEventId:"sota-growth3" },
  { id:"springSalad", name:"朝採れ春色サラダ", icon:"🥗", price:400, requiredIngredients:["tomato","lettuce","strawberry"], unlockHint:"秋生と旬の一皿を考えると作れそう", tags:["vegetable","lunch","seasonal"], limited:true, unlockEventId:"aki-growth3" },
  { id:"chocolateParfait", name:"喫茶店チョコパフェ", icon:"🍨", price:480, requiredIngredients:["chocolate","vanillaSugar","milk"], unlockHint:"樹と喫茶店らしい甘味を考えると作れそう", tags:["sweet","dessert","elegant"], limited:true, unlockEventId:"itsuki-growth3" },
  { id:"botanicalSoda", name:"庭先ボタニカルソーダ", icon:"🥤", price:390, requiredIngredients:["herb","mint"], unlockHint:"凪と香りを生かす飲み物を考えると作れそう", tags:["tea","drink","calm","seasonal"], limited:true, unlockEventId:"nagisa-growth3" },
  { id:"moonLatte", name:"月明かりのカフェオレ", icon:"🌙", price:620, requiredIngredients:["moonRoast","milk"], requiredEquipmentIds:["espressoMachine"], unlockHint:"蓮との共同成長ルートの先にある限定メニュー", tags:["coffee","drink","limited","calm"], limited:true, unlockEventId:"ren-growth5" },
  { id:"honeyFrenchToast", name:"朝焼けフレンチトースト", icon:"🍯", price:640, requiredIngredients:["goldenHoney","bread","egg"], requiredEquipmentIds:["bakeryOven"], unlockHint:"陽との共同成長ルートの先にある限定メニュー", tags:["bread","sweet","limited","breakfast"], limited:true, unlockEventId:"haru-growth5" },
  { id:"cloverPudding", name:"四つ葉ミルクプリン", icon:"🍮", price:650, requiredIngredients:["cloverCream","milk","egg"], requiredEquipmentIds:["chilledCase"], unlockHint:"蒼太との共同成長ルートの先にある限定メニュー", tags:["milk","sweet","limited","family"], limited:true, unlockEventId:"sota-growth5" },
  { id:"sunriseSandwich", name:"陽だまり畑サンド", icon:"🌞", price:660, requiredIngredients:["sunTomato","bread","lettuce"], requiredEquipmentIds:["seasonalCounter"], unlockHint:"秋生との共同成長ルートの先にある限定メニュー", tags:["bread","vegetable","limited","lunch"], limited:true, unlockEventId:"aki-growth5" },
  { id:"vanillaCustard", name:"秘密のバニラカスタード", icon:"✨", price:690, requiredIngredients:["vanillaSugar","milk","egg"], requiredEquipmentIds:["parfaitStation"], unlockHint:"樹との共同成長ルートの先にある限定メニュー", tags:["sweet","dessert","limited","elegant"], limited:true, unlockEventId:"itsuki-growth5" },
  { id:"mimosaTea", name:"春待ちミモザティー", icon:"🌼", price:600, requiredIngredients:["mimosaHerb","teaLeaves"], requiredEquipmentIds:["herbInfuser"], unlockHint:"凪との共同成長ルートの先にある限定メニュー", tags:["tea","drink","limited","calm"], limited:true, unlockEventId:"nagisa-growth5" },
  { id:"richChocolatePudding", name:"濃厚ショコラプリン", icon:"🍮", price:720, requiredIngredients:["cloverCream","chocolate","vanillaSugar"], unlockHint:"牧場と洋菓子店、二人の知恵がつながると……", tags:["milk","sweet","dessert","hidden"], limited:true, hidden:true, unlockEventId:"hidden-rich-pudding" },
  { id:"gardenBerryTea", name:"春庭ベリーティー", icon:"🫐", price:680, requiredIngredients:["strawberry","mimosaHerb","teaLeaves"], unlockHint:"農園と花・ハーブ店、二人の素材がつながると……", tags:["tea","drink","seasonal","hidden"], limited:true, hidden:true, unlockEventId:"hidden-garden-tea" },
];

export const getRecipe = (id:string) => recipes.find(item => item.id === id);
