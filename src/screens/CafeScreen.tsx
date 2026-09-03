"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import { getDecoration } from "../data/decorations";
import { getEquipment } from "../data/equipment";
import { activeCookingOrder, stationActivity } from "../game/kitchen";
import { equipmentLayout } from "../components/cafe/equipmentLayout";
import { hasIngredients, startProblem } from "../game/operations";
import { isRecipeUsable, salePrice } from "../game/logic";
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
  onCollect: (id: string) => void;
  onCharacter: (id: string) => void;
  onTown: () => void;
  onEquipment: () => void;
}
type Notebook = { page: "orders" | "shop"; selected?: string };

export function CafeScreen({ state, manager, managerFrame, onCollect, onStart, onCharacter, onTown, onEquipment }: CafeProps) {
  const [notebook, setNotebook] = useState<Notebook>();
  const ready = state.orders.filter(order => order.status === "ready").length;
  const cooking = activeCookingOrder(state) ? 1 : 0;
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
    <div className="cafe-scene-heading">
      <div><span className="cafe-heading-kicker"><i/> のんびり営業中</span><h1>こもれび喫茶</h1></div>
      <div className="cafe-kitchen-rule"><span>一杯ずつ、ていねいに</span><small>基本30秒で調理</small></div>
    </div>
    <CafeScene state={state} manager={manager} managerPose={managerFrame} onOrder={actOnOrder} onCharacter={onCharacter} onEquipment={() => setNotebook({ page: "shop" })}/>
    <div className="cafe-action-dock">
      <div className="cafe-live-line"><span className={ready ? "ready-indicator" : ""}/><p>{manager.current ? `店長：${managerFrame.label}${manager.queue.length ? ` · 次の仕事 ${manager.queue.length}件` : ""}` : ready ? `できたてが${ready}品。タップすると店長が提供します` : cooking ? `${cooking}品を調理中。ゆっくりお待ちください` : state.orders.length ? "吹き出しをタップすると、店長がマシンへ" : stocked ? "窓辺にひと息。まもなくお客さまが来店します" : "食材を仕入れて、お客さまを迎えましょう"}</p></div>
      <div className="cafe-dock-buttons">
        <button type="button" onClick={() => setNotebook({ page: "orders" })}><span className="dock-icon">☷</span><span>注文とキッチン</span><b className={ready ? "has-ready" : ""}>{state.orders.length}<small>/4</small></b><span className="dock-chevron">⌃</span></button>
        <button type="button" className="cafe-journal-button" onClick={() => setNotebook({ page: "shop" })}><span>♧</span> 店のようす</button>
      </div>
    </div>
    {notebook && <CafeNotebook state={state} manager={manager} notebook={notebook} onClose={() => setNotebook(undefined)}
      onStart={id => { onStart(id); setNotebook(undefined); }} onCollect={id => { onCollect(id); setNotebook(undefined); }} stocked={stocked} onTown={onTown} onEquipment={onEquipment}/>}
  </section>;
}

function CafeNotebook({ state, manager, notebook, onClose, onStart, onCollect, stocked, onTown, onEquipment }: {
  state: GameState; manager: ManagerModel; notebook: Notebook; onClose: () => void; onStart: (id: string) => void;
  onCollect: (id: string) => void; stocked: boolean; onTown: () => void; onEquipment: () => void;
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
      <p className="notebook-intro">調理開始で店長がマシンへ。完成後に提供を選ぶと、お盆で客席まで運びます。お客さまは時間を気にせず待ってくれます。</p>
      {!state.orders.length && <div className="notebook-empty"><span>☕</span><p>{stocked ? "お湯を沸かして、次のお客さまを待ちましょう。" : "食材を仕入れると、注文の受付を再開します。"}</p></div>}
      <div className="notebook-orders">{state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const problem = order.status === "queued" ? startProblem(state, recipe) : "";
        const pending = managerPending(manager, order.id);
        return <article ref={order.id === notebook.selected ? selectedRef : undefined} className={`notebook-order order-${order.status} ${order.id === notebook.selected ? "order-selected" : ""}`} key={order.id}>
          <span className="notebook-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          <div className="notebook-order-info"><small>テーブル {order.customerSlot + 1} · {salePrice(recipe.id)}コイン</small><h3>{recipe.name}</h3>
            {order.stationId && <small>{getEquipment(state.stations.find(station => station.id === order.stationId)?.equipmentId || "")?.name}{order.cookId ? ` · ${getCharacter(order.cookId)?.shortName}` : ""}</small>}
            {order.status === "cooking" ? <><progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>{activeCookingOrder(state)?.id === order.id ? `調理中 · あと${Math.ceil(order.remainingMs / 1000)}秒` : "順番待ち・調理の続きから再開します"}</p></> : <p>{order.status === "ready" ? state.staff.some(person => person.servingOrderId === order.id) ? "スタッフが提供中です。タップでも提供できます" : "できたてです！" : problem || "注文が入りました"}</p>}
          </div>
          <button type="button" className="notebook-action" disabled={!!pending || order.status === "cooking" || (order.status === "queued" && !!problem)} onClick={() => order.status === "ready" ? onCollect(order.id) : onStart(order.id)}>{pending === "serve" ? "お届け待ち" : pending === "start" ? "準備待ち" : order.status === "ready" ? "提供する" : order.status === "cooking" ? activeCookingOrder(state)?.id === order.id ? "調理中" : "順番待ち" : "調理開始"}</button>
        </article>;
      })}</div>
      {!stocked && <div className="notebook-stock"><p>食材が足りません。仕入れは1パック5食分です。</p><button type="button" onClick={onTown}>街へ仕入れに行く →</button></div>}
    </> : <>
      <p className="notebook-intro">調理は店全体で1品ずつ。設備の強化やスタッフの得意料理で、基本30秒から短くなります。</p>
      <dl className="notebook-stats"><div><dt>累計の売上</dt><dd>{state.lifetimeStats.totalRevenue.toLocaleString()}<small>コイン</small></dd></div><div><dt>注文件数</dt><dd>{state.lifetimeStats.totalOrders}<small>件</small></dd></div></dl>
    </>}
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
