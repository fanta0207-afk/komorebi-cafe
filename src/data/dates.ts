import type { DateEvent, DateLocationId } from "../types/game";

export const dateLocations:{id:DateLocationId;title:string;icon:string;description:string}[]=[
  {id:"amusement",title:"遊園地",icon:"🎡",description:"夕焼けの観覧車とカルーセルへ"},
  {id:"walk",title:"散歩",icon:"🌆",description:"閉店後の街をゆっくり歩く"},
  {id:"home",title:"お家デート",icon:"🏠",description:"お茶と会話を楽しむ穏やかな時間"},
];

const dialogue:Record<string,Record<DateLocationId,string[]>>={
  ren:{
    amusement:["……観覧車、思ったより高いな。お前は平気か。","景色もいいが、今はお前の顔を見ていたい。……こっち向け。"],
    walk:["歩幅、これくらいでいいか。急ぐ理由もないしな。","店の話をしていない時間も、お前となら悪くない。"],
    home:["今日は仕事の試飲じゃない。お前が飲みたい味を淹れる。","同じ部屋で、それぞれ好きなことをするのも……落ち着くな。"],
  },
  sota:{
    amusement:["メリーゴーランドの馬、一頭ずつ表情が違うね。","今日は誰かのためじゃなくて、僕たちが楽しむ日にしよう。"],
    walk:["川の音、牛舎とはまた違って聞こえるね。","君と歩くと、休んでいる時間も大切だって思えるよ。"],
    home:["お茶、おかわりあるよ。毛布も使ってね。","何もしなくても君と一緒にいられるの、すごくうれしいな。"],
  },
  aki:{
    amusement:["店長、あの空中ブランコ勝負しよ！……やっぱ隣同士で乗ろっか。","こんなに楽しいと、帰りたくなくなるじゃん。もう一個だけ乗ろ！"],
    walk:["散歩ってゆっくりするもんだろ？……分かってるって、走らないから！","店長とだと、いつもの道でも新しいもの見つかるな。"],
    home:["野菜の映画にしようと思ったけど、そんなジャンルなかった！","今日は隣にいるだけでいいや。……ちょっと近い？　このままでいい？"],
  },
  itsuki:{
    amusement:["エスコートはお任せください。……ただし観覧車の頂上では、私も少し緊張するかもしれません。","完璧な予定より、あなたと迷う時間のほうが楽しいとは。"],
    walk:["今夜は行き先を決めずに歩きましょう。あなたの歩幅に合わせます。","沈黙を埋めなくてもいい相手は、とても貴重ですね。"],
    home:["お茶は私が淹れます。菓子は……仕事になるので、今日は市販のものを。","飾らない私を見せても、あなたは笑わないのですね。……安心しました。"],
  },
  haru:{
    amusement:["遊園地のパンも研究したいけど、今日は仕事抜きだ！","お前が笑ってると、乗り物よりそっちを見ちゃうな。"],
    walk:["朝の配達路も、夕方に歩くとぜんぜん違うだろ。","次は弁当を作って来るよ。ゆっくり座って食べよう。"],
    home:["焼きたては持ってきた。あとは好きな音楽でもかけようぜ。","お前の家での顔、店にいる時よりやわらかいな。また来てもいいか？"],
  },
  nagisa:{
    amusement:["光がたくさんあるのに、不思議とうるさく感じないね。","あの観覧車に乗ろう。高い場所で、君とゆっくり話したい。"],
    walk:["夜の葉が揺れる音、聞こえる？　君と並んで聞きたかった。","道に迷ってもいいよ。もう少し、一緒に歩けるから。"],
    home:["雨の音を聞きながら読む本、二冊持ってきた。好きなほうを選んで。","同じページで笑えるの、いいね。この時間を覚えていたい。"],
  },
  sae:{
    amusement:["混雑する前に回る順番を決めた。……不満か？　なら予定は捨てる。","次はお前が選べ。お前が楽しそうなほうに、俺も行く。"],
    walk:["夜道は俺が車道側を歩く。……職業病だ、気にするな。","お前となら、目的のない時間も無駄には感じない。"],
    home:["室温は調整した。飲み物もある。……他に必要なものは？","そうか、隣にいればいいのか。なら、ここにいる。"],
  },
};

export const dateEvents:DateEvent[]=Object.entries(dialogue).flatMap(([characterId,locations])=>dateLocations.map(location=>({
  id:`${characterId}-date-${location.id}`,characterId,locationId:location.id,title:location.title,icon:location.icon,dialogue:locations[location.id],
})));

export const getDateEvent=(id:string)=>dateEvents.find(event=>event.id===id);
export const getCharacterDates=(characterId:string)=>dateEvents.filter(event=>event.characterId===characterId);
