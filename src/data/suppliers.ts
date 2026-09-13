import type { Supplier } from "../types/game";

export const suppliers: Supplier[] = [
  { id:"coffee", name:"珈琲豆店 月舟", icon:"☕", description:"香ばしい匂いの小さな豆店", characterId:"ren" },
  { id:"bakery", name:"麦の音ベーカリー", icon:"🥖", description:"朝早くから灯りがともるパン屋", characterId:"haru" },
  { id:"ranch", name:"白樺牧場", icon:"🐄", description:"丘の上にある、のどかな牧場", characterId:"sota" },
  { id:"farm", name:"ひだまり農園", icon:"🥕", description:"旬の野菜が並ぶ直売所", characterId:"aki" },
  { id:"patisserie", name:"菓子店シュクレ", icon:"🍰", description:"甘い香りの洋菓子材料店", characterId:"itsuki" },
  { id:"herb", name:"草花店ミモザ", icon:"🌿", description:"花とハーブに囲まれた店", characterId:"nagisa" },
  { id:"freezer", name:"雪白冷凍倉庫", icon:"🧊", description:"アイスと冷凍果実が眠る静かな倉庫", characterId:"sae" },
  { id:"chocolaterie", name:"ショコラトリー・ノワール", icon:"🍫", description:"カカオの香りと緊張感が満ちるチョコレート専門店", characterId:"cacao" },
];

export const getSupplier = (id:string) => suppliers.find(item => item.id === id);
