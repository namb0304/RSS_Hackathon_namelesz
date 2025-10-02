# ---- 1. Development Stage ----
# 開発サーバーを実行するためのベース環境
FROM node:22-slim AS development

# pnpmをグローバルにインストール
RUN npm install -g pnpm

# アプリケーションの作業ディレクトリを設定
WORKDIR /app

# まず依存関係ファイルだけをコピーして、pnpm installを実行
# これにより、依存関係に変更がない限りキャッシュが使われ、高速化される
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# アプリケーションのソースコードをコピー
COPY . .

# Vite開発サーバーを外部からアクセス可能にする
EXPOSE 5173

# 開発サーバーを起動するデフォルトコマンド
CMD [ "pnpm", "dev", "--host" ]


# ---- 2. Builder Stage ----
# 本番用の静的ファイルをビルドするための環境
FROM node:22-slim AS builder

RUN npm install -g pnpm
WORKDIR /app

# 依存関係をインストール
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# ソースコードをコピーしてビルドを実行
COPY . .
RUN pnpm build


# ---- 3. Production Stage ----
# ビルドされた静的ファイルを配信するための最終的な本番環境
FROM nginx:1.28-alpine AS production

# builderステージからビルド済みの静的ファイル（distディレクトリ）をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# NginxがVue Routerの履歴モードを正しく処理するための設定ファイルをコピー
# （この後、nginx.confファイルを作成します）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginxが使用するポートを公開
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]