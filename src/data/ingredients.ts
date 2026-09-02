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
];

export const getIngredient = (id:string) => ingredients.find(item => item.id === id);
