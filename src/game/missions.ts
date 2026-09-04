import type { GameState, MissionProgress } from "../types/game";

export type MissionDestination = "orders" | "inventory" | "town" | "coffee" | "ranch" | "patisserie" | "gifts" | "ren" | "recipes" | "equipment";
export interface Mission {
  id:string; chapter:string; title:string; hint:string; reward:number;
  destination:MissionDestination; target:number; value:(state:GameState)=>number;
}
export const emptyMissions=():MissionProgress=>({completed:[],claimed:[],visited:[],receivedPacks:{},boughtBook:false,gaveBook:false});
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
  add("first-order","1 はじめての営業","お客さまの注文を見つけよう","店内の料理の吹き出しが注文です。来客まで少し待ち、吹き出しをタップしてみましょう。",5,"orders",s=>yes(s.orders.length||s.lifetimeStats.totalOrders)),
  add("first-cook","1 はじめての営業","最初の料理を作り始めよう","注文の吹き出し、または注文ノートの「調理開始」を押します。店長が設備まで歩いて調理します。",5,"orders",s=>yes(s.orders.some(o=>o.status!=="queued")||s.lifetimeStats.totalOrders)),
  add("first-ready","1 はじめての営業","料理の完成を確認しよう","基本の調理時間は30秒。「できたてです！」になったら提供できます。完成しても、提供するまで売上は入りません。",5,"orders",s=>yes(s.orders.some(o=>o.status==="ready")||s.lifetimeStats.totalOrders)),
  add("first-serve","1 はじめての営業","最初の一皿を届けよう","完成した料理の吹き出し、または「提供する」を押しましょう。店長がお客さままで運ぶと売上が入ります。",15,"orders",s=>s.lifetimeStats.totalOrders),
  add("visit-town","2 蓮との出会い","街へ仕入れに出かけよう","「街へ」から仕入れ先を探しましょう。店に戻っても注文は消えません。",5,"town",s=>yes(s.missions.visited.includes("town")||s.characterProgress.ren.met)),
  add("meet-ren","2 蓮との出会い","コーヒーの仕入れ先で蓮に会おう","最初の共同開発は、コーヒー屋の蓮と進めます。ほかの人とも自由に交流できます。",10,"coffee",s=>yes(s.characterProgress.ren.met)),
  add("ren-story1","2 蓮との出会い","蓮の「はじめまして」を読もう","自動で始まる出会いの物語を最後まで読みましょう。読了すると好感度が1になります。",15,"coffee",s=>stage(s)),
  add("beans-first","3 仕入れを覚える","コーヒー豆を1パック発注しよう","100コインで5食分。まずは1パックだけ注文しましょう。発注した時点で支払い、届くまで追加発注はできません。",10,"coffee",s=>bought(s,"coffeeBeans")),
  add("inventory","3 仕入れを覚える","在庫と入荷予定を見よう","店内の「在庫」を開き、今ある食材と届く予定を確認しましょう。初期の豆で営業を続けられます。",5,"inventory",s=>yes(s.missions.visited.includes("inventory"))),
  add("beans-arrive","3 仕入れを覚える","最初のコーヒー豆を受け取ろう","好感度1では1パック2分45秒。自動で入荷します。待っている間は店で調理・提供を進めましょう。",15,"orders",s=>received(s,"coffeeBeans")),
  add("coffee-three","4 小さな信頼","コーヒー料理を累計3杯届けよう","コーヒーの注文を順に調理・提供しましょう。ほかの料理を売っても、この杯数は減りません。",20,"orders",coffee,3),
  add("ren-growth1","4 小さな信頼","蓮から店の小物を受け取ろう","3杯の提供と好感度1で「カップの向こう側」が始まります。最後まで読んで、店の小物を受け取りましょう。",15,"ren",s=>viewed(s,"ren-growth1")),
  add("talk-ren","4 小さな信頼","もう一度、蓮のお店で話そう","コーヒー屋を訪ねると、今の関係で初めての会話で交流+5。何度も同じ会話をするだけでは増えません。",5,"coffee",s=>yes(s.characterProgress.ren.talkedStages.includes(1)||stage(s)>=2)),
  add("visit-gifts","4 小さな信頼","贈物のお店をのぞこう","蓮には本が似合いそう。「短編集」を探してみましょう。",5,"gifts",s=>yes(s.missions.visited.includes("gifts")||s.missions.boughtBook||stage(s)>=2)),
  add("save-gift","4 小さな信頼","短編集のために360コイン貯めよう","足りない分は営業で少しずつ。達成済みミッションの報酬も受け取りましょう。贈物はこの導入では1つで十分です。",10,"orders",s=>s.missions.boughtBook||stage(s)>=2?360:s.currency,360),
  add("buy-book","4 小さな信頼","短編集を1冊買おう","贈物のお店で「短編集」を購入します。すでに持っているなら買い足す必要はありません。",10,"gifts",s=>yes(s.missions.boughtBook||(s.inventory.book||0)>0||stage(s)>=2)),
  add("ren-profile","4 小さな信頼","蓮の人物ページを開こう","人物ページには次の物語の条件があります。「プレゼントを渡す」から所持品を選べます。",5,"ren",s=>yes(s.missions.visited.includes("ren")||stage(s)>=2)),
  add("give-book","4 小さな信頼","蓮に短編集を贈ろう","「プレゼントを渡す」で短編集を選びましょう。蓮の好みの贈物は交流+15。反応も読んでみてください。",15,"ren",s=>yes(s.missions.gaveBook||stage(s)>=2)),
  add("ren-story2","4 小さな信頼","蓮と「顔なじみ」になろう","交流20で次の物語が始まります。足りなければ、まだしていない今の関係の会話や仕入れを。物語を最後まで読みましょう。",20,"coffee",s=>stage(s),2),
  add("beans-second","5 ふたりの新メニュー","コーヒー豆をもう1パック発注しよう","累計2パックの仕入れが、次の共同イベントの条件です。入荷待ちがあれば、到着してから注文しましょう。",10,"coffee",s=>bought(s,"coffeeBeans"),2),
  add("beans-second-arrive","5 ふたりの新メニュー","2パック目の豆を受け取ろう","入荷を待ちながら営業しましょう。豆は最初の10食分と仕入れた分で、共同開発まで十分にあります。",10,"orders",s=>received(s,"coffeeBeans"),2),
  add("ren-growth2","5 ふたりの新メニュー","特別な豆の話を聞こう","好感度2・累計2パック・前の共同イベントの読了で「夜色の豆」が始まります。特別素材を今買う必要はありません。",15,"ren",s=>viewed(s,"ren-growth2")),
  add("coffee-five","5 ふたりの新メニュー","コーヒー料理を累計5杯届けよう","毎回の提供が次の開発につながります。豆が足りなければ、コーヒー屋へ仕入れに行きましょう。",10,"orders",coffee,5),
  add("coffee-eight","5 ふたりの新メニュー","コーヒー料理を累計8杯届けよう","あと少しで蓮に味の相談ができそう。提供待ちの料理があれば、先に届けましょう。",10,"orders",coffee,8),
  add("coffee-ten","5 ふたりの新メニュー","コーヒー料理を累計10杯届けよう","10杯が新メニューの条件です。丁寧なハンドドリップなど、コーヒー料理ならどれでも数えます。",20,"orders",coffee,10),
  add("develop-mocha","5 ふたりの新メニュー","蓮と街角カフェモカを共同開発しよう","好感度2・コーヒー10杯・「夜色の豆」の読了で「ふたりのカフェモカ」が始まります。最後まで読んで新メニューを受け取りましょう。",30,"ren",s=>viewed(s,"ren-growth3")),
  add("mocha-recipe","6 新メニューをお客さまへ","カフェモカの材料を確認しよう","料理一覧を開きましょう。必要なのはコーヒー豆・牛乳・チョコレートを各1食分。基本のコーヒーカウンターで作れます。",5,"recipes",s=>yes(s.missions.visited.includes("recipes"))),
  add("meet-ranch","6 新メニューをお客さまへ","牧場の牧に会おう","牛乳の仕入れ先を訪ねましょう。出会いの物語が始まったら、最後まで読んでから仕入れます。",5,"ranch",s=>yes(s.characterProgress.sota.met)),
  add("buy-milk","6 新メニューをお客さまへ","牛乳を1パック発注しよう","しぼりたて牛乳は130コインで5食分。今は1パックで十分です。",10,"ranch",s=>bought(s,"milk")),
  add("milk-arrive","6 新メニューをお客さまへ","牛乳の入荷を待とう","牛乳が届くまでは、次の食材を注文できません。店でコーヒーを提供しながら待ちましょう。",10,"orders",s=>received(s,"milk")),
  add("buy-chocolate","6 新メニューをお客さまへ","洋菓子店でチョコレートを1パック発注しよう","アールの店へ。チョコレートは180コインで5食分。特別な砂糖などは不要です。",10,"patisserie",s=>bought(s,"chocolate")),
  add("chocolate-arrive","6 新メニューをお客さまへ","チョコレートを受け取ろう","入荷したらカフェモカを作れます。コーヒー豆も1食分残しておきましょう。",10,"orders",s=>received(s,"chocolate")),
  add("cook-mocha","6 新メニューをお客さまへ","街角カフェモカを初めて作ろう","材料がそろうとカフェモカの注文が入ります。席がいっぱいなら、今の注文を提供して席を空けましょう。",15,"orders",s=>yes(mochaSold(s)||s.orders.some(o=>o.recipeId==="cafeMocha"&&o.status!=="queued"))),
  add("serve-mocha","6 新メニューをお客さまへ","ふたりのカフェモカを届けよう","完成したカフェモカをお客さまへ。ふたりで考えた味が、お店のメニューになりました。",30,"orders",mochaSold),
  add("view-investment","7 はじめての設備投資","設備の強化費用を見よう","コーヒーカウンターのLv.2強化は450コイン。調理が30秒から25.5秒になります。今すぐ買わず、仕入れ代も残しましょう。",5,"equipment",s=>yes(s.missions.visited.includes("equipment"))),
  add("save-investment","7 はじめての設備投資","強化費用と仕入れ代、550コインを貯めよう","強化450コイン＋豆1パック100コインが目標。売上の全額が利益ではありません。食材代を残して貯めましょう。",10,"orders",s=>s.stations.some(st=>st.equipmentId==="coffeeCounter"&&st.level>=2)?550:s.currency,550),
  add("first-investment","7 はじめての設備投資","コーヒーカウンターをLv.2にしよう","設備画面でコーヒーカウンターの「強化」を押します。料理が設備を使っているときは、提供してから強化できます。",20,"equipment",s=>yes(s.stations.some(st=>st.equipmentId==="coffeeCounter"&&st.level>=2))),
];

export function currentMission(state:GameState) { return missions.find(m=>!state.missions.claimed.includes(m.id)); }
export function updateMissions(state:GameState):GameState {
  const newly=missions.filter(m=>!state.missions.completed.includes(m.id)&&m.value(state)>=m.target).map(m=>m.id);
  return newly.length?{...state,missions:{...state.missions,completed:[...state.missions.completed,...newly]}}:state;
}
export function claimMission(state:GameState,id:string):GameState {
  const mission=currentMission(state);
  if(!mission||mission.id!==id||!state.missions.completed.includes(id))return state;
  return {...state,currency:state.currency+mission.reward,missions:{...state.missions,claimed:[...state.missions.claimed,id]},
    notice:{id:Date.now()+Math.random(),type:"coin",text:`ミッション達成！ +${mission.reward} コイン`}};
}

/** Guided orders only during the introduction. Never create stock or bypass a lock. */
export function tutorialRecipe(state:GameState):string|undefined {
  if(state.missions.claimed.includes("serve-mocha"))return;
  if(state.unlockedRecipes.includes("cafeMocha")&&!mochaSold(state))return "cafeMocha";
  if(coffee(state)<10)return "coffee";
}
