---
name: openspec-archive-change
description: 封存已完成的 OpenSpec 變更。當使用者要在實作完成後收尾時使用。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

封存單一 change。

## 步驟
1. 若未指定 change，先列出 active changes 並請使用者選擇。
2. 檢查 artifacts 完成度（`openspec status --json`）。
3. 檢查 tasks 勾選狀態（`- [ ]` / `- [x]`）。
4. 若存在 delta specs，先評估是否同步到 `openspec/specs/`。
5. 執行封存到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。
6. 輸出封存摘要（change、schema、路徑、是否同步）。

## 護欄
- 未指定 change 時不可自動猜測。
- 有未完成項目時需警示並取得使用者確認。
