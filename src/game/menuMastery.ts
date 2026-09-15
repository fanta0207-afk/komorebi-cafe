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
  const unlocked=recipes.filter(recipe=>state.unlockedRecipes.includes(recipe.id)).length;
  return {unlocked,total:recipes.length,percent:recipes.length?Math.floor(unlocked/recipes.length*100):0};
}
