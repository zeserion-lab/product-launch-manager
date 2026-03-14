# Vercel 公開手順書

このファイルは1回だけ実施する「初回デプロイ手順」です。  
完了後は `git push` するたびに Vercel が自動でデプロイします。

---

## ステップ 1 — GitHub にリポジトリを作成する

1. ブラウザで [github.com/new](https://github.com/new) を開く
2. 以下を設定して **Create repository** をクリック

   | 項目 | 入力値 |
   |---|---|
   | Repository name | `product-launch-manager` |
   | Visibility | Private（社内用）または Public |
   | Initialize this repository | **チェックを外す**（← 重要） |

---

## ステップ 2 — ローカルから GitHub に Push する

ターミナル（PowerShell）を開き、プロジェクトフォルダに移動して実行：

```powershell
cd "C:\Users\toru.yamamoto\Desktop\Study_AI\product-launch-manager"

# リモートリポジトリを登録（YOUR_USERNAME を GitHub のユーザー名に変更）
git remote add origin https://github.com/YOUR_USERNAME/product-launch-manager.git

# main ブランチに切り替え
git branch -M main

# GitHub に Push
git push -u origin main
```

> **認証を求められる場合**: GitHub の「Personal Access Token」またはブラウザ認証で承認してください。

---

## ステップ 3 — Vercel に接続してデプロイする

1. [vercel.com](https://vercel.com) にアクセスしてサインイン（GitHub アカウントで OK）

2. **Add New Project** をクリック

3. GitHub リポジトリ一覧から `product-launch-manager` を選択 → **Import**

4. 設定画面で以下を確認（通常は自動検出される）

   | 項目 | 値 |
   |---|---|
   | Framework Preset | **Vite** |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

5. **Deploy** ボタンをクリック → 1〜2分で完了

6. 表示された URL（例: `https://product-launch-manager-xxx.vercel.app`）にアクセスして動作確認

---

## ステップ 4（任意） — カスタムドメインを設定する

1. Vercel プロジェクトの **Settings → Domains** を開く
2. 持っているドメイン（例: `launch.example.com`）を追加
3. DNS の CNAME レコードを `cname.vercel-dns.com` に向ける

---

## 以降の更新手順

コードを変更したら以下のコマンドだけで自動デプロイされます：

```powershell
cd "C:\Users\toru.yamamoto\Desktop\Study_AI\product-launch-manager"

git add .
git commit -m "変更内容のメモ"
git push
```

Vercel が検知して自動的にビルド・デプロイします（通常30秒〜1分）。

---

## よくある問題

| 症状 | 対処 |
|---|---|
| Build failed | `npm run build` をローカルで実行してエラーを確認 |
| 画面が白い | Vercel の Framework を **Vite** に設定し直す |
| URLを開くと 404 | `vercel.json` があることを確認（リライトルール） |
| Push 後に更新されない | Vercel ダッシュボードの Deployments タブで状況確認 |

---

## プロジェクト情報

```
ローカル開発:  http://localhost:5173/
本番 URL:     https://YOUR_PROJECT.vercel.app/
GitHub:       https://github.com/YOUR_USERNAME/product-launch-manager
```
