import { cacaoDateDialogue } from "./cacaoEpisodes";
import { saeDateDialogue } from "./saeEpisodes";
import { shizukaDateDialogue } from "./shizukaEpisodes";
import type { CharacterExpression, DateEvent, DateLocationId, SimpleDialogueLine } from "../types/game";

import { taiyoDateDialogue } from "./taiyoEpisodes";
import { earlDateDialogue } from "./earlEpisodes";
import { aoiDateDialogue } from "./aoiEpisodes";
import { makiDateDialogue } from "./makiEpisodes";

export const dateLocations:{id:DateLocationId;title:string;icon:string;description:string}[]=[
  {id:"amusement",title:"遊園地",icon:"🎡",description:"夕焼けの観覧車とカルーセルへ"},
  {id:"walk",title:"散歩",icon:"🌆",description:"閉店後の街をゆっくり歩く"},
  {id:"home",title:"お家デート",icon:"🏠",description:"お茶と会話を楽しむ穏やかな時間"},
];

const d=(text:string,expression:CharacterExpression):SimpleDialogueLine=>({text,expression});

const dialogue:Record<string,Record<DateLocationId,SimpleDialogueLine[]>>={
  ren:{
    amusement:[
      d("……地図、見せてくれ。全部回るつもりで、書いてきたのか。","surprised"),
      d("俺は、観覧車に乗れたらいい。歩きながら話す時より、ゆっくり顔を見られるだろ。","blush"),
      d("いや、他も付き合う。お前が楽しみにしてたなら。……最初は、どれだ。","smile"),
      d("その菓子、半分でいいのか。なら、こっちの大きい方を取れ。","serious"),
      d("……笑うな。量ったわけじゃない。そっちの方が、好きそうだった。","blush"),
      d("観覧車、思ったより揺れるな。怖かったら言え。","surprised"),
      d("俺も、平気なふりはやめる。……少し、落ち着かない。お前が近いのもある。","blush"),
      d("手、つないでいいか。降りるまで……そのあとも、嫌じゃなければ。","blush"),
      d("夕焼け、向こうに見える。……ああ、見てる。お前がどんな顔で見てるかも。","smile"),
      d("次に来るなら、今日乗れなかったやつにしよう。また、一緒に来たい。","smile"),
    ],
    walk:[
      d("片づけ、終わったか。今日は道具、持ってない。お前を誘いに来た。","smile"),
      "いつもの仕入れ道でもいいか。急がず歩くと、違うものが見える。",
      "……歩幅、これくらいでいいか。俺、一人だと早くなるから。",
      "あの窓、灯りがついてるな。焙煎の帰り、こもれびの灯りもよく見てた。",
      "最初は、まだ仕事してるのかって。それから、少し寄ってもいいかって。",
      d("用事を考えてから入るの、もうやめる。会いたい時は、そう言う。","serious"),
      d("……今も。少し、遠回りしたい。お前はどうだ。","blush"),
      "なら、川沿いへ。手、つないでもいいか。",
      "店へ戻ったら、休憩の一杯を淹れよう。今日は、俺が。",
      d("明日も仕事はあるけど、帰る前にこういう時間、また作ろう。","smile"),
    ],
    home:[
      d("……ここに上着、置いていいか。店じゃないと、勝手が分からないな。","surprised"),
      "豆は持ってきた。けど、感想のメモはいらない。今日は、ゆっくり飲もう。",
      "カップ、これをよく使ってるのか。……取っ手の形、手に合ってる。",
      "俺が淹れていいか。お前が飲みたい温かさで。",
      "砂糖、入れたければ入れろ。好みは、お前が決めることだ。",
      d("……店にいる時より、肩の力が抜けてるな。見られて、うれしい。","smile"),
      "本、持ってきた。前に話したやつ。貸すつもりだったのに、続きを俺が読んでた。",
      d("今、一緒に読むか。隣なら、同じページが見える。……近すぎたら言え。","blush"),
      "ここ、落ち着く。お前が黙ってても、帰れって意味じゃないのが分かるから。",
      d("次は俺の方へ来るか。あの椅子、今度は上着をどけて待ってる。","smile"),
    ],
  },
  sota:makiDateDialogue,
  aki:aoiDateDialogue,
  itsuki:earlDateDialogue,
  haru:taiyoDateDialogue,
  nagisa:shizukaDateDialogue,
  sae:saeDateDialogue,
  cacao:cacaoDateDialogue,
};

export const dateEvents:DateEvent[]=Object.entries(dialogue).flatMap(([characterId,locations])=>dateLocations.map(location=>({
  id:`${characterId}-date-${location.id}`,characterId,locationId:location.id,title:location.title,icon:location.icon,dialogue:locations[location.id],
})));

export const getDateEvent=(id:string)=>dateEvents.find(event=>event.id===id);
export const getCharacterDates=(characterId:string)=>dateEvents.filter(event=>event.characterId===characterId);
