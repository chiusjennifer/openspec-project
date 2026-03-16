---
name: openspec-ff-change
description: 快速建立所有實作前所需 artifacts，一次到 apply-ready。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

一口氣完成 proposal/design/specs/tasks（依 schema）。

## 步驟
1. 釐清需求與 change 名稱。
2. `openspec new change "<name>"`。
3. 讀 `openspec status --json` 取得 artifact 依賴順序。
4. 逐個處理 `ready` artifact：讀 instructions、依 template 建立檔案。
5. 每完成一個就重查 status，直到 `applyRequires` 全部 done。
6. 顯示最終狀態並提示 `/opsx:apply`。
