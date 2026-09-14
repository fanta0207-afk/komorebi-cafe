# こもれび喫茶を公開する手順（初心者向け）

上から順番に進めると、インターネットで遊べるゲームのURLを作れます。
**ゲーム側の準備は済んでいますが、まだGitHubへの送信・Vercelでの公開はしていません。**

## 最初に：何をするの？

- **GitHub**：ゲームのファイルを預けるサービスです。
- **GitHub Desktop**：GitHubへファイルを送るMac用アプリです。ボタンで操作できます。
- **Vercel**：GitHubのファイルを使い、みんなが遊べるURLを作るサービスです。

「GitHubへ送る → Vercelにつなぐ → 公開URLを確認する」の順に進めます。**公開するだけなら、ターミナルに命令を入力したり、MacにNode.jsを入れたりする必要はありません。** Vercelが公開用の組み立てを行います。

## 1. アカウントとアプリを用意する

1. [GitHub](https://github.com/)でアカウントを作ります。すでにあればログインします。
2. [GitHub Desktopの公式サイト](https://desktop.github.com/)からMac用アプリをダウンロードし、インストールします。
3. GitHub Desktopを開き、**Sign in to GitHub.com**から同じアカウントでログインします。
4. [Vercel](https://vercel.com/)にも、GitHubアカウントを使って登録・ログインします。

画面の表記は少し違う場合があります。パスワードや認証コードは自分で入力し、チャットやゲームのファイルには書かないでください。

## 2. ゲームの「v」フォルダを選ぶ

1. GitHub Desktopの上部メニューで **File → Add Local Repository…** を選びます。初期画面の **Add an Existing Repository** でもかまいません。
2. **Choose…**を押して、Macにある「カフェ恋愛ゲーム」フォルダを開きます。
3. その中の **`v`フォルダ**を選びます。
4. **Add Repository**を押します。

**重要：選ぶのは「カフェ恋愛ゲーム」ではなく、その中の「v」です。**

Finderで`v`を開くと、この`README.md`のほかに`package.json`、`vercel.json`、`src`、`public`が見えます。この場所を選べば正解です。`public`や`dist-public`だけを選ばないでください。

ゲームにはすでに変更履歴があるので、**Create a New Repository（新しく作る）は不要です。** 「Gitのフォルダではない」というエラーが出たら、場所を確認してください。`.git`を削除したり、初期化し直したりする必要はありません。

## 3. 最新の変更をGitHubへ送る

### 3-1. まずMac内で変更を記録する

1. 左側の **Changes** に変更されたファイルが並んでいるか確認します。
2. 公開準備で変更したファイルのチェックを入れます。README、`vercel.json`、`vite.public.config.ts`、`index.html`、`src/main.tsx`など、今回の対応ファイルはまとめて含めます。
3. 個人的なメモなど、送りたくないファイルはチェックを外します。`node_modules`、`.env`、パスワードや鍵のファイルが一覧に出たら、送信せずに相談してください。
4. 左下の **Summary** に `公開の準備` と入力します。Descriptionは空欄で大丈夫です。
5. **Commit to …**を押します。後ろの`main`などの名前は、現在の作業場所の名前です。そのまま押してください。

「Commit」はMac内で変更を記録することです。**これだけではGitHubに送られません。** Changesが空なら、この操作は飛ばせます。

`tsconfig.tsbuildinfo`の削除が一覧にあっても正常です。作業キャッシュを送信対象から外したものです。

### 3-2. GitHubへ送る

1. 上部の **Publish repository**を押します。
2. **Name**に `komorebi-cafe` と入力します。同じ名前を使っていたら、`komorebi-cafe-game`など別の名前にします。
3. Descriptionは `こもれび喫茶のゲーム` など。空欄でも大丈夫です。
4. **Keep this code private**は、最初はチェックを入れたままにするのがおすすめです。GitHubのファイルを一般公開せず、Vercelでゲームだけ公開できます。
5. Organizationの欄があれば、個人アカウントを使います。
6. **Publish Repository**を押し、送信が終わるまで待ちます。

Publishではなく **Push origin**が表示されたら、すでに送信先があります。**Repository → View on GitHub**で自分のゲームの保管場所か確認してから、Push originを押してください。知らない送信先なら送らずに相談してください。

### 3-3. 送れたか確認する

**Repository → View on GitHub**を押します。ブラウザのファイル一覧の最初の階層に、次が見えれば成功です。

- `README.md`
- `package.json`、`package-lock.json`
- `vercel.json`、`vite.public.config.ts`
- `index.html`
- `src`、`public`

GitHub上でさらに`v`を開かないとこれらが見えない場合は、この説明と違う構成です。Vercelへ進む前に相談してください。

公式説明：[GitHub Desktopで既存のフォルダを送る](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)。

## 4. Vercelにゲームを取り込む

1. [Vercel](https://vercel.com/)にログインします。
2. **Add New → Project**（またはNew Project）を開きます。
3. GitHubとの接続を求められたら、同じGitHubアカウントをつなぎます。
4. アクセスを許可する保管場所を選べる場合は、**このゲームのリポジトリだけ**を許可します。「リポジトリ」は、GitHubにあるゲームの保管場所という意味です。
5. 一覧の `komorebi-cafe`（自分が付けた名前）の横にある **Import**を押します。

一覧に出ない場合は、GitHubへの送信と、Vercelにその保管場所へのアクセスを許可したかを確認します。送り直しのために新しい保管場所を増やす必要はありません。

公式説明：[GitHubのファイルをVercelに取り込む](https://vercel.com/docs/git)。

## 5. 設定を確認し、Deployを押す

取り込み後の画面で、次の内容にします。すでに同じ値なら変更しなくて大丈夫です。

| 画面の項目 | 選ぶ・入力する内容 |
| --- | --- |
| Project Name | `komorebi-cafe`など自分で決めた名前 |
| Framework Preset | **Vite**。Next.jsではありません |
| Root Directory | 最初の階層のまま。空欄や`./`ならそのまま。**`v`や`public`を選ばない** |
| Install Command | `npm ci` |
| Build Command | `npm run build:vercel` |
| Output Directory | `dist-public` |
| Node.js Version | 22.x |
| Environment Variables | 何も追加しない |

Install・Build・Outputの欄が見えなければ **Build and Output Settings**を開きます。Overrideというスイッチがあれば、変えたい欄のスイッチを入れて入力します。命令の欄には表の文字だけをコピーし、かぎ括弧や説明文は入れません。

Node.js Versionが最初の画面にない場合は、プロジェクトの **Settings → Build and Deployment**で確認できます。変更したら、再度Deployして新しい設定を使います。

設定できたら **Deploy**を押し、結果を待ちます。

- **ビルド**：ゲームを公開用に組み立てることです。
- **Deploy**：組み立てたゲームをインターネットに置くことです。

Vercelが組み立てるので、`dist-public`を自分でGitHubに追加する必要はありません。

公式説明：[ビルド設定](https://vercel.com/docs/builds/configure-a-build)、[Viteの公開設定](https://vercel.com/docs/frameworks/frontend/vite)。

## 6. 公開URLで遊べるか確認する

完了画面やプロジェクト画面に `https://…vercel.app` というURLが表示されます。**Visit**などのボタンから開いてください。これが公開URLです。`localhost`や`127.0.0.1`は自分のMac用なので、人に送っても遊べません。

1. 公開URLで「こもれび喫茶」が表示されるか確認します。
2. 店・街・ギフトの下部ボタンを押し、画面が切り替わるか確認します。
3. ページを更新しても開き、お客さんと注文が残るか確認します。
4. 同じ公開URLをスマートフォンでも開き、文字とボタンを確認します。
5. 食材を発注して閉じ、入荷時刻後に同じURLを開いて確認します。

友だちに送る前に、別のブラウザでも開きます。Vercelへのログインを求められる場合は、本番URLか、公開範囲の設定がどうなっているかを確認してください。困ったらパスワードや認証コードを隠して画面を見せてください。

**セーブは端末・ブラウザ・URLごとに別です。** Macの試作画面のセーブは公開URLに自動で移りません。Macとスマホのセーブも別です。遊ぶURLは本番の同じURLに決めておくと安心です。

## 7. ゲームを直したあと、公開版も更新する方法

1. Mac内のゲームファイルを変更します。
2. GitHub Desktopで`v`を選びます。
3. Changesを確認し、Summaryに `ギフトの表示を修正` などと入力します。
4. **Commit to …**を押し、その後 **Push origin**を押します。
5. Vercelの **Deployments**で、更新の組み立てが成功したか確認します。
6. 本番の同じURLを開き、ページを更新して変更を確認します。

本番として設定されたブランチ（作業場所）に送ると自動更新されます。別のブランチだと確認用URLだけが更新される場合があります。最初は作業場所をむやみに切り替えず、Vercelの本番ブランチと同じものを使ってください。

## 困ったとき

| 状況 | まず確認すること |
| --- | --- |
| GitHubにファイルがない | `v`を選んだか。Commit後にPublishまたはPushを押したか |
| Vercelにゲームが出ない | 同じGitHubアカウントか。その保管場所のアクセスを許可したか |
| Deployが失敗した | FrameworkがViteか。BuildとOutputが表の値と同じか |
| `package.json`がないと言われた | GitHubの最初の階層にあるか。Root Directoryを余計なフォルダに変えていないか |
| 公開版が変わらない | Pushを押したか。Vercelの更新が完了したか。本番URLを開いているか |
| セーブが空になった | 試作URLや別のブラウザではないか。公開URLを変えていないか |

エラーが出たら、Vercelの **Build Logs**（組み立ての記録）を開き、失敗した付近の文章を見せてください。わからないままファイルを削除したり、設定を全部変えたりする必要はありません。

## 自分のMacで動かす方法（必要な人だけ）

**公開するだけなら、この節は飛ばせます。**

1. Node.jsがなければ、[公式サイト](https://nodejs.org/)から22.13以上の対応版（22.xまたは24.x）をインストールします。
2. Finderでゲームの`v`フォルダを表示します。
3. Macの「ターミナル」アプリを開きます。Spotlightで「ターミナル」と検索できます。
4. `cd ` と入力します。**cdの後ろに半角スペースを1つ入れ、まだEnterは押しません。**
5. Finderから`v`フォルダをターミナルへドラッグし、場所が入力されたらEnterを押します。これで、命令を実行する場所が`v`になります。
6. 以下を**1行ずつ**入力してEnterを押します。1行目が終わってから2行目を入力します。

```bash
npm ci
npm run dev:vercel
```

1行目は必要な部品の準備、2行目はゲームの起動です。表示された **Local: http://…**のURLをブラウザで開きます。ターミナルはそのままにしておきます。停止するときはターミナルで **Control＋C**を押します。Command＋Cではありません。

公開用の組み立ても確認したければ、停止後に次を1行ずつ実行します。

```bash
npm run build:vercel
npm run preview:vercel
```

赤いエラーが出て命令が終わったら、次へ進まずエラーの文章を見せてください。自動テストの命令は`npm test`です。

## 準備済みの内容と注意点

- 公開版はReact＋Viteです。元の開発環境にはvinextも使っていますが、この手順で選ぶのはViteです。
- 公開準備時に本番ビルドと全170テストが成功しています。スマホ幅320px・390px、直接URL・再読み込みもMacのブラウザで確認しました。Vercelでの最終確認は手順6で行ってください。
- 画像は同梱しています。個別画像がない料理・贈物などは既存の代替表示を使います。音声・追加フォントの設定は不要です。
- 公開版の開発メニューは表示しません。作業用ファイルや秘密情報のファイルを除外する設定も済んでいます。今後自分で追加する秘密情報にも注意してください。
- GitHubが非公開でも、ゲームの画像や文章は遊ぶ人から見えます。公開したくない内容はゲームに含めないでください。
- 保存形式は現在v21です。旧v5データの読み込み互換性を維持しています。公開対応で保存キーを変えたり、v5へ戻したりはしていません。
- コードの書き方の検査（lint）は19件のエラー・8件の警告が残っています。ビルドにも警告はありますが、組み立てと素材の存在確認は成功しています。すべての品質検査が合格したという意味ではありません。

最新のゲーム仕様は[仕様書](docs/仕様書.md)、以前の技術説明は[開発・旧仕様メモ](docs/開発・旧仕様メモ.md)に残しています。公開するだけなら、これらを読む必要はありません。
