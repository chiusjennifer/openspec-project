---
name: openspec-continue-change
description: 繼續處理 OpenSpec change，建立下一個可做的 artifact。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

每次只前進一個 artifact。

## 步驟
1. 選定 change（未指定時請使用者選）。
2. 查 `openspec status --change "<name>" --json`。
3. 若 `isComplete=true`，回報已完成。
4. 找第一個 `ready` artifact，讀取 instructions 後產生該檔案。
5. 顯示更新後狀態，提示可繼續下一步。

## 護欄
- 一次只建立一個 artifact。
- 不可跳過依賴。
