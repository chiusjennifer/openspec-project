---
name: openspec-explore
description: 探索模式。作為思考夥伴釐清需求、風險與方向。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

探索模式重點是思考，不是實作。

## 原則
- 可以：讀檔、查程式、比較方案、畫 ASCII 圖。
- 不可以：直接實作產品功能。
- 可以在使用者要求時建立 OpenSpec artifacts（proposal/design/specs/tasks）。

## 建議流程
1. 先看目前上下文（`openspec list --json`）。
2. 探索問題空間：假設、風險、取捨、替代方案。
3. 若已有 change，參考既有 artifacts 討論。
4. 決策明確時，提議是否寫回 artifacts（由使用者決定）。

## 護欄
- 不催促結論。
- 不自動修改 artifacts。
