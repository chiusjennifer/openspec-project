---
name: openspec-new-change
description: 建立新的 OpenSpec change，開始 artifact 工作流。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

建立 change 並顯示第一個 artifact 指示。

## 步驟
1. 釐清需求與 change 名稱（kebab-case）。
2. 依需求選 schema（未指定則用預設）。
3. `openspec new change "<name>"`。
4. `openspec status --change "<name>"` 檢查 artifact。
5. 找出第一個 `ready` artifact，顯示其 instructions。
6. 停在這裡，等待使用者指示。

## 護欄
- 不直接建立 artifact。
