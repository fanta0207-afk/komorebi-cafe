import type { Supplier } from "../types/game";

export const suppliers: Supplier[] = [
  { id:"coffee", name:"珈琲豆店 月舟", icon:"☕", description:"香ばしい匂いの小さな豆店", characterId:"ren" },
  { id:"bakery", name:"麦の音ベーカリー", icon:"🥖", description:"朝早くから灯りがともるパン屋", characterId:"haru" },
  { id:"ranch", name:"白樺牧場", icon:"🐄", description:"丘の上にある、のどかな牧場", characterId:"sota" },
  { id:"farm", name:"ひだまり農園", icon:"🥕", description:"旬の野菜が並ぶ直売所", characterId:"aki" },
  { id:"patisserie", name:"菓子店シュクレ", icon:"🍰", description:"甘い香りの洋菓子材料店", characterId:"itsuki" },
  { id:"herb", name:"草花店ミモザ", icon:"🌿", description:"花とハーブに囲まれた店", characterId:"nagisa" },
];

export const getSupplier = (id:string) => suppliers.find(item => item.id === id);
