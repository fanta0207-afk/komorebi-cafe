"use client";

import { useEffect, useRef, useState } from "react";
import { useAudio } from "../audio/AudioProvider";
import { GameModal } from "./GameModal";
import "./settings-menu.css";

export function SettingsMenu({onClose,onReset}:{onClose:()=>void;onReset:()=>void}) {
  const {settings,updateSettings}=useAudio();
  const [confirming,setConfirming]=useState(false);
  const closeRef=useRef<HTMLButtonElement>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeRef.current?.focus();},[]);
  useEffect(()=>{if(confirming)cancelRef.current?.focus();},[confirming]);
  return <GameModal className="settings-menu" labelledBy="settings-title" onCancel={onClose} layerClassName="settings-modal-layer">
    <header><h2 id="settings-title">設定</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="設定を閉じる">×</button></header>
    <div className="settings-content">
      {confirming?<div className="settings-confirm" role="alert">
        <h3>セーブデータを初期化しますか？</h3>
        <p>このブラウザの進行・所持品・物語の記録を消して、最初からやり直します。元には戻せません。</p>
        <div className="settings-confirm-actions">
          <button ref={cancelRef} type="button" onClick={()=>setConfirming(false)}>キャンセル</button>
          <button type="button" className="settings-danger" onClick={onReset}>初期化する</button>
        </div>
      </div>:<>
        <section className="settings-audio" aria-labelledby="audio-settings-title">
          <h3 id="audio-settings-title">サウンド</h3>
          <p>こもれび喫茶の音楽と効果音を調整できます。</p>
          <AudioControl label="BGM" icon="♫" enabled={settings.bgmEnabled} volume={settings.bgmVolume} onEnabled={bgmEnabled=>updateSettings({bgmEnabled})} onVolume={bgmVolume=>updateSettings({bgmVolume})}/>
          <AudioControl label="効果音" icon="♪" enabled={settings.sfxEnabled} volume={settings.sfxVolume} onEnabled={sfxEnabled=>updateSettings({sfxEnabled})} onVolume={sfxVolume=>updateSettings({sfxVolume})}/>
        </section>
        <section className="settings-save">
          <h3>セーブデータ</h3>
          <p>このブラウザに保存されているゲームの進行を管理できます。</p>
          <button type="button" className="settings-reset" onClick={()=>setConfirming(true)}>セーブデータを初期化</button>
        </section>
      </>}
    </div>
  </GameModal>;
}

function AudioControl({label,icon,enabled,volume,onEnabled,onVolume}:{label:string;icon:string;enabled:boolean;volume:number;onEnabled:(value:boolean)=>void;onVolume:(value:number)=>void}) {
  const percent=Math.round(volume*100);
  return <div className={`audio-control ${enabled?"is-on":"is-off"}`}>
    <button type="button" className="audio-toggle" aria-pressed={enabled} onClick={()=>onEnabled(!enabled)}><span aria-hidden="true">{enabled?icon:"×"}</span><b>{label}</b><small>{enabled?"ON":"OFF"}</small></button>
    <label><span className="sr-only">{label}音量</span><input type="range" min="0" max="100" step="1" value={percent} disabled={!enabled} onChange={event=>onVolume(Number(event.target.value)/100)}/><output>{percent}</output></label>
  </div>;
}
