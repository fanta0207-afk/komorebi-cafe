import type { Decoration } from "../types/game";

export const decorations:Decoration[] = [
  {id:"coffeeScoop",name:"豆量りのスコップ",icon:"🥄",characterId:"ren",placement:"shelf"},
  {id:"renCoffeeSet",name:"蓮のコーヒーセット",icon:"☕",characterId:"ren",placement:"counter"},
  {id:"breadBasket",name:"焼きたてパン籠",icon:"🥖",characterId:"haru",placement:"counter"},
  {id:"haruSign",name:"太陽の手描きパン札",icon:"🪧",characterId:"haru",placement:"wall"},
  {id:"milkCan",name:"小さなミルク缶",icon:"🥛",characterId:"sota",placement:"floor"},
  {id:"cloverBottle",name:"四つ葉のミルク瓶",icon:"🍀",characterId:"sota",placement:"shelf"},
  {id:"farmCrate",name:"朝採れ野菜の木箱",icon:"🥕",characterId:"aki",placement:"floor"},
  {id:"seasonalBoard",name:"旬の黒板",icon:"🖍️",characterId:"aki",placement:"wall"},
  {id:"cakeDome",name:"ガラスのケーキドーム",icon:"🍰",characterId:"itsuki",placement:"counter"},
  {id:"dessertPlate",name:"アールのデザート皿",icon:"🍮",characterId:"itsuki",placement:"shelf"},
  {id:"flowerVase",name:"窓辺の花瓶",icon:"💐",characterId:"nagisa",placement:"wall"},
  {id:"herbGarland",name:"ハーブのガーランド",icon:"🌿",characterId:"nagisa",placement:"shelf"},
  {id:"frostedGlass",name:"霜花のガラス置物",icon:"❄️",characterId:"sae",placement:"shelf"},
  {id:"iceMenuBoard",name:"冴のアイスメニュー札",icon:"🧊",characterId:"sae",placement:"wall"},
  // Character story rewards
  {"id": "milkFlowerVase", "name": "ミルク瓶の花器", "icon": "🌷", "characterId": "sota", "placement": "shelf"},
  {"id": "pairedDessertPlates", "name": "ペアのデザート皿", "icon": "🍽️", "characterId": "itsuki", "placement": "shelf"},
  {"id": "tableGreen", "name": "小さな卓上グリーン", "icon": "🪴", "characterId": "nagisa", "placement": "counter"},
  {"id": "seasonalVase", "name": "季節の一輪挿し", "icon": "🌷", "characterId": "nagisa", "placement": "shelf"},
  {"id": "herbShelf", "name": "花とハーブのカフェ棚", "icon": "🪴", "characterId": "nagisa", "placement": "wall"},
  {"id": "greenhouseWindow", "name": "温室風の窓辺飾り", "icon": "🌿", "characterId": "nagisa", "placement": "wall"},
  {"id": "herbTeapot", "name": "ハーブティーポット", "icon": "🫖", "characterId": "nagisa", "placement": "counter"},
  {"id": "flowerHerbWindow", "name": "花とハーブの窓辺セット", "icon": "💐", "characterId": "nagisa", "placement": "wall"},
  {"id": "cacaoBonbonCase", "name": "一粒ショコラのガラスケース", "icon": "🍫", "characterId": "cacao", "placement": "counter"},
  {"id": "cacaoThermometer", "name": "金縁のショコラ温度計", "icon": "🌡️", "characterId": "cacao", "placement": "wall"},
  {"id": "pairedChocolateBoxes", "name": "ふたりのショコラ箱", "icon": "🎁", "characterId": "cacao", "placement": "shelf"},
];

export const getDecoration=(id:string)=>decorations.find(item=>item.id===id);
