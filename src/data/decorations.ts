import type { Decoration } from "../types/game";

export const decorations:Decoration[] = [
  {id:"coffeeScoop",name:"豆量りのスコップ",icon:"🥄",characterId:"ren",placement:"shelf"},
  {id:"renCoffeeSet",name:"蓮のコーヒーセット",icon:"☕",characterId:"ren",placement:"counter"},
  {id:"breadBasket",name:"焼きたてパン籠",icon:"🥖",characterId:"haru",placement:"counter"},
  {id:"haruSign",name:"陽の手描きパン札",icon:"🪧",characterId:"haru",placement:"wall"},
  {id:"milkCan",name:"小さなミルク缶",icon:"🥛",characterId:"sota",placement:"floor"},
  {id:"cloverBottle",name:"四つ葉のミルク瓶",icon:"🍀",characterId:"sota",placement:"shelf"},
  {id:"farmCrate",name:"朝採れ野菜の木箱",icon:"🥕",characterId:"aki",placement:"floor"},
  {id:"seasonalBoard",name:"旬の黒板",icon:"🖍️",characterId:"aki",placement:"wall"},
  {id:"cakeDome",name:"ガラスのケーキドーム",icon:"🍰",characterId:"itsuki",placement:"counter"},
  {id:"dessertPlate",name:"樹のデザート皿",icon:"🍮",characterId:"itsuki",placement:"shelf"},
  {id:"flowerVase",name:"窓辺の花瓶",icon:"💐",characterId:"nagisa",placement:"wall"},
  {id:"herbGarland",name:"ハーブのガーランド",icon:"🌿",characterId:"nagisa",placement:"shelf"},
];

export const getDecoration=(id:string)=>decorations.find(item=>item.id===id);
