---
name: openspec-sync-specs
description: 將 change 的 delta specs 同步到主規格 `openspec/specs`。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

同步 delta specs（agent-driven 智慧合併）。

## 步驟
1. 選定 change。
2. 找 `openspec/changes/<name>/specs/*/spec.md`。
3. 對每個 capability 讀 delta + main spec。
4. 套用 ADDED / MODIFIED / REMOVED / RENAMED。
5. 若 main spec 不存在則建立。
6. 輸出同步摘要。

## 護欄
- 先讀後改。
- 保留未被 delta 提及的既有內容。
- 盡量保持重複執行結果一致（idempotent）。
