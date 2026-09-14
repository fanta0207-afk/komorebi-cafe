import { cacaoDefaultGreetings, cacaoDefaultGiftResponses } from "./cacaoConversations";
import { saeDefaultGreetings, saeDefaultGiftResponses } from "./saeConversations";
import { shizukaDefaultGreetings, shizukaDefaultGiftResponses } from "./shizukaConversations";
import type { Character } from "../types/game";
import { renDefaultGreetings, renDefaultGiftResponses } from "./renConversations";

import { makiDefaultGreetings, makiDefaultGiftResponses } from "./makiConversations";

import { aoiDefaultGreetings, aoiDefaultGiftResponses } from "./aoiConversations";

import { earlDefaultGreetings, earlDefaultGiftResponses } from "./earlConversations";

import { taiyoDefaultGreetings, taiyoDefaultGiftResponses } from "./taiyoConversations";

// Internal IDs are retained so existing saves, suppliers and growth rewards remain compatible.
export const characters: Character[] = [
  {
    "id": "ren",
    "name": "黒豆 蓮",
    "shortName": "蓮",
    "nameReading": "くろまめ れん",
    "gender": "male",
    "occupation": "コーヒー豆店 店主",
    "supplierId": "coffee",
    "profile": "亡き父の小さな焙煎店を継いだ職人。接客は不器用だが、買い手の器具や営業形態まで覚えて豆を選ぶ。愛情表現は、荷物を持つ、焙煎日をメモする、閉店まで待つなどの行動が先に出る。豆の説明になると少しだけ口数が増える。",
    "image": "/assets/characters/ren.png",
    "silhouette": "蓮",
    "favoriteGiftTags": [
      "coffee",
      "craft",
      "book"
    ],
    "dislikedGiftTags": [
      "flashy"
    ],
    "routeTheme": "言わなくても、から、言葉にして",
    "voice": "「俺」と話す。言葉は短く、考える時には少し間がある。豆の話になると、いつもより口数が増える。",
    "backstory": "幼い頃から父の店の手伝いをしてきた。若い頃に自作ブレンドを提案した際、父の「まだ早い」という言葉を否定と受け取り、それ以来自分の味を出さなくなった。父とは和解しないまま死別。店を守るため、今も父の定番ブレンドを忠実に作り続けている。",
    "concern": "父の定番を守りながら、自分の味を出してもよいのか迷っている。否定されるのが怖くて、伝えたい言葉を飲み込むことがある。",
    "attraction": "知らないことを取り繕わず、何度も試して感想を返してくれる。沈黙を急かさず、欲しい言葉も伝えてくれる。自分の味と努力を見てくれるあなたに、もっと自分を知ってほしくなった。",
    "greetings": renDefaultGreetings,
    "giftResponses": renDefaultGiftResponses
  },
  {
    "id": "sota",
    "name": "白川 牧",
    "shortName": "牧",
    "nameReading": "しらかわ まき",
    "gender": "male",
    "occupation": "牧場スタッフ",
    "supplierId": "ranch",
    "profile": "家族経営の牧場で働き、乳製品の販売を担当する。動物の小さな変化に気づき、人の話も最後まで聞く。天然さは、牛の誕生日は全頭覚えているのに自分の誕生日を忘れるような生活の偏り。飼育の判断には責任感がある。",
    "image": "/assets/characters/shirakawa-maki.png",
    "silhouette": "牧",
    "favoriteGiftTags": [
      "animal",
      "nature",
      "warm"
    ],
    "dislikedGiftTags": [
      "flashy"
    ],
    "routeTheme": "安心させる人が、安心して甘えられるまで",
    "voice": "「僕」と話す。「〜だね」「〜かな」と穏やかで、こちらの返事をゆっくり待つ。困ると袖口を握り、本当にうれしいと少し早口になる。気を許すにつれ、自分の希望も言葉にする。",
    "backstory": "幼い頃、家族が忙しい日は祖母や牧場の動物と過ごした。自分が泣くより誰かを慰めると喜ばれたため、「手のかからない子」でいる癖がついた。数年前、父がけがで休んだ際に仕事を多く引き受け、父が復帰した今も担当を戻せていない。",
    "concern": "頼まれると断れず、自分の休みを後回しにしてきた。引退した牛がゆっくり暮らせる区画を作りたいと思いながら、人手や費用の相談をためらっている。",
    "attraction": "「牧はどうしたい？」と聞き、何もしない時間にも隣にいてくれる。誰かの役に立っていなくても一緒にいられることが、彼にとって大きな安心になった。",
    "greetings": makiDefaultGreetings,
    "giftResponses": makiDefaultGiftResponses
  },
  {
    "id": "aki",
    "name": "三ツ葉 葵",
    "shortName": "葵",
    "nameReading": "みつば あおい",
    "gender": "male",
    "occupation": "農園・栽培と直売担当",
    "supplierId": "farm",
    "profile": "祖父母の農園で栽培と直売を担当する。新しい品種や売り方を試すのが好き。勝負を持ちかけたり、大きな野菜を宝物のように差し出したりして、人を笑わせる。距離は近いが、嫌がられたことは繰り返さない。",
    "image": "/assets/characters/aki.png",
    "silhouette": "葵",
    "favoriteGiftTags": [
      "nature",
      "food",
      "practical"
    ],
    "dislikedGiftTags": [
      "synthetic"
    ],
    "routeTheme": "いつもの冗談が、本気になる日",
    "voice": "「俺」と話す。「〜じゃん」「〜しよ」と軽快。照れると鼻の下を指でこする。栽培の話は具体的で、真剣な願いを伝える時は冗談を止め、相手の返事を待つ。",
    "backstory": "町育ちで、昔から近所では「元気な葵くん」。農業系の学校で品種改良に興味を持ったが、卒業時に祖父が腰を痛め、いったん農園に戻った。祖父は回復しているものの、町の人に「やっぱり葵はここが似合う」と言われ、都市近郊の研究農場で学びたい希望を言い出しにくくなっている。",
    "concern": "都市近郊の研究農場で品種改良を学んでみたい。でも、家族や町を置いていくようで言い出せず、本当の願いまで冗談にしてしまう。",
    "attraction": "一緒にふざけて笑いながら、栽培や将来の話は真剣に聞いてくれる。年下扱いせず生産者として頼り、挑戦する夢も大切にしてくれるあなたを、特別に思うようになった。",
    "greetings": aoiDefaultGreetings,
    "giftResponses": aoiDefaultGiftResponses
  },
  {
    "id": "itsuki",
    "name": "アール・グレイ",
    "shortName": "アール",
    "nameReading": "アール・グレイ",
    "gender": "male",
    "occupation": "洋菓子店 パティシエ",
    "supplierId": "patisserie",
    "profile": "英国帰りで、日本と英国にルーツを持つハーフのパティシエ。町の洋菓子店を営む、爽やかな王子様のような青年。上品で物腰が柔らかく、扉を押さえ、椅子を引くレディファーストが自然に身についている。実は少し策士で、好きな相手と会う口実や隣の席をさりげなく用意する。計画を見抜かれると照れた素顔が出る。",
    "image": "/assets/characters/earl-grey.png",
    "silhouette": "ア",
    "favoriteGiftTags": [
      "sweet",
      "art",
      "elegant"
    ],
    "dislikedGiftTags": [
      "rough"
    ],
    "routeTheme": "優しいエスコートから、隣を選ぶ恋へ",
    "voice": "「僕」と話す。柔らかな敬語と爽やかな笑顔で迎える。軽口は上品で、親しくなると少し策士な本音を楽しそうに明かす。動揺するとティースプーンを持ち直し、本当にうれしいと整えきれない笑顔になる。",
    "backstory": "日本と英国の文化に触れて育ち、英国で菓子作りとティータイムのもてなしを学んだ。帰国後、町で洋菓子店を開く。相手が心地よく過ごせるよう先回りすることが得意で、いつも余裕のある迎え役でいようとしてきた。繊細な菓子だけでなく、市場の素朴な揚げ菓子や紙袋を持って歩く午後も好き。",
    "concern": "誰にでも丁寧なため、特別な好意まで接客の一部に見えてしまう。会いたい気持ちを試食や相談の口実へ隠し、上手に迎えられない日には自分の希望を伝えるのをためらう。相手の希望を聞き、自分の本音も飾らず話すことを覚えていく。",
    "attraction": "爽やかな気遣いにときめきながらも、職人としての手や仕事の工夫を見てくれる。店の客に合う味は遠慮なく提案し、彼の素朴な好みも残して一緒に楽しむ。用意した口実を見抜いて笑い、うまく迎えられない日も会いたいと言ってくれるあなたに、自分から選ばれたいと思うようになった。",
    "greetings": earlDefaultGreetings,
    "giftResponses": earlDefaultGiftResponses
  },
  {
    "id": "haru",
    "name": "麦野 太陽",
    "shortName": "太陽",
    "nameReading": "むぎの たいよう",
    "gender": "male",
    "occupation": "パン職人・配達担当",
    "supplierId": "bakery",
    "profile": "パン屋で製造と配達を担う。人懐っこく、困りごとを放っておけない兄貴肌。見えないところで練習を重ねる努力家で、接客中に失敗談を笑って話しても、本当に悩んでいることは言わない。主人公の店に朝いちばんで顔を出すことが多い。",
    "image": "/assets/characters/mugino-taiyo.png",
    "silhouette": "太",
    "favoriteGiftTags": [
      "sweet",
      "handmade",
      "warm"
    ],
    "dislikedGiftTags": [
      "perfume"
    ],
    "routeTheme": "毎日の「またね」が、未来の約束になる",
    "voice": "「俺」と話す。仕事では「店長」、親しくなると休憩では「お前」と呼ぶ。「任せとけ」と明るく歯切れがよいが、自分から頼む時は少し言葉が遅くなる。照れると首の後ろへ手をやる。働く時は袖をまくり、休む時は袖を下ろす。",
    "backstory": "家業を手伝いながら、年の離れた弟妹の世話をして育った。「太陽がいると助かる」と言われることが誇り。製パンは最初から得意だったわけではなく、早朝の練習を何年も続けて今の腕になった。家族が独立しても、自分は誰かの用事で一日を埋める癖が残っている。",
    "concern": "頼られなくなると、居場所もなくなりそうで怖い。自分の新しいパンを作りたいのに、他の人の頼みを先に引き受けてしまう。",
    "attraction": "完成したパンだけでなく、何年も重ねた試作や工夫に気づいてくれた。パンを持たない日も会いたいと言ってくれるあなたの前なら、役に立とうと急がず座っていられる。",
    "greetings": taiyoDefaultGreetings,
    "giftResponses": taiyoDefaultGiftResponses
  },
  {
    "id": "nagisa",
    "name": "灰島 静",
    "shortName": "静",
    "nameReading": "はいじま しずか",
    "gender": "male",
    "occupation": "花・ハーブ店 店主",
    "supplierId": "herb",
    "profile": "古い温室のある花・ハーブ店を営む。香りや光に敏感で、「雨の前は葉が少し急いでいる」など独特の表現をする。静かな観察力と、ふいに出る率直な一言が魅力。神秘的に見える場面も、植物や暮らしへの細やかな注意で説明でき、超常現象の有無は確定させない。",
    "image": "/assets/characters/shizuka.png",
    "silhouette": "静",
    "favoriteGiftTags": [
      "flower",
      "nature",
      "tea"
    ],
    "dislikedGiftTags": [
      "synthetic"
    ],
    "routeTheme": "思い出の香りに、今日の約束を重ねる",
    "voice": "「僕」と話す。初めは「あなた」、親しくなると「君」。低く穏やかな常体で、香りや光の短い比喩には具体的な説明を添える。話す前に葉へ触れる癖があり、親密になると植物から相手へ視線を移す。照れると一拍遅れ、耳が赤くなる。大切な気持ちは、植物の話に隠さず率直に伝える。",
    "backstory": "幼い頃から祖母の花店に通い、植物の世話と押し花作りを教わった。町を出て植物の仕事をしていたが、祖母の死後に店を引き継いだ。祖母の温室と手帳には大切な記憶が残る一方、生前に「また今度」と先延ばしにした約束を悔やんでいる。",
    "concern": "祖母の温室を変えたら、大切な記憶まで失いそうで怖い。「また今度」を果たせなかった後悔が、新しい約束をためらわせている。",
    "attraction": "独特な言葉を茶化さず、分からなければ聞いてくれる。新芽も枯れた葉も報告し、変化があっても会いに来てくれるあなたと、次の季節を待ちたいと思った。",
    "greetings": shizukaDefaultGreetings,
    "giftResponses": shizukaDefaultGiftResponses
  },
  {
    "id": "sae",
    "name": "凍堂 冴",
    "shortName": "冴",
    "nameReading": "とうどう さえ",
    "gender": "male",
    "occupation": "冷凍倉庫 管理者",
    "supplierId": "freezer",
    "profile": "アイスや冷凍果実を保管する冷凍倉庫の管理者。常に厚着で、マフラーとフードに隠れて表情が見えにくい。人と関わるのを避け、必要なことしか話さないが、温度管理と品質への妥協はない。主人公の温かさに触れ、凍った距離が少しずつ溶けていく。",
    "image": "/assets/characters/toudou-sae.png",
    "silhouette": "冴",
    "favoriteGiftTags": [
      "practical",
      "craft",
      "warm"
    ],
    "dislikedGiftTags": [
      "flashy",
      "perfume"
    ],
    "routeTheme": "閉ざした心が、あなたの温度で溶けるまで",
    "voice": "「俺」と話し、相手は「お前」。短く淡々とした常体で、仕事の確認は具体的。優しさは保管のメモ、寒くない場所への案内、二人分の器など行動に出る。気持ちが揺れると返事が一拍遅れ、マフラーへ手を伸ばす。親しくなると隠さず目を合わせ、赤くなった耳や小さな笑顔が見える。「会いたい」「うれしい」は短くても自分から言う。",
    "backstory": "幼い頃から人の感情に敏感で、周囲の言い争いに巻き込まれるたびに、誰とも深く関わらない方が楽だと学んだ。静かな環境と数値で管理できる仕事を好み、冷凍倉庫の管理者になった。人を避ける一方、品物を最良の状態で届けることには誰より誠実。",
    "concern": "親しくなれば期待され、いずれ失望させると思っている。一人なら傷つかないと言い聞かせるが、本当は誰かと同じ食卓を囲む温かさに憧れている。",
    "attraction": "沈黙を無理に埋めず、寒さや距離を尊重しながら何度も会いに来てくれた。冷たい手に温かい飲み物を渡し、その後は急かさないあなたの隣でなら、自分のペースで心を開けると思った。",
    "greetings": saeDefaultGreetings,
    "giftResponses": saeDefaultGiftResponses
  },
  {
    "id": "cacao",
    "name": "カカオ・ショコラ",
    "shortName": "カカオ",
    "nameReading": "カカオ・ショコラ",
    "gender": "male",
    "occupation": "ショコラトリー店主・ショコラティエ",
    "supplierId": "chocolaterie",
    "profile": "若くして数々の賞を取った天才ショコラティエ。自信家で挑発的だが、味覚と仕事への妥協は一切ない。主人公を試すような言葉を投げながら、真剣な感想には誰より早く応える。好意が深まるほど独占欲を隠せなくなるが、相手の意思を無視することはしない。",
    "image": "/assets/characters/cacao.png",
    "storyImage": "/assets/characters/cacao-story.png",
    "silhouette": "カ",
    "favoriteGiftTags": ["sweet", "craft", "elegant"],
    "dislikedGiftTags": ["rough"],
    "routeTheme": "試す舌から、ただ一人に捧げる一粒へ",
    "voice": "「僕」「君」で話す。俺様系。自分の腕と判断に強い自信があり、「こっちへ」「僕の隣」「君が決めて」と言い切って主導する。短い挑発や「合格」で相手の反応を楽しむ。率直な反論には面白そうに笑い、感想は最後までメモする。仕事では袖を整えて繊細に手を動かす。褒められたり近づかれたりすると返事が一拍遅れ、耳が赤くなる。親しくなると隣の席を自分から取り、「僕を選んだこと、後悔させない」と好意も強く言い切る。相手の反論を楽しみ、普段は余裕を崩さない。照れと甘えは、大切な相手に不意を突かれた時にだけ漏れる。",
    "backstory": "名門ショコラトリーの家に生まれ、幼い頃から味覚と技術を競わされてきた。結果を出すたび周囲は才能だけを褒め、失敗や迷いを見せる相手はいなくなった。独立後は完璧な一粒を武器に店を守る一方、誰かと作ることを『妥協』だと切り捨てている。",
    "concern": "天才であり続けなければ誰にも選ばれないと思い込み、他人に味を預けられない。対等に認めた相手ほど失うのが怖く、試す言葉や独占欲でつなぎ止めようとしてしまう。",
    "attraction": "挑発にひるまず、分からない味は分からないと言い、良いものには自分の言葉で感想を返す。肩書きではなく一粒ごとの仕事を見て、嫌なことにはきちんと線を引くあなたを、唯一対等な相手として手放したくなくなった。",
    "greetings": cacaoDefaultGreetings,
    "giftResponses": cacaoDefaultGiftResponses
  }
];

export const getCharacter = (id:string) => characters.find(item => item.id === id);
