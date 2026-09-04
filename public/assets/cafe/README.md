# カフェ画像素材の追加方法

画像のない項目だけCSS・仮素材を表示します。指定名のPNGを追加し、画面を再読み込みすると自動で切り替わります。ゲームデータやセーブの編集は不要です。公開版には画像を含む更新の反映が必要です。

## レイヤー構成

| 順序 | レイヤー | 内容 |
| --- | --- | --- |
| 1 | `background` | 壁・床の独立した背景 |
| 2 | `furniture` | 窓、ドア、棚、カウンター、照明、植物、解放済み装飾 |
| 3 | `equipment` | 解放済み設備。未設置・増設数・稼働状態も表示 |
| 4 | `seating` | 4組のテーブルと左右の椅子 |
| 5 | `customers` | 注文に対応する客。来店→着席→提供後のひと息→退店 |
| 6 | `characters` | 雇用して調理・提供に配置した既存キャラクター |
| 7 | `bubbles` | 注文・進捗・提供・お礼の吹き出し |
| 8 | `effects` | 木漏れ日、埃、提供時のきらめき |

背景に家具・キャラクター・文字・操作UIを描き込まないでください。完成した店内の一枚絵ではなく、個々の素材を差し替える構成です。料理は注文吹き出しと提供後のテーブルで共通利用します。

## ファイル名

全て `public/` からの相対パス、拡張子は `.png` です。家具、人物、設備、料理、演出は背景を透過し、余白を少なめにしてください。壁・床は枠を埋める表示、その他は縦横比を保った全体表示です。サイズは目安です。

| フォルダ | ファイル名 | 推奨サイズ・用途 |
| --- | --- | --- |
| `assets/cafe/backgrounds/` | `wall.png`, `floor.png` | 各 1200×700px。壁と床を別素材で指定 |
| `assets/cafe/furniture/` | `window.png`, `door.png`, `shelf.png`, `counter.png`, `pendant.png`, `plant.png` | 各 400〜800px。各オブジェクトのみ |
| `assets/cafe/furniture/` | `table.png`, `chair.png` | 400×300 / 180×260px。テーブルは天板と脚。椅子は独立 |
| `assets/cafe/furniture/` | `{装飾ID}.png` | 128〜256px。解放済み装飾だけ表示 |
| `assets/cafe/equipment/` | `{設備ID}.png` | 256×256px。解放時に未設置の姿を表示。購入後に稼働可能 |
| `assets/customers/` | `moss.png`, `rose.png`, `navy.png`, `ochre.png` | 240×320px。一般客4種の全身 |
| `assets/characters/` | `ren.png`, `sota.png`, `aki.png`, `itsuki.png`, `haru.png`, `nagisa.png` | 240×360px。既存キャラクターの店内用全身 |
| `assets/foods/` | `{料理ID}.png` | 128×128px。例 `coffee.png`, `toast.png` |
| `assets/effects/` | `sunlight.png`, `serve.png` | 600×800 / 256×256px。透過素材 |

客は `{look}-{phase}.png` があると優先します。例：`moss-entering.png`, `moss-seated.png`, `moss-enjoying.png`, `moss-leaving.png`。ない状態は `moss.png`、それもなければCSSへ戻ります。

キャラクターは `{id}-cook.png` / `{id}-server.png` を優先し、次に `{id}.png`、次に既存の `character.image`、最後にCSSの人物を使用します。静止PNGでも移動・作業の演出は付けられます。表情を含むスプライトシートの自動分割は行いません。

設備ID：`coffeeCounter`, `toastGrill`, `prepTable`, `espressoMachine`, `bakeryOven`, `chilledCase`, `seasonalCounter`, `parfaitStation`, `herbInfuser`。

装飾IDは `src/data/decorations.ts`、料理IDは `src/data/recipes.ts` を参照してください。既存IDはセーブ互換性のため変更しません。

## 実装上の境界

- パス規則・配置・演出時間：`src/components/cafe/sceneModel.ts`
- 読み込み成功までは代替表示、404や画像破損でも代替表示：`CafeAsset.tsx`
- 各レイヤーとゲームデータの接続：`CafeScene.tsx`
- レスポンシブ配置・見た目・動き：`cafe-scene.css`
- 注文詳細と状況の手帳：`src/screens/CafeScreen.tsx`
- 演出の訪問履歴は画面内の一時状態です。セーブは従来のv5のままです。
- 客の移動は既存の営業時間 `activeMs` に追従します。画面を開き直すと現在の注文客を着席状態で復元し、過去の提供演出は再生しません。
- 自動提供でも手動提供でも同じ退店演出を行います。手動提供は店長が客席で手渡した時点で既存の提供処理を呼び出し、売上を反映します。スタッフの自動提供は従来の提供時間のままです。
- OSの「視差効果を減らす」設定で移動・点滅・揺れを止めます。

### 店長（プレイヤー）素材

`public/assets/characters/manager.png` を追加すると、店長（あなた）のCSS人物から画像へ置き換わります。動作別の画像を使う場合は、`manager-idle.png`, `manager-walking.png`, `manager-cooking.png`, `manager-ready.png`, `manager-pickup.png`, `manager-carrying.png`, `manager-serving.png`, `manager-returning.png` を追加してください。動作別画像がない場合は `manager.png`、それもない場合はCSS人物を使用します。おすすめは透過PNG・240×360pxです。

店長の操作待ちは一時的な演出データで、セーブ形式には追加されません。リロードした場合、未着手の注文や完成済み料理は従来どおり残り、もう一度吹き出しから店長へ指示できます。調理時間・食材消費・売上は既存のゲーム処理が担当し、店長は移動後にその処理を呼び出します。

設備の座標は `src/components/cafe/equipmentLayout.ts` で管理し、店内描画と店長・スタッフの移動先で共用します。設備追加による配置変更にも追従します。調理中は実際の残り秒数と湯気、完成後は提供待ちの印を表示します。基本調理時間は30秒、店全体で1品ずつです。

## 今回の提供素材（スマホ版）

- `backgrounds/room.png`：提供された941×1672pxの店内画像。建物と固定家具の背景として原本のまま使用します。購入設備・客席・人物・注文・演出は独立したレイヤーで重ねます。
- `furniture/table-set.png`：提供された透過PNGのテーブルと椅子。原本の余白は画面上の表示枠でトリミングし、4卓に共用します。
- 背景画像が読み込めない場合は従来のCSSの店内、テーブル画像が読み込めない場合は従来のテーブルと椅子を表示します。
- 店内の原画比率を維持し、スマホの縦画面を埋めるように表示します。端末の比率に応じて左右または下端にトリミングが入ります。動くレイヤーも同じ座標面に配置するため、設備と人物の位置がずれません。
- 下部メニュー（店・街・贈物・人物・設備・料理・スタッフ）を常時表示。右上のノートには注文ノート・店のようす・思い出をまとめています。店内は下部メニューに重ならない領域を使います。
