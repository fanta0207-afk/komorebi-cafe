"use client";

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "../data/characters";
import { getRecipe, recipes } from "../data/recipes";
import { getDecoration } from "../data/decorations";
import { getEquipment } from "../data/equipment";
import { getCustomerGroup, getTownDailyEvent, getWeather } from "../data/dailyConditions";
import { hasIngredients, startProblem } from "../game/operations";
import { isRecipeUsable, salePrice } from "../game/logic";
import type { GameState } from "../types/game";
import { CafeScene } from "../components/cafe/CafeScene";
import { CafeAsset } from "../components/cafe/CafeAsset";
import { cafeAsset } from "../components/cafe/sceneModel";

interface CafeProps {
  state: GameState;
  onStart: (id: string) => void;
  onCollect: (id: string) => void;
  onCharacter: (id: string) => void;
  onTown: () => void;
}
type Notebook = { page: "orders" | "today"; selected?: string };

export function CafeScreen({ state, onCollect, onStart, onCharacter, onTown }: CafeProps) {
  const [notebook, setNotebook] = useState<Notebook>();
  const weather = getWeather(state.dailyWeatherId);
  const dailyEvent = getTownDailyEvent(state.dailyEventId);
  const ready = state.orders.filter(order => order.status === "ready").length;
  const cooking = state.orders.filter(order => order.status === "cooking").length;
  const stocked = recipes.some(recipe => isRecipeUsable(recipe.id, state) && hasIngredients(state, recipe));
  const actOnOrder = (id: string) => {
    const order = state.orders.find(item => item.id === id);
    const recipe = order && getRecipe(order.recipeId);
    if (!order || !recipe) return;
    if (order.status === "ready") onCollect(id);
    else if (order.status === "queued" && !startProblem(state, recipe)) onStart(id);
    else setNotebook({ page: "orders", selected: id });
  };
  return <section className="cafe-screen" aria-label="カフェ">
    <div className="cafe-scene-heading">
      <div><span className="cafe-heading-kicker"><i/> のんびり営業中</span><h1>こもれび喫茶</h1></div>
      <button type="button" className="cafe-weather" onClick={() => setNotebook({ page: "today" })} aria-label={`${weather.name}・${dailyEvent.name}。店のようすを開く`}>
        <span>{weather.icon}</span><span>{weather.name}<small>{dailyEvent.name} ›</small></span>
      </button>
    </div>
    <CafeScene state={state} onOrder={actOnOrder} onCharacter={onCharacter} onEquipment={() => setNotebook({ page: "today" })}/>
    <div className="cafe-action-dock">
      <div className="cafe-live-line"><span className={ready ? "ready-indicator" : ""}/><p>{ready ? `できたてが${ready}品。吹き出しをタップして提供` : cooking ? `${cooking}品を調理中。ゆっくりお待ちください` : state.orders.length ? "吹き出しをタップして調理開始" : stocked ? "窓辺にひと息。まもなくお客さまが来店します" : "食材を仕入れて、お客さまを迎えましょう"}</p></div>
      <div className="cafe-dock-buttons">
        <button type="button" onClick={() => setNotebook({ page: "orders" })}><span className="dock-icon">☷</span><span>注文とキッチン</span><b className={ready ? "has-ready" : ""}>{state.orders.length}<small>/4</small></b><span className="dock-chevron">⌃</span></button>
        <button type="button" className="cafe-journal-button" onClick={() => setNotebook({ page: "today" })}><span>♧</span> 店のようす</button>
      </div>
    </div>
    {notebook && <CafeNotebook state={state} notebook={notebook} onClose={() => setNotebook(undefined)}
      onStart={onStart} onCollect={onCollect} stocked={stocked} onTown={onTown}/>}
  </section>;
}

function CafeNotebook({ state, notebook, onClose, onStart, onCollect, stocked, onTown }: {
  state: GameState; notebook: Notebook; onClose: () => void; onStart: (id: string) => void;
  onCollect: (id: string) => void; stocked: boolean; onTown: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    selectedRef.current?.scrollIntoView({ block: "nearest" });
    return () => dialog?.close();
  }, []);
  const weather = getWeather(state.dailyWeatherId);
  const crowd = getCustomerGroup(state.dailyCustomerGroupId);
  const dailyEvent = getTownDailyEvent(state.dailyEventId);
  return <dialog ref={dialogRef} className="cafe-notebook" aria-labelledby="notebook-title" onClose={onClose}>
    <div className="notebook-handle"/>
    <header className="notebook-header"><div><span>CAFE NOTEBOOK</span><h2 id="notebook-title">{notebook.page === "orders" ? "注文とキッチン" : "店のようす"}</h2></div><button type="button" onClick={onClose} aria-label="店内に戻る">×</button></header>
    {notebook.page === "orders" ? <>
      <p className="notebook-intro">調理開始 → 完成を待つ → 提供する。お客さまは時間を気にせず待ってくれます。</p>
      {!state.orders.length && <div className="notebook-empty"><span>☕</span><p>{stocked ? "お湯を沸かして、次のお客さまを待ちましょう。" : "食材を仕入れると、注文の受付を再開します。"}</p></div>}
      <div className="notebook-orders">{state.orders.map(order => {
        const recipe = getRecipe(order.recipeId); if (!recipe) return null;
        const problem = order.status === "queued" ? startProblem(state, recipe) : "";
        return <article ref={order.id === notebook.selected ? selectedRef : undefined} className={`notebook-order order-${order.status} ${order.id === notebook.selected ? "order-selected" : ""}`} key={order.id}>
          <span className="notebook-food"><CafeAsset src={cafeAsset.food(recipe.id)}>{recipe.icon}</CafeAsset></span>
          <div className="notebook-order-info"><small>テーブル {order.customerSlot + 1} · {salePrice(recipe.id, state)}コイン</small><h3>{recipe.name}</h3>
            {order.stationId && <small>{getEquipment(state.stations.find(station => station.id === order.stationId)?.equipmentId || "")?.name}{order.cookId ? ` · ${getCharacter(order.cookId)?.shortName}` : ""}</small>}
            {order.status === "cooking" ? <><progress max={order.totalMs} value={order.totalMs - order.remainingMs} aria-label={`${recipe.name}の調理進捗`}/><p>調理中 · あと{Math.ceil(order.remainingMs / 1000)}秒</p></> : <p>{order.status === "ready" ? state.staff.some(person => person.servingOrderId === order.id) ? "スタッフが提供中です。タップでも提供できます" : "できたてです！" : problem || "注文が入りました"}</p>}
          </div>
          <button type="button" className="notebook-action" disabled={order.status === "cooking" || (order.status === "queued" && !!problem)} onClick={() => order.status === "ready" ? onCollect(order.id) : onStart(order.id)}>{order.status === "ready" ? "提供する" : order.status === "cooking" ? "調理中" : "調理開始"}</button>
        </article>;
      })}</div>
      {!stocked && <div className="notebook-stock"><p>食材が足りません。仕入れは1パック5食分です。</p><button type="button" onClick={onTown}>街へ仕入れに行く →</button></div>}
    </> : <>
      <div className="notebook-weather"><span>{weather.icon}</span><div><h3>{weather.name}</h3><p>{weather.description}</p></div></div>
      <div className="notebook-conditions"><p><b>{crowd.icon} {crowd.name}</b>{crowd.description}</p><p><b>{dailyEvent.icon} {dailyEvent.name} · 売上×{dailyEvent.saleMultiplier}</b>{dailyEvent.description}</p></div>
      <dl className="notebook-stats"><div><dt>累計の売上</dt><dd>{state.lifetimeStats.totalRevenue.toLocaleString()}<small>コイン</small></dd></div><div><dt>注文件数</dt><dd>{state.lifetimeStats.totalOrders}<small>件</small></dd></div></dl>
    </>}
    <section className="notebook-equipment"><h3>設備の使用状況 <small>{state.stations.length}台</small></h3>{state.stations.map(station => {
      const busy = state.orders.some(order => order.stationId === station.id && order.status === "cooking");
      return <div key={station.id}><span>{getEquipment(station.equipmentId)?.icon} {getEquipment(station.equipmentId)?.name} <small>Lv.{station.level}</small></span><b className={busy ? "busy" : ""}>{busy ? "調理中" : "空き"}</b></div>;
    })}</section>
    {state.staff.some(person => person.role !== "rest") && <section className="notebook-crew"><h3>お手伝い中</h3>{state.staff.filter(person => person.role !== "rest").map(person => <p key={person.characterId}>♡ {getCharacter(person.characterId)?.shortName} · {person.role === "cook" ? "調理担当" : "提供担当"}</p>)}</section>}
    {notebook.page === "today" && state.unlockedDecorations.length > 0 && <section className="notebook-memories"><h3>店に残った思い出 <small>{state.unlockedDecorations.length}</small></h3>{state.unlockedDecorations.map(id => { const item = getDecoration(id); return item && <span key={id}>{item.icon} {item.name}</span>; })}</section>}
  </dialog>;
}
