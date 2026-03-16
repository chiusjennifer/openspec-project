# 出缺勤管理系統

## 服務組成
- 前端：React + Vite（`apps/frontend`）
- 後端：Express + TypeScript（`apps/backend`）
- 資料庫：PostgreSQL
- 資料庫管理介面：pgAdmin
- 郵件測試工具：MailHog（選用）

## 本機開發（前後端本機執行，資料庫用 Docker）
1. 複製設定檔：將 `.env.example` 複製成 `.env`
2. 安裝相依套件：
   - `npm install`
3. 僅啟動資料庫相關服務：
   - `docker compose up -d postgres pgadmin`
4. 執行 migration 與 seed：
   - `npm run migrate -w apps/backend`
   - `npm run seed -w apps/backend`
5. 啟動後端（終端機 A）：
   - `npm run dev -w apps/backend`
6. 啟動前端（終端機 B）：
   - `npm run dev -w apps/frontend`
7. 開啟以下網址：
   - 前端：`http://localhost:5173`
   - API 健康檢查：`http://localhost:4000/health`
   - pgAdmin：`http://localhost:5050`

## 選用：啟動 MailHog（測試註冊/通知信）
- 啟動：
  - `docker compose up -d mailhog`
- 開啟：
  - `http://localhost:8025`

## 後端常用指令
- `npm run migrate -w apps/backend`
- `npm run seed -w apps/backend`
- `npm run test -w apps/backend`

## 前端常用指令
- `npm run dev -w apps/frontend`
- `npm run test -w apps/frontend`

## 停止服務
- 僅停止資料庫工具：
  - `docker compose stop postgres pgadmin`
- 停止並移除資料庫工具容器：
  - `docker compose rm -sf postgres pgadmin`
