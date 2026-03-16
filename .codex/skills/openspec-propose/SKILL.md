---
name: openspec-propose
description: 一次產出完整提案 artifacts（proposal/design/specs/tasks）。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

快速建立 change 並完成可實作前所有 artifacts。

## 步驟
1. 釐清需求與 change 名稱。
2. `openspec new change "<name>"`。
3. `openspec status --json` 取得 `applyRequires` 與依賴順序。
4. 逐一建立所有 `ready` artifacts（依 instructions/template）。
5. 每次建立後重查 status，直到 apply-ready。
6. 輸出總結並提示可用 `/opsx:apply`。
