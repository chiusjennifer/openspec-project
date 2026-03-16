---
name: openspec-verify-change
description: 驗證實作與 change artifacts 的一致性（完整性、正確性、連貫性）。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

驗證是否可安全封存。

## 驗證面向
- Completeness：tasks 與 requirements 是否完整落地。
- Correctness：實作是否符合 requirement/scenario。
- Coherence：是否符合 design 與專案模式。

## 步驟
1. 選定 change。
2. 讀 `status` 與 `instructions apply` 取得 contextFiles。
3. 檢查 tasks、specs、design 與程式碼實作對應。
4. 輸出分級結果：CRITICAL / WARNING / SUGGESTION。
5. 給出具體修正建議（含檔案位置）。
