import { cacaoRelationshipEvents, cacaoStaffStories } from "./cacaoEpisodes";
import { saeRelationshipEvents, saeStaffStories } from "./saeEpisodes";
import { shizukaRelationshipEvents, shizukaStaffStories } from "./shizukaEpisodes";
import type { RelationshipEvent } from "../types/game";
import { renRelationshipEvents, renStaffStories } from "./renEpisodes";

import { makiRelationshipEvents, makiStaffStories } from "./makiEpisodes";

import { aoiRelationshipEvents, aoiStaffStories } from "./aoiEpisodes";

import { earlRelationshipEvents, earlStaffStories } from "./earlEpisodes";

import { taiyoRelationshipEvents, taiyoStaffStories } from "./taiyoEpisodes";

export const staffStoryEvents = [...renStaffStories, ...makiStaffStories, ...aoiStaffStories, ...earlStaffStories, ...taiyoStaffStories, ...shizukaStaffStories, ...saeStaffStories, ...cacaoStaffStories];
export const getStaffStoryEvent = (id:string) => staffStoryEvents.find(event=>event.id===id);

// Based on docs/キャラクター設定・恋愛ストーリー案.md. One event for each of 10 levels.
export const relationshipEvents: RelationshipEvent[] = [
  ...renRelationshipEvents,
  ...makiRelationshipEvents,
  ...aoiRelationshipEvents,
  ...earlRelationshipEvents,
  ...taiyoRelationshipEvents,
  ...shizukaRelationshipEvents,
  ...saeRelationshipEvents,
  ...cacaoRelationshipEvents,
];

export const getRelationshipEvent = (id:string) => relationshipEvents.find(event => event.id === id);
