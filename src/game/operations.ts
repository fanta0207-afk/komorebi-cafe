import { getRecipe } from "../data/recipes";
import { getEquipment } from "../data/equipment";
import { getIngredient } from "../data/ingredients";
import { GAME_CONFIG } from "./config";
import { isRecipeUsable, salePrice } from "./logic";
import type { GameState, Recipe, Station } from "../types/game";
import { activeCookingOrder, stationOccupied } from "./kitchen";

export const specialties:Record<string,{label:string;tags:string[]}>= {
  ren:{label:"コーヒー",tags:["coffee"]},sota:{label:"ミルク料理",tags:["milk"]},
  aki:{label:"野菜・フルーツ",tags:["vegetable","fruit"]},itsuki:{label:"スイーツ",tags:["sweet","dessert"]},
  haru:{label:"パン料理",tags:["bread"]},nagisa:{label:"紅茶・ハーブ",tags:["tea"]},
};
export function preparation(recipe:Recipe) {
  const equipmentId=recipe.requiredEquipmentIds?.[0] || (recipe.tags.includes("drink")?"coffeeCounter":recipe.tags.includes("bread")?"toastGrill":"prepTable");
  const seconds=GAME_CONFIG.baseCookingSeconds;
  return {equipmentId,seconds};
}
export function hasIngredients(state:GameState,recipe:Recipe) {
  return recipe.requiredIngredients.every(id=>(state.ingredients[id]||0)>=1);
}
export function cookingMs(state:GameState,recipe:Recipe,station:Station,cookId?:string) {
  const skilled=cookId && state.characterProgress[cookId]?.relationshipStage>=6 && specialties[cookId]?.tags.some(tag=>recipe.tags.includes(tag));
  return Math.round(preparation(recipe).seconds*1000*Math.pow(0.85,station.level-1)*(skilled?0.8:1));
}
export function stationFor(state:GameState,recipe:Recipe,cookId?:string) {
  return state.stations.filter(station=>station.equipmentId===preparation(recipe).equipmentId&&!stationOccupied(state,station.id))
    .sort((a,b)=>cookingMs(state,recipe,a,cookId)-cookingMs(state,recipe,b,cookId))[0];
}
export function startProblem(state:GameState,recipe:Recipe) {
  if(!isRecipeUsable(recipe.id,state))return "必要な設備を設置してください";
  if(!hasIngredients(state,recipe))return `食材待ち：${recipe.requiredIngredients.filter(id=>!(state.ingredients[id]>0)).map(id=>getIngredient(id)?.name).join("・")}`;
  if(activeCookingOrder(state))return "前の料理を調理中です。1品ずつ作ります";
  if(!stationFor(state,recipe))return "設備の空きを待っています";
  return "";
}
export function startCooking(state:GameState,orderId:string,cookId?:string):GameState {
  const order=state.orders.find(item=>item.id===orderId),recipe=order&&getRecipe(order.recipeId);
  if(!order||order.status!=="queued"||!recipe||startProblem(state,recipe))return state;
  if(cookId&&(!state.staff.some(person=>person.characterId===cookId&&person.role==="cook")||state.orders.some(item=>item.status==="cooking"&&item.cookId===cookId)))return state;
  const station=stationFor(state,recipe,cookId)!;const totalMs=cookingMs(state,recipe,station,cookId);
  const ingredients={...state.ingredients};for(const id of recipe.requiredIngredients)ingredients[id]-=1;
  return {...state,ingredients,orders:state.orders.map(item=>item.id===orderId?{...item,status:"cooking",stationId:station.id,cookId,remainingMs:totalMs,totalMs}:item)};
}
export function serveOrder(state:GameState,orderId:string):GameState {
  const order=state.orders.find(item=>item.id===orderId),recipe=order&&getRecipe(order.recipeId);
  if(!order||order.status!=="ready"||!recipe)return state;
  const price=salePrice(recipe.id),tagSales={...state.lifetimeStats.tagSales};
  recipe.tags.forEach(tag=>{tagSales[tag]=(tagSales[tag]||0)+1;});
  return {...state,currency:state.currency+price,orders:state.orders.filter(item=>item.id!==orderId),
    staff:state.staff.map(person=>person.servingOrderId===orderId?{...person,servingOrderId:undefined,remainingMs:0}:person),
    dailyStats:{sales:state.dailyStats.sales+price,orders:state.dailyStats.orders+1,recipeSales:{...state.dailyStats.recipeSales,[recipe.id]:(state.dailyStats.recipeSales[recipe.id]||0)+1}},
    lifetimeStats:{...state.lifetimeStats,totalOrders:state.lifetimeStats.totalOrders+1,totalRevenue:state.lifetimeStats.totalRevenue+price,recipeSales:{...state.lifetimeStats.recipeSales,[recipe.id]:(state.lifetimeStats.recipeSales[recipe.id]||0)+1},tagSales},
    notice:{id:Date.now()+Math.random(),type:"coin",text:`${recipe.name}を提供 +${price} コイン`}};
}
export function equipmentPrice(state:GameState,equipmentId:string) {
  return Math.round((getEquipment(equipmentId)?.price||0)*Math.pow(1.5,state.stations.filter(item=>item.equipmentId===equipmentId).length));
}
export function upgradePrice(station:Station) { return Math.round((getEquipment(station.equipmentId)?.price||0)*0.5*station.level); }
export function staffBusy(state:GameState,id:string) { return state.orders.some(order=>order.status==="cooking"&&order.cookId===id)||state.staff.some(person=>person.characterId===id&&!!person.servingOrderId); }
export function serveDuration(state:GameState,id:string) {return GAME_CONFIG.serveMs*(state.characterProgress[id]?.relationshipStage>=6?0.8:1);}
