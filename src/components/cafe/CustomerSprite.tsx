"use client";

import type { CSSProperties } from "react";
import { CafeAsset } from "./CafeAsset";
import { PersonFallback } from "./PersonFallback";
import { cafeAsset, type VisitPhase } from "./sceneModel";

const columns: Record<string, number> = { moss: 0, rose: 1, navy: 2, ochre: 0 };

/** Use the supplied transparent sheet unchanged; the viewport selects one person.
 * Individual/phase PNGs still override the sheet when added later.
 */
export function CustomerSprite({ look, phase }: { look: string; phase: VisitPhase }) {
  return <div className="customer-facing"><div className="customer-sway">
    <CafeAsset src={cafeAsset.customer(look, phase)} alternatives={[cafeAsset.customer(look)]}>
      <div className="customer-atlas" style={{ "--customer-column": columns[look] ?? 0 } as CSSProperties}>
        <CafeAsset src="/assets/customers/cafe-guests.png"><PersonFallback look={look}/></CafeAsset>
      </div>
    </CafeAsset>
  </div></div>;
}
