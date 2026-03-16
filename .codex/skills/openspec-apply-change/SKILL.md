---
name: openspec-apply-change
description: 從 OpenSpec 變更實作任務。當使用者要開始實作、繼續實作或逐項完成任務時使用。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

實作指定 change 的 tasks。

## 步驟
1. 選定 change（未指定時先列出可用 change 讓使用者選）。
2. 執行 `openspec status --change "<name>" --json` 讀取 schema 與 artifact 狀態。
3. 執行 `openspec instructions apply --change "<name>" --json` 取得 `contextFiles`、`tasks` 與進度。
4. 讀取 `contextFiles`，回報目前進度（N/M）。
5. 逐項實作 pending task：完成後把 `- [ ]` 改成 `- [x]`。
6. 如遇不清楚需求、設計衝突、錯誤或阻塞，暫停並回報。
7. 結束時輸出本次完成項目與總進度。

## 護欄
- 不可跳過依賴順序。
- 有疑問先確認，不要猜。
- 每完成一項任務就立即更新 tasks.md。
