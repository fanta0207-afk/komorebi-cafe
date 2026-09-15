"use client";

import { useEffect, useRef, useState } from "react";
import "./prologue.css";

const pages=[
  {speaker:"語り",text:"春風通りの『こもれび喫茶』は、子どもの頃からあなたの好きな場所だった。"},
  {speaker:"おばあちゃん",text:"私もそろそろ、ゆっくりしていいかしら。この店、あなたに任せてもいい？"},
  {speaker:"あなた",text:"すぐに『できる』とは言えなかった。でも、この場所をなくしたくない。……やってみる。分からないことは教えてね。"},
  {speaker:"語り",text:"そして今日、あなたは初めて店長として扉を開ける。コーヒー豆の瓶は空っぽ。最初の一杯のために、街へ出かけよう。"},
] as const;

export function Prologue({onComplete}:{onComplete:()=>void}) {
  const [page,setPage]=useState(0);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const nextRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const dialog=dialogRef.current;dialog?.showModal();nextRef.current?.focus();return()=>dialog?.close();},[]);
  useEffect(()=>{nextRef.current?.focus();},[page]);
  const next=()=>page<pages.length-1?setPage(value=>value+1):onComplete();
  return <dialog ref={dialogRef} className="prologue-dialog" aria-labelledby="prologue-title" onCancel={event=>event.preventDefault()}>
    <img className="prologue-room" src="/assets/cafe/backgrounds/room.png" alt=""/>
    <div className="prologue-vignette" aria-hidden="true"/>
    <header className="prologue-heading">
      <span>春風通り · 開店前</span>
      <h2 id="prologue-title">こもれび喫茶</h2>
      <button type="button" className="prologue-skip" onClick={onComplete}>物語をスキップ</button>
    </header>
    <div className="prologue-panel">
      <div className="prologue-progress" aria-label={`プロローグ ${page+1} / ${pages.length}`}>
        {pages.map((_,index)=><span key={index} className={index===page?"is-current":index<page?"is-done":""}/>)}
      </div>
      <div key={page} className="prologue-line" aria-live="polite">
        <span className={`prologue-speaker ${pages[page].speaker==="おばあちゃん"?"is-grandmother":""}`}>{pages[page].speaker}</span>
        <p>{pages[page].text}</p>
      </div>
      <button ref={nextRef} type="button" className="prologue-next" onClick={next}>{page===pages.length-1?"店を開ける":"つづける"}<span aria-hidden="true">→</span></button>
    </div>
  </dialog>;
}
