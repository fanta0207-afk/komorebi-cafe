import type { RelationshipEvent } from "../types/game";
import { renRelationshipEvents, renStaffStories } from "./renEpisodes";

export const staffStoryEvents = renStaffStories;
export const getStaffStoryEvent = (id:string) => staffStoryEvents.find(event=>event.id===id);

// Based on docs/キャラクター設定・恋愛ストーリー案.md. One event for each of 10 levels.
export const relationshipEvents: RelationshipEvent[] = [
  ...renRelationshipEvents,
  {
    "id": "sota-stage1",
    "characterId": "sota",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "牛乳より先に自己紹介",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "初仕入れで、牧は牛の名前から紹介する。あなたが一頭ずつ違う性格に興味を示すと、商品説明より生き生きと話す。"
      },
      {
        "speaker": "character",
        "text": "この子はね、知らない人には少し慎重なんだ"
      }
    ]
  },
  {
    "id": "sota-stage2",
    "characterId": "sota",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "子牛の歩幅",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "配達前に子牛が通路で立ち止まる。牧の指示で距離を保って待つあなたを見て、彼は自分と動物のペースを尊重してもらえたと感じる。"
      },
      {
        "speaker": "character",
        "text": "待ってくれて、ありがとう。僕までほっとした"
      }
    ],
    "reward": {
      "recipeIds": [
        "hotMilk"
      ],
      "note": "ホットミルクのレシピを解放しました"
    }
  },
  {
    "id": "sota-stage3",
    "characterId": "sota",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "草の上の昼休み",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "味見を兼ねて牧場で昼食。話さない時間も心地よく、牧がうとうとする。"
      },
      {
        "speaker": "narrator",
        "text": "あなたが休憩の終わりに声をかけると、「また来て」と自然に頼む。"
      },
      {
        "speaker": "character",
        "text": "隣に人がいるのに、こんなに眠くなるんだね"
      }
    ],
    "reward": {
      "ingredientIds": [
        "richMilk"
      ],
      "note": "濃厚ミルクを解放しました"
    }
  },
  {
    "id": "sota-stage4",
    "characterId": "sota",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "いい人の予定表",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "牧が配達も見学案内も引き受けていると知る。あなたは「今日は何をしたかった？」と尋ねる。"
      },
      {
        "speaker": "narrator",
        "text": "彼は初めて、帰って昼寝したかったとこぼす。"
      },
      {
        "speaker": "character",
        "text": "僕の予定？　……ちゃんと、考えてなかったな"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "牧自身は、今日は何をしたかった？",
        "response": [
          {
            "speaker": "character",
            "text": "お昼寝。……言ってみたら、すごくしたくなった。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "一緒に休む時間を作ろう",
        "response": [
          {
            "speaker": "character",
            "text": "うん。僕から、家族に相談してみるね。"
          }
        ]
      }
    ]
  },
  {
    "id": "sota-stage5",
    "characterId": "sota",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "休む練習とプリン",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "家族に半日の休みを頼んだ牧が、カフェでプリンを試作する。失敗して笑い、自分が楽しむために時間を使えたと気づく。"
      },
      {
        "speaker": "narrator",
        "text": "帰り際、子ども時代の癖を話す。"
      },
      {
        "speaker": "character",
        "text": "今日は、誰かのためじゃなくて楽しかった"
      }
    ],
    "reward": {
      "ingredientIds": [
        "cloverCream"
      ],
      "equipmentIds": [
        "chilledCase"
      ],
      "recipeIds": [
        "ranchPudding"
      ],
      "note": "生クリームの仕入れ・牧場プリンを解放しました。設備はメニューの「設備」で購入できます"
    }
  },
  {
    "id": "sota-stage6",
    "characterId": "sota",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "君の隣は眠くなる",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "あなたの仕事が落ち着くまで客席で待ち、牧が居眠りする。起きた彼は手伝えなかったと謝りかけ、あなたの「来てくれてうれしい」に言葉を止める。"
      },
      {
        "speaker": "character",
        "text": "何もしてなくても、ここにいていいんだね"
      }
    ],
    "reward": {
      "recipeIds": [
        "milkGelato"
      ],
      "note": "ミルクジェラートのレシピを解放しました"
    }
  },
  {
    "id": "sota-stage7",
    "characterId": "sota",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "大丈夫じゃない日",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "仕事と牛の引退区画の準備が重なり、牧は約束を忘れてしまう。あなたは寂しかったと伝え、彼も疲れを認める。"
      },
      {
        "speaker": "narrator",
        "text": "牧は翌日、家族との担当見直しを自分から提案する。"
      },
      {
        "speaker": "character",
        "text": "大丈夫って、言うところだった。……今日は、違う"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "寂しかった。次は無理せず話してね",
        "response": [
          {
            "speaker": "character",
            "text": "ごめんね。次は、疲れているってちゃんと話す。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "一人で抱えず、家族にも相談できるかな",
        "response": [
          {
            "speaker": "character",
            "text": "うん。僕が引き受けすぎていた分、見直してみる。"
          }
        ]
      }
    ]
  },
  {
    "id": "sota-stage8",
    "characterId": "sota",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "何もしない約束",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "分担が整い、牧から休日のピクニックに誘われる。あなたにどちらの行き先がいいか尋ねられ、いつもの「どこでも」ではなく、自分の好きな丘を選ぶ。"
      },
      {
        "speaker": "character",
        "text": "今日は僕の好きな場所に、君と行きたい"
      }
    ],
    "reward": {
      "recipeIds": [
        "milkPicnic"
      ],
      "note": "ミルクピクニックセットのレシピを解放しました"
    }
  },
  {
    "id": "sota-stage9",
    "characterId": "sota",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "帰り道を、もう少し",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "丘からの帰り道、牧は立ち止まる。「落ち着くから」だけでは説明できない寂しさを話し、自分からあなたに恋人になってほしいと願う。"
      },
      {
        "speaker": "character",
        "text": "誰とでも、こうなるわけじゃない。君が好きなんだ"
      }
    ],
    "friendshipTitle": "無理のない約束",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "牧と休みや仕入れの希望を話し、互いに無理をしない関係を確認した。"
      },
      {
        "speaker": "character",
        "text": "僕も希望を話すから、君も遠慮しないでね。"
      }
    ]
  },
  {
    "id": "sota-stage10",
    "characterId": "sota",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "おやすみを分け合う",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "家族と小さく始めた引退区画を案内した後、二人で休む日を予定表に書く。疲れている方が相手に甘えられる関係になり、新しいプリンを囲んで昼休みを過ごす。"
      },
      {
        "speaker": "character",
        "text": "今日は僕が淹れるね。次は、君にお願いしたいな"
      }
    ],
    "reward": {
      "recipeIds": [
        "doubleMilkPudding"
      ],
      "note": "二層の濃厚ミルクプリンを解放しました"
    },
    "friendshipTitle": "牧場からの新作",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "家族と整えた引退区画を見せてもらい、新作プリンとミルク瓶の花器をカフェへ迎えた。"
      },
      {
        "speaker": "character",
        "text": "家族と、少しずつ進めていくよ。プリンの感想も、また聞かせて。"
      }
    ]
  },
  {
    "id": "aki-stage1",
    "characterId": "aki",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "今日のおすすめ当て",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "初仕入れを食材当てクイズに変えられ、二人で笑う。ふざけながらも、葵が収穫日や味の違いを細かく説明できることを知る。"
      },
      {
        "speaker": "character",
        "text": "正解！　……って、ちゃんと味で当てたの？　やるじゃん"
      }
    ]
  },
  {
    "id": "aki-stage2",
    "characterId": "aki",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "曲がった野菜の作戦会議",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "規格外の野菜をどう売るか相談される。あなたがスープを提案し、葵は試作に合う野菜を選ぶ。"
      },
      {
        "speaker": "narrator",
        "text": "思いつきを形にできる仕事相手になる。"
      },
      {
        "speaker": "character",
        "text": "見た目で落選なんて、もったいないもんな"
      }
    ],
    "reward": {
      "recipeIds": [
        "farmSoup"
      ],
      "note": "農園スープのレシピを解放しました"
    }
  },
  {
    "id": "aki-stage3",
    "characterId": "aki",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "収穫勝負",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "収穫を手伝い、どちらがよい実を見つけるか競う。あなたが日当たりや水やりの工夫を尋ねると、葵は勝負を忘れて説明する。"
      },
      {
        "speaker": "character",
        "text": "そこ気づく？　俺、今年いちばん頑張ったとこ"
      }
    ],
    "reward": {
      "ingredientIds": [
        "seasonalFruit"
      ],
      "note": "季節のフルーツの仕入れを解放しました"
    }
  },
  {
    "id": "aki-stage4",
    "characterId": "aki",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "友達なら、平気？",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "買い出しを手伝った帰り、「これデートっぽくない？」と茶化す。あなたがどう思うかを聞き返すと、葵はいつもの調子で逃げた後、返答を気にしてしまう。"
      },
      {
        "speaker": "character",
        "text": "友達なら、これくらい普通……だよな？"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "デートだったら、うれしいな",
        "response": [
          {
            "speaker": "character",
            "text": "え。……そういう返事は、ずるいって。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "葵は、どういうつもり？",
        "response": [
          {
            "speaker": "character",
            "text": "俺？　……まだ、うまく言えない。でも気になった。"
          }
        ]
      }
    ]
  },
  {
    "id": "aki-stage5",
    "characterId": "aki",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "土のついたノート",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "落とした栽培ノートを返すと、新品種の研究と研修先の資料を見せてくれる。あなたが感想を真剣に返し、葵は町を離れて学びたい希望を初めて口にする。"
      },
      {
        "speaker": "character",
        "text": "笑わないんだ。……いや、笑われると思ってた"
      }
    ],
    "reward": {
      "recipeIds": [
        "fruitSyrup"
      ],
      "note": "果実シロップ・季節のソーダを解放しました"
    }
  },
  {
    "id": "aki-stage6",
    "characterId": "aki",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "いつもの呼び名が違う",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "近所の人に子ども扱いされた帰り、あなたは新メニューの相談相手として葵を頼る。彼はあなたを名前で呼び、「店長」の一言で隠していた距離を変える。"
      },
      {
        "speaker": "character",
        "text": "俺にも頼ってよ。君の力になりたいんだ。"
      }
    ],
    "reward": {
      "recipeIds": [
        "grilledVegetables"
      ],
      "note": "季節野菜のグリルプレートを解放しました"
    }
  },
  {
    "id": "aki-stage7",
    "characterId": "aki",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "冗談で終わらせない",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "短期研修の募集を「どうせ無理」と笑う葵に、あなたは本当はどうしたいか尋ねる。彼は祖父母へ希望を話し、農園の作業計画を作って応募する。"
      },
      {
        "speaker": "character",
        "text": "行きたい。でも、会えなくなるのは寂しい"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "行っておいで。帰ったら話を聞かせて",
        "response": [
          {
            "speaker": "character",
            "text": "うん。応募する。土産話、いっぱい持って帰るから！"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "寂しくなるけど、挑戦してほしい",
        "response": [
          {
            "speaker": "character",
            "text": "俺も寂しい。だから、ちゃんと連絡する。両方、大事にしたい。"
          }
        ]
      }
    ]
  },
  {
    "id": "aki-stage8",
    "characterId": "aki",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "デートの練習、おしまい",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "研修への出発が決まり、二人で町の直売イベントを巡る。「デートの練習」と言いかけた葵は言い直し、仕事の寄り道を終えてから正式にデートへ誘う。"
      },
      {
        "speaker": "character",
        "text": "練習って言うの、やめる。俺は、そういうつもりで誘った"
      }
    ],
    "reward": {
      "equipmentIds": [
        "seasonalCounter"
      ],
      "recipeIds": [
        "farmParfait"
      ],
      "note": "農園フルーツパフェを解放しました。設備はメニューの「設備」で購入できます"
    }
  },
  {
    "id": "aki-stage9",
    "characterId": "aki",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "笑わない告白",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "出発前、農園の片づけを終えて気持ちを伝える。「友達に戻れなくなるのが怖い」と認めたうえで、相手の返事を冗談で流さず聞く。"
      },
      {
        "speaker": "character",
        "text": "いつも笑っててほしいけど、今だけは真面目に聞いて。好きだ"
      }
    ],
    "friendshipTitle": "離れていても作戦会議",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "研修中にも近況を伝え合い、帰還後に試作をする約束を交わした。"
      },
      {
        "speaker": "character",
        "text": "帰ったら新しいメニュー、相談しような！"
      }
    ]
  },
  {
    "id": "aki-stage10",
    "characterId": "aki",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "次の季節の約束",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "研修中の連絡を重ね、数週間後に帰ってきた葵と再会。学んだ栽培を農園で試し、二人で次の季節のメニューを考える。"
      },
      {
        "speaker": "narrator",
        "text": "友達だった頃の笑い合う時間も続く。"
      },
      {
        "speaker": "character",
        "text": "ただいま。最初に会いたかったの、やっぱり君だった"
      }
    ],
    "reward": {
      "recipeIds": [
        "seasonalParfait",
        "fruitPlatter"
      ],
      "note": "二人の季節パフェ・農園フルーツ盛り合わせを解放しました"
    },
    "friendshipTitle": "次の季節の作戦会議",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "数週間後。研修から帰った葵と、新しい栽培を生かす季節パフェと盛り合わせを考えた。"
      },
      {
        "speaker": "character",
        "text": "ただいま！　学んだこと、一緒に形にしようぜ。"
      }
    ]
  },
  {
    "id": "itsuki-stage1",
    "characterId": "itsuki",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "不合格の盛りつけ",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "取引相談で試食用の盛りつけを見せると、ソースの温度を指摘される。あなたが理由を尋ね、彼は説明と保存の手順を渡す。"
      },
      {
        "speaker": "narrator",
        "text": "まず基本商品から取引を始める。"
      },
      {
        "speaker": "character",
        "text": "お客様が食べる瞬間までが、お菓子作りです"
      }
    ],
    "reward": {
      "ingredientIds": [
        "bakedSweets"
      ],
      "note": "定番焼き菓子の仕入れを解放しました"
    }
  },
  {
    "id": "itsuki-stage2",
    "characterId": "itsuki",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "二度目の試食",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "助言を試し、提供時間も測って持ち込む。彼は味だけでなく記録にも目を通し、同じ目線で改善点を話すようになる。"
      },
      {
        "speaker": "character",
        "text": "……きちんと、試してくださったのですね"
      }
    ],
    "reward": {
      "recipeIds": [
        "bakedPlate"
      ],
      "note": "焼き菓子のデザートプレートを解放しました"
    }
  },
  {
    "id": "itsuki-stage3",
    "characterId": "itsuki",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "初めての合格",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "混む時間でも品質を保つあなたの店を見て、生菓子の卸売を提案する。帰り際、あなたの接客を具体的に褒め、照れを紅茶で隠す。"
      },
      {
        "speaker": "character",
        "text": "あなたのお店なら、この子たちを預けられます"
      }
    ],
    "reward": {
      "ingredientIds": [
        "petitGateau"
      ],
      "equipmentIds": [
        "chilledCase"
      ],
      "recipeIds": [
        "gateauPlate"
      ],
      "note": "高級プチガトーの仕入れを解放しました。設備はメニューの「設備」で購入できます"
    }
  },
  {
    "id": "itsuki-stage4",
    "characterId": "itsuki",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "紙袋の秘密",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "休日の市場で、彼が素朴な揚げ菓子を買っているところに遭遇。あなたとベンチで分け合い、品評を忘れて食べる。"
      },
      {
        "speaker": "narrator",
        "text": "仕事を離れた笑顔を初めて見せる。"
      },
      {
        "speaker": "character",
        "text": "今日のことは……いえ、また一緒に買いに来ましょうか"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "また一緒に、このお菓子を食べたい",
        "response": [
          {
            "speaker": "character",
            "text": "ええ。次はあなたの好きなお店も、教えてください。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "好きなものの話、もっと聞かせて",
        "response": [
          {
            "speaker": "character",
            "text": "品評なしのお茶も、よいものですね。"
          }
        ]
      }
    ]
  },
  {
    "id": "itsuki-stage5",
    "characterId": "itsuki",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "正しさだけでは届かない",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "新メニューの提案を彼が即座に退けるが、あなたは常連の好みを説明する。実際に食べ比べた彼は判断を改め、言い方を謝罪。"
      },
      {
        "speaker": "narrator",
        "text": "二人で軽い口当たりへ調整する。"
      },
      {
        "speaker": "character",
        "text": "私の基準だけで決めました。失礼しました"
      }
    ],
    "reward": {
      "ingredientIds": [
        "teaChiffon"
      ],
      "recipeIds": [
        "chiffonPlate"
      ],
      "note": "紅茶シフォンケーキの仕入れ・提供レシピを解放しました"
    }
  },
  {
    "id": "itsuki-stage6",
    "characterId": "itsuki",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "あなたの席だけ",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "閉店後の試食に招かれると、あなたの好みの茶器と甘さが用意されている。彼は修業時代の話を少しし、あなたが帰った後の静けさを惜しむ。"
      },
      {
        "speaker": "character",
        "text": "試食は済んでいますが……もう一杯、いかがですか"
      }
    ],
    "reward": {
      "recipeIds": [
        "afternoonTea"
      ],
      "note": "アフタヌーンティーセットを解放しました"
    }
  },
  {
    "id": "itsuki-stage7",
    "characterId": "itsuki",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "ひびの入った自信",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "大切な試作が思う仕上がりにならず、彼はあなたとの約束も断ろうとする。あなたは一緒に過ごしたいと伝え、彼は修業時代の恐れを話す。"
      },
      {
        "speaker": "narrator",
        "text": "休憩後、自分で作り直す段取りを決める。"
      },
      {
        "speaker": "character",
        "text": "失敗した私に、会いたい人がいるとは思えなくて"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "うまくいかない日でも、会いたい",
        "response": [
          {
            "speaker": "character",
            "text": "……そう言ってもらえるのですね。少し、座ってもいいですか。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "お茶にしよう。続きは休んでから",
        "response": [
          {
            "speaker": "character",
            "text": "ええ。休んでから、作り直す順番を考えます。"
          }
        ]
      }
    ]
  },
  {
    "id": "itsuki-stage8",
    "characterId": "itsuki",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "あなたに教わる午後",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "あなたの思い出の簡単なおやつを、彼が教わる側になって一緒に作る。形の違いを笑い、どちらの皿を食べるか相談する。"
      },
      {
        "speaker": "narrator",
        "text": "帰り際、仕事以外でも会いたいと伝える。"
      },
      {
        "speaker": "character",
        "text": "次は手順より先に、あなたの思い出を聞かせてください"
      }
    ],
    "reward": {
      "recipeIds": [
        "simpleSweets"
      ],
      "note": "素朴な焼き菓子アソートを解放しました"
    }
  },
  {
    "id": "itsuki-stage9",
    "characterId": "itsuki",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "用意していない言葉",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "告白用の美しい言葉を考えていたのに、あなたを前に忘れる。沈黙の後、上手に話せないまま自分の願いを伝え、返事を待つ。"
      },
      {
        "speaker": "character",
        "text": "あなたが好きです。……これ以上、うまく言えません"
      }
    ],
    "friendshipTitle": "次の一皿も一緒に",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "互いに意見を言える開発仲間として、次のケーキを企画することになった。"
      },
      {
        "speaker": "character",
        "text": "あなたと意見を交わせることに、感謝しています。次も、ぜひ。"
      }
    ]
  },
  {
    "id": "itsuki-stage10",
    "characterId": "itsuki",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "ふたり分の余白",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "恋人になった二人で新作ケーキを考える。品質を整えた商品を完成させた後、試作の端を分け合って笑う。"
      },
      {
        "speaker": "narrator",
        "text": "彼は次の休日を、仕事を入れずあなたのために空ける。"
      },
      {
        "speaker": "character",
        "text": "あなたと食べる時間まで含めて、私のいちばん好きな味です"
      }
    ],
    "reward": {
      "recipeIds": [
        "earlGreyCake"
      ],
      "note": "共同開発のアールグレイケーキを解放しました"
    },
    "friendshipTitle": "店に似合うケーキ",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "アールと新作ケーキとデザート皿の提供セットを完成させ、カフェの新メニューに加えた。"
      },
      {
        "speaker": "character",
        "text": "お客様に届くまでが、私たちの一皿ですね。"
      }
    ]
  },
  {
    "id": "haru-stage1",
    "characterId": "haru",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "おはようの配達",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "開店準備に戸惑うあなたへ、太陽が焼きたてのパンを届ける。運び込みを助け、食べ頃と保存方法を手際よく教える。"
      },
      {
        "speaker": "narrator",
        "text": "朝の頼れる顔になる。"
      },
      {
        "speaker": "character",
        "text": "まず一個食べな。腹ぺこで開店はきついぞ"
      }
    ]
  },
  {
    "id": "haru-stage2",
    "characterId": "haru",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "売れ残りの相談",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "パンの発注量に悩むあなたと販売数を振り返る。二人で小さな改善を試し、翌朝その結果を話すことが楽しみになる。"
      },
      {
        "speaker": "character",
        "text": "外した日も数えとこうぜ。明日の仕入れに使える"
      }
    ],
    "reward": {
      "recipeIds": [
        "toast"
      ],
      "note": "トーストメニューを解放しました"
    }
  },
  {
    "id": "haru-stage3",
    "characterId": "haru",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "閉店後の試作会",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "パンと具材の組み合わせを一緒に試す。あなたが失敗した試作も記録していると、太陽は自分の古いノートを持ってくると約束する。"
      },
      {
        "speaker": "character",
        "text": "そういう一ページが、あとで効くんだよな"
      }
    ],
    "reward": {
      "ingredientIds": [
        "campagne"
      ],
      "recipeIds": [
        "campagneSandwich"
      ],
      "note": "カンパーニュ・サンドイッチを解放しました"
    }
  },
  {
    "id": "haru-stage4",
    "characterId": "haru",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "来ない朝",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "太陽が別便の担当になり、いつもの時間に顔を見ない。仕入れは届いているのに落ち着かず、あなたは後日「会えなくて寂しかった」と伝える。"
      },
      {
        "speaker": "narrator",
        "text": "彼も配達の楽しみを自覚する。"
      },
      {
        "speaker": "character",
        "text": "パンじゃなくて、俺のほう？　……そっか"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "パンは届いていたけど、会いたかった",
        "response": [
          {
            "speaker": "character",
            "text": "俺に会いたかったのか。……俺もだ。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "明日の朝は、少し話せる？",
        "response": [
          {
            "speaker": "character",
            "text": "ああ。配達の後、時間空けておくな。"
          }
        ]
      }
    ]
  },
  {
    "id": "haru-stage5",
    "characterId": "haru",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "才能の裏のノート",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "太陽が持ってきた試作ノートには、失敗と改善が何年分も並ぶ。あなたは具体的に工夫を褒める。"
      },
      {
        "speaker": "narrator",
        "text": "彼はまだ形にしていない、自分の新しいパンの案を話す。"
      },
      {
        "speaker": "character",
        "text": "器用に見えてた？　最初なんか、ひどかったぞ"
      }
    ],
    "reward": {
      "equipmentIds": [
        "bakeryOven"
      ],
      "recipeIds": [
        "croqueMonsieur"
      ],
      "note": "オーブン購入権・クロックムッシュを解放しました。設備はメニューの「設備」で購入できます"
    }
  },
  {
    "id": "haru-stage6",
    "characterId": "haru",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "いつもの席",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "用事で近くまで来た太陽に、あなたが一杯を勧める。彼は手伝おうとするが、今日は客として座ることに。"
      },
      {
        "speaker": "narrator",
        "text": "互いのちょっとした癖や好みの話が増える。"
      },
      {
        "speaker": "character",
        "text": "何もしないで座ってるの、変な感じだな。……悪くない"
      }
    ],
    "reward": {
      "recipeIds": [
        "morningSet"
      ],
      "note": "モーニングセットを解放しました"
    }
  },
  {
    "id": "haru-stage7",
    "characterId": "haru",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "任せとけ、の続き",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "配達、町の行事、自分の試作を全部抱え、太陽が試作会に遅れる。あなたは約束を大切にしてほしいと伝える。"
      },
      {
        "speaker": "narrator",
        "text": "彼は店と分担を相談し、試食記録をあなたに頼む。"
      },
      {
        "speaker": "character",
        "text": "一人でできるって思ってた。……ここ、手伝ってくれないか"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "試食の記録なら、私に任せて",
        "response": [
          {
            "speaker": "character",
            "text": "助かる。じゃあ、その間に生地を見直すな。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "約束も大切にしたい。仕事を分けよう",
        "response": [
          {
            "speaker": "character",
            "text": "そうだな。店でも相談してくる。全部一人では、続かないもんな。"
          }
        ]
      }
    ]
  },
  {
    "id": "haru-stage8",
    "characterId": "haru",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "パンを持たない休日",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "太陽が手ぶらでカフェを訪ね、「デートに誘いに来た」と伝える。二人で町を歩き、家族の用事に追われていた頃や、これから欲しい休日を話す。"
      },
      {
        "speaker": "character",
        "text": "今日は差し入れなし。その代わり、一日空けてきた"
      }
    ],
    "reward": {
      "recipeIds": [
        "ovenSandwich"
      ],
      "note": "オーブンで焼く具だくさんサンドを解放しました"
    }
  },
  {
    "id": "haru-stage9",
    "characterId": "haru",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "帰りたくない理由",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "いつもの帰り道、太陽が「また明日」で終わらせず立ち止まる。役に立てるかに関係なく会いたいと伝え、あなたの毎日に恋人として関わりたいと告白する。"
      },
      {
        "speaker": "character",
        "text": "明日も、その先も、好きな人として会いに来たい"
      }
    ],
    "friendshipTitle": "これからも味見を",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "試作を一人で抱えず分担することを話し合い、次の試食の日を決めた。"
      },
      {
        "speaker": "character",
        "text": "これからも試食、頼めるか？　一緒に考えると、うまくいくんだ。"
      }
    ]
  },
  {
    "id": "haru-stage10",
    "characterId": "haru",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "同じ朝を選ぶ",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "自分の新作パンが完成し、二人でモーニングを考える。毎日会えると決めつけず、互いの休みを合わせて朝食を取る日を作る。"
      },
      {
        "speaker": "narrator",
        "text": "何でもない「おはよう」が二人の約束になる。"
      },
      {
        "speaker": "character",
        "text": "特別な日じゃなくても、一緒に朝飯食べような"
      }
    ],
    "reward": {
      "ingredientIds": [
        "kaitoBread"
      ],
      "recipeIds": [
        "morningPlate"
      ],
      "note": "太陽の新作パン・二人のモーニングプレートを解放しました"
    },
    "friendshipTitle": "新しい朝のメニュー",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "太陽の新作パンを使ったモーニングを完成させ、仕入れと販売の計画を立てた。"
      },
      {
        "speaker": "character",
        "text": "焼けたぞ！　こいつで新しい朝飯、考えようぜ。"
      }
    ]
  },
  {
    "id": "nagisa-stage1",
    "characterId": "nagisa",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "まだ知らない香り",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "店で香りを選べずにいるあなたへ、静がミントの葉を一枚差し出す。カフェの光や席の位置を尋ね、置き場所に合う鉢を選んでくれる。"
      },
      {
        "speaker": "character",
        "text": "名前より先に、好きな香りを覚えていいよ"
      }
    ],
    "reward": {
      "note": "静との新しい物語を読み終えました"
    }
  },
  {
    "id": "nagisa-stage2",
    "characterId": "nagisa",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "葉っぱの近況報告",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "あなたが鉢の新芽を報告すると、静はうれしそうに育て方を補足する。仕入れのたびに小さな変化を話す習慣ができる。"
      },
      {
        "speaker": "character",
        "text": "覚えていてくれたんだ。あの、小さな葉のこと"
      }
    ],
    "reward": {
      "recipeIds": [
        "freshMintTea"
      ],
      "note": "フレッシュミントティーを解放しました"
    }
  },
  {
    "id": "nagisa-stage3",
    "characterId": "nagisa",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "雨の日の温室",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "納品相談の途中で雨が降り、温室で話す。あなたが雨音の違いに気づくと、静は好きな場所を一つずつ教え、祖母の店だったと話す。"
      },
      {
        "speaker": "character",
        "text": "雨の日だけ、ここは少し違う部屋になる"
      }
    ],
    "reward": {
      "ingredientIds": [
        "chamomile",
        "lemonBalm"
      ],
      "note": "カモミール・レモンバームの仕入れを解放しました"
    }
  },
  {
    "id": "nagisa-stage4",
    "characterId": "nagisa",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "君の店に似合う色",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "静が営業時間の終わりにカフェを訪れ、花を飾る。あなたの好きな色が選ばれていると気づくと、彼は店を見に来たかった気持ちも認める。"
      },
      {
        "speaker": "character",
        "text": "花を届ける理由があって、よかった"
      }
    ],
    "reward": {
      "note": "静との新しい物語を読み終えました"
    },
    "choices": [
      {
        "id": "choice-1",
        "label": "私に会いに来てくれて、うれしい",
        "response": [
          {
            "speaker": "character",
            "text": "……うん。次は花がなくても、来ていい？"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "お茶を淹れるから、座っていって",
        "response": [
          {
            "speaker": "character",
            "text": "ありがとう。君のお店の音を、もう少し聞いていたい。"
          }
        ]
      }
    ]
  },
  {
    "id": "nagisa-stage5",
    "characterId": "nagisa",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "押し花の日付",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "古い押し花帳を一緒に見ながら、祖母との思い出を聞く。最後の空白ページを閉じかける静に、あなたは続きを書きたくなったら見たいと伝え、待つ。"
      },
      {
        "speaker": "character",
        "text": "この先に何を書けばいいか、ずっと分からなかった"
      }
    ],
    "reward": {
      "recipeIds": [
        "seasonalHerbTea"
      ],
      "note": "季節のブレンドハーブティーを解放しました"
    }
  },
  {
    "id": "nagisa-stage6",
    "characterId": "nagisa",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "咲いたら、知らせて",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "静から苗を預かり、あなたが初めて咲いた日の様子を伝える。翌日には彼が見に来て、花を眺めた後、次はあなたと夕暮れの温室を歩く約束をする。"
      },
      {
        "speaker": "character",
        "text": "花を見たかった。君が喜ぶ顔も、見たかった"
      }
    ],
    "reward": {
      "note": "静との新しい物語を読み終えました"
    }
  },
  {
    "id": "nagisa-stage7",
    "characterId": "nagisa",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "変えられなかった温室",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "古い棚の交換が必要になり、静は決められず約束の日にも作業を止めたままになる。あなたは思い出の鉢を一緒に移す提案をする。"
      },
      {
        "speaker": "narrator",
        "text": "静は残すものを自分で選び、修繕を依頼する。"
      },
      {
        "speaker": "character",
        "text": "同じ形じゃなくても、ここを好きでいていいのかな"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "残したい鉢は、どれ？",
        "response": [
          {
            "speaker": "character",
            "text": "これと、あの小さな鉢。……自分で、選んでみる。"
          }
        ]
      },
      {
        "id": "choice-2",
        "label": "思い出の鉢を、新しい棚に移そう",
        "response": [
          {
            "speaker": "character",
            "text": "新しくしても、なくならないものはあるんだね。相談してみるよ。"
          }
        ]
      }
    ]
  },
  {
    "id": "nagisa-stage8",
    "characterId": "nagisa",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "新しい鉢の置き場所",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "修繕した温室に、二人で選んだ新しい苗を置く。押し花帳の続きに今日の日付を記し、静は曖昧な「また」ではなく、来週の夕方にあなたを誘う。"
      },
      {
        "speaker": "character",
        "text": "来週の木曜、ここでお茶をしよう。君がよければ"
      }
    ],
    "reward": {
      "note": "静との新しい物語を読み終えました"
    }
  },
  {
    "id": "nagisa-stage9",
    "characterId": "nagisa",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "枯れないものを探すより",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "約束の夕方、開いた花を一緒に眺める。静は別れが怖くて気持ちを隠していたと明かし、確かな保証のない未来でもあなたと過ごしたいと告げる。"
      },
      {
        "speaker": "character",
        "text": "先のことは分からない。でも、君が好きだ。次の季節も一緒にいたい"
      }
    ],
    "friendshipTitle": "次の打ち合わせ",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "静は温室を再び開く相談をし、次に会う日を具体的に手帳へ書いた。"
      },
      {
        "speaker": "character",
        "text": "来週の木曜、温室でお茶をしよう。お店の相談もしたい。"
      }
    ]
  },
  {
    "id": "nagisa-stage10",
    "characterId": "nagisa",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "次の春の予約",
    "dialogue": [
      {
        "speaker": "narrator",
        "text": "二人で植え替えをして、温室の手帳に新しい予定を書き足す。祖母の押し花の隣に二人の記録を残し、カフェの窓辺にも育つ場所を作る。"
      },
      {
        "speaker": "character",
        "text": "来年の花も、君と見たい。これから一緒に育てよう"
      }
    ],
    "reward": {
      "recipeIds": [
        "promiseTea"
      ],
      "note": "二人で名づけるブレンドティーを解放しました"
    },
    "friendshipTitle": "窓辺に育つ時間",
    "friendshipDialogue": [
      {
        "speaker": "narrator",
        "text": "カフェ専用のブレンドティーと窓辺セットを作り、次の植え替えの予定を共有した。"
      },
      {
        "speaker": "character",
        "text": "植え替えの時は、また呼んで。続きを一緒に考えたい。"
      }
    ]
  },
  {
    "id": "sae-stage1",
    "characterId": "sae",
    "fromStage": 0,
    "toStage": 1,
    "requiredAffection": 0,
    "title": "零下の初対面",
    "dialogue": [
      { "speaker": "narrator", "text": "冷凍倉庫で迷ったあなたを、厚着の冴が出口まで案内する。返事は冷たいが、滑りやすい足元をさりげなく支えてくれた。" },
      { "speaker": "character", "text": "用件が済んだら帰れ。……ここはお前には寒すぎる" }
    ]
  },
  {
    "id": "sae-stage2",
    "characterId": "sae",
    "fromStage": 1,
    "toStage": 2,
    "requiredAffection": 10,
    "title": "無言の温度計",
    "dialogue": [
      { "speaker": "narrator", "text": "届いたアイスの箱に、保存温度と食べ頃を記したメモが入っていた。感謝を伝えると、冴は視線を逸らす。" },
      { "speaker": "character", "text": "品質管理の一部だ。……礼はいらない" }
    ],
    "reward": { "recipeIds": ["vanillaIceCup"], "note": "バニラアイスカップを解放しました" }
  },
  {
    "id": "sae-stage3",
    "characterId": "sae",
    "fromStage": 2,
    "toStage": 3,
    "requiredAffection": 30,
    "title": "半解凍のベリー",
    "dialogue": [
      { "speaker": "narrator", "text": "冴は溶け方まで計算したベリーアイスを差し出す。あなたが急がず味わうと、マフラーの奥で口元がわずかに緩んだ。" },
      { "speaker": "character", "text": "……その速度でいい。一番うまい状態だ" }
    ],
    "reward": { "ingredientIds": ["snowMilkIce"], "recipeIds": ["snowBerryCup"], "note": "雪ミルクアイス・雪どけベリーカップを解放しました" }
  },
  {
    "id": "sae-stage4",
    "characterId": "sae",
    "fromStage": 3,
    "toStage": 4,
    "requiredAffection": 65,
    "title": "温かい一杯の距離",
    "dialogue": [
      { "speaker": "narrator", "text": "風邪気味の冴に、あなたは温かいコーヒーを渡す。冴は受け取らず帰そうとするが、打ち合わせのために席へ戻った。" },
      { "speaker": "character", "text": "心配は余計だ。……でも、冷めるまではいる" }
    ],
    "choices": [
      { "id": "choice-1", "label": "話さなくても、ここにいて", "response": [{ "speaker": "character", "text": "……変わってるな、お前は。じゃあ、少しだけ" }] },
      { "id": "choice-2", "label": "コーヒーの温度、見てくれる？", "response": [{ "speaker": "character", "text": "……仕事なら仕方ない。温度計を貸せ" }] }
    ]
  },
  {
    "id": "sae-stage5",
    "characterId": "sae",
    "fromStage": 4,
    "toStage": 5,
    "requiredAffection": 110,
    "title": "見えない表情",
    "dialogue": [
      { "speaker": "narrator", "text": "試作中、アイスを失敗した冴はフードを深く被る。あなたが責めずに原因を一緒に探すと、彼は初めて自分のことを少し話した。" },
      { "speaker": "character", "text": "人とやると、失敗の数が増えると思ってた。……違うんだな" }
    ],
    "reward": { "equipmentIds": ["iceCreamMaker"], "recipeIds": ["frozenChocolate"], "note": "アイスクリームメーカー購入権・氷温ミルクアイスを解放しました" }
  },
  {
    "id": "sae-stage6",
    "characterId": "sae",
    "fromStage": 5,
    "toStage": 6,
    "requiredAffection": 170,
    "title": "日だまりの席",
    "dialogue": [
      { "speaker": "narrator", "text": "冴は閉店前のカフェを訪れ、店の奥の日だまりに座る。厚着を一枚脱ぎ、何もせず同じ時間を過ごした。" },
      { "speaker": "character", "text": "ここは、暑い。……だが、嫌いじゃない" }
    ],
    "reward": { "recipeIds": ["iceCreamSandwich"], "note": "ひとやすみアイスサンドを解放しました" }
  },
  {
    "id": "sae-stage7",
    "characterId": "sae",
    "fromStage": 6,
    "toStage": 7,
    "requiredAffection": 245,
    "title": "閉じた扉の向こう",
    "dialogue": [
      { "speaker": "narrator", "text": "納品のミスを一人で抱えた冴は、倉庫にこもってしまう。あなたは扉の外から、彼が話せるまで待った。" },
      { "speaker": "character", "text": "……なぜ帰らない。俺は、人をうまく頼れない" }
    ],
    "choices": [
      { "id": "choice-1", "label": "頼めるまで、ここで待つよ", "response": [{ "speaker": "character", "text": "……ずるいな。そんなふうに待たれたら、打ち明けるしかない" }] },
      { "id": "choice-2", "label": "半分だけ、私に任せて", "response": [{ "speaker": "character", "text": "半分……か。分かった。お前に頼む" }] }
    ]
  },
  {
    "id": "sae-stage8",
    "characterId": "sae",
    "fromStage": 7,
    "toStage": 8,
    "requiredAffection": 335,
    "title": "初めての外出",
    "dialogue": [
      { "speaker": "narrator", "text": "冴が休日にカフェへ来て、人の少ない湖へ誘う。マフラーを少し下げ、倉庫の外で並んで食べるアイスに、小さく笑った。" },
      { "speaker": "character", "text": "人混みは嫌いだ。……お前と二人なら、外も悪くない" }
    ],
    "reward": { "recipeIds": ["frostBerryParfait"], "note": "霜夜のベリーパフェを解放しました" }
  },
  {
    "id": "sae-stage9",
    "characterId": "sae",
    "fromStage": 8,
    "toStage": 9,
    "requiredAffection": 450,
    "title": "溶けた言葉",
    "dialogue": [
      { "speaker": "narrator", "text": "冴はカフェの外で待ち、帰り道を一緒に歩く。誰かを求めることが怖かったと明かし、あなたにだけは隣にいてほしいと告げる。" },
      { "speaker": "character", "text": "お前が好きだ。……これからも、俺の隣にいてくれ" }
    ],
    "friendshipTitle": "一人じゃない管理表",
    "friendshipDialogue": [
      { "speaker": "narrator", "text": "冴はカフェ用の在庫表を開き、これからの仕入れと試作を一緒に管理したいと伝えた。" },
      { "speaker": "character", "text": "一人で管理するより、お前と確かめた方がいい。……これからも頼む" }
    ]
  },
  {
    "id": "sae-stage10",
    "characterId": "sae",
    "fromStage": 9,
    "toStage": 10,
    "requiredAffection": 600,
    "title": "冬の先の約束",
    "dialogue": [
      { "speaker": "narrator", "text": "冴の特製アイスに、あなたが温かいコーヒーを注ぐ。相反する温度が一つの味になり、二人は来年の冬も同じ席で食べる約束をする。" },
      { "speaker": "character", "text": "溶ける前に食べろ。……来年も、俺が作る" }
    ],
    "reward": { "ingredientIds": ["saeIce"], "recipeIds": ["thawingAffogato"], "note": "冴の特製アイス・ほどける心のアフォガートを解放しました" },
    "friendshipTitle": "二人の温度レシピ",
    "friendshipDialogue": [
      { "speaker": "narrator", "text": "冴の特製アイスとカフェのコーヒーを合わせ、二人の定番メニューを完成させた。" },
      { "speaker": "character", "text": "温度は俺が見る。味はお前が見ろ。……それでいい" }
    ]
  },
  {
    "id":"cacao-stage1","characterId":"cacao","fromStage":0,"toStage":1,"requiredAffection":0,
    "title":"舌を見せて",
    "dialogue":[
      {"speaker":"narrator","text":"ショコラトリーの扉を開けると、カカオは挨拶より先に小さなボンボンを差し出した。"},
      {"speaker":"character","text":"僕がカカオ・ショコラ。君、本当に僕のチョコを扱える舌を持ってるのか？　まずは答えを聞かせて"}
    ]
  },
  {
    "id":"cacao-stage2","characterId":"cacao","fromStage":1,"toStage":2,"requiredAffection":10,
    "title":"三粒の試験",
    "dialogue":[
      {"speaker":"narrator","text":"甘さの違う三粒を食べ比べ、あなたは飾らずに感じた順を伝えた。カカオは意地悪く笑いながらも、最後までメモを取る。"},
      {"speaker":"character","text":"知ったふりをしないのは合格。君の言葉、僕の次の一粒に使ってあげる"}
    ],
    "reward":{"recipeIds":["bonbonPlate"],"note":"三粒のボンボンショコラを解放しました"}
  },
  {
    "id":"cacao-stage3","characterId":"cacao","fromStage":2,"toStage":3,"requiredAffection":30,
    "title":"苦味の輪郭",
    "dialogue":[
      {"speaker":"narrator","text":"カカオは焙煎したカカオニブを持ち込み、カフェの客に届く苦味を一緒に探した。"},
      {"speaker":"character","text":"僕の技術に君の店の感覚を足す。勘違いしないで、対等に扱うのは君だけだよ"}
    ],
    "reward":{"ingredientIds":["cacaoNib"],"recipeIds":["cacaoNibCookie"],"note":"焙煎カカオニブ・カカオニブクッキーを解放しました"}
  },
  {
    "id":"cacao-stage4","characterId":"cacao","fromStage":3,"toStage":4,"requiredAffection":65,
    "title":"一粒だけの場所",
    "dialogue":[
      {"speaker":"narrator","text":"カカオはカウンターの一番目立つ場所を測り、ショコラ一粒だけを置くガラスケースを用意した。"},
      {"speaker":"character","text":"数でごまかす必要はない。僕の一粒と、君の説明があれば十分だ"}
    ],
    "choices":[
      {"id":"choice-1","label":"一緒に一番きれいな位置を探す","response":[{"speaker":"character","text":"いい返事。君の店で僕の一粒が一番に見える場所を選ぼう"}]},
      {"id":"choice-2","label":"お客様が見やすい位置を優先する","response":[{"speaker":"character","text":"僕より客を優先するんだ。……正しいよ。だから君に任せたい"}]}
    ],
    "reward":{"decorationIds":["cacaoBonbonCase"],"note":"一粒ショコラのガラスケースを解放しました"}
  },
  {
    "id":"cacao-stage5","characterId":"cacao","fromStage":4,"toStage":5,"requiredAffection":110,
    "title":"甘さの命令",
    "dialogue":[
      {"speaker":"narrator","text":"閉店後、カカオは深い苦味のクーベルチュールを温め、あなたに甘さを決めるよう命じた。"},
      {"speaker":"character","text":"遠慮は不合格。君が飲みたい甘さを言って。僕が完璧に仕上げる"}
    ],
    "reward":{"ingredientIds":["bitterCouverture"],"recipeIds":["bitterHotChocolate"],"note":"深煎りビタークーベルチュール・深煎りホットショコラを解放しました"}
  },
  {
    "id":"cacao-stage6","characterId":"cacao","fromStage":5,"toStage":6,"requiredAffection":170,
    "title":"預けた温度",
    "dialogue":[
      {"speaker":"narrator","text":"カカオは温度計をあなたに渡し、これまで誰にも任せなかったテンパリングの最後を託した。"},
      {"speaker":"character","text":"一度でも外せば艶は消える。……それでも君なら、僕のチョコを預けられる"}
    ],
    "reward":{"equipmentIds":["temperingMachine"],"recipeIds":["chocolateTerrine"],"note":"精密テンパリングマシン購入権・艶やかショコラテリーヌを解放しました"}
  },
  {
    "id":"cacao-stage7","characterId":"cacao","fromStage":6,"toStage":7,"requiredAffection":245,
    "title":"天才の失敗作",
    "dialogue":[
      {"speaker":"narrator","text":"ひびの入った試作品を隠すカカオに、あなたは完成品だけでなく迷った理由も聞かせてほしいと伝えた。"},
      {"speaker":"character","text":"失敗した僕を見ても帰らない？　……なら最後までここにいて。君だけは、勝手に離れないで"}
    ],
    "choices":[
      {"id":"choice-1","label":"成功するまで隣で味見する","response":[{"speaker":"character","text":"言ったね。今夜は長いよ。僕の隣、君の指定席にするから"}]},
      {"id":"choice-2","label":"今日は休んで、明日また作ろう","response":[{"speaker":"character","text":"僕を止めるなんて生意気だ。……でも、明日も来るなら従ってあげる"}]}
    ],
    "reward":{"decorationIds":["cacaoThermometer"],"note":"金縁のショコラ温度計を解放しました"}
  },
  {
    "id":"cacao-stage8","characterId":"cacao","fromStage":7,"toStage":8,"requiredAffection":335,
    "title":"君だけの色",
    "dialogue":[
      {"speaker":"narrator","text":"淡い紅色のチョコを前に、カカオはあなたのためだけに配合を変えたと打ち明ける。"},
      {"speaker":"character","text":"似合うと思ったのは君だけ。ほかの誰かに同じものを作る気はないよ"}
    ],
    "reward":{"ingredientIds":["rubyChocolate"],"recipeIds":["rubyChocolateParfait"],"note":"ルビーチョコレート・ルビーショコラパフェを解放しました"}
  },
  {
    "id":"cacao-stage9","characterId":"cacao","fromStage":8,"toStage":9,"requiredAffection":450,
    "title":"独占の告白",
    "dialogue":[
      {"speaker":"narrator","text":"カカオは新作発表を断り、最初の一粒をあなたに差し出す。強い視線の奥には、選ばれないことへの怖さがあった。"},
      {"speaker":"character","text":"君の舌も、言葉も、隣の席も、全部僕が一番近くにいたい。僕だけを選んで――嫌なら、今ここで止めて"}
    ],
    "friendshipTitle":"唯一の共同開発者",
    "friendshipDialogue":[
      {"speaker":"narrator","text":"あなたは恋ではなく、互いの仕事を預けられる唯一の共同開発者として隣にいる道を選んだ。"},
      {"speaker":"character","text":"僕に対等を選ばせるなんて、やっぱり君は生意気だ。いいよ、最高の相棒になって"}
    ]
  },
  {
    "id":"cacao-stage10","characterId":"cacao","fromStage":9,"toStage":10,"requiredAffection":600,
    "title":"ただ一人のシグネチャー",
    "dialogue":[
      {"speaker":"narrator","text":"カカオは自分の名を冠した一粒を、あなたのカフェだけに卸す契約書とともに差し出した。"},
      {"speaker":"character","text":"僕の最高傑作も、これからの失敗も、最初に君へ渡す。君の一番近くは、ずっと僕の場所にして"}
    ],
    "reward":{"ingredientIds":["cacaoSignature"],"recipeIds":["onlyOneBonbon"],"decorationIds":["pairedChocolateBoxes"],"note":"カカオのシグネチャーショコラ・ただ一人のシグネチャーボンボンを解放しました"},
    "friendshipTitle":"対等な二つの署名",
    "friendshipDialogue":[
      {"speaker":"narrator","text":"二人はショコラとカフェ、双方の名前を並べた共同メニューを完成させた。"},
      {"speaker":"character","text":"僕の名前の隣に置けるのは君だけ。次の最高傑作も、二人で更新するよ"}
    ]
  }
];

export const getRelationshipEvent = (id:string) => relationshipEvents.find(event => event.id === id);
