import { allRecipes as recipes } from "../data/recipes";
import type { GameState } from "../types/game";
import { MENU_MASTERY_LEVELS } from "./config";

export { MENU_MASTERY_LEVELS } from "./config";

export function menuMasteryFromSales(sales:number) {
  return [...MENU_MASTERY_LEVELS].reverse().find(item=>sales>=item.sales) || MENU_MASTERY_LEVELS[0];
}

export function menuMastery(recipeId:string,state:GameState) {
  const sales=state.lifetimeStats.recipeSales[recipeId]||0;
  const current=menuMasteryFromSales(sales);
  const next=MENU_MASTERY_LEVELS.find(item=>item.level===current.level+1);
  return {sales,current,next};
}

export function recipesAtMasteryLevel(state:GameState,level:number) {
  return recipes.filter(recipe=>menuMastery(recipe.id,state).current.level>=level).length;
}

export function menuCatalogProgress(state:GameState) {
  const catalog=recipes.filter(recipe=>!recipe.hidden||state.unlockedRecipes.includes(recipe.id));
  const unlocked=catalog.filter(recipe=>state.unlockedRecipes.includes(recipe.id)).length;
  return {unlocked,total:catalog.length,percent:catalog.length?Math.floor(unlocked/catalog.length*100):0};
}
