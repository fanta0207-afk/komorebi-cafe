"use client";

import { recipes } from "../data/recipes";
import { useGame } from "../game/GameContext";
import { ScreenTitle } from "../components/GameUI";

export function MenuScreen() {
  const {state}=useGame();
  return <section className="screen fade-in"><ScreenTitle kicker="CAFE MENU" title="喫茶店のメニュー"/><p className="intro-copy">解放した料理は、店のお客さんが注文するようになります。</p>
    <div className="recipe-list">{recipes.map(recipe=>{const unlocked=state.unlockedRecipes.includes(recipe.id);return <article key={recipe.id} className={`recipe-card ${!unlocked?"locked":""}`}><span className="recipe-icon">{unlocked?recipe.icon:"?"}</span><div><small>{unlocked?"AVAILABLE":"RECIPE HINT"}</small><h3>{recipe.name}</h3><p>{unlocked?`${recipe.price}コインで販売中`:recipe.unlockHint}</p></div><em>{unlocked?"販売中":"未解放"}</em></article>})}</div>
  </section>;
}
