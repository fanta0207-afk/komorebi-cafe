"use client";

import type { CSSProperties } from "react";
import { CafeAsset } from "./CafeAsset";
import { PersonFallback } from "./PersonFallback";
import { cafeAsset, type VisitPhase } from "./sceneModel";

const columns: Record<string, number> = { moss: 0, rose: 1, navy: 2, ochre: 0 };

/** Read the supplied assets directly instead of first requesting absent phase PNGs. */
export function CustomerSprite({ look, phase }: { look: string; phase: VisitPhase }) {
  // The glasses guest uses the supplied full-body PNG for every visit phase.
  const standalone = look === "glasses";
  return <div className="customer-facing"><div className="customer-sway">
    {standalone?<CafeAsset className="customer-standalone" src={cafeAsset.customer(look)}><PersonFallback look={look}/></CafeAsset>:
      <div className="customer-atlas" data-visit-phase={phase} style={{ "--customer-column": columns[look] ?? 0 } as CSSProperties}>
        <CafeAsset src="/assets/customers/cafe-guests.png"><PersonFallback look={look}/></CafeAsset>
      </div>}
  </div></div>;
}
