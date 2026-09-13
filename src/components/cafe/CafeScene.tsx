"use client";

import { useState, type CSSProperties } from "react";
import { getCharacter } from "../../data/characters";
import { getRecipe } from "../../data/recipes";
import { hasIngredients, serveDuration, startProblem } from "../../game/operations";
import { orderSalePrice } from "../../game/logic";
import { tableCapacity } from "../../game/seating";
import { equipmentLayout, equipmentWorkPosition } from "./equipmentLayout";
import type { GameState, Order } from "../../types/game";
import { CafeAsset } from "./CafeAsset";
import { cafeAsset, customerFacing, makeVisit, reconcileVisits, TABLE_POSITIONS, visitPhase, VISIT_TIMING } from "./sceneModel";
import { CustomerSprite } from "./CustomerSprite";
import { CafeManager } from "./CafeManager";
import { aislePosition, createManager, managerFrame, managerPending, type ManagerModel, type ManagerFrame } from "./managerModel";
import { PersonFallback } from "./PersonFallback";

type SceneProps = { state: GameState; manager?: ManagerModel; managerPose?: ManagerFrame; onOrder: (id: string) => void; onCharacter: (id: string) => void; onEquipment: () => void };

function place(x: number, y: number): CSSProperties { return { left: `${x}%`, top: `${y}%` }; }
function useVisits(orders: Order[], now: number) {
  const signature = orders.map(order => `${order.id}:${order.status}`).join("|");
  const [snapshot, setSnapshot] = useState(() => ({ signature, orders,
    visits: orders.map(order => makeVisit(order, now - VISIT_TIMING.enter)) }));
  if (signature !== snapshot.signature) {
    const next = { signature, orders, visits: reconcileVisits(snapshot.visits, snapshot.orders, orders, now) };
    setSnapshot(next);
    return next.visits;
  }
  return snapshot.visits;
}

export function CafeScene({ state, manager, managerPose, onOrder, onCharacter, onEquipment }: SceneProps) {
  const managerView = managerPose ?? managerFrame(createManager(state.activeMs), state);
  const visits = useVisits(state.orders, state.activeMs);
  const activeVisits = visits.flatMap(visit => { const phase = visitPhase(visit, state.activeMs); return phase ? [{ ...visit, phase }] : []; });
  const workingStaff = state.staff.filter(person => person.role === "cook"||person.role === "server");
  const layout = equipmentLayout(state);
  const serving = workingStaff.some(person => person.servingOrderId);
  const kitchenCountdownOrderId=layout.find(entry=>entry.status==="cooking"&&entry.order)?.order?.id;
  return <div className={`cafe-scene photo-cafe ${layout.length > 5 ? "has-expanded-kitchen" : ""}`} style={{ "--guest-enter-duration": `${VISIT_TIMING.enter}ms`, "--guest-leave-duration": `${VISIT_TIMING.leave}ms` } as CSSProperties} role="group" aria-label="こもれび喫茶の店内。お客さまの吹き出しから注文を操作できます。">
    <div className="scene-layer layer-background" data-layer="background" aria-hidden="true">
      <CafeAsset src={`${cafeAsset.background("room")}?v=d9fba6fd`} className="room-art" fallbackDuringLoad={false} priority><div className="room-wall"><CafeAsset src={cafeAsset.background("wall")}><i className="wall-paper"/><i className="wall-panels"/></CafeAsset></div>
      <div className="room-floor"><CafeAsset src={cafeAsset.background("floor")}><i className="wood-floor"/></CafeAsset></div></CafeAsset>
    </div>
    <div className="scene-layer layer-furniture" data-layer="furniture" aria-hidden="true">
      <div className="room-fallback-furniture"><div className="room-window"><CafeAsset src={cafeAsset.furniture("window")}><span className="window-outside"><i/><i/><i/></span><span className="window-frame"/><span className="window-curtain curtain-left"/><span className="window-curtain curtain-right"/></CafeAsset></div>
      <div className="room-door"><CafeAsset src={cafeAsset.furniture("door")}><span className="door-glass"/><span className="door-open">OPEN</span><i className="door-knob"/></CafeAsset></div>
      <div className="room-sign"><span>自家焙煎珈琲</span><b>こもれび</b><small>COFFEE &amp; GOOD DAYS</small></div>
      <div className="room-shelf"><CafeAsset src={cafeAsset.furniture("shelf")}><span>☕ ▥ ☕ 🫖</span></CafeAsset></div>
      <div className="room-clock"><span>Ⅻ</span><i/><b/></div>
      <div className="room-counter"><CafeAsset src={cafeAsset.furniture("counter")}><i className="counter-top"/><span className="counter-panels"/><b>KOMOREBI</b></CafeAsset></div>
      <div className="room-lamp lamp-left"><CafeAsset src={cafeAsset.furniture("pendant")}><i/><b/></CafeAsset></div>
      <div className="room-lamp lamp-right"><CafeAsset src={cafeAsset.furniture("pendant")}><i/><b/></CafeAsset></div>
      <div className="room-plant plant-left"><CafeAsset src={cafeAsset.furniture("plant")}><span>🪴</span></CafeAsset></div>
      <div className="room-plant plant-right"><CafeAsset src={cafeAsset.furniture("plant")}><span>🪴</span></CafeAsset></div>
      <div className="door-mat">WELCOME</div></div>
    </div>
    <div className="scene-layer layer-equipment" data-layer="equipment">
      <div className="equipment-layout">
        {layout.map(({ item, position, stations, status, label, order }) => {
          const busy = status === "cooking";
          return <button key={item.id} type="button" className={`scene-equipment equipment-${status}`} data-equipment={item.id} data-equipment-status={status}
            style={place(position.x, position.y)} onClick={onEquipment}
            aria-label={`${item.name} ${stations.length}台・${busy&&order&&order.id===kitchenCountdownOrderId?`あと${Math.ceil(order.remainingMs/1000)}秒`:label}。設備・料理を開く`}>
            <CafeAsset src={cafeAsset.equipment(item.id)}><span className={`equipment-prop prop-${item.id}`}><i>{item.icon}</i></span></CafeAsset>
            {stations.length > 1 && <small>×{stations.length}</small>}
            <span className="equipment-state-label">{busy&&order&&order.id===kitchenCountdownOrderId?`あと${Math.ceil(order.remainingMs/1000)}秒`:busy?"調理中":label}</span>
            {busy && <><span className="equipment-steam"><i/><i/><i/></span><progress max={order!.totalMs} value={order!.totalMs - order!.remainingMs} aria-label={`${item.name}の調理進捗`}/></>}
            {status === "ready" && <span className="equipment-done">✓</span>}
          </button>;
        })}
      </div>
    </div>
    <div className="scene-layer layer-seating" data-layer="seating" aria-hidden="true">
      {TABLE_POSITIONS.slice(0,tableCapacity(state)).map(({ x, y }, slot) => <div className="room-table" key={slot} style={place(x, y)} data-table={slot}>
        <CafeAsset src={cafeAsset.furniture("table-set")} className="table-set"><span className="table-chair chair-left"><CafeAsset src={cafeAsset.furniture("chair")}><i/></CafeAsset></span>
        <span className="table-chair chair-right"><CafeAsset src={cafeAsset.furniture("chair")}><i/></CafeAsset></span>
        <CafeAsset src={cafeAsset.furniture("table")}><i className="table-foot"/><i className="table-top"/><span className="table-cloth"/></CafeAsset>
        <span className="table-number">{String(slot + 1).padStart(2, "0")}</span><span className="table-flower">✿</span></CafeAsset>
      </div>)}
    </div>
    <div className="scene-layer layer-customers" data-layer="customers" aria-hidden="true">
      {activeVisits.map(visit => {
        const { x, y } = TABLE_POSITIONS[visit.slot];
        const elapsed = visit.phase === "leaving" ? state.activeMs - visit.servedAt! - VISIT_TIMING.enjoy : state.activeMs - visit.arrivedAt;
        const style = { ...place(x - 12, y + 10), "--door-x": `${18 - (x - 12)}cqw`, "--door-y": `${37 - (y + 10)}cqh`, "--aisle-x": `${49 - (x - 12)}cqw`, "--foyer-y": `${44 - (y + 10)}cqh`, "--visit-delay": `${-elapsed}ms`, "--guest-step": `${-(elapsed % 640)}ms`, "--guest-breath": `${-((state.activeMs + visit.slot * 730) % 3600)}ms`, "--guest-facing": customerFacing(visit, state.activeMs) } as CSSProperties;
        return <div key={visit.id} className={`scene-guest guest-${visit.phase}`} style={style} data-visit-phase={visit.phase}>
          <div className="guest-motion"><span className="guest-ground-shadow"/><CustomerSprite look={visit.look} phase={visit.phase}/></div>
          {visit.phase === "enjoying" && <span className="served-food"><CafeAsset src={cafeAsset.food(visit.recipeId)}>{getRecipe(visit.recipeId)?.icon}</CafeAsset></span>}
        </div>;
      })}
    </div>
    <div className="scene-layer layer-characters" data-layer="characters">
      {workingStaff.map((person, index) => {
        const character = getCharacter(person.characterId); if (!character) return null;
        const cookingOrder = state.orders.find(order => order.status === "cooking" && order.cookId === person.characterId);
        const cooking = !!cookingOrder;
        const workPosition = cookingOrder ? equipmentWorkPosition(state, cookingOrder) : undefined;
        const target = person.servingOrderId && state.orders.find(order => order.id === person.servingOrderId);
        const home={x:36+index*7,y:44};
        const destination=target?{x:TABLE_POSITIONS[target.customerSlot].x+(target.customerSlot%2?-15:15),y:TABLE_POSITIONS[target.customerSlot].y+7}:undefined;
        const returnDestination=person.returningFromSlot!==undefined?{x:TABLE_POSITIONS[person.returningFromSlot].x+(person.returningFromSlot%2?-15:15),y:TABLE_POSITIONS[person.returningFromSlot].y+7}:undefined;
        const duration=serveDuration(state,person.characterId);
        const serviceProgress=target?1-Math.max(0,person.remainingMs)/duration:0;
        const returnProgress=returnDestination?1-Math.max(0,person.remainingMs)/duration:0;
        const walkingPosition=destination?aislePosition(home,destination,serviceProgress):returnDestination?aislePosition(returnDestination,home,returnProgress):undefined;
        const position = walkingPosition ? place(walkingPosition.x,walkingPosition.y) : workPosition ? place(workPosition.x, workPosition.y) : place(home.x,home.y);
        const facing = target ? (target.customerSlot % 2 ? -1 : 1) : returnDestination ? (home.x>=returnDestination.x?1:-1) : workPosition ? (workPosition.x < 50 ? 1 : -1) : 1;
        const returning=!!returnDestination;
        return <button className={`scene-staff ${target ? "staff-serving staff-moving" : returning?"staff-returning staff-moving":""} ${cooking ? "staff-cooking" : ""}`} type="button"
          key={person.characterId} style={{...position,"--staff-facing":facing} as CSSProperties} onClick={() => onCharacter(person.characterId)}
          aria-label={`${character.name}・${returning?"提供後、カウンターへ戻っています":person.role === "cook" ? "調理担当" : person.role === "server" ? "提供担当" : "仕入れ担当"}。人物の詳細を開く`}>
          <span className="staff-character"><CafeAsset src={cafeAsset.character(person.characterId)}>
            <PersonFallback look={person.characterId} apron/>
          </CafeAsset></span><span className="staff-name">{character.shortName} <b>♡</b></span>
        </button>;
      })}
      <CafeManager frame={managerView} now={state.activeMs}/>
    </div>
    <div className="scene-layer layer-bubbles" data-layer="bubbles">
      {["cooking", "ready", "pickup", "carrying", "serving"].includes(managerView.phase) && <span className={`manager-bubble manager-bubble-${managerView.phase}`} style={place(managerView.position.x, managerView.position.y)}>
        <strong>{getRecipe(managerView.recipeId || "")?.name}</strong>{managerView.label}{managerView.phase === "cooking" && <progress max={1} value={managerView.progress ?? 0} aria-label="店長の調理進捗"/>}
      </span>}
      {state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const { x, y } = TABLE_POSITIONS[order.customerSlot];
        const problem = order.status === "queued" ? startProblem(state, recipe) : "";
        const pending = manager && managerPending(manager, order.id);
        const label = pending === "serve" ? "お届け中" : pending === "start" ? "店長が準備" : order.status === "ready" ? "提供する" : order.status === "cooking" ? "調理中" : !state.unlockedRecipes.includes(recipe.id) ? "解放待ち" : !hasIngredients(state, recipe) ? "食材待ち" : problem ? "設備待ち" : "調理開始";
        const arrival = activeVisits.find(visit => visit.id === order.id && visit.phase === "entering");
        const entering = !!arrival;
        return <button type="button" key={order.id} disabled={!!pending} className={`scene-order bubble-${order.status} ${pending ? "bubble-manager-pending" : ""} ${entering ? "bubble-entering" : ""}`}
          style={{ ...place(x + 1, y - 2), "--arrival-delay": arrival ? `${-(state.activeMs - arrival.arrivedAt)}ms` : "0ms" } as CSSProperties} onClick={() => onOrder(order.id)}
          aria-label={`テーブル${order.customerSlot + 1}、${recipe.name}、${problem || label}`}>
          <span className="bubble-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          {order.request && <span className="bubble-request">リクエスト +25%</span>}<span className="bubble-recipe-name">{recipe.name}</span><span className="bubble-sale">+{orderSalePrice(order,state)}コイン</span><span className="bubble-label">{label}</span>
          {order.status === "cooking" && <progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/>}
          {order.status === "ready" && <i className="ready-star">✦</i>}
        </button>;
      })}
      {activeVisits.filter(visit => visit.phase === "enjoying").map(visit => <span key={visit.id} className="thanks-bubble" style={place(TABLE_POSITIONS[visit.slot].x, TABLE_POSITIONS[visit.slot].y - 3)}>ごちそうさま ♡</span>)}
      {serving && <span className="staff-talk">お待たせしました</span>}
    </div>
    <div className="scene-layer layer-effects" data-layer="effects" aria-hidden="true">
      <div className="scene-light"><CafeAsset src={cafeAsset.effect("sunlight")}><i/></CafeAsset></div>
      <div className="scene-dust"><i/><i/><i/><i/><i/></div>
      {activeVisits.filter(visit => visit.phase === "enjoying").map(visit => <span className="serve-sparkles" key={visit.id} style={place(TABLE_POSITIONS[visit.slot].x + 6, TABLE_POSITIONS[visit.slot].y - 5)}><CafeAsset src={cafeAsset.effect("serve")}><i>✦</i><i>♡</i><i>✧</i></CafeAsset></span>)}
      <div className="scene-vignette"/>
    </div>
  </div>;
}
