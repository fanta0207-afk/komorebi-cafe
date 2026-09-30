"use client";

import { useState } from "react";
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

  if(currentError.failed)return <div className="story-art-fallback"><span>{character.occupation}</span><strong>{character.name}</strong></div>;
  return <img
    className={className}
    src={source}
    alt={`${character.name}の立ち絵`}
    data-expression={expression||"normal"}
    onError={()=>setError({request:requested,fallback:true,failed:source===normal})}
  />;
}
