"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import type { Action } from "../../game/state";
import type { GameState } from "../../types/game";
import { advanceManager, createManager, enqueueManager, managerFrame, type ManagerAction } from "./managerModel";

/** Lives above screen navigation so an accepted delivery can finish in any game screen.
 * Pending gestures are transient: reloading retains the underlying queued/ready order.
 */
export function useCafeManager(state: GameState, dispatch: Dispatch<Action>) {
  const [manager, setManager] = useState(() => createManager(state.activeMs));
  const runtime = useRef(manager);
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    const result = advanceManager(runtime.current, state);
    if (result.model !== runtime.current) {
      runtime.current = result.model;
      setManager(result.model);
    }
    // Mark issued before dispatch: Strict Mode, rerenders and repeated taps cannot replay it.
    if (result.command) dispatch(result.command);
  }, [state, dispatch]);
  const request = useCallback((kind: ManagerAction, orderId: string) => {
    const current = latest.current;
    const queued = enqueueManager(runtime.current, current, { kind, orderId });
    const result = advanceManager(queued, current);
    runtime.current = result.model;
    setManager(result.model);
    if (result.command) dispatch(result.command);
  }, [dispatch]);
  return { manager, frame: managerFrame(manager, state), request };
}
