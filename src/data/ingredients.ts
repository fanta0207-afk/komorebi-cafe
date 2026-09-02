import type { Ingredient } from "../types/game";

export const ingredients: Ingredient[] = [
  { id:"coffeeBeans", name:"コーヒー豆", icon:"🫘", price:100, supplierId:"coffee" },
  { id:"teaLeaves", name:"紅茶葉", icon:"🍃", price:150, supplierId:"coffee" },
  { id:"flour", name:"小麦粉", icon:"🌾", price:120, supplierId:"bakery" },
  { id:"bread", name:"焼きたてパン", icon:"🍞", price:90, supplierId:"bakery" },
  { id:"milk", name:"しぼりたて牛乳", icon:"🥛", price:130, supplierId:"ranch" },
  { id:"egg", name:"たまご", icon:"🥚", price:110, supplierId:"ranch" },
  { id:"tomato", name:"トマト", icon:"🍅", price:90, supplierId:"farm" },
  { id:"lettuce", name:"レタス", icon:"🥬", price:80, supplierId:"farm" },
  { id:"strawberry", name:"苺", icon:"🍓", price:170, supplierId:"farm" },
  { id:"sugar", name:"きび砂糖", icon:"◽", price:100, supplierId:"patisserie" },
  { id:"chocolate", name:"チョコレート", icon:"🍫", price:180, supplierId:"patisserie" },
  { id:"herb", name:"香りハーブ", icon:"🌿", price:100, supplierId:"herb" },
  { id:"mint", name:"ミント", icon:"☘️", price:110, supplierId:"herb" },
  { id:"moonRoast", name:"月舟の宵豆", icon:"🌙", price:240, supplierId:"coffee", limited:true, unlockEventId:"ren-stage2" },
  { id:"goldenHoney", name:"朝焼けはちみつ", icon:"🍯", price:210, supplierId:"bakery", limited:true, unlockEventId:"haru-stage2" },
  { id:"cloverCream", name:"四つ葉クリーム", icon:"🍀", price:230, supplierId:"ranch", limited:true, unlockEventId:"sota-stage2" },
  { id:"sunTomato", name:"陽だまりトマト", icon:"🌞", price:190, supplierId:"farm", limited:true, unlockEventId:"aki-stage2" },
  { id:"vanillaSugar", name:"秘密のバニラ糖", icon:"✨", price:260, supplierId:"patisserie", limited:true, unlockEventId:"itsuki-stage2" },
  { id:"mimosaHerb", name:"ミモザの若葉", icon:"🌼", price:200, supplierId:"herb", limited:true, unlockEventId:"nagisa-stage2" },
];

export const getIngredient = (id:string) => ingredients.find(item => item.id === id);
