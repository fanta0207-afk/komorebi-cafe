import type { CustomerGroup, DailyCondition, DailyWeather, TownDailyEvent } from "../types/game";

export const dailyWeathers:DailyWeather[] = [
  { id:"sunny", name:"ぽかぽか晴れ", icon:"☀️", description:"散歩ついでのお客さんが増えそう", favoredTags:["breakfast","vegetable","family"] },
  { id:"cloudy", name:"花曇り", icon:"☁️", description:"静かに過ごす飲み物が人気", favoredTags:["coffee","tea","calm"] },
  { id:"rain", name:"春の雨", icon:"🌧️", description:"温かい一杯を求める人が多い日", favoredTags:["warm","drink","coffee"] },
  { id:"breeze", name:"春風", icon:"🍃", description:"軽食を持って出かける人が増えそう", favoredTags:["bread","lunch","vegetable"] },
];

export const customerGroups:CustomerGroup[] = [
  { id:"neighbors", name:"近所の常連さん", icon:"🏡", description:"いつもの朝ごはんがお目当て", favoredTags:["coffee","breakfast","warm"] },
  { id:"students", name:"放課後の学生", icon:"🎒", description:"甘いものを囲んでおしゃべり", favoredTags:["sweet","dessert","drink"] },
  { id:"workers", name:"働く街の人", icon:"💼", description:"手早い昼食と濃い珈琲が人気", favoredTags:["coffee","lunch","bread"] },
  { id:"families", name:"親子連れ", icon:"🧺", description:"分け合える甘い料理を選びそう", favoredTags:["family","sweet","milk"] },
  { id:"travelers", name:"旅のお客さん", icon:"🧳", description:"この店だけの一皿に興味津々", favoredTags:["limited","tea","dessert"] },
];

export const townDailyEvents:TownDailyEvent[] = [
  { id:"morningMarket", name:"朝市の日", icon:"🧺", description:"早起きのお客さんで通りが賑わっています", favoredTags:["breakfast","coffee","bread"], saleMultiplier:1.1 },
  { id:"readingClub", name:"読書会", icon:"📚", description:"ゆっくりできる飲み物がいつもより人気", favoredTags:["coffee","tea","calm"], saleMultiplier:1.05 },
  { id:"schoolHoliday", name:"学校のお休み", icon:"🎈", description:"甘いものを楽しみに若いお客さんが来店", favoredTags:["sweet","dessert","family"], saleMultiplier:1.1 },
  { id:"flowerFair", name:"春の花市", icon:"🌷", description:"遠くから来た人が限定メニューを探しています", favoredTags:["limited","tea","vegetable"], saleMultiplier:1.2 },
  { id:"quietDay", name:"静かな平日", icon:"🕰️", description:"客足は穏やか。常連さんとの時間を大切に", favoredTags:["warm","coffee","calm"], saleMultiplier:1 },
  { id:"picnicDay", name:"ピクニック日和", icon:"🧺", description:"持ち歩きやすい軽食の注文が増えそう", favoredTags:["bread","lunch","sweet"], saleMultiplier:1.15 },
];

export function conditionForDay(day:number):DailyCondition {
  const index=Math.max(0,day-1);
  return {
    weatherId:dailyWeathers[index%dailyWeathers.length].id,
    customerGroupId:customerGroups[(index*2)%customerGroups.length].id,
    dailyEventId:townDailyEvents[index%townDailyEvents.length].id,
  };
}

export const getWeather=(id:string)=>dailyWeathers.find(item=>item.id===id) || dailyWeathers[0];
export const getCustomerGroup=(id:string)=>customerGroups.find(item=>item.id===id) || customerGroups[0];
export const getTownDailyEvent=(id:string)=>townDailyEvents.find(item=>item.id===id) || townDailyEvents[0];
