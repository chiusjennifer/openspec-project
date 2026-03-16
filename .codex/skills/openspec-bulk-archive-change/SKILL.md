---
name: openspec-bulk-archive-change
description: 一次封存多個已完成變更。適用於平行開發後批次收尾。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

批次封存多個 change，並處理可能的 spec 衝突。

## 步驟
1. 取得 active changes（`openspec list --json`）。
2. 讓使用者多選要封存的 changes。
3. 蒐集每個 change 的 artifacts/tasks/delta specs 狀態。
4. 檢測 capability 衝突（多個 change 修改同一 spec）。
5. 依實作情況決定同步順序（必要時按時間序）。
6. 顯示總表與風險，請使用者確認。
7. 逐一執行 sync + archive，記錄成功/略過/失敗。
8. 輸出批次摘要。

## 護欄
- 不可自動選擇變更。
- 單一 change 失敗不應阻斷其餘項目處理。
