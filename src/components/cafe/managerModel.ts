import { getRecipe } from "../../data/recipes";
import { preparation, startProblem } from "../../game/operations";
import type { Action } from "../../game/state";
import type { GameState, Order } from "../../types/game";
import { TABLE_POSITIONS } from "./sceneModel";

export interface Point { x: number; y: number }
export type ManagerAction = "start" | "serve";
export interface ManagerTask { kind: ManagerAction; orderId: string }
interface ManagerRun extends ManagerTask { startedAt: number; from: Point; machine: Point; table: Point; recipeId: string; issued: boolean }
export interface ManagerModel {
  current?: ManagerRun;
  queue: ManagerTask[];
  rest: { from: Point; to: Point; startedAt: number };
  focusId?: string;
  clock: number;
}
export interface ManagerFrame {
  position: Point;
  phase: "idle" | "walking" | "cooking" | "ready" | "pickup" | "carrying" | "serving" | "returning";
  label: string;
  recipeId?: string;
  orderId?: string;
  progress?: number;
}
export const MANAGER_HOME: Point = { x: 30, y: 49 };
export const MANAGER_TIMING = { toMachine: 900, startWork: 450, pickup: 350, toTable: 1100, handoff: 450, return: 900 };
const HANDOFF_AT = MANAGER_TIMING.toMachine + MANAGER_TIMING.pickup + MANAGER_TIMING.toTable;

export function createManager(now = 0): ManagerModel {
  return { queue: [], rest: { from: MANAGER_HOME, to: MANAGER_HOME, startedAt: now - MANAGER_TIMING.return }, clock: now };
}

/** Same centers as the counter's flex rows. Actor feet sit in front of its machines. */
export function machinePosition(state: GameState, order: Order): Point {
  const installed = [...new Set(state.stations.map(station => station.equipmentId))];
  const equipmentId = state.stations.find(station => station.id === order.stationId)?.equipmentId
    ?? (getRecipe(order.recipeId) ? preparation(getRecipe(order.recipeId)!).equipmentId : "coffeeCounter");
  const index = Math.max(0, installed.indexOf(equipmentId));
  const columns = installed.length > 4 ? Math.min(5, installed.length - Math.floor(index / 5) * 5) : installed.length;
  return { x: 33 + ((index % 5 + .5) / Math.max(1, columns)) * 46, y: 47 };
}

function between(from: Point, to: Point, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

// Service routes follow the center aisle rather than crossing neighboring tables.
function walk(from: Point, to: Point, progress: number): Point {
  const points = from.y > 55 || to.y > 55
    ? [from, { x: 49, y: from.y }, { x: 49, y: to.y }, to] : [from, to];
  const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
  let distance = Math.max(0, Math.min(1, progress)) * lengths.reduce((sum, length) => sum + length, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) return between(points[i], points[i + 1], distance / lengths[i]);
    distance -= lengths[i];
  }
  return to;
}

export function managerFrame(model: ManagerModel, state: GameState): ManagerFrame {
  const now = state.activeMs;
  const run = model.current;
  if (run) {
    const elapsed = Math.max(0, now - run.startedAt);
    const order = state.orders.find(item => item.id === run.orderId);
    const base = { recipeId: run.recipeId, orderId: run.orderId };
    if (elapsed < MANAGER_TIMING.toMachine) return { ...base, position: walk(run.from, run.machine, elapsed / MANAGER_TIMING.toMachine), phase: "walking", label: run.kind === "start" ? "マシンへ移動中" : "料理を取りに" };
    if (run.kind === "start") return { ...base, position: run.machine, phase: "cooking", label: "調理を始めます", progress: order?.totalMs ? 1 - order.remainingMs / order.totalMs : 0 };
    if (elapsed < MANAGER_TIMING.toMachine + MANAGER_TIMING.pickup) return { ...base, position: run.machine, phase: "pickup", label: "できたてをお盆に" };
    if (elapsed < HANDOFF_AT) return { ...base, position: walk(run.machine, run.table, (elapsed - MANAGER_TIMING.toMachine - MANAGER_TIMING.pickup) / MANAGER_TIMING.toTable), phase: "carrying", label: order ? `テーブル${order.customerSlot + 1}へお届け` : "客席へお届け" };
    return { ...base, position: run.table, phase: "serving", label: "お待たせしました" };
  }
  const elapsed = now - model.rest.startedAt;
  if (elapsed < MANAGER_TIMING.return && (model.rest.from.x !== model.rest.to.x || model.rest.from.y !== model.rest.to.y)) {
    return { position: walk(model.rest.from, model.rest.to, elapsed / MANAGER_TIMING.return), phase: "returning", label: "カウンターへ" };
  }
  const focus = state.orders.find(order => order.id === model.focusId && !order.cookId);
  if (focus?.status === "cooking") return { position: model.rest.to, phase: "cooking", label: `調理中 · あと${Math.ceil(focus.remainingMs / 1000)}秒`, recipeId: focus.recipeId, orderId: focus.id, progress: 1 - focus.remainingMs / Math.max(1, focus.totalMs) };
  if (focus?.status === "ready") return { position: model.rest.to, phase: "ready", label: "できました！", recipeId: focus.recipeId, orderId: focus.id, progress: 1 };
  return { position: model.rest.to, phase: "idle", label: "いらっしゃいませ" };
}

function applicable(task: ManagerTask, state: GameState) {
  return state.orders.some(order => order.id === task.orderId && order.status === (task.kind === "start" ? "queued" : "ready"));
}
export function managerPending(model: ManagerModel, orderId: string): ManagerAction | undefined {
  if (model.current?.orderId === orderId && !model.current.issued) return model.current.kind;
  return model.queue.find(task => task.orderId === orderId)?.kind;
}
export function enqueueManager(model: ManagerModel, state: GameState, task: ManagerTask): ManagerModel {
  if (!applicable(task, state) || model.current?.orderId === task.orderId || model.queue.some(item => item.orderId === task.orderId)) return model;
  return { ...model, queue: [...model.queue, task] };
}

/** Produces at most one existing game command. No money/stock/save logic lives here. */
export function advanceManager(model: ManagerModel, state: GameState): { model: ManagerModel; command?: Action } {
  const now = state.activeMs;
  if (now < model.clock) return { model: createManager(now) };
  let next = model;
  const queue = model.queue.filter(task => applicable(task, state));
  if (queue.length !== model.queue.length) next = { ...next, queue };
  const run = next.current;
  if (run) {
    const elapsed = now - run.startedAt;
    const order = state.orders.find(item => item.id === run.orderId);
    const invalid = !run.issued && !applicable(run, state);
    const finished = run.issued && elapsed >= (run.kind === "start" ? MANAGER_TIMING.toMachine + MANAGER_TIMING.startWork : HANDOFF_AT + MANAGER_TIMING.handoff);
    if (invalid || finished) {
      const position = managerFrame(next, state).position;
      const focus = state.orders.find(item => item.id === (run.kind === "start" ? run.orderId : next.focusId) && !item.cookId && item.status !== "queued");
      next = { ...next, current: undefined, focusId: focus?.id, rest: { from: position, to: focus ? machinePosition(state, focus) : MANAGER_HOME, startedAt: now }, clock: now };
    } else if (!run.issued && elapsed >= (run.kind === "start" ? MANAGER_TIMING.toMachine : HANDOFF_AT)) {
      if (run.kind === "start") {
        const recipe = order && getRecipe(order.recipeId);
        // Stock or machine availability can change while walking (staff works concurrently).
        if (!recipe || startProblem(state, recipe)) {
          return { model: { ...next, current: undefined, queue: [{ kind: run.kind, orderId: run.orderId }, ...next.queue], rest: { from: run.machine, to: run.machine, startedAt: now }, clock: now } };
        }
      }
      return { model: { ...next, current: { ...run, issued: true }, clock: now }, command: { type: run.kind === "start" ? "START_COOKING" : "COLLECT_ORDER", orderId: run.orderId } };
    } else return { model: next };
  }
  const availableIndex = next.queue.findIndex(task => {
    if (task.kind === "serve") return true;
    const order = state.orders.find(item => item.id === task.orderId);
    const recipe = order && getRecipe(order.recipeId);
    return !!recipe && !startProblem(state, recipe);
  });
  if (availableIndex !== -1) {
    const task = next.queue[availableIndex];
    const order = state.orders.find(item => item.id === task.orderId)!;
    const table = TABLE_POSITIONS[order.customerSlot];
    return { model: { ...next, queue: next.queue.filter((_, index) => index !== availableIndex), current: { ...task, recipeId: order.recipeId, startedAt: now, from: managerFrame(next, state).position, machine: machinePosition(state, order), table: { x: table.x + (table.x < 50 ? 15 : -15), y: table.y + 8 }, issued: false }, clock: now } };
  }
  // Resume a saved manual cooking order; staffing/recipe/save schemas stay unchanged.
  const focus = state.orders.find(order => order.id === next.focusId && !order.cookId && order.status !== "queued")
    ?? state.orders.find(order => !order.cookId && order.status !== "queued");
  if (focus?.id !== next.focusId) next = { ...next, focusId: focus?.id, rest: { from: managerFrame(next, state).position, to: focus ? machinePosition(state, focus) : MANAGER_HOME, startedAt: now }, clock: now };
  return { model: next };
}
