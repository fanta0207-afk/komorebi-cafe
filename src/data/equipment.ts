import type { Equipment } from "../types/game";

export const baseEquipmentIds=["coffeeCounter","toastGrill","prepTable"];
export const initialEquipmentIds=["coffeeCounter"];
export const equipment:Equipment[] = [
  {id:"coffeeCounter",name:"コーヒーカウンター",icon:"☕",price:900,characterId:"",description:"豆を挽いて、一杯ずつ淹れるカウンター。",effectText:"コーヒー・紅茶などの基本の飲み物を作れます"},
  {id:"toastGrill",name:"トースター",icon:"🍞",price:800,characterId:"",description:"小さな喫茶店の、頼れる焼き台。",effectText:"基本のパン料理を作れます"},
  {id:"prepTable",name:"キッチン作業台",icon:"🥣",price:1100,characterId:"",description:"下ごしらえと盛り付けに使う作業台。",effectText:"基本の料理とデザートを作れます"},
  {id:"espressoMachine",name:"真鍮のエスプレッソマシン",icon:"⚙️",price:5200,characterId:"ren",description:"蓮が選んだ、圧力を細かく調整できる一台。",effectText:"エスプレッソ系の特別なドリンクを作れます"},
  {id:"bakeryOven",name:"小さな石窯オーブン",icon:"🧱",price:4800,characterId:"haru",description:"海斗と火加減を試した、パンの香りを引き出す石窯。",effectText:"焼きたてパンと焼き菓子を販売できます"},
  {id:"chilledCase",name:"木枠の冷蔵ショーケース",icon:"❄️",price:5000,characterId:"sota",description:"牧の乳製品を一番おいしい温度で並べられます。",effectText:"プリンなどの冷たい生菓子を販売できます"},
  {id:"seasonalCounter",name:"季節の仕込み台",icon:"🧺",price:4200,characterId:"aki",description:"葵が使いやすい高さに整えた、野菜と果物の仕込み台。",effectText:"旬の素材を使った季節料理を販売できます"},
  {id:"parfaitStation",name:"ガラスのパフェ台",icon:"🍨",price:5500,characterId:"itsuki",description:"アールの手順を再現できる、冷菓専用の作業台。",effectText:"パフェや繊細な生菓子を販売できます"},
  {id:"herbInfuser",name:"銅のハーブ抽出器",icon:"🫗",price:4600,characterId:"nagisa",description:"静と香りを確かめながら組み上げた抽出器。",effectText:"ハーブを使った特殊ドリンクを作れます"},
];

export const getEquipment=(id:string)=>equipment.find(item=>item.id===id);
