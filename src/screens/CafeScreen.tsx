"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import { getDecoration } from "../data/decorations";
import { orderRequirements } from "../game/orderRequirements";
import { deliveryCountdown } from "../game/procurement";
import { getIngredient } from "../data/ingredients";
import { getEquipment } from "../data/equipment";
import { activeCookingOrder, stationActivity } from "../game/kitchen";
import { equipmentLayout } from "../components/cafe/equipmentLayout";
import { hasIngredients, startProblem } from "../game/operations";
import { isRecipeUsable, orderSalePrice } from "../game/logic";
import type { GameState } from "../types/game";
import { CafeScene } from "../components/cafe/CafeScene";
import { CafeAsset } from "../components/cafe/CafeAsset";
import { cafeAsset } from "../components/cafe/sceneModel";
import { managerPending, type ManagerFrame, type ManagerModel } from "../components/cafe/managerModel";

interface CafeProps {
  state: GameState;
  manager: ManagerModel;
  managerFrame: ManagerFrame;
  onStart: (id: string) => void;
  onDecline: (id: string) => void;
  onCollect: (id: string) => void;
  onCharacter: (id: string) => void;
  onTown: () => void;
  onEquipment: () => void;
  onDev: () => void;
}
type Notebook = { page: "orders" | "shop"; selected?: string };

export function CafeScreen({ state, manager, managerFrame, onCollect, onDecline, onStart, onCharacter, onTown, onEquipment, onDev }: CafeProps) {
  const [notebook, setNotebook] = useState<Notebook>();
  const [menuOpen, setMenuOpen] = useState(false);
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
        {state.deliveries.length > 0 && <button type="button" className="cafe-delivery-status" onClick={() => setNotebook({ page: "orders" })}>入荷まで {deliveryCountdown(Math.min(...state.deliveries.map(item => item.arrivesAt)), state.lastPlayedAt)}</button>}
      </div>
      <button className="cafe-menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-label="注文ノートと店の情報を開く"><span aria-hidden="true">☷</span><small>ノート</small></button>
    </header>
    <CafeScene state={state} manager={manager} managerPose={managerFrame} onOrder={actOnOrder} onCharacter={onCharacter} onEquipment={onEquipment}/>
    {!stocked && <button className="cafe-restock-hint" type="button" onClick={onTown}>食材を仕入れる →</button>}
    {menuOpen && <CafeMenu onClose={() => setMenuOpen(false)}
      onNotebook={page => { setMenuOpen(false); setNotebook({ page }); }} onDev={() => { setMenuOpen(false); onDev(); }}/>}
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
    <header className="notebook-header"><div><span>CAFE NOTEBOOK</span><h2 id="notebook-title">{notebook.page === "orders" ? "注文とキッチン" : "店のようす"}</h2></div><button type="button" onClick={onClose} aria-label="店内に戻る">×</button></header>
    {notebook.page === "orders" ? <>
      <p className="notebook-intro">調理開始で店長がマシンへ。完成後に提供を選ぶと、お盆で客席まで運びます。リクエストは材料をそろえて応えると売上25%増。難しい注文はお断りできます。</p>
      {!state.orders.length && <div className="notebook-empty"><span>☕</span><p>{stocked ? "お湯を沸かして、次のお客さまを待ちましょう。" : "食材を仕入れると、注文の受付を再開します。"}</p></div>}
      <div className="notebook-orders">{state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const problem = order.status === "queued" ? startProblem(state, recipe) : "";
        const pending = managerPending(manager, order.id);
        return <article ref={order.id === notebook.selected ? selectedRef : undefined} className={`notebook-order order-${order.status} ${order.id === notebook.selected ? "order-selected" : ""}`} key={order.id}>
          <span className="notebook-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          <div className="notebook-order-info"><small>テーブル {order.customerSlot + 1} · {orderSalePrice(order)}コイン{order.request ? " · リクエスト報酬25%増" : ""}</small><h3>{recipe.name}</h3>
            {order.stationId && <small>{getEquipment(state.stations.find(station => station.id === order.stationId)?.equipmentId || "")?.name}{order.cookId ? ` · ${getCharacter(order.cookId)?.shortName}` : ""}</small>}
            {order.status === "cooking" ? <><progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>{activeCookingOrder(state)?.id === order.id ? `調理中 · あと${Math.ceil(order.remainingMs / 1000)}秒` : "順番待ち・調理の続きから再開します"}</p></> : <p>{order.status === "ready" ? state.staff.some(person => person.servingOrderId === order.id) ? "スタッフが提供中です。タップでも提供できます" : "できたてです！" : problem || "注文が入りました"}</p>}
          </div>
          <div className="order-conditions"><h4>提供するための条件</h4><ul>{orderRequirements(state, order).map(condition => <li key={condition.id} data-met={condition.met}>
            <span aria-label={condition.met ? "達成" : "未達成"}>{condition.met ? "✓" : "○"}</span><div><b>{condition.label}</b><small>{condition.detail}</small></div>
          </li>)}</ul></div>
          {order.status === "queued" && <div className="notebook-order-tools">{(!state.unlockedRecipes.includes(recipe.id) || !hasIngredients(state, recipe)) && <button type="button" onClick={onTown}>食材を仕入れる →</button>}<button type="button" className="decline-order" onClick={() => onDecline(order.id)}>お断りする</button></div>}
          <button type="button" className="notebook-action" disabled={!!pending || order.status === "cooking" || (order.status === "queued" && !!problem)} onClick={() => order.status === "ready" ? onCollect(order.id) : onStart(order.id)}>{pending === "serve" ? "お届け待ち" : pending === "start" ? "準備待ち" : order.status === "ready" ? "提供する" : order.status === "cooking" ? activeCookingOrder(state)?.id === order.id ? "調理中" : "順番待ち" : "調理開始"}</button>
        </article>;
      })}</div>
      {!stocked && <div className="notebook-stock"><p>食材が足りません。仕入れは1パック5食分です。</p><button type="button" onClick={onTown}>街へ仕入れに行く →</button></div>}
    </> : <>
      <p className="notebook-intro">調理は店全体で1品ずつ。設備の強化やスタッフの得意料理で、基本30秒から短くなります。</p>
      <dl className="notebook-stats"><div><dt>累計の売上</dt><dd>{state.lifetimeStats.totalRevenue.toLocaleString()}<small>コイン</small></dd></div><div><dt>注文件数</dt><dd>{state.lifetimeStats.totalOrders}<small>件</small></dd></div></dl>
    </>}
    {state.deliveries.length > 0 && <section className="notebook-deliveries"><h3>入荷待ち</h3>{state.deliveries.map(delivery => <p className="supply-delivery" key={delivery.id}><span>{getIngredient(delivery.ingredientId)?.name} {delivery.packs * 5}食分</span><b>あと {deliveryCountdown(delivery.arrivesAt, state.lastPlayedAt)}</b></p>)}</section>}
    <section className="notebook-equipment"><h3>設備の使用状況 <small>{state.stations.length}台</small></h3>{state.stations.map(station => {
      const activity = stationActivity(state, station.id);
      const recipe = activity.order && getRecipe(activity.order.recipeId);
      return <div key={station.id} data-station-status={activity.status}><span>{getEquipment(station.equipmentId)?.icon} {getEquipment(station.equipmentId)?.name} <small>Lv.{station.level}</small>
        <small className="station-order-detail">{recipe ? `${recipe.name} · テーブル${activity.order!.customerSlot + 1}` : "注文をお待ちしています"}</small>
        {activity.status === "cooking" && <progress max={activity.order.totalMs} value={activity.order.totalMs - activity.order.remainingMs} aria-label={`${getEquipment(station.equipmentId)?.name}の調理進捗`}/>}
      </span><b className={activity.status}>{activity.label}{activity.status === "cooking" && <small>あと{Math.ceil(activity.order.remainingMs / 1000)}秒</small>}</b></div>;
    })}
    {equipmentLayout(state).filter(entry => entry.status === "uninstalled").map(({ item }) => <div key={item.id}><span>{item.icon} {item.name}</span><b>解放済み・未設置</b></div>)}
    <button className="notebook-equipment-link" type="button" onClick={onEquipment}>設備の設置・強化へ →</button></section>
    {state.staff.some(person => person.role !== "rest") && <section className="notebook-crew"><h3>お手伝い中</h3>{state.staff.filter(person => person.role !== "rest").map(person => <p key={person.characterId}>♡ {getCharacter(person.characterId)?.shortName} · {person.role === "cook" ? "調理担当" : "提供担当"}</p>)}</section>}
    {notebook.page === "shop" && state.unlockedDecorations.length > 0 && <section className="notebook-memories"><h3>店に残った思い出 <small>{state.unlockedDecorations.length}</small></h3>{state.unlockedDecorations.map(id => { const item = getDecoration(id); return item && <span key={id}>{item.icon} {item.name}</span>; })}</section>}
  </dialog>;
}

function CafeMenu({ onClose, onNotebook, onDev }: {
  onClose: () => void; onNotebook: (page: Notebook["page"]) => void; onDev: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="cafe-notebook cafe-menu" aria-labelledby="cafe-menu-title" onClose={onClose}>
    <div className="notebook-handle"/>
    <header className="notebook-header"><h2 id="cafe-menu-title">こもれび喫茶</h2><button type="button" onClick={onClose} aria-label="店内に戻る">×</button></header>
    <nav className="cafe-menu-grid" aria-label="お店のノート">
      <button type="button" onClick={() => onNotebook("orders")}><span aria-hidden="true">☷</span>注文ノート</button>
      <button type="button" onClick={() => onNotebook("shop")}><span aria-hidden="true">♧</span>店のようす・思い出</button>
    </nav>
    <details className="cafe-settings"><summary>設定</summary><button type="button" onClick={onDev}>開発メニュー</button></details>
  </dialog>;
}
