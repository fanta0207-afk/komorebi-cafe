"use client";

import type { CSSProperties } from "react";
import { getRecipe } from "../../data/recipes";
import { CafeAsset } from "./CafeAsset";
import { PersonFallback } from "./PersonFallback";
import type { ManagerFrame } from "./managerModel";
import { cafeAsset } from "./sceneModel";

export function CafeManager({ frame, now }: { frame: ManagerFrame; now: number }) {
  const moving = ["walking", "carrying", "returning"].includes(frame.phase);
  const carrying = frame.phase === "pickup" || frame.phase === "carrying";
  const style = { left: `${frame.position.x}%`, top: `${frame.position.y}%`, "--manager-step": `${-(now % 1200)}ms` } as CSSProperties;
  return <div className={`scene-manager manager-${frame.phase} ${moving ? "manager-moving" : ""}`} style={style} role="img" aria-label={`店長（あなた）・${frame.label}`} data-manager-phase={frame.phase}>
    <div className="manager-body"><CafeAsset src={cafeAsset.character("manager")}>
      <PersonFallback look="manager" apron/>
    </CafeAsset></div>
    {carrying && <span className="manager-tray"><span className="manager-dish"><CafeAsset src={cafeAsset.food(frame.recipeId || "coffee")}>{getRecipe(frame.recipeId || "coffee")?.icon}</CafeAsset></span><i/></span>}
    {frame.phase === "cooking" && <span className="manager-working-spark">✧</span>}
    {frame.phase === "ready" && <span className="manager-complete">✓</span>}
    <span className="manager-name">店長 <small>あなた</small></span>
  </div>;
}
