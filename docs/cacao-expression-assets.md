# カカオ・ショコラの表情差分

通常表情は既存の `public/assets/characters/cacao-c-story-cutout.png` を維持。組み込みimagegenでこの立ち絵を参照し、同じ人物・衣装・ポーズ・構図・水彩の絵柄のまま顔の表情を変更した。全素材は1024×1536の透過RGBA PNG。

| 表情 | 保存先 |
| --- | --- |
| 笑顔 | `public/assets/characters/cacao-expression-smile.png` |
| 照れ | `public/assets/characters/cacao-expression-blush.png` |
| 心配・悲しみ | `public/assets/characters/cacao-expression-sad.png` |
| 驚き | `public/assets/characters/cacao-expression-surprised.png` |
| 真剣 | `public/assets/characters/cacao-expression-serious.png` |

実際に使用した全プロンプトは `docs/cacao-expression-prompts.json` に保存。

## 会話への指定

- `src/data/characters.ts` に5種類の `expressionImages` と、贈物の反応別の `giftReactionExpressions` を登録。
- `src/data/cacaoEpisodes.ts` の本編10話、恋愛／友情分岐、お手伝い話、選択肢の返答、デート3件、成長イベント5件へ表情を明示。
- `src/data/dramaEvents.ts` のカカオが話す4件の修羅場へ表情を明示。
- 仕事の説明や告白は真剣、失敗を隠す場面は心配・悲しみ、意外な返事や出来事は驚き、親密な相手への動揺は照れ、試食の成功や嬉しい時間は笑顔を基本に、各場面を読んで指定。序盤の挑発には通常の余裕ある表情も使用し、仕事仲間として早期に解放する成長イベントには恋愛的な照れを入れない。
- プレゼント反応は大好物＝照れ、好き＝笑顔、ふつう＝通常、苦手＝心配・悲しみ。既存の反応別の会話と初回のみのポップアップを維持。

表情を台詞から推測する処理は追加していない。通常の店頭画像と顔アイコンはC案のまま。物語の各ページ、選択肢、デート、成長イベントは明示された表情を既存の表示処理へ渡す。修羅場は発話中の人物にその台詞の表情を適用し、他の参加者には通常表情を使用する。

## フォールバックと保存

既存の `StoryStandingArt` が、表情未登録時と画像の読込失敗時に通常立ち絵へ戻す。通常画像も読めない場合は人物名を表示。別の表情へ進んだ時は、その画像を独立して読み込める。

セーブ形式とバージョン、イベントID、選択肢ID、条件、進行、報酬、台詞は変更していない。保存済みのプレゼント反応は既存の移行処理が反応の種類から明示された表情を復元し、品物の消費や好感度を再付与しない。

## 検証

変更前の全会話・イベントのスナップショットと、表情フィールドだけを除いた変更後のデータが一致することを比較確認。通常立ち絵も元ファイルとバイト単位で一致。

関連テストでは5種類の寸法・RGBA・実際の透過ピクセル、未登録／読込失敗時のフォールバック、全会話領域の明示指定、4種のプレゼント反応の保存再開と一度だけの適用を検証する。

実行結果：関連テスト206件、`npm test`の全220件が成功。`npm test`内の通常ビルドとVercel用静的ビルドが成功し、生成仕様書も更新済み。
