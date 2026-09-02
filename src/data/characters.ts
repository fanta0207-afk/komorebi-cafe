import type { Character } from "../types/game";

export const characters: Character[] = [
  { id:"ren", name:"蓮", gender:"male", age:28, occupation:"珈琲豆店 店主", supplierId:"coffee", profile:"静かに豆と向き合う職人気質。話す言葉は少ないが、客の好みはよく覚えている。", image:"/assets/characters/ren.png", silhouette:"♟", favoriteGiftTags:["coffee","craft","book"], dislikedGiftTags:["flashy"] },
  { id:"haru", name:"陽", gender:"male", age:24, occupation:"パン職人", supplierId:"bakery", profile:"朝に強く、よく笑うパン職人。新しいパンの試作にいつも夢中。", image:"/assets/characters/haru.png", silhouette:"♟", favoriteGiftTags:["sweet","handmade","warm"], dislikedGiftTags:["perfume"] },
  { id:"sota", name:"蒼太", gender:"male", age:26, occupation:"牧場スタッフ", supplierId:"ranch", profile:"動物たちに慕われる穏やかな青年。街へ出ると少し緊張するらしい。", image:"/assets/characters/sota.png", silhouette:"♟", favoriteGiftTags:["animal","nature","warm"], dislikedGiftTags:["flashy"] },
  { id:"aki", name:"秋生", gender:"male", age:30, occupation:"農園主", supplierId:"farm", profile:"季節と土を大切にする頼れる農園主。さりげない気遣いが得意。", image:"/assets/characters/aki.png", silhouette:"♟", favoriteGiftTags:["nature","food","practical"], dislikedGiftTags:["luxury"] },
  { id:"itsuki", name:"樹", gender:"male", age:27, occupation:"パティシエ", supplierId:"patisserie", profile:"美しい菓子作りに妥協しないパティシエ。意外と庶民的なおやつも好き。", image:"/assets/characters/itsuki.png", silhouette:"♟", favoriteGiftTags:["sweet","art","elegant"], dislikedGiftTags:["rough"] },
  { id:"nagisa", name:"凪", gender:"male", age:25, occupation:"花・ハーブ店員", supplierId:"herb", profile:"草花の話になると止まらない、柔らかな雰囲気の青年。ハーブティーが得意。", image:"/assets/characters/nagisa.png", silhouette:"♟", favoriteGiftTags:["flower","nature","tea"], dislikedGiftTags:["synthetic"] },
];

export const getCharacter = (id:string) => characters.find(item => item.id === id);
