# 凍堂 冴の表情差分

既存の `public/assets/characters/sae-story-cutout.png` を編集対象に、組み込みの ImageGen で5枚を個別に生成。通常表情の元画像は変更していません。

全画像は1024×1536のRGBA PNGで、透明ピクセルと輪郭の半透明ピクセルを確認済みです。

| 表情 | 保存先 |
| --- | --- |
| 笑顔 | `public/assets/characters/sae-expression-smile.png` |
| 照れ | `public/assets/characters/sae-expression-blush.png` |
| 心配・悲しみ | `public/assets/characters/sae-expression-sad.png` |
| 驚き | `public/assets/characters/sae-expression-surprised.png` |
| 真剣 | `public/assets/characters/sae-expression-serious.png` |

## 使用したプロンプト

各表情につき、下記の共通文に表情指定を続けて生成。`transparent_background: true`、参照画像は既存のストーリー用立ち絵1枚です。

```text
Use case: identity-preserve. Asset type: transparent PNG expression sprite for Japanese romance game. Edit target: referenced existing Sae full-body standing artwork. Change ONLY his facial expression. Preserve exactly the same person, silver-white hairstyle and blue gray eyes, body proportions, yellow and olive fur-trimmed parka, blue scarf, blue trousers, fur-trimmed brown boots, hands in both pockets, standing pose, camera framing, subject scale and position, linework, watercolor-anime coloring and shading. Full body including boots and hair tips within the same 1024x1536 canvas. Backdrop must be genuinely transparent alpha, remove the surrounding brown/black glow, no new objects, text, panels or shadows. Expression:
```

```text
smile: a gentle restrained warm smile, eyes softly happy, small closed-mouth smile.
blush: shy embarrassment and affection, rosy cheeks, softened eyes, a small bashful mouth, keep the head angle unchanged.
sad: worry and sadness, inner brows raised slightly, eyes troubled, subtly downturned mouth, no tears.
surprised: surprise, widened eyes and slightly raised eyebrows, small parted mouth, no exaggerated symbols.
serious: focused serious determination, subtly drawn brows and steady gaze, firm closed mouth, no anger.
```

会話データの `expression` とキャラクターデータの `giftReactionExpressions` で明示的に指定し、台詞からの自動判定は行いません。表示は既存の `StoryStandingArt` を使用し、未登録や読込失敗では通常立ち絵に戻ります。
