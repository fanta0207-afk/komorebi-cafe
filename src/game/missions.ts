import { characters } from "../data/characters";
import { growthEvents } from "../data/growthEvents";
import { recipes } from "../data/recipes";
import { dateEvents } from "../data/dates";
import type { GameState, MissionProgress, OngoingMission } from "../types/game";
import { autoProcurementUnlocked } from "./automation";

export type MissionDestination = "orders" | "inventory" | "town" | "coffee" | "ranch" | "patisserie" | "gifts" | "ren" | "recipes" | "equipment" | "people" | "staff";
export interface Mission {
  id:string; chapter:string; title:string; hint:string; reward:number;
  destination:MissionDestination; target:number; value:(state:GameState)=>number;
}
export interface MissionChapter { id:string; title:string; missions:Mission[]; }

export const emptyMissions=():MissionProgress=>({ongoing:[],completed:[],claimed:[],visited:[],receivedPacks:{},boughtBook:false,gaveBook:false});
const yes=(value:unknown)=>value?1:0;
const bought=(s:GameState,id:string)=>s.lifetimeStats.ingredientPurchases[id]||0;
const received=(s:GameState,id:string)=>s.missions.receivedPacks[id]||0;
const viewed=(s:GameState,id:string)=>yes(s.viewedGrowthEvents.includes(id));
const relationship=(s:GameState,id:string)=>s.characterProgress[id]?.relationshipStage||0;
const hired=(s:GameState,id:string)=>yes(s.staff.some(person=>person.characterId===id));
const dated=(s:GameState,id:string)=>yes(s.viewedDateEvents.includes(id));
const add=(id:string,title:string,hint:string,reward:number,destination:MissionDestination,value:Mission["value"],target=1):Mission=>({id,chapter:"",title,hint,reward,destination,value,target});

const introduction:Mission[]=[
  add("visit-town","街へ行く","下の「街」から仕入れ先を探そう。",5,"town",s=>yes(s.missions.visited.includes("town")||s.characterProgress.ren.met)),
  add("meet-ren","蓮に会う","コーヒー屋を訪ねよう。",10,"coffee",s=>yes(s.characterProgress.ren.met)),
  add("ren-story1","蓮との出会いを読む","物語を最後まで読もう。",15,"coffee",s=>relationship(s,"ren")),
  add("beans-first","コーヒー豆を発注","最初は1パック4食分。",10,"coffee",s=>bought(s,"coffeeBeans")),
  add("inventory","在庫を確認","店内の「在庫」で入荷予定を見る。",5,"inventory",s=>yes(s.missions.visited.includes("inventory"))),
  add("beans-arrive","豆の入荷を待つ","好感度1なら約57秒で届きます。",15,"inventory",s=>received(s,"coffeeBeans")),
  add("first-order","注文を見つける","料理の吹き出しをタップしよう。",5,"orders",s=>yes(s.orders.length||s.lifetimeStats.totalOrders)),
  add("first-cook","最初の料理を作る","注文ノートで「調理開始」。",5,"orders",s=>yes(s.orders.some(o=>o.status!=="queued")||s.lifetimeStats.totalOrders)),
  add("first-serve","最初の一皿を届ける","完成した料理を提供しよう。",25,"orders",s=>s.lifetimeStats.totalOrders),
  add("coffee-three","コーヒーを3杯提供","コーヒー料理ならすべて対象。",20,"orders",s=>s.lifetimeStats.tagSales.coffee||0,3),
  add("supply-ren","蓮と仕入れを整える","好感度1・コーヒー3杯で始まります。",15,"ren",s=>viewed(s,"ren-growth1")),
  add("talk-ren","蓮ともう一度話す","新しい会話で交流を深めよう。",5,"coffee",s=>yes(s.characterProgress.ren.talkedStages.includes(1)||relationship(s,"ren")>=2)),
  add("visit-gifts","ギフトのお店へ行く","蓮が好きそうな短編集を探そう。",5,"gifts",s=>yes(s.missions.visited.includes("gifts")||s.missions.boughtBook||relationship(s,"ren")>=2)),
  add("buy-book","短編集を1冊買う","360コイン。所持済みでも達成。",20,"gifts",s=>yes(s.missions.boughtBook||(s.inventory.book||0)>0||relationship(s,"ren")>=2)),
  add("give-book","蓮に短編集を贈る","人物ページからギフトを渡そう。",20,"ren",s=>yes(s.missions.gaveBook||relationship(s,"ren")>=2)),
  add("ren-story2","蓮と顔なじみになる","好感度2の物語を読もう。",20,"coffee",s=>relationship(s,"ren"),2),
  add("beans-second","豆を累計2パック発注","仕入れ改善後は1パック5食分。",10,"coffee",s=>bought(s,"coffeeBeans"),2),
  add("ren-growth2","特別な豆の話を聞く","夜色の豆の物語を読もう。",15,"ren",s=>viewed(s,"ren-growth2")),
  add("coffee-ten","コーヒーを累計10杯提供","営業を続けて新料理へ進もう。",30,"orders",s=>s.lifetimeStats.tagSales.coffee||0,10),
  add("develop-mocha","蓮とカフェモカを開発","店づくりの物語を進めよう。",30,"ren",s=>viewed(s,"ren-growth3")),
  add("meet-sota","牧に会う","牧場を訪ね、牛乳を仕入れよう。",10,"ranch",s=>yes(s.characterProgress.sota.met)),
  add("buy-milk","牛乳を1パック発注","牧の店で購入できます。",10,"ranch",s=>bought(s,"milk")),
  add("buy-chocolate","チョコを1パック発注","アールの洋菓子店で購入。",10,"patisserie",s=>bought(s,"chocolate")),
  add("serve-mocha","カフェモカを届ける","完成した新メニューを提供しよう。",30,"orders",s=>s.lifetimeStats.recipeSales.cafeMocha||0),
];

const alreadyGuided=new Set(["meet-ren","supply-ren","meet-sota"]);
const meetAndBond=characters.flatMap(character=>[
  add(`meet-${character.id}`,`${character.shortName}と出会う`,`街で${character.shortName}の仕入れ先を訪ねよう。`,10,"town",s=>yes(s.characterProgress[character.id]?.met)),
  add(`supply-${character.id}`,`${character.shortName}と仕入れ改善`,`店づくりの物語で1パック5食分に。`,20,"people",s=>viewed(s,`${character.id}-growth1`)),
  add(`bond3-${character.id}`,`${character.shortName}と好感度3`,`会話・ギフト・仕入れで交流しよう。`,25,"people",s=>relationship(s,character.id),3),
]).filter(mission=>!alreadyGuided.has(mission.id));

const growTogether=characters.flatMap(character=>[
  add(`hire-${character.id}`,`${character.shortName}に働いてもらう`,`好感度3でスタッフに雇用できます。`,30,"staff",s=>hired(s,character.id)),
  add(`bond6-${character.id}`,`${character.shortName}と好感度6`,`好感度6で得意な仕事が速くなります。`,35,"people",s=>relationship(s,character.id),6),
  add(`growth5-${character.id}`,`${character.shortName}と限定料理を作る`,`店づくりの物語を最後まで進めよう。`,40,"people",s=>viewed(s,`${character.id}-growth5`)),
]);

const automation:Mission[]=[
  add("automation-team","スタッフを3人雇用","調理・提供・仕入れを分担しよう。",40,"staff",s=>s.staff.length,Math.min(3,characters.length)),
  add("automation-trust","3人と好感度6になる","任せられる仲間を増やそう。",40,"people",s=>characters.filter(c=>relationship(s,c.id)>=6).length,Math.min(3,characters.length)),
  add("automation-enable","自動仕入れを開始","スタッフ画面で自動仕入れをオンに。",40,"staff",s=>yes(autoProcurementUnlocked(s)&&s.autoProcurementEnabled)),
];

const dates:Mission[]=characters.flatMap(character=>dateEvents.filter(event=>event.characterId===character.id).map(event=>
  add(event.id,`${character.shortName}と${event.title}`,`好感度8で解放。街の${character.shortName}のお店から誘おう。`,30,"town",s=>dated(s,event.id))
));

const endings:Mission[]=[
  ...characters.map(character=>add(`bond10-${character.id}`,`${character.shortName}と好感度10`,`最後の物語まで関係を深めよう。`,50,"people",s=>relationship(s,character.id),10)),
  add("all-recipes","すべての料理を提供","追加された料理も自動で対象になります。",80,"recipes",s=>recipes.filter(recipe=>(s.lifetimeStats.recipeSales[recipe.id]||0)>0).length,recipes.length),
  add("all-growth","全員の店づくりを完了","すべての店づくりの物語を読もう。",80,"people",s=>s.viewedGrowthEvents.length,growthEvents.length),
  add("auto-packs","自動仕入れを3回受取","在庫2食以下で自動発注されます。",50,"staff",s=>s.lifetimeStats.automaticPacks,3),
  add("auto-orders","全自動で10品提供","調理担当と提供担当を配置しよう。",80,"staff",s=>s.lifetimeStats.automatedOrders,10),
  add("all-bonds","全員と好感度10","カフェとみんなの物語を完成させよう。",100,"people",s=>characters.filter(c=>relationship(s,c.id)>=10).length,characters.length),
];

const roadmap=[...introduction,...meetAndBond,...growTogether,...dates,...automation,...endings];
if(roadmap.length%3!==0)throw new Error("Mission roadmap must be divisible into groups of three");
export const missionChapters:MissionChapter[]=Array.from({length:roadmap.length/3},(_,index)=>{
  const number=index+1,title=index===roadmap.length/3-1?"最終目標":`ステップ ${number}`;
  const chapter=`${number} ${title}`;
  return {id:`chapter-${number}`,title,missions:roadmap.slice(index*3,index*3+3).map(mission=>({...mission,chapter}))};
});
export const missions=missionChapters.flatMap(chapter=>chapter.missions);
export const milestoneMissions:Mission[]=[];

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

// Kept only to migrate old recurring mission save fields safely.
export function restoreOngoing(value:unknown):OngoingMission[] { void value; return []; }

/** Guided orders only during the introduction. Never create stock or bypass a lock. */
export function tutorialRecipe(state:GameState):string|undefined {
  if(state.missions.claimed.includes("serve-mocha"))return;
  if(state.unlockedRecipes.includes("cafeMocha")&&!(state.lifetimeStats.recipeSales.cafeMocha||0))return "cafeMocha";
  if((state.lifetimeStats.tagSales.coffee||0)<10)return "coffee";
}
