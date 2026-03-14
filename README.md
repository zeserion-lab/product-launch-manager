# 新商品進捗管理システム
### Product Launch Manager

> 発売日を入力するだけで、企画〜発売まで **全41工程の日程を自動逆算**。  
> 遅延検知・ガントチャート・フィルター付きの業務向けWebアプリ。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/product-launch-manager)

---

## 画面イメージ

| ダッシュボード | 案件詳細（タスク一覧） | ガントチャート |
|---|---|---|
| KPI・要注意タスク | フィルター・インライン編集 | フェーズ別タイムライン |

---

## 主な機能

| 機能 | 概要 |
|---|---|
| **発売日逆算** | 発売日を入力 → 全41工程の予定日程を自動計算（総リードタイム233日） |
| **進捗管理** | ステータス5段階・進捗率・実績日付・担当者・メモをタスクごとに記録 |
| **遅延検知** | 予定完了日を超えた未完了タスクを自動赤色ハイライト |
| **フィルター検索** | キーワード・フェーズ・担当部署・ステータス・遅延/重要工程で絞込 |
| **ガントチャート** | 全工程をフェーズ別横断タイムライン表示（今日ライン付き） |
| **タスク追加・削除** | 標準41工程にカスタムタスクを追加/非表示可能 |
| **名称・部署の上書き** | テンプレートのタスク名・担当部署を案件単位で変更可能 |
| **担当者名記入** | タスクごとに担当者名を記録・検索対象に含む |
| **複数案件対応** | 案件ごとに独立管理。ダッシュボードで横断比較 |
| **データ永続化** | ブラウザの localStorage に自動保存 |

---

## ローカルで起動する

```bash
# 1. リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/product-launch-manager.git
cd product-launch-manager

# 2. 依存関係をインストール
npm install

# 3. 開発サーバーを起動
npm run dev
# → http://localhost:5173/
```

### 動作確認済み環境

- Node.js 18 以上
- 主要ブラウザ最新版（Chrome / Edge / Firefox / Safari）

---

## Vercel にデプロイする

### 方法① GitHub 連携（推奨・無料）

```bash
# 1. このリポジトリを GitHub に Push する
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/product-launch-manager.git
git push -u origin main
```

1. [vercel.com](https://vercel.com) にサインイン（GitHubアカウントで可）
2. **Add New Project** → GitHub リポジトリを選択
3. Framework Preset: **Vite** を選択（自動検出されます）
4. **Deploy** → 完了（1〜2分）

以降は `git push` のたびに自動デプロイされます。

---

### 方法② Vercel CLI

```bash
# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ（初回）
vercel --prod
```

---

### 方法③ Netlify（代替）

```bash
# ビルド
npm run build

# Netlify CLI でデプロイ
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

または [netlify.com](https://netlify.com) の GUI でも `dist/` フォルダをドラッグ&ドロップするだけで公開できます。

---

## Vercel の設定確認事項

| 設定項目 | 値 |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

`vercel.json` に SPA ルーティング設定済みのため、追加設定は不要です。

---

## ディレクトリ構成

```
product-launch-manager/
├── public/                    # 静的アセット（favicon 等）
├── src/
│   ├── types/index.ts         # 型定義（Project / TaskTemplate / ProjectTask）
│   ├── data/
│   │   ├── taskTemplates.ts   # 標準41工程テンプレート
│   │   └── sampleProject.ts   # 初期サンプルデータ
│   ├── logic/
│   │   ├── scheduleCalc.ts    # 発売日逆算ロジック（純粋関数）
│   │   └── taskUtils.ts       # 遅延判定・集計・フィルター処理
│   ├── storage/
│   │   └── projectStorage.ts  # localStorage 抽象化層 ← DB化時の差し替え箇所
│   ├── store/
│   │   └── useProjectStore.ts # Zustand グローバルストア
│   ├── components/            # 共通UIコンポーネント
│   └── pages/                 # ページコンポーネント
├── index.html
├── vercel.json                # Vercel SPA ルーティング設定
└── README.md
```

---

## データモデル

```
TaskTemplate  ── 全案件共通の工程雛形（ソースコードに固定）
     ↓ 参照
ProjectTask   ── 案件固有の実績データ（localStorage: plm:tasks:{id}）
     ↓ 合成
ProjectTaskView ── UI表示用（計算済み日程・遅延フラグ・カスタムフラグ付き）

Project       ── 案件メタ情報（localStorage: plm:projects）
  ├── tasks[]          テンプレートタスクの実績
  ├── customTasks[]    ユーザー追加タスク
  └── hiddenTaskIds[]  非表示にしたテンプレートタスクID
```

### localStorage キー仕様

```
plm:projects          → 案件メタ情報の配列（tasks を含まない）
plm:tasks:{projectId} → 案件ごとの ProjectTask[]
```

---

## 発売日逆算ロジック

```
各タスクのオフセット:
  offsetStart = 先行タスクの offsetEnd
  offsetEnd   = offsetStart + days

企画開始日 = 発売日 − 233日（GOAL タスクの offsetEnd − 1）
各タスク:
  startDate = 企画開始日 + offsetStart
  endDate   = 企画開始日 + offsetEnd − 1
```

**発売日を変更するだけで全41タスクの日程が自動再計算されます。**

---

## 遅延判定ロジック

```
isAutoDelayed(endDate, status):
  → status が completed / on_hold 以外 かつ
    endDate < today（00:00:00） → 遅延と判定

isEffectivelyDelayed:
  → 上記 OR 手動ステータス 'delayed'
```

---

## 将来の拡張

`src/storage/projectStorage.ts` の1ファイルを差し替えるだけで **REST API + DB化** が完了します。

| 現在（localStorage） | DB化後（例） |
|---|---|
| `loadAll()` | `GET /api/projects` |
| `saveProject(p)` | `PUT /api/projects/:id` |
| `saveTasks(id, tasks)` | `PATCH /api/projects/:id/tasks` |
| `deleteProject(id)` | `DELETE /api/projects/:id` |

---

## 使用技術

| ライブラリ | 用途 |
|---|---|
| React 19 + TypeScript | UI・型安全 |
| Vite 8 | ビルドツール |
| Zustand | 状態管理 |
| date-fns | 日付計算 |
| React Router v7 | クライアントルーティング |

---

## ライセンス

MIT License — 社内運用・改変・再配布自由
