import { cacaoGreetingsByStage, cacaoRomanceGreetings, cacaoRomanceDailyGreetings, cacaoFriendshipGreetings, cacaoGiftDetails, cacaoGiftThanks, cacaoConversationTone, cacaoSupplyReplies, cacaoStaffReplies, cacaoStaffOffer, cacaoStaffEarlyReply } from "../data/cacaoConversations";
import { saeGreetingsByStage, saeRomanceGreetings, saeRomanceDailyGreetings, saeFriendshipGreetings, saeGiftDetails, saeGiftThanks, saeConversationTone, saeSupplyReplies, saeStaffReplies, saeStaffOffer, saeStaffEarlyReply } from "../data/saeConversations";
import { shizukaGreetingsByStage, shizukaRomanceGreetings, shizukaRomanceDailyGreetings, shizukaFriendshipGreetings, shizukaGiftDetails, shizukaGiftThanks, shizukaConversationTone, shizukaSupplyReplies, shizukaStaffReplies, shizukaStaffOffer, shizukaStaffEarlyReply } from "../data/shizukaConversations";
import type { Character, CharacterProgress, Gift, GiftReaction, StaffRole } from "../types/game";
import { staffHireStage } from "./automation";
import { renGreetingsByStage, renRomanceGreetings, renRomanceDailyGreetings, renFriendshipGreetings, renGiftDetails, renGiftThanks, renConversationTone, renSupplyReplies, renStaffReplies, renStaffOffer, renStaffEarlyReply } from "../data/renConversations";
import { makiGreetingsByStage, makiRomanceGreetings, makiRomanceDailyGreetings, makiFriendshipGreetings, makiGiftDetails, makiGiftThanks, makiConversationTone, makiSupplyReplies, makiStaffReplies, makiStaffOffer, makiStaffEarlyReply } from "../data/makiConversations";
import { aoiGreetingsByStage, aoiRomanceGreetings, aoiRomanceDailyGreetings, aoiFriendshipGreetings, aoiGiftDetails, aoiGiftThanks, aoiConversationTone, aoiSupplyReplies, aoiStaffReplies, aoiStaffOffer, aoiStaffEarlyReply } from "../data/aoiConversations";
import { earlGreetingsByStage, earlRomanceGreetings, earlRomanceDailyGreetings, earlFriendshipGreetings, earlGiftDetails, earlGiftThanks, earlConversationTone, earlSupplyReplies, earlStaffReplies, earlStaffOffer, earlStaffEarlyReply } from "../data/earlConversations";

import { taiyoGreetingsByStage, taiyoRomanceGreetings, taiyoRomanceDailyGreetings, taiyoFriendshipGreetings, taiyoGiftDetails, taiyoGiftThanks, taiyoConversationTone, taiyoSupplyReplies, taiyoStaffReplies, taiyoStaffOffer, taiyoStaffEarlyReply } from "../data/taiyoConversations";

type ConversationTone="early"|"close"|"romance"|"friendship";
type EverydayConversation={
  stages:Record<number,string[]>;romance:string[];daily:string[];friendship:string[];
  giftDetails:Record<string,string>;giftThanks:Record<ConversationTone,Record<GiftReaction,string[]>>;
  tone:(progress:CharacterProgress)=>ConversationTone;supply:Record<ConversationTone,string>;
  staff:Record<StaffRole,{assign:string;busy:string;working?:string}>;staffOffer:string;staffEarly:string;
};
// One data entry per revised character keeps all conversation surfaces in the same voice.
const conversations:Record<string,EverydayConversation>={
  ren:{stages:renGreetingsByStage,romance:renRomanceGreetings,daily:renRomanceDailyGreetings,friendship:renFriendshipGreetings,giftDetails:renGiftDetails,giftThanks:renGiftThanks,tone:renConversationTone,supply:renSupplyReplies,staff:renStaffReplies,staffOffer:renStaffOffer,staffEarly:renStaffEarlyReply},
  sota:{stages:makiGreetingsByStage,romance:makiRomanceGreetings,daily:makiRomanceDailyGreetings,friendship:makiFriendshipGreetings,giftDetails:makiGiftDetails,giftThanks:makiGiftThanks,tone:makiConversationTone,supply:makiSupplyReplies,staff:makiStaffReplies,staffOffer:makiStaffOffer,staffEarly:makiStaffEarlyReply},
  aki:{stages:aoiGreetingsByStage,romance:aoiRomanceGreetings,daily:aoiRomanceDailyGreetings,friendship:aoiFriendshipGreetings,giftDetails:aoiGiftDetails,giftThanks:aoiGiftThanks,tone:aoiConversationTone,supply:aoiSupplyReplies,staff:aoiStaffReplies,staffOffer:aoiStaffOffer,staffEarly:aoiStaffEarlyReply},
  itsuki:{stages:earlGreetingsByStage,romance:earlRomanceGreetings,daily:earlRomanceDailyGreetings,friendship:earlFriendshipGreetings,giftDetails:earlGiftDetails,giftThanks:earlGiftThanks,tone:earlConversationTone,supply:earlSupplyReplies,staff:earlStaffReplies,staffOffer:earlStaffOffer,staffEarly:earlStaffEarlyReply},
  haru:{stages:taiyoGreetingsByStage,romance:taiyoRomanceGreetings,daily:taiyoRomanceDailyGreetings,friendship:taiyoFriendshipGreetings,giftDetails:taiyoGiftDetails,giftThanks:taiyoGiftThanks,tone:taiyoConversationTone,supply:taiyoSupplyReplies,staff:taiyoStaffReplies,staffOffer:taiyoStaffOffer,staffEarly:taiyoStaffEarlyReply},
  nagisa:{stages:shizukaGreetingsByStage,romance:shizukaRomanceGreetings,daily:shizukaRomanceDailyGreetings,friendship:shizukaFriendshipGreetings,giftDetails:shizukaGiftDetails,giftThanks:shizukaGiftThanks,tone:shizukaConversationTone,supply:shizukaSupplyReplies,staff:shizukaStaffReplies,staffOffer:shizukaStaffOffer,staffEarly:shizukaStaffEarlyReply},
  sae:{stages:saeGreetingsByStage,romance:saeRomanceGreetings,daily:saeRomanceDailyGreetings,friendship:saeFriendshipGreetings,giftDetails:saeGiftDetails,giftThanks:saeGiftThanks,tone:saeConversationTone,supply:saeSupplyReplies,staff:saeStaffReplies,staffOffer:saeStaffOffer,staffEarly:saeStaffEarlyReply},
  cacao:{stages:cacaoGreetingsByStage,romance:cacaoRomanceGreetings,daily:cacaoRomanceDailyGreetings,friendship:cacaoFriendshipGreetings,giftDetails:cacaoGiftDetails,giftThanks:cacaoGiftThanks,tone:cacaoConversationTone,supply:cacaoSupplyReplies,staff:cacaoStaffReplies,staffOffer:cacaoStaffOffer,staffEarly:cacaoStaffEarlyReply},
};

function variation(lines:string[],count:number) {
  return lines[Math.max(0,Math.floor(count))%lines.length];
}

export function characterGreeting(character:Character,progress:CharacterProgress) {
  const everyday=conversations[character.id];
  if(!everyday)return progress.route==="romance"?character.greetings.romance:progress.route==="friendship"?character.greetings.friendship:progress.visits<=1?character.greetings.first:progress.relationshipStage>=4?character.greetings.close:character.greetings.familiar;
  const visit=Math.max(0,progress.visits-1);
  if(progress.route==="friendship")return variation(everyday.friendship,visit);
  if(progress.route==="romance")return variation(progress.relationshipStage>=10?everyday.daily:everyday.romance,visit);
  const stage=Math.min(10,Math.max(0,progress.relationshipStage));
  if(progress.visits<=1&&stage<=1)return everyday.stages[0][0];
  return variation(everyday.stages[stage],visit);
}

export function characterGiftResponse(character:Character,progress:CharacterProgress,gift:Gift,reaction:GiftReaction) {
  const everyday=conversations[character.id];
  if(!everyday)return character.giftResponses[reaction];
  const thanks=variation(everyday.giftThanks[everyday.tone(progress)][reaction],progress.giftsGiven);
  const detail=everyday.giftDetails[gift.id];
  return detail?`${detail} ${thanks}`:thanks;
}

export function characterSupplyResponse(character:Character,progress:CharacterProgress) {
  const everyday=conversations[character.id];
  return everyday?everyday.supply[everyday.tone(progress)]:characterGreeting(character,progress);
}

export function characterStaffReply(characterId:string,progress:CharacterProgress,role?:StaffRole,busy=false,activeRole?:StaffRole) {
  const everyday=conversations[characterId];
  if(!everyday||!progress.met)return undefined;
  if(!role)return progress.relationshipStage>=staffHireStage(characterId)?everyday.staffOffer:everyday.staffEarly;
  const reply=everyday.staff[role];
  return busy?(activeRole===role?reply.working:undefined)||reply.busy:reply.assign;
}
