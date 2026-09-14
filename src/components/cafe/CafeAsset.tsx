"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Keep legacy artwork out of loading frames; recover transient network failures. */
export function CafeAsset({ src, alternatives = [], children, className = "", fallbackDuringLoad = false, fallbackOnError = true, priority = false }: {
  src: string; alternatives?: string[]; children: ReactNode; className?: string;
  fallbackDuringLoad?: boolean; fallbackOnError?: boolean; priority?: boolean;
}) {
  const sources = [src, ...alternatives].filter(Boolean);
  return <AssetLoader key={sources.join("|")} sources={sources} className={className} fallbackDuringLoad={fallbackDuringLoad} fallbackOnError={fallbackOnError} priority={priority}>{children}</AssetLoader>;
}

function AssetLoader({ sources, children, className, fallbackDuringLoad, fallbackOnError, priority }: {
  sources: string[]; children: ReactNode; className: string; fallbackDuringLoad: boolean; fallbackOnError: boolean; priority: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadEpoch,setReloadEpoch]=useState(0);
  const exhausted = index >= sources.length;
  const retry = useCallback(() => {setIndex(0);setAttempt(0);setReloadEpoch(Date.now());setFailed(false);setLoaded(false);},[]);
  useEffect(()=>{
    if(!failed || exhausted)return;
    const timer=window.setTimeout(()=>{
      if(attempt<2)setAttempt(current=>current+1);
      else {setIndex(current=>current+1);setAttempt(0);}
      setFailed(false);
    },attempt<2?500*(attempt+1):0);
    return ()=>window.clearTimeout(timer);
  },[failed,exhausted,attempt]);
  useEffect(()=>{
    if(!exhausted)return;
    window.addEventListener("online",retry);
    return ()=>window.removeEventListener("online",retry);
  },[exhausted,retry]);
  const showFallback = !loaded && (fallbackDuringLoad || (exhausted && fallbackOnError));
  const state = loaded ? "image" : exhausted ? "fallback" : "loading";
  const source=sources[index];
  const requestSrc=source&&(attempt||reloadEpoch)?`${source}${source.includes("?")?"&":"?"}assetRetry=${reloadEpoch}-${attempt}`:source;
  return <span className={`cafe-asset ${className}`} data-asset-state={state}>
    <span className="cafe-asset-fallback" hidden={!showFallback}>{showFallback?children:null}</span>
    {!exhausted && <AssetImage key={`${index}:${attempt}`} src={requestSrc} visible={loaded || (!fallbackDuringLoad&&!failed)} priority={priority}
      onLoad={()=>{setLoaded(true);setFailed(false);}} onError={()=>{setLoaded(false);setFailed(true);}}/>}
    {exhausted&&!fallbackOnError&&<button type="button" className="cafe-asset-retry" onClick={retry} aria-label="画像を再読み込み">再読み込み</button>}
  </span>;
}

function AssetImage({src,visible,priority,onLoad,onError}:{src:string;visible:boolean;priority:boolean;onLoad:()=>void;onError:()=>void}) {
  const settled=useRef(false);
  const complete=useCallback((success:boolean)=>{
    // A cached failure and its error event belong to one attempt, never two.
    if(settled.current)return;
    settled.current=true;
    if(success)onLoad();else onError();
  },[onLoad,onError]);
  const checkImage=useCallback((node:HTMLImageElement|null)=>{
    if(node?.complete)complete(node.naturalWidth>0);
  },[complete]);
  return <img ref={checkImage} src={src} alt="" draggable={false} className={visible?"asset-loaded":""}
    loading={priority?"eager":undefined} fetchPriority={priority?"high":undefined}
    onLoad={()=>complete(true)} onError={()=>complete(false)}/>;
}
