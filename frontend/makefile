# .PHONY: ターゲットがファイル名と被ってもコマンドとして実行されるようにするおまじない
.PHONY: help up down shell logs build serve clean

# デフォルトのコマンド（makeとだけ打った時に実行される）
help:
	@echo "======================================================================="
	@echo "利用可能なコマンド一覧:"
	@echo "-----------------------------------------------------------------------"
	@echo " make up      - 開発用コンテナを起動します"
	@echo " make down    - 開発用コンテナを停止します"
	@echo " make shell   - 開発用コンテナ内でシェルを起動します"
	@echo " make logs    - 開発用コンテナのログを表示します"
	@echo " make build   - 本番用Dockerイメージをビルドします"
	@echo " make serve   - 本番用コンテナを起動します"
	@echo " make clean   - 停止したコンテナやビルド済みイメージを削除します"
	@echo "======================================================================="

# 開発コンテナを起動
up:
	docker compose up -d

# 開発コンテナを停止
down:
	docker compose down

# 開発コンテナ内でシェルを起動
shell:
	docker compose exec dev sh

# 開発コンテナのログを表示
logs:
	docker compose logs -f

# 本番用のDockerイメージをビルド
build:
	docker build --target production -t thanks-relay-prod .

# 本番用コンテナを起動して、ビルドされたアプリをサーブ
serve:
	docker run -it -d -p 8080:80 --name thanks-relay-prod-instance thanks-relay-prod


# 不要なコンテナやイメージをクリーンアップ
clean:
	docker compose down --volumes --remove-orphans --rmi local
	docker rm -f thanks-relay-prod-instance || true
	docker rmi thanks-relay-prod || true
	docker image prune -f