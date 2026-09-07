"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import { orderRequirements } from "../game/orderRequirements";
import { deliveryCountdown } from "../game/procurement";
import { getIngredient } from "../data/ingredients";
import { getEquipment } from "../data/equipment";
import { activeCookingOrder, stationActivity } from "../game/kitchen";
import { equipmentLayout } from "../components/cafe/equipmentLayout";
import { hasIngredients, startProblem } from "../game/operations";
import { isRecipeUsable, orderSalePrice } from "../game/logic";
import type { GameState } from "../types/game";
import { InventoryModal } from "../components/cafe/InventoryModal";
import { CafeScene } from "../components/cafe/CafeScene";
import { CafeAsset } from "../components/cafe/CafeAsset";
import { cafeAsset } from "../components/cafe/sceneModel";
import { managerPending, type ManagerFrame, type ManagerModel } from "../components/cafe/managerModel";

interface CafeProps {
  missionControl?:ReactNode;
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
}
type Notebook = { page: "orders"; selected?: string };

export function CafeScreen({ missionControl, storyOpen, panelRequest, onInventory, state, manager, managerFrame, onCollect, onDecline, onStart, onCharacter, onTown, onEquipment }: CafeProps) {
  const [notebook, setNotebook] = useState<Notebook>();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  useEffect(()=>{
    if(panelRequest?.page==="orders")setNotebook({page:"orders"});
    if(panelRequest?.page==="inventory")setInventoryOpen(true);
  },[panelRequest]);
  useEffect(()=>{if(inventoryOpen)onInventory();},[inventoryOpen,onInventory]);
  useEffect(()=>{if(storyOpen){setNotebook(undefined);setInventoryOpen(false);}},[storyOpen]);
  const stocked = recipes.some(recipe => isRecipeUsable(recipe.id, state) && hasIngredients(state, recipe));
  const actOnOrder = (id: string) => {
    const order = state.orders.find(item => item.id === id);
    const recipe = order && getRecipe(order.recipeId);
    if (!order || !recipe) return;
    if (managerPending(manager, id)) return;
    if (order.status === "ready") onCollect(id);
    else if (order.status === "queued" && !startProblem(state, recipe)) onStart(id);
    else setNotebook({ page: "orders", selected: id });
  };
  return <section className="cafe-screen" aria-label="カフェ">
    <h1 className="sr-only">こもれび喫茶</h1>
    <header className="cafe-hud">
      <div className="cafe-hud-left">
        <div className="cafe-wallet" aria-label={`所持コイン ${state.currency.toLocaleString()}`}><span aria-hidden="true">●</span>{state.currency.toLocaleString()}</div>
        <button type="button" className="scene-kitchen-entry" onClick={onEquipment} aria-label="設備・料理を開く">設備・料理 <span aria-hidden="true">›</span></button>
        {missionControl}
        {state.deliveries.length > 0 && <button type="button" className="cafe-delivery-status" onClick={() => setNotebook({ page: "orders" })}>入荷まで {deliveryCountdown(Math.min(...state.deliveries.map(item => item.arrivesAt)), state.lastPlayedAt)}</button>}
      </div>
      <div className="cafe-hud-right">
        <button className="cafe-menu-toggle" type="button" onClick={() => setInventoryOpen(true)} aria-label="現在の在庫状況を開く"><span aria-hidden="true">▤</span><small>在庫</small></button>
      </div>
    </header>
    <CafeScene state={state} manager={manager} managerPose={managerFrame} onOrder={actOnOrder} onCharacter={onCharacter} onEquipment={onEquipment}/>
    {!stocked && <button className="cafe-restock-hint" type="button" onClick={onTown}>食材を仕入れる →</button>}
    {inventoryOpen && <InventoryModal state={state} onClose={() => setInventoryOpen(false)} onTown={onTown}/>}
    {notebook && <CafeNotebook state={state} manager={manager} notebook={notebook} onClose={() => setNotebook(undefined)}
      onStart={id => { onStart(id); setNotebook(undefined); }} onCollect={id => { onCollect(id); setNotebook(undefined); }} onDecline={onDecline} stocked={stocked} onTown={onTown} onEquipment={onEquipment}/>}
  </section>;
}

function CafeNotebook({ state, manager, notebook, onClose, onStart, onCollect, onDecline, stocked, onTown, onEquipment }: {
  state: GameState; manager: ManagerModel; notebook: Notebook; onClose: () => void; onStart: (id: string) => void;
  onDecline: (id: string) => void; onCollect: (id: string) => void; stocked: boolean; onTown: () => void; onEquipment: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    selectedRef.current?.scrollIntoView({ block: "nearest" });
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="cafe-notebook" aria-labelledby="notebook-title" onClose={onClose}>
    <div className="notebook-handle"/>
    <header className="notebook-header"><h2 id="notebook-title">注文とキッチン</h2><button type="button" onClick={onClose} aria-label="店内に戻る">×</button></header>
      {!state.orders.length && <div className="notebook-empty"><span>☕</span><p>{stocked ? "来店待ち" : "食材がありません"}</p></div>}
      <div className="notebook-orders">{state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const problem = order.status === "queued" ? startProblem(state, recipe) : "";
        const pending = managerPending(manager, order.id);
        const missingConditions = orderRequirements(state, order).filter(condition => !condition.met && condition.id !== "cooking");
        return <article ref={order.id === notebook.selected ? selectedRef : undefined} className={`notebook-order order-${order.status} ${order.id === notebook.selected ? "order-selected" : ""}`} key={order.id}>
          <span className="notebook-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          <div className="notebook-order-info"><small>テーブル {order.customerSlot + 1} · {orderSalePrice(order)}コイン{order.request ? " · リクエスト報酬25%増" : ""}</small><h3>{recipe.name}</h3>
            {order.stationId && <small>{getEquipment(state.stations.find(station => station.id === order.stationId)?.equipmentId || "")?.name}{order.cookId ? ` · ${getCharacter(order.cookId)?.shortName}` : ""}</small>}
            {order.status === "cooking" ? <><progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>{activeCookingOrder(state)?.id === order.id ? `あと${Math.ceil(order.remainingMs / 1000)}秒` : "順番待ち"}</p></> : order.status === "ready" ? <p>{state.staff.some(person => person.servingOrderId === order.id) ? "スタッフが提供中" : "完成"}</p> : problem ? <p>{problem}</p> : null}
          </div>
          {missingConditions.length > 0 && <div className="order-conditions"><h4>不足</h4><ul>{missingConditions.map(condition => <li key={condition.id} data-met={condition.met}>
            <span aria-label="未達成">○</span><div><b>{condition.label}</b><small>{condition.detail}</small></div>
          </li>)}</ul></div>}
          {order.status === "queued" && <div className="notebook-order-tools">{(!state.unlockedRecipes.includes(recipe.id) || !hasIngredients(state, recipe)) && <button type="button" onClick={onTown}>食材を仕入れる →</button>}<button type="button" className="decline-order" onClick={() => onDecline(order.id)}>お断りする</button></div>}
          <button type="button" className="notebook-action" disabled={!!pending || order.status === "cooking" || (order.status === "queued" && !!problem)} onClick={() => order.status === "ready" ? onCollect(order.id) : onStart(order.id)}>{pending === "serve" ? "お届け待ち" : pending === "start" ? "準備待ち" : order.status === "ready" ? "提供する" : order.status === "cooking" ? activeCookingOrder(state)?.id === order.id ? "調理中" : "順番待ち" : "調理開始"}</button>
        </article>;
      })}</div>
      {!stocked && <div className="notebook-stock"><button type="button" onClick={onTown}>街へ仕入れに行く →</button></div>}
    {state.deliveries.length > 0 && <section className="notebook-deliveries"><h3>入荷待ち</h3>{state.deliveries.map(delivery => <p className="supply-delivery" key={delivery.id}><span>{getIngredient(delivery.ingredientId)?.name} {delivery.packs * 5}食分</span><b>あと {deliveryCountdown(delivery.arrivesAt, state.lastPlayedAt)}</b></p>)}</section>}
    <section className="notebook-equipment"><h3>設備の使用状況 <small>{state.stations.length}台</small></h3>{state.stations.map(station => {
      const activity = stationActivity(state, station.id);
      const recipe = activity.order && getRecipe(activity.order.recipeId);
      return <div key={station.id} data-station-status={activity.status}><span>{getEquipment(station.equipmentId)?.icon} {getEquipment(station.equipmentId)?.name} <small>Lv.{station.level}</small>
        {recipe && <small className="station-order-detail">{recipe.name} · テーブル{activity.order!.customerSlot + 1}</small>}
        {activity.status === "cooking" && <progress max={activity.order.totalMs} value={activity.order.totalMs - activity.order.remainingMs} aria-label={`${getEquipment(station.equipmentId)?.name}の調理進捗`}/>}
      </span><b className={activity.status}>{activity.label}{activity.status === "cooking" && <small>あと{Math.ceil(activity.order.remainingMs / 1000)}秒</small>}</b></div>;
    })}
    {equipmentLayout(state).filter(entry => entry.status === "uninstalled").map(({ item }) => <div key={item.id}><span>{item.icon} {item.name}</span><b>解放済み・未設置</b></div>)}
    <button className="notebook-equipment-link" type="button" onClick={onEquipment}>設備の設置・強化へ →</button></section>
  </dialog>;
}
