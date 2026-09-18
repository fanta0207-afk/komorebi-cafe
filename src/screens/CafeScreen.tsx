"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import { orderRequirements } from "../game/orderRequirements";
import { deliveryCountdown } from "../game/procurement";
import { getIngredient } from "../data/ingredients";
import { getEquipment } from "../data/equipment";
import { stationActivity } from "../game/kitchen";
import { equipmentLayout } from "../components/cafe/equipmentLayout";
import { hasIngredients, startProblem } from "../game/operations";
import { staffBusy } from "../game/operations";
import { isRecipeUsable, orderSalePrice } from "../game/logic";
import type { GameState } from "../types/game";
import { InventoryModal } from "../components/cafe/InventoryModal";
import { GameModal } from "../components/GameModal";
import { CafeScene } from "../components/cafe/CafeScene";
import { CafeAsset } from "../components/cafe/CafeAsset";
import { cafeAsset } from "../components/cafe/sceneModel";
import { managerPending, type ManagerFrame, type ManagerModel } from "../components/cafe/managerModel";

interface CafeProps {
  missionControl?:ReactNode;
  onMenu:()=>void;
  menuLabel:string;
  menuCaption:string;
  storyOpen?:boolean;
  panelRequest?:{page:"orders"|"inventory";nonce:number};
  onInventory:()=>void;
  state: GameState;
  manager: ManagerModel;
  managerFrame: ManagerFrame;
  onStart: (id: string) => void;
  onDecline: (id: string) => void;
  onCollect: (id: string) => void;
  onCharacter: (id: string) => void;
  onTown: () => void;
  onEquipment: () => void;
  onSupplier: (ingredientId: string) => void;
  onRequestSupply: (orderId:string,ingredientId:string,staffId:string) => void;
}
type Notebook = { page: "orders"; selected?: string };
const deliveryRunner=(staffId?:string)=>staffId?getCharacter(staffId)?.shortName||"スタッフ":"店長";

export function CafeScreen({ missionControl, onMenu, menuLabel, menuCaption, storyOpen, panelRequest, onInventory, state, manager, managerFrame, onCollect, onDecline, onStart, onCharacter, onTown, onEquipment, onSupplier, onRequestSupply }: CafeProps) {
  const [notebook, setNotebook] = useState<Notebook>();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  useEffect(()=>{
    if(panelRequest?.page==="orders")setNotebook({page:"orders"});
    if(panelRequest?.page==="inventory")setInventoryOpen(true);
  },[panelRequest]);
  useEffect(()=>{if(inventoryOpen)onInventory();},[inventoryOpen,onInventory]);
  useEffect(()=>{if(storyOpen){setNotebook(undefined);setInventoryOpen(false);}},[storyOpen]);
  const stocked = recipes.some(recipe => isRecipeUsable(recipe.id, state) && hasIngredients(state, recipe));
  const deliveriesByArrival=[...state.deliveries].sort((a,b)=>Number(!!a.staffId)-Number(!!b.staffId)||a.arrivesAt-b.arrivesAt);
  const actOnOrder = (id: string) => {
    const order = state.orders.find(item => item.id === id);
    const recipe = order && getRecipe(order.recipeId);
    if (!order || !recipe) return;
    if (managerPending(manager, id)) return;
    if (order.status === "ready") onCollect(id);
    else if (order.status === "queued" && !startProblem(state, recipe, !!order.forestReserved)) onStart(id);
    else setNotebook({ page: "orders", selected: id });
  };
  return <section className="cafe-screen" aria-label="カフェ">
    <h1 className="sr-only">こもれび喫茶</h1>
    <header className="cafe-hud">
      <div className="cafe-hud-left">
        <div className="cafe-wallet" aria-label={`所持コイン ${state.currency.toLocaleString()}`}><span aria-hidden="true">●</span>{state.currency.toLocaleString()}</div>
        <button type="button" className="scene-kitchen-entry" onClick={onEquipment} aria-label="設備・料理を開く">設備・料理 <span aria-hidden="true">›</span></button>
        {missionControl}
        {!!deliveriesByArrival.length && !notebook && <div className="cafe-delivery-list" aria-label="入荷状況">{deliveriesByArrival.map(delivery=><button type="button" className="cafe-delivery-status" key={delivery.id} onClick={() => setNotebook({ page: "orders" })}>{delivery.staffId?deliveryRunner(delivery.staffId):"仕入れ"}：{deliveryCountdown(delivery.arrivesAt,state.lastPlayedAt)}</button>)}</div>}
      </div>
      <div className="cafe-hud-right">
        <button className="cafe-menu-toggle" type="button" onClick={() => setInventoryOpen(true)} aria-label="現在の在庫状況を開く"><span aria-hidden="true">▤</span><small>在庫</small></button>
        <button className="cafe-menu-toggle cafe-settings-toggle" type="button" onClick={onMenu} aria-label={menuLabel}><span aria-hidden="true">⚙</span><small>{menuCaption}</small></button>
      </div>
    </header>
    <CafeScene state={state} manager={manager} managerPose={managerFrame} onOrder={actOnOrder} onCharacter={onCharacter} onEquipment={onEquipment}/>
    {!stocked && <button className="cafe-restock-hint" type="button" onClick={onTown}>食材を仕入れる →</button>}
    {inventoryOpen && <InventoryModal state={state} onClose={() => setInventoryOpen(false)} onTown={onTown}/>}
    {notebook && <CafeNotebook state={state} manager={manager} notebook={notebook} onClose={() => setNotebook(undefined)}
      onStart={id => { onStart(id); setNotebook(undefined); }} onCollect={id => { onCollect(id); setNotebook(undefined); }}
      onDecline={onDecline} stocked={stocked} onTown={onTown} onEquipment={onEquipment} onSupplier={onSupplier}
      onRequestSupply={onRequestSupply}/>}
  </section>;
}

function CafeNotebook({ state, manager, notebook, onClose, onStart, onCollect, onDecline, stocked, onTown, onEquipment, onSupplier, onRequestSupply }: {
  state: GameState; manager: ManagerModel; notebook: Notebook; onClose: () => void; onStart: (id: string) => void;
  onDecline: (id: string) => void; onCollect: (id: string) => void; stocked: boolean; onTown: () => void; onEquipment: () => void; onSupplier: (ingredientId: string) => void; onRequestSupply:(orderId:string,ingredientId:string,staffId:string)=>void;
}) {
  const selectedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, []);
  const procurementStaff=state.staff.filter(person=>person.role==="procurement");
  const availableProcurers=procurementStaff.filter(person=>!staffBusy(state,person.characterId));
  return <GameModal className="cafe-notebook cafe-orders-notebook" labelledBy="notebook-title" onCancel={onClose} layerClassName="cafe-modal-layer cafe-orders-layer">
    <div className="notebook-handle"/>
    <header className="notebook-header"><h2 id="notebook-title">注文とキッチン</h2><button type="button" onClick={onClose} aria-label="店内に戻る">×</button></header>
      {!state.orders.length && <div className="notebook-empty"><span>☕</span><p>{stocked ? "来店待ち" : "食材がありません"}</p></div>}
      <div className="notebook-orders">{state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const problem = order.status === "queued" ? startProblem(state, recipe, !!order.forestReserved) : "";
        const pending = managerPending(manager, order.id);
        const missingConditions = orderRequirements(state, order).filter(condition => !condition.met && condition.id !== "cooking");
        return <article ref={order.id === notebook.selected ? selectedRef : undefined} className={`notebook-order order-${order.status} menu-rarity-${recipe.rarity} ${order.id === notebook.selected ? "order-selected" : ""}`} key={order.id}>
          <span className="notebook-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          <div className="notebook-order-info"><small>テーブル {order.customerSlot + 1} · {orderSalePrice(order,state)}コイン{order.request ? " · リクエスト報酬25%増" : ""}</small><h3>{recipe.name}</h3>
            {order.stationId && <small>{getEquipment(state.stations.find(station => station.id === order.stationId)?.equipmentId || "")?.name}{order.cookId ? ` · ${getCharacter(order.cookId)?.shortName}` : ""}</small>}
            {order.status === "cooking" ? <><progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>調理中</p></> : order.status === "ready" ? <p>{state.staff.some(person => person.servingOrderId === order.id) ? "スタッフが提供中" : "完成"}</p> : problem ? <p>{problem}</p> : null}
          </div>
          {missingConditions.length > 0 && <div className="order-conditions"><h4>不足しているもの</h4><ul>{missingConditions.map(condition => <li key={condition.id} data-met={condition.met}>
            <span aria-label="未達成">○</span><div><b>{condition.label}</b><small>{condition.detail}</small>
              {condition.id.startsWith("ingredient-") && <>{procurementStaff.length>0&&<button className="missing-supply-link staff-supply-button" type="button" disabled={!availableProcurers.length||state.deliveries.some(delivery=>delivery.ingredientId===condition.id.slice("ingredient-".length))} onClick={() => {const person=availableProcurers[Math.floor(Math.random()*availableProcurers.length)];if(person)onRequestSupply(order.id,condition.id.slice("ingredient-".length),person.characterId);}}>{availableProcurers.length&&!state.deliveries.some(delivery=>delivery.ingredientId===condition.id.slice("ingredient-".length))?"仕入れを頼む":"仕入れ担当は対応中"}</button>}<button className="missing-supply-link" type="button" onClick={() => onSupplier(condition.id.slice("ingredient-".length))}>自分で仕入れる →</button></>}
              {condition.id.startsWith("equipment-") && <button className="missing-supply-link" type="button" onClick={onEquipment}>設備を確認する →</button>}
            </div>
          </li>)}</ul></div>}
          {order.status === "queued" && <div className="notebook-order-tools"><button type="button" className="decline-order" onClick={() => onDecline(order.id)}>お断りする</button></div>}
          <button type="button" className="notebook-action" disabled={!!pending || order.status === "cooking" || (order.status === "queued" && !!problem)} onClick={() => order.status === "ready" ? onCollect(order.id) : onStart(order.id)}>{pending === "serve" ? "お届け待ち" : pending === "start" ? "準備待ち" : order.status === "ready" ? "提供する" : order.status === "cooking" ? "調理中" : "調理開始"}</button>
        </article>;
      })}</div>
      {!stocked && <div className="notebook-stock"><button type="button" onClick={onTown}>街へ仕入れに行く →</button></div>}
    {state.deliveries.length > 0 && <section className="notebook-deliveries"><h3>入荷待ち</h3>{state.deliveries.map(delivery => <p className="supply-delivery" key={delivery.id}><span><strong>{deliveryRunner(delivery.staffId)}</strong>が {getIngredient(delivery.ingredientId)?.name} {delivery.packs * delivery.servingsPerPack}食分{delivery.automatic?"・自動":""}</span><b>あと {deliveryCountdown(delivery.arrivesAt, state.lastPlayedAt)}</b></p>)}</section>}
    <section className="notebook-equipment"><h3>設備の使用状況 <small>{state.stations.length}台</small></h3>{state.stations.map(station => {
      const activity = stationActivity(state, station.id);
      const recipe = activity.order && getRecipe(activity.order.recipeId);
      return <div key={station.id} data-station-status={activity.status}><span>{getEquipment(station.equipmentId)?.icon} {getEquipment(station.equipmentId)?.name} <small>Lv.{station.level}</small>
        {recipe && <small className="station-order-detail">{recipe.name} · テーブル{activity.order!.customerSlot + 1}</small>}
        {activity.status === "cooking" && <progress max={activity.order.totalMs} value={activity.order.totalMs - activity.order.remainingMs} aria-label={`${getEquipment(station.equipmentId)?.name}の調理進捗`}/>}
      </span><b className={activity.status}>{activity.label}</b></div>;
    })}
    {equipmentLayout(state).filter(entry => entry.status === "uninstalled").map(({ item }) => <div key={item.id}><span>{item.icon} {item.name}</span><b>解放済み・未設置</b></div>)}
    <button className="notebook-equipment-link" type="button" onClick={onEquipment}>設備の設置・強化へ →</button></section>
  </GameModal>;
}
