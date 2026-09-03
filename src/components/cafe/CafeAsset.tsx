"use client";

import { useCallback, useState, type ReactNode } from "react";

/** Keep the fallback visible until an image actually loads (also handles corrupt files).
 * A keyed loader resets failures when its source changes. No save fields are required.
 */
export function CafeAsset({ src, alternatives = [], children, className = "" }: {
  src: string; alternatives?: string[]; children: ReactNode; className?: string;
}) {
  const sources = [src, ...alternatives].filter(Boolean);
  return <AssetLoader key={sources.join("|")} sources={sources} className={className}>{children}</AssetLoader>;
}

function AssetLoader({ sources, children, className }: { sources: string[]; children: ReactNode; className: string }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Cached images may finish before hydration attaches load/error handlers.
  const checkImage = useCallback((node: HTMLImageElement | null) => {
    if (!node?.complete) return;
    if (node.naturalWidth > 0) setLoaded(true);
    else setIndex(index + 1);
  }, [index]);
  return <span className={`cafe-asset ${className}`} data-asset-state={loaded ? "image" : "fallback"}>
    <span className="cafe-asset-fallback" hidden={loaded}>{children}</span>
    {index < sources.length && <img ref={checkImage} key={sources[index]} src={sources[index]} alt="" draggable={false}
      className={loaded ? "asset-loaded" : ""} onLoad={() => setLoaded(true)}
      onError={() => { setLoaded(false); setIndex(index + 1); }} />}
  </span>;
}
