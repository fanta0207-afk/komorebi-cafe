"use client";

import { useEffect, useRef, useState } from "react";
import type { Character, CharacterExpression } from "../types/game";

export function storyArtSource(character:Character,expression?:CharacterExpression) {
  const normal=character.storyImage||character.image;
  return expression&&expression!=="normal"?character.expressionImages?.[expression]||normal:normal;
}

export function StoryStandingArt({character,expression,className="story-standing-art"}:{
  character:Character;expression?:CharacterExpression;className?:string;
}) {
  const normal=character.storyImage||character.image;
  const requested=storyArtSource(character,expression);
  const [error,setError]=useState<{request:string;fallback:boolean;failed:boolean}>({request:requested,fallback:false,failed:false});
  const currentError=error.request===requested?error:{request:requested,fallback:false,failed:false};
  const source=currentError.fallback?normal:requested;
  const artRef=useRef<HTMLImageElement>(null);
  useEffect(()=>{
    const stage=artRef.current?.closest<HTMLElement>(".story-stage");
    const heading=stage?.previousElementSibling;
    if(!stage || !(heading instanceof HTMLElement) || !heading.classList.contains("story-player-heading"))return;
    const update=()=>stage.style.setProperty("--story-heading-height",`${heading.offsetHeight}px`);
    update();
    const observer=new ResizeObserver(update);
    observer.observe(heading);
    return ()=>observer.disconnect();
  },[currentError.failed]);

  if(currentError.failed)return <div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>;
  return <img
    ref={artRef}
    className={className}
    src={source}
    alt={`${character.name}の立ち絵`}
    data-expression={expression||"normal"}
    onError={()=>setError({request:requested,fallback:true,failed:source===normal})}
  />;
}
