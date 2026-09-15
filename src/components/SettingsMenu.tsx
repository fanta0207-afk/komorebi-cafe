"use client";

import { useEffect, useRef, useState } from "react";
import "./settings-menu.css";

export function SettingsMenu({onClose,onReset}:{onClose:()=>void;onReset:()=>void}) {
  const [confirming,setConfirming]=useState(false);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const dialog=dialogRef.current;dialog?.showModal();closeRef.current?.focus();return()=>dialog?.close();},[]);
  useEffect(()=>{if(confirming)cancelRef.current?.focus();},[confirming]);
  return <dialog ref={dialogRef} className="settings-menu" aria-labelledby="settings-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <header><h2 id="settings-title">設定</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="設定を閉じる">×</button></header>
    <div className="settings-content">
      {confirming?<div className="settings-confirm" role="alert">
        <h3>セーブデータを初期化しますか？</h3>
        <p>このブラウザの進行・所持品・物語の記録を消して、最初からやり直します。元には戻せません。</p>
        <div className="settings-confirm-actions">
          <button ref={cancelRef} type="button" onClick={()=>setConfirming(false)}>キャンセル</button>
          <button type="button" className="settings-danger" onClick={onReset}>初期化する</button>
        </div>
      </div>:<section>
        <h3>セーブデータ</h3>
        <p>このブラウザに保存されているゲームの進行を管理できます。</p>
        <button type="button" className="settings-reset" onClick={()=>setConfirming(true)}>セーブデータを初期化</button>
      </section>}
    </div>
  </dialog>;
}
