import type { GameState, MissionProgress, OngoingMission } from "../types/game";
import { recipes, recipeEquipmentId } from "../data/recipes";

export type MissionDestination = "orders" | "inventory" | "town" | "coffee" | "ranch" | "patisserie" | "gifts" | "ren" | "recipes" | "equipment" | "people" | "staff";
export interface Mission {
  id:string; chapter:string; title:string; hint:string; reward:number;
  destination:MissionDestination; target:number; value:(state:GameState)=>number;
}
export const emptyMissions=():MissionProgress=>({ongoing:[],completed:[],claimed:[],visited:[],receivedPacks:{},boughtBook:false,gaveBook:false});
const yes=(value:unknown)=>value?1:0;
const coffee=(s:GameState)=>s.lifetimeStats.tagSales.coffee||0;
const stage=(s:GameState)=>s.characterProgress.ren?.relationshipStage||0;
const bought=(s:GameState,id:string)=>s.lifetimeStats.ingredientPurchases[id]||0;
const received=(s:GameState,id:string)=>s.missions.receivedPacks[id]||0;
const viewed=(s:GameState,id:string)=>yes(s.viewedGrowthEvents.includes(id));
const mochaSold=(s:GameState)=>s.lifetimeStats.recipeSales.cafeMocha||0;
const add=(id:string,chapter:string,title:string,hint:string,reward:number,destination:MissionDestination,value:Mission["value"],target=1):Mission=>({id,chapter,title,hint,reward,destination,value,target});

// Stable IDs are save data. Completion is latched even when stock, money or orders change.
export const missions:Mission[]=[
  add("visit-town","1 最初の仕入れ先","街へ行く","下の「街」から仕入れ先を探そう。",5,"town",s=>yes(s.missions.visited.includes("town")||s.characterProgress.ren.met)),
  add("meet-ren","1 最初の仕入れ先","蓮に会う","コーヒー屋を訪ねよう。",10,"coffee",s=>yes(s.characterProgress.ren.met)),
  add("ren-story1","1 最初の仕入れ先","蓮との出会いを読む","物語を最後まで読むと、好感度1に。",15,"coffee",s=>stage(s)),
  add("beans-first","2 豆を仕入れる","コーヒー豆を1パック発注","蓮の店で購入。100コインで5食分。",10,"coffee",s=>bought(s,"coffeeBeans")),
  add("inventory","2 豆を仕入れる","在庫を確認","店内の「在庫」で残りと入荷予定を見る。",5,"inventory",s=>yes(s.missions.visited.includes("inventory"))),
  add("beans-arrive","2 豆を仕入れる","豆の入荷を待つ","好感度1なら2分45秒。在庫で入荷までの時間を確認。",15,"inventory",s=>received(s,"coffeeBeans")),
  add("first-order","3 はじめての営業","注文を見つける","豆が届いたら、店内の料理の吹き出しをタップ。",5,"orders",s=>yes(s.orders.length||s.lifetimeStats.totalOrders)),
  add("first-cook","3 はじめての営業","最初の料理を作る","注文ノートで「調理開始」を押す。",5,"orders",s=>yes(s.orders.some(o=>o.status!=="queued")||s.lifetimeStats.totalOrders)),
  add("first-ready","3 はじめての営業","料理の完成を待つ","調理は約30秒。「できたて」が完成の合図。",5,"orders",s=>yes(s.orders.some(o=>o.status==="ready")||s.lifetimeStats.totalOrders)),
  add("first-serve","3 はじめての営業","最初の一皿を届ける","「提供する」を押すと、売上が入る。",15,"orders",s=>s.lifetimeStats.totalOrders),
  add("coffee-three","4 小さな信頼","コーヒーを累計3杯提供","コーヒー料理なら、どれでも数える。",20,"orders",coffee,3),
  add("ren-growth1","4 小さな信頼","蓮から小物を受け取る","好感度1・3杯提供で始まる物語を読む。",15,"ren",s=>viewed(s,"ren-growth1")),
  add("talk-ren","4 小さな信頼","蓮ともう一度話す","蓮の店へ。今の関係で初めての会話は交流＋5。",5,"coffee",s=>yes(s.characterProgress.ren.talkedStages.includes(1)||stage(s)>=2)),
  add("visit-gifts","4 小さな信頼","贈物のお店へ行く","蓮への贈物に「短編集」を探そう。",5,"gifts",s=>yes(s.missions.visited.includes("gifts")||s.missions.boughtBook||stage(s)>=2)),
  add("save-gift","4 小さな信頼","360コイン貯める","営業とミッション報酬で、短編集の代金を貯めよう。",10,"orders",s=>s.missions.boughtBook||stage(s)>=2?360:s.currency,360),
  add("buy-book","4 小さな信頼","短編集を1冊買う","贈物のお店で購入。すでに持っていればOK。",10,"gifts",s=>yes(s.missions.boughtBook||(s.inventory.book||0)>0||stage(s)>=2)),
  add("ren-profile","4 小さな信頼","蓮の人物ページを開く","次の物語の条件や、贈物の渡し方を確認。",5,"ren",s=>yes(s.missions.visited.includes("ren")||stage(s)>=2)),
  add("give-book","4 小さな信頼","蓮に短編集を贈る","「プレゼントを渡す」→短編集。交流＋15。",15,"ren",s=>yes(s.missions.gaveBook||stage(s)>=2)),
  add("ren-story2","4 小さな信頼","蓮と顔なじみになる","交流20で始まる物語を読む。会話・仕入れでも交流が増える。",20,"coffee",s=>stage(s),2),
  add("beans-second","5 ふたりの新メニュー","豆を累計2パック発注","蓮の店でもう1パック。入荷待ちなら到着後に。",10,"coffee",s=>bought(s,"coffeeBeans"),2),
  add("beans-second-arrive","5 ふたりの新メニュー","2パック目の豆を受け取る","自動で入荷するまで、営業を続けよう。",10,"orders",s=>received(s,"coffeeBeans"),2),
  add("ren-growth2","5 ふたりの新メニュー","特別な豆の話を聞く","好感度2・2パック発注・小物の物語読了で解放。",15,"ren",s=>viewed(s,"ren-growth2")),
  add("coffee-five","5 ふたりの新メニュー","コーヒーを累計5杯提供","豆が足りなければ、蓮の店で仕入れよう。",10,"orders",coffee,5),
  add("coffee-eight","5 ふたりの新メニュー","コーヒーを累計8杯提供","完成した料理から、お客さまへ届けよう。",10,"orders",coffee,8),
  add("coffee-ten","5 ふたりの新メニュー","コーヒーを累計10杯提供","ハンドドリップなども対象。あと少し！",20,"orders",coffee,10),
  add("develop-mocha","5 ふたりの新メニュー","蓮とカフェモカを開発","好感度2・10杯提供・「夜色の豆」読了で物語が始まる。",30,"ren",s=>viewed(s,"ren-growth3")),
  add("mocha-recipe","6 新メニューをお客さまへ","カフェモカの材料を見る","豆・牛乳・チョコを各1食分。基本設備で作れる。",5,"recipes",s=>yes(s.missions.visited.includes("recipes"))),
  add("meet-ranch","6 新メニューをお客さまへ","牧に会う","牧場を訪ね、出会いの物語を読もう。",5,"ranch",s=>yes(s.characterProgress.sota.met)),
  add("buy-milk","6 新メニューをお客さまへ","牛乳を1パック発注","牧の店で購入。130コインで5食分。",10,"ranch",s=>bought(s,"milk")),
  add("milk-arrive","6 新メニューをお客さまへ","牛乳の入荷を待つ","届くまでは追加発注できない。営業しながら待とう。",10,"orders",s=>received(s,"milk")),
  add("buy-chocolate","6 新メニューをお客さまへ","チョコを1パック発注","アールの店で購入。180コインで5食分。",10,"patisserie",s=>bought(s,"chocolate")),
  add("chocolate-arrive","6 新メニューをお客さまへ","チョコの入荷を待つ","カフェモカ用に、豆も1食分残そう。",10,"orders",s=>received(s,"chocolate")),
  add("cook-mocha","6 新メニューをお客さまへ","カフェモカを作る","材料がそろうと注文が入る。満席なら先に提供。",15,"orders",s=>yes(mochaSold(s)||s.orders.some(o=>o.recipeId==="cafeMocha"&&o.status!=="queued"))),
  add("serve-mocha","6 新メニューをお客さまへ","カフェモカを届ける","完成したら「提供する」を押そう。",30,"orders",mochaSold),
  add("view-investment","7 はじめての設備投資","設備の強化費用を見る","カウンター強化は450コイン。調理30秒→25.5秒。",5,"equipment",s=>yes(s.missions.visited.includes("equipment"))),
  add("save-investment","7 はじめての設備投資","550コイン貯める","強化450＋次の豆100コインを用意しよう。",10,"orders",s=>s.stations.some(st=>st.equipmentId==="coffeeCounter"&&st.level>=2)?550:s.currency,550),
  add("first-investment","7 はじめての設備投資","カウンターをLv.2にする","設備で「強化」を押す。使用中なら提供後に。",20,"equipment",s=>yes(s.stations.some(st=>st.equipmentId==="coffeeCounter"&&st.level>=2))),
];

export const milestoneMissions:Mission[]=[
  ...[5,10,20,30,51].map(n=>add(`variety-${n}`,"料理のコレクション",`${n}種類の料理を提供`,"一度でも提供した料理の種類を数える。",n===51?50:20,"recipes",s=>Object.values(s.lifetimeStats.recipeSales).filter(count=>count>0).length,n)),
  ...[3,6].map(n=>add(`neighbors-${n}`,"街のつながり",`${n}人と出会う`,"街の仕入れ先を訪ねよう。",15,"town",s=>Object.values(s.characterProgress).filter(p=>p.met).length,n)),
  ...[5,10,20,30].map(n=>add(`collaboration-${n}`,"みんなとの共同開発",`共同成長の物語を${n}話読む`,"人物ページで次の共同開発を確認。",30,"people",s=>s.viewedGrowthEvents.length,n)),
  ...[1,3,6].map(n=>add(`team-${n}`,"お店の仲間",`スタッフを${n}人雇う`,"好感度3から雇用できる。",20,"staff",s=>s.staff.length,n)),
];

const specialTags:Record<string,string>={drink:"ドリンク",bread:"パン料理",sweet:"甘い料理",vegetable:"野菜料理",milk:"ミルク料理",tea:"お茶"};
const ongoingKinds:OngoingMission["kind"][]=["service","special","supply"];
const ongoingId=(kind:OngoingMission["kind"],round:number)=>`ongoing-${kind}-${round}`;
const ongoingValue=(state:GameState,kind:OngoingMission["kind"],tag?:string)=>kind==="service"?state.lifetimeStats.totalOrders:kind==="special"?(state.lifetimeStats.tagSales[tag!]||0):Object.values(state.missions.receivedPacks).reduce((sum,count)=>sum+count,0);
function createOngoing(state:GameState,kind:OngoingMission["kind"],round:number):OngoingMission {
  const available=Object.keys(specialTags).filter(tag=>recipes.some(recipe=>recipe.tags.includes(tag)&&state.unlockedRecipes.includes(recipe.id)&&state.stations.some(station=>station.equipmentId===recipeEquipmentId(recipe))&&(recipe.requiredEquipmentIds||[]).every(id=>state.ownedEquipment.includes(id))));
  const tag=kind==="special"?(available[(round-1)%available.length]||"drink"):undefined;
  return {id:ongoingId(kind,round),kind,round,start:ongoingValue(state,kind,tag),...(tag?{tag}:{})};
}
function ongoingDefinition(run:OngoingMission):Mission {
  const target=run.kind==="service"?Math.min(20,5*run.round):3;
  const reward=run.kind==="service"?Math.min(30,10+5*run.round):10;
  const title=run.kind==="service"?`お客さまに${target}品届ける`:run.kind==="special"?`${specialTags[run.tag!]}を3品提供`:"食材を3パック受け取る";
  const hint=run.kind==="supply"?"開始後に届いた分を数える。どの食材でもOK。":"開始後の提供を数える。受取後に次の目標へ。";
  return add(run.id,`継続ミッション · ${run.round}回目`,title,hint,reward,run.kind==="supply"?"town":"orders",s=>Math.max(0,ongoingValue(s,run.kind,run.tag)-run.start),target);
}

// Keep round IDs and baselines across reloads; old sales never pay the next round.
export function restoreOngoing(value:unknown):OngoingMission[] {
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();
  return value.filter((run):run is OngoingMission=>{
    if(!run||!ongoingKinds.includes(run.kind)||!Number.isSafeInteger(run.round)||run.round<1||!Number.isFinite(run.start)||run.start<0||run.id!==ongoingId(run.kind,run.round)||(run.kind==="special"&&!Object.hasOwn(specialTags,run.tag))||seen.has(run.id))return false;
    seen.add(run.id);return true;
  }).map(({id,kind,round,start,tag})=>({id,kind,round,start,...(kind==="special"?{tag}:{})}));
}
export function getMissions(state:GameState):Mission[] {
  return [...missions,...(state.missions.ongoing.length?milestoneMissions:[]),...state.missions.ongoing.map(ongoingDefinition)];
}
export function missionRank(state:GameState,mission:Mission):number {
  return state.missions.claimed.includes(mission.id)?2:state.missions.completed.includes(mission.id)?0:1;
}
export function sortedMissions(state:GameState):Mission[] {
  return getMissions(state).sort((a,b)=>missionRank(state,a)-missionRank(state,b));
}

// The opening guide remains available to callers that need its next step.
export function currentMission(state:GameState) { return missions.find(m=>!state.missions.claimed.includes(m.id)); }
export function updateMissions(state:GameState):GameState {
  if(state.lifetimeStats.totalOrders>0){
    const missing=ongoingKinds.filter(kind=>!state.missions.ongoing.some(run=>run.kind===kind));
    if(missing.length)state={...state,missions:{...state.missions,ongoing:[...state.missions.ongoing,...missing.map(kind=>createOngoing(state,kind,1))]}};
  }
  const newly=getMissions(state).filter(m=>!state.missions.completed.includes(m.id)&&m.value(state)>=m.target).map(m=>m.id);
  return newly.length?{...state,missions:{...state.missions,completed:[...state.missions.completed,...newly]}}:state;
}
export function claimMission(state:GameState,id:string):GameState {
  const mission=getMissions(state).find(m=>m.id===id);
  if(!mission||state.missions.claimed.includes(id)||!state.missions.completed.includes(id))return state;
  const run=state.missions.ongoing.find(item=>item.id===id);
  const ongoing=run?[...state.missions.ongoing,createOngoing(state,run.kind,run.round+1)]:state.missions.ongoing;
  return {...state,currency:state.currency+mission.reward,missions:{...state.missions,ongoing,claimed:[...state.missions.claimed,id]},
    notice:{id:Date.now()+Math.random(),type:"coin",text:`ミッション達成！ +${mission.reward} コイン`}};
}

/** Guided orders only during the introduction. Never create stock or bypass a lock. */
export function tutorialRecipe(state:GameState):string|undefined {
  if(state.missions.claimed.includes("serve-mocha"))return;
  if(state.unlockedRecipes.includes("cafeMocha")&&!mochaSold(state))return "cafeMocha";
  if(coffee(state)<10)return "coffee";
}
