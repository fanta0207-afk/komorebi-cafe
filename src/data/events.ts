import type { RelationshipEvent } from "../types/game";

const eventLines: Record<string,[string,string]> = {
  ren:["君の店、少し気になってたんだ。今度この豆を試してみて。","……感想を、聞かせてくれると嬉しい。"],
  haru:["いつも来てくれるから、新作を一番に味見してほしくて。","君の『おいしい』って顔、けっこう励みになるんだ。"],
  sota:["店の子牛がね、君が来る日は不思議と機嫌がいいんだ。","僕も……まあ、同じかもしれない。"],
  aki:["最近、畑を見ながら君の店なら何を作るかなって考える。","商売仲間ってだけじゃなくなってきたな。"],
  itsuki:["君の喫茶店には、飾らない良さがある。","それはたぶん、店主の人柄なんだろうね。"],
  nagisa:["この花、君の店の窓辺に似合いそうだと思って。","次に咲いた時も、こうして話せたらいいな。"],
};

const eventRewards:Record<string,{ingredientId:string;ingredientName:string;recipeId:string;recipeName:string}> = {
  ren:{ingredientId:"moonRoast",ingredientName:"月舟の宵豆",recipeId:"moonLatte",recipeName:"月明かりのカフェオレ"},
  haru:{ingredientId:"goldenHoney",ingredientName:"朝焼けはちみつ",recipeId:"honeyFrenchToast",recipeName:"朝焼けフレンチトースト"},
  sota:{ingredientId:"cloverCream",ingredientName:"四つ葉クリーム",recipeId:"cloverPudding",recipeName:"四つ葉ミルクプリン"},
  aki:{ingredientId:"sunTomato",ingredientName:"陽だまりトマト",recipeId:"sunriseSandwich",recipeName:"陽だまり畑サンド"},
  itsuki:{ingredientId:"vanillaSugar",ingredientName:"秘密のバニラ糖",recipeId:"vanillaCustard",recipeName:"秘密のバニラカスタード"},
  nagisa:{ingredientId:"mimosaHerb",ingredientName:"ミモザの若葉",recipeId:"mimosaTea",recipeName:"春待ちミモザティー"},
};

export const relationshipEvents: RelationshipEvent[] = Object.entries(eventLines).flatMap(([characterId, lines]) => {
  const reward=eventRewards[characterId];
  return [
    { id:`${characterId}-stage2`, characterId, fromStage:1, toStage:2, requiredAffection:20, title:"顔なじみのしるし", dialogue:["最近、よく顔を合わせるようになったね。", lines[0]], reward:{ingredientIds:[reward.ingredientId],note:`限定素材「${reward.ingredientName}」が仕入れられるようになりました`} },
    { id:`${characterId}-stage3`, characterId, fromStage:2, toStage:3, requiredAffection:45, title:"いつもより近い距離", dialogue:[lines[0], lines[1]], reward:{recipeIds:[reward.recipeId],note:`思い出の限定料理「${reward.recipeName}」を教わりました`} },
  ];
});
