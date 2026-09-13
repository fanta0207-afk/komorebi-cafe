import { characters } from "../data/characters";
import { growthEvents } from "../data/growthEvents";
import { recipes } from "../data/recipes";
import { dateEvents } from "../data/dates";
import { getEquipment } from "../data/equipment";
import { getSupplier } from "../data/suppliers";
import type { GameState, MissionProgress, OngoingMission } from "../types/game";
import { autoProcurementUnlocked } from "./automation";
import { GAME_CONFIG } from "./config";
import { menuCatalogProgress, recipesAtMasteryLevel } from "./menuMastery";

export type MissionDestination = "orders" | "inventory" | "town" | "coffee" | "bakery" | "ranch" | "patisserie" | "chocolaterie" | "gifts" | "ren" | "recipes" | "equipment" | "people" | "staff";
export interface Mission {
  id:string; chapter:string; title:string; hint:string; reward:number;
  destination:MissionDestination; target:number; value:(state:GameState)=>number;
}
export interface MissionChapter { id:string; title:string; missions:Mission[]; }
export interface SideMission { id:string; title:string; reward:number; target:number; value:(state:GameState)=>number; }

export const emptyMissions=():MissionProgress=>({ongoing:[],completed:[],claimed:[],visited:[],receivedPacks:{},boughtBook:false,gaveBook:false,sideClaimed:[]});
const yes=(value:unknown)=>value?1:0;
const bought=(s:GameState,id:string)=>s.lifetimeStats.ingredientPurchases[id]||0;
const received=(s:GameState,id:string)=>s.missions.receivedPacks[id]||0;
const viewed=(s:GameState,id:string)=>yes(s.viewedGrowthEvents.includes(id));
const relationship=(s:GameState,id:string)=>s.characterProgress[id]?.relationshipStage||0;
const hired=(s:GameState,id:string)=>yes(s.staff.some(person=>person.characterId===id));
const installed=(s:GameState,id:string)=>s.stations.filter(station=>station.equipmentId===id).length;
const stationLevel=(s:GameState,id:string)=>Math.max(0,...s.stations.filter(station=>station.equipmentId===id).map(station=>station.level));
const dated=(s:GameState,id:string)=>yes(s.viewedDateEvents.includes(id));
const add=(id:string,title:string,hint:string,reward:number,destination:MissionDestination,value:Mission["value"],target=1):Mission=>({id,chapter:"",title,hint,reward,destination,value,target});
const supplierName=(characterId:string)=>getSupplier(characters.find(item=>item.id===characterId)!.supplierId)!.name;
const relationshipHint=()=>"ギフトをあげて、好感度をあげよう";

function growthStatCondition(requirement:(typeof growthEvents)[number]["requiredStats"][number]) {
  if(requirement.type==="ingredientPurchases")return `${requirement.label.replace("を仕入れる","")}を累計${requirement.target}パック発注`;
  if(requirement.type==="tagSales"||requirement.type==="recipeSales")return `${requirement.label.replace("を販売","")}を累計${requirement.target}品提供`;
  if(requirement.type==="totalRevenue")return `累計売上${requirement.target}コイン`;
  return `料理を累計${requirement.target}品提供`;
}

function growthStoryHint(characterId:string,routeStage:number) {
  const character=characters.find(item=>item.id===characterId)!;
  const event=growthEvents.find(item=>item.eventId===`${characterId}-growth${routeStage}`)!;
  const conditions=[
    `${character.shortName}の好感度${event.requiredRelationshipStage}以上`,
    ...event.requiredStats.map(growthStatCondition),
  ];
  return `${conditions.join("\n")}で発生`;
}

function equipmentUnlockHint(characterId:string) {
  const event=growthEvents.find(item=>item.eventId===`${characterId}-growth4`)!;
  return `${event.requiredStats.map(growthStatCondition).join("\n")}\n「${event.title}」を読むと解放`;
}

const introduction:Mission[]=[
  add("visit-town","街へ行く","",5,"town",s=>yes(s.missions.visited.includes("town")||s.characterProgress.ren.met)),
  add("meet-ren","蓮に会う",`街 → ${supplierName("ren")}`,10,"coffee",s=>yes(s.characterProgress.ren.met)),
  add("ren-story1","蓮との出会いを読む","",15,"coffee",s=>relationship(s,"ren")),
  add("beans-first","コーヒー豆を1パック発注","",10,"coffee",s=>bought(s,"coffeeBeans")),
  add("beans-arrive","コーヒー豆を1パック受け取る","",15,"inventory",s=>received(s,"coffeeBeans")),
  add("second-table","2席目を購入","",15,"equipment",s=>yes(s.tableCount>=2)),
  add("first-order","注文を1件開く","",5,"orders",s=>yes(s.orders.length||s.lifetimeStats.totalOrders)),
  add("first-cook","料理を1品調理する","",5,"orders",s=>yes(s.orders.some(o=>o.status!=="queued")||s.lifetimeStats.totalOrders)),
  add("first-serve","料理を1品提供する","",25,"orders",s=>s.lifetimeStats.totalOrders),
  add("toast-order","トーストの注文を受ける","",5,"orders",s=>yes(s.orders.some(order=>order.recipeId==="toast")||(s.lifetimeStats.recipeSales.toast||0))),
  add("install-toaster","トースターを1台設置","",35,"equipment",s=>yes(s.stations.some(station=>station.equipmentId==="toastGrill"))),
  add("bread-first","焼きたてパンを1パック発注","",10,"bakery",s=>bought(s,"bread")),
  add("coffee-three","コーヒー料理を累計2品提供","",20,"orders",s=>s.lifetimeStats.tagSales.coffee||0,2),
  add("supply-ren","蓮の「仕入れを整える」を読む",growthStoryHint("ren",1),15,"ren",s=>viewed(s,"ren-growth1")),
  add("talk-ren","蓮と新しい会話をする","好感度1で蓮の店を訪問",5,"coffee",s=>yes(s.characterProgress.ren.talkedStages.includes(1)||relationship(s,"ren")>=2)),
  add("visit-gifts","ギフトのお店を1回開く","",5,"gifts",s=>yes(s.missions.visited.includes("gifts")||s.missions.boughtBook||relationship(s,"ren")>=2)),
  add("buy-book","短編集を1冊購入","",20,"gifts",s=>yes(s.missions.boughtBook||(s.inventory.book||0)>0||relationship(s,"ren")>=2)),
  add("give-book","蓮に短編集を1冊贈る","",20,"ren",s=>yes(s.missions.gaveBook||relationship(s,"ren")>=2)),
  add("ren-story2","蓮の好感度2「袋の裏のメモ」を読む","交流ポイント10で発生",20,"coffee",s=>relationship(s,"ren"),2),
  add("beans-second","コーヒー豆を累計2パック発注","",10,"coffee",s=>bought(s,"coffeeBeans"),2),
  add("ren-growth2","蓮の「夜色の豆」を読む",growthStoryHint("ren",2),15,"ren",s=>viewed(s,"ren-growth2")),
  add("coffee-ten","コーヒー料理を累計5品提供","",30,"orders",s=>s.lifetimeStats.tagSales.coffee||0,5),
  add("develop-mocha","蓮の「ふたりのカフェモカ」を読む",growthStoryHint("ren",3),30,"ren",s=>viewed(s,"ren-growth3")),
  add("meet-sota","牧に会う",`街 → ${supplierName("sota")}`,10,"ranch",s=>yes(s.characterProgress.sota.met)),
  add("buy-milk","しぼりたて牛乳を1パック発注","",10,"ranch",s=>bought(s,"milk")),
  add("meet-cacao","カカオに会う",`街 → ${supplierName("cacao")}`,10,"chocolaterie",s=>yes(s.characterProgress.cacao.met)),
  add("buy-chocolate","チョコレートを1パック発注","",10,"chocolaterie",s=>bought(s,"chocolate")),
  add("chocolate-arrive","チョコレートを1パック受け取る","",15,"inventory",s=>received(s,"chocolate")),
  add("serve-mocha","街角カフェモカを1品提供","",30,"orders",s=>s.lifetimeStats.recipeSales.cafeMocha||0),
  add("chocolate-three","チョコ料理を累計3品提供","",30,"orders",s=>s.lifetimeStats.tagSales.chocolate||0,3),
];

const alreadyGuided=new Set(["meet-ren","supply-ren","bond3-ren","meet-sota","meet-cacao"]);
const meetAndBond=characters.flatMap(character=>[
  add(`meet-${character.id}`,`${character.shortName}と出会う`,`街 → ${supplierName(character.id)}`,10,"town",s=>yes(s.characterProgress[character.id]?.met)),
  add(`supply-${character.id}`,`${character.shortName}の「仕入れを整える」を読む`,growthStoryHint(character.id,1),20,"people",s=>viewed(s,`${character.id}-growth1`)),
  add(`bond3-${character.id}`,`${character.shortName}の好感度を3にする`,relationshipHint(),25,"people",s=>relationship(s,character.id),3),
]).filter(mission=>!alreadyGuided.has(mission.id));

const earlyRenStaff:Mission[]=[
  add("bond3-ren","蓮の好感度を3にする",relationshipHint(),25,"ren",s=>relationship(s,"ren"),3),
  add("bond4-ren","蓮の好感度を4にする",relationshipHint(),35,"ren",s=>relationship(s,"ren"),4),
  add("hire-ren","黒豆蓮をスタッフに雇用","好感度4・初回雇用600コイン",40,"staff",s=>hired(s,"ren")),
  add("assign-ren-procurement","黒豆蓮に仕入れを任せる","スタッフ → 蓮 → 仕入れ",40,"staff",s=>yes(s.staff.some(person=>person.characterId==="ren"&&person.role==="procurement"))),
  add("ren-first-staff-supply","蓮に仕入れを1回頼む","注文 → 不足食材 → 仕入れを頼む",40,"orders",s=>s.lifetimeStats.staffProcurementOrders),
  add("install-prep-table","キッチン作業台を1台設置","",200,"equipment",s=>yes(installed(s,"prepTable"))),
];

const coreEquipment:Mission[]=[
  add("upgrade-toast-grill","トースターをLv.2に強化","設備 → トースター → 強化",50,"equipment",s=>stationLevel(s,"toastGrill"),2),
  add("upgrade-prep-table","キッチン作業台をLv.2に強化","設備 → キッチン作業台 → 強化",100,"equipment",s=>stationLevel(s,"prepTable"),2),
  add("upgrade-coffee-counter","コーヒーカウンターをLv.2に強化","設備 → コーヒーカウンター → 強化",180,"equipment",s=>stationLevel(s,"coffeeCounter"),2),
  add("install-second-coffee-counter","コーヒーカウンターを2台にする","",250,"equipment",s=>installed(s,"coffeeCounter"),2),
];

const growTogether=characters.flatMap(character=>{
  const event=growthEvents.find(item=>item.eventId===`${character.id}-growth4`)!;
  const item=getEquipment(event.rewards.equipmentIds![0])!;
  return [
    add(`bond6-${character.id}`,`${character.shortName}の好感度を7にする`,relationshipHint(),35,"people",s=>relationship(s,character.id),7),
    add(`install-${character.id}-equipment`,`${item.name}を1台設置`,equipmentUnlockHint(character.id),600,"equipment",s=>yes(installed(s,item.id))),
    add(`growth5-${character.id}`,`${character.shortName}の最後の店づくり物語を読む`,growthStoryHint(character.id,5),40,"people",s=>viewed(s,`${character.id}-growth5`)),
  ];
});

const hireHint="好感度7で雇用";
const staffProgression:Mission[]=[
  ...growTogether.slice(0,3),
  ...growTogether.slice(3,4),
  add("hire-second","スタッフを2人雇用",hireHint,50,"staff",s=>s.staff.length,2),
  ...growTogether.slice(4,9),
  add("hire-third","スタッフを3人雇用",hireHint,60,"staff",s=>s.staff.length,3),
  ...growTogether.slice(9,13),
  add("hire-fourth","スタッフを4人雇用",hireHint,80,"staff",s=>s.staff.length,4),
  ...growTogether.slice(13),
];

const automation:Mission[]=[
  add("automation-team","調理・提供スタッフを4人配置","",40,"staff",s=>s.staff.filter(person=>person.role==="cook"||person.role==="server").length,GAME_CONFIG.maxFloorStaff),
  add("automation-trust","スタッフ1人を「仕入れ」担当にする","",40,"staff",s=>yes(s.staff.some(person=>person.role==="procurement"))),
  add("automation-enable","不足食材を自動仕入れしてもらう","仕入れ担当の好感度9以上\n注文に足りない食材があると発生",40,"staff",s=>yes(autoProcurementUnlocked(s)&&s.lifetimeStats.automaticPacks>0)),
];

const dates:Mission[]=characters.flatMap(character=>dateEvents.filter(event=>event.characterId===character.id).map(event=>
  add(event.id,`${character.shortName}と「${event.title}」へ行く`,`${character.shortName}の好感度8以上\n${supplierName(character.id)}から誘う`,30,"town",s=>dated(s,event.id))
));

const endings:Mission[]=[
  ...characters.map(character=>add(`bond10-${character.id}`,`${character.shortName}の好感度を10にする`,relationshipHint(),50,"people",s=>relationship(s,character.id),10)),
  add("all-recipes","全料理をそれぞれ1品以上提供","",80,"recipes",s=>recipes.filter(recipe=>(s.lifetimeStats.recipeSales[recipe.id]||0)>0).length,recipes.length),
  add("all-growth","全員の店づくり物語を全話読む","",80,"people",s=>s.viewedGrowthEvents.length,growthEvents.length),
  add("auto-packs","自動仕入れの配達を累計3パック受け取る","好感度9以上の「仕入れ」担当を配置\n注文に足りない食材があると発生",50,"staff",s=>s.lifetimeStats.automaticPacks,3),
  add("auto-orders","自動で累計10品提供","「調理」と「提供」担当を配置",80,"staff",s=>s.lifetimeStats.automatedOrders,10),
  add("all-bonds","全員の好感度を10にする","",100,"people",s=>characters.filter(c=>relationship(s,c.id)>=10).length,characters.length),
];

const roadmap=[...introduction,...earlyRenStaff,...coreEquipment,...meetAndBond,...staffProgression,...dates,...automation,...endings];
if(roadmap.length%3!==0)throw new Error("Mission roadmap must be divisible into groups of three");
export const missionChapters:MissionChapter[]=Array.from({length:roadmap.length/3},(_,index)=>{
  const number=index+1,title=index===roadmap.length/3-1?"最終目標":`ステップ ${number}`;
  const chapter=`${number} ${title}`;
  return {id:`chapter-${number}`,title,missions:roadmap.slice(index*3,index*3+3).map(mission=>({...mission,chapter}))};
});
export const missions=missionChapters.flatMap(chapter=>chapter.missions);
export const milestoneMissions:Mission[]=[];

const sideRewards=[30,50,80,120,180,260];
const sideMissionRounds=30;
const recurringTargets=(initial:number[])=>Array.from({length:sideMissionRounds},(_,index)=>index<initial.length?initial[index]:initial[initial.length-1]*2**(index-initial.length+1));
const recurringReward=(index:number)=>index<sideRewards.length?sideRewards[index]:Math.min(500,sideRewards[sideRewards.length-1]+40*(index-sideRewards.length+1));
const sideGroups:SideMission[][]=[
  recurringTargets([5,15,30,60,120,250]).map((target,index)=>({id:`side-orders-${target}`,title:`料理を累計${target.toLocaleString()}品提供`,target,reward:recurringReward(index),value:s=>s.lifetimeStats.totalOrders})),
  recurringTargets([300,1000,3000,7500,15000,30000]).map((target,index)=>({id:`side-sales-${target}`,title:`累計売上${target.toLocaleString()}コイン`,target,reward:recurringReward(index),value:s=>s.lifetimeStats.totalRevenue})),
  recurringTargets([1,3,7,15,30,60]).map((target,index)=>({id:`side-gifts-${target}`,title:`ギフトを累計${target.toLocaleString()}個購入`,target,reward:recurringReward(index),value:s=>s.lifetimeStats.giftPurchases})),
  [10,25,50,75,100].map((target,index)=>({id:`side-menu-unlock-${target}`,title:`メニュー解放率を${target}%にする`,target,reward:recurringReward(index),value:s=>menuCatalogProgress(s).percent})),
  [{level:2,count:3},{level:3,count:5},{level:4,count:10},{level:5,count:15},{level:6,count:20},{level:7,count:30}].map((goal,index)=>({id:`side-menu-level-${goal.level}-${goal.count}`,title:`${goal.count}種類の料理をLv.${goal.level}にする`,target:goal.count,reward:recurringReward(index),value:s=>recipesAtMasteryLevel(s,goal.level)})),
];
export const sideMissions=sideGroups.flat();
export function activeSideMissions(state:GameState) { return sideGroups.map(group=>group.find(mission=>!state.missions.sideClaimed.includes(mission.id))).filter((mission):mission is SideMission=>!!mission); }

export function activeMissionChapter(state:GameState) { return missionChapters.find(chapter=>chapter.missions.some(mission=>!state.missions.claimed.includes(mission.id))); }
export function getMissions(state:GameState):Mission[] { return activeMissionChapter(state)?.missions||[]; }
export function missionRank(state:GameState,mission:Mission):number { return state.missions.claimed.includes(mission.id)?2:state.missions.completed.includes(mission.id)?0:1; }
export function sortedMissions(state:GameState):Mission[] { return [...getMissions(state)].sort((a,b)=>missionRank(state,a)-missionRank(state,b)); }
export function currentMission(state:GameState) { return getMissions(state).find(m=>!state.missions.claimed.includes(m.id)); }

export function updateMissions(state:GameState):GameState {
  const newly=getMissions(state).filter(m=>!state.missions.completed.includes(m.id)&&m.value(state)>=m.target).map(m=>m.id);
  return newly.length?{...state,missions:{...state.missions,completed:[...state.missions.completed,...newly]}}:state;
}

export function claimMission(state:GameState,id:string):GameState {
  const mission=getMissions(state).find(m=>m.id===id);
  if(!mission||state.missions.claimed.includes(id)||!state.missions.completed.includes(id))return state;
  return {...state,currency:state.currency+mission.reward,missions:{...state.missions,claimed:[...state.missions.claimed,id]},
    notice:{id:Date.now()+Math.random(),type:"coin",text:`ミッション達成！ +${mission.reward} コイン`}};
}

export function claimSideMission(state:GameState,id:string):GameState {
  const mission=activeSideMissions(state).find(item=>item.id===id);
  if(!mission||mission.value(state)<mission.target)return state;
  return {...state,currency:state.currency+mission.reward,missions:{...state.missions,sideClaimed:[...state.missions.sideClaimed,id]},
    notice:{id:Date.now()+Math.random(),type:"coin",text:`サブミッション達成！ +${mission.reward} コイン`}};
}

// Kept only to migrate old recurring mission save fields safely.
export function restoreOngoing(value:unknown):OngoingMission[] { void value; return []; }

/** Guided orders only during the introduction. Never create stock or bypass a lock. */
export function tutorialRecipe(state:GameState):string|undefined {
  if(state.missions.claimed.includes("serve-mocha"))return;
  if(state.unlockedRecipes.includes("cafeMocha")&&!(state.lifetimeStats.recipeSales.cafeMocha||0))return "cafeMocha";
  const toastChapter=activeMissionChapter(state)?.missions.some(mission=>mission.id==="toast-order");
  if(!(state.lifetimeStats.recipeSales.toast||0)&&(toastChapter||state.missions.claimed.includes("toast-order")))return "toast";
}
