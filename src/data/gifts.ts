import type { Gift } from "../types/game";

export const gifts: Gift[] = [
  { id:"bouquet", name:"野の花束", icon:"💐", price:280, tags:["flower","nature"], description:"季節の小花を束ねた花束" },
  { id:"cookies", name:"焼き菓子", icon:"🍪", price:220, tags:["sweet","handmade"], description:"素朴なバタークッキー" },
  { id:"book", name:"短編集", icon:"📕", price:360, tags:["book","art"], description:"珈琲に似合う静かな物語" },
  { id:"mug", name:"陶器のマグ", icon:"☕", price:420, tags:["coffee","craft"], description:"手になじむ飴色のカップ" },
  { id:"handkerchief", name:"刺繍ハンカチ", icon:"◫", price:260, tags:["practical","handmade"], description:"小さな葉の刺繍入り" },
  { id:"earlGrey", name:"アールグレイ", icon:"🫖", price:300, tags:["tea","elegant"], description:"柑橘が香る茶葉" },
  { id:"chocolateBox", name:"チョコレート箱", icon:"🍫", price:380, tags:["sweet","elegant"], description:"ひと粒ずつ味の違う詰め合わせ" },
  { id:"plant", name:"小さな観葉植物", icon:"🪴", price:340, tags:["nature","practical"], description:"窓辺に置ける緑" },
  { id:"scarf", name:"やわらかマフラー", icon:"🧣", price:520, tags:["warm","handmade"], description:"落ち着いた色の手編み風" },
  { id:"animalCharm", name:"動物のお守り", icon:"🐑", price:320, tags:["animal","craft"], description:"木彫りの小さなお守り" },
  { id:"jam", name:"季節のジャム", icon:"🍓", price:240, tags:["food","sweet"], description:"果実を煮詰めた瓶詰め" },
  { id:"notebook", name:"革の手帳", icon:"📔", price:450, tags:["book","practical"], description:"長く使える小さな手帳" },
  { id:"incense", name:"森の香り袋", icon:"🌲", price:290, tags:["nature","perfume"], description:"深呼吸したくなる森の香り" },
  { id:"glassPen", name:"ガラスペン", icon:"✒️", price:650, tags:["art","elegant","luxury"], description:"光を受けてきらめくペン" },
  { id:"apron", name:"丈夫なエプロン", icon:"▱", price:480, tags:["practical","rough"], description:"毎日の仕事に頼れる一枚" },
  { id:"mintCandy", name:"ミントキャンディ", icon:"🍬", price:160, tags:["tea","food"], description:"すっきり爽やかな飴" },
  { id:"musicBox", name:"小さなオルゴール", icon:"🎵", price:780, tags:["art","luxury"], description:"懐かしい曲を奏でる箱" },
  { id:"ribbon", name:"きらきらリボン", icon:"🎀", price:250, tags:["flashy","synthetic"], description:"目を引く鮮やかなリボン" },
  { id:"woodTray", name:"木のトレイ", icon:"▰", price:390, tags:["craft","practical"], description:"木目のきれいなお盆" },
  { id:"poundCake", name:"パウンドケーキ", icon:"🍰", price:330, tags:["sweet","warm","food"], description:"しっとり焼いたケーキ" },
];

export const getGift = (id:string) => gifts.find(item => item.id === id);
