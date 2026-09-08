"use client";

import { useCallback, useState, type ReactNode } from "react";

/** A keyed loader resets failures when its source changes. Assets normally keep their
 * fallback visible while loading. Hero artwork can opt out so server-rendered legacy
 * art never flashes before the supplied image is painted.
 */
export function CafeAsset({ src, alternatives = [], children, className = "", fallbackDuringLoad = true, priority = false }: {
  src: string; alternatives?: string[]; children: ReactNode; className?: string;
  fallbackDuringLoad?: boolean; priority?: boolean;
}) {
  const sources = [src, ...alternatives].filter(Boolean);
  return <AssetLoader key={sources.join("|")} sources={sources} className={className} fallbackDuringLoad={fallbackDuringLoad} priority={priority}>{children}</AssetLoader>;
}

function AssetLoader({ sources, children, className, fallbackDuringLoad, priority }: {
  sources: string[]; children: ReactNode; className: string; fallbackDuringLoad: boolean; priority: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Cached images may finish before hydration attaches load/error handlers.
  const checkImage = useCallback((node: HTMLImageElement | null) => {
    if (!node?.complete) return;
    if (node.naturalWidth > 0) setLoaded(true);
    else setIndex(current => current + 1);
  }, []);
  const exhausted = index >= sources.length;
  const showFallback = !loaded && (fallbackDuringLoad || exhausted);
  const state = loaded ? "image" : exhausted || fallbackDuringLoad ? "fallback" : "loading";
  return <span className={`cafe-asset ${className}`} data-asset-state={state}>
    <span className="cafe-asset-fallback" hidden={!showFallback}>{children}</span>
    {index < sources.length && <img ref={checkImage} key={sources[index]} src={sources[index]} alt="" draggable={false}
      className={loaded || !fallbackDuringLoad ? "asset-loaded" : ""} loading={priority ? "eager" : undefined} fetchPriority={priority ? "high" : undefined}
      onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setIndex(current => current + 1); }} />}
  </span>;
}
