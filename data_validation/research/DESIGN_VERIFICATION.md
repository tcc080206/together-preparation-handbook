# 資料收集文件驗證

## 2026-11-17 單卡流程與工作清單正規化

本次依使用者要求整理C11-NWT已完成工作的操作方法，將WORK_ORDERS改為按完整卡號指定的清單；本次只修改文件，未抓取其他卡、未匯入資料、未修改程式或AGENTS。共用流程見[EXECUTION_GUIDE](EXECUTION_GUIDE.md)，以下驗收對應其文件DoD。

| DoD | 結果 | 實際驗證 |
| --- | --- | --- |
| P1 唯一卡號與範圍 | 通過 | 程式核對30個完整唯一卡號：25個金額／費用卡、5個待補範圍的辦理卡；原合併卡各子卡均保留，沒有合併或漏列。WORK_ORDERS無「第一張」、短prompt、JSON及合併卡號；C11-NWT原分類、3個穩定ID、完整情境及5個案例移到C11-NWT.md。 |
| P2 範圍與授權 | 通過 | 交叉核對WORK_ORDERS入口、EXECUTION_GUIDE、DELIVERY_SPEC、COLLECTION_PLAN與README：指定執行預設完成查核、驗證及新增匯入；只抓取／工作包／設計等限制優先；未授權核准、覆寫或before_p同步。舊的必須另說匯入與短prompt段落已移除。 |
| P3 可重現流程 | 通過 | 對照C11-NWT實際REPORT及verify腳本，列明基準、原件metadata／SHA256、候選／新增去重、暫存DB測試、兩尺寸、原子新增、正式只讀驗收及逐筆保留比對；註明腳本固定卡號／數字不可直接套用。 |
| P4 實際結果與限制 | 通過 | 執行DoD仍為A1–A6及適用N1–N9；明列來源衝突、null、部分完成、無新增及已有review情況，不能用上一批通過結果代替新批次驗證。設計P1–P5與後續資料驗收分開。 |
| P5 引用、契約與資料保留 | 通過 | 自動檢查當次7份主要文件50個相對連結均存在；DELIVERY_SPEC JSON以現有validate_batch在記憶體通過，category與C11-NWT詳細規格一致。唯讀比較C11-NWT交付基準及匯入結果：仍26 records、69 reviews、78 events；原23 records及69 reviews逐筆原文不變，3筆新增與已匯入JSON一致，正式批次與work副本位元組相同。 |

補回C06-TPE原有tpe_support_current來源線索至SOURCE_MAP，URL依既有source_registry唯讀取得，未將其當作本次重新查證的官方內容。

本次為文件變更，按工作區規範核對引用與內容一致性；未重跑不受影響的應用測試。以上只代表流程文件完成，不表示其他工作卡已執行；C11-NWT重跑也仍須重新查核。

## 2026-11-17 原金額優先設計驗證（歷史）

以下保留原設計交付當時的驗證及未執行狀態，現行範圍與派工方式以上節及引用文件為準；C11-NWT後續實際成果見其工作包。

日期2026-11-17。本紀錄取代原先「缺口優先」設計的驗證判準；目前有效文件為COLLECTION_PLAN、WORK_ORDERS、DELIVERY_SPEC與SOURCE_MAP。本次僅修改設計與README，不修改AGENTS、程式、SQLite、imports或before_p資料，沒有執行抓取或匯入。

| DoD | 結果 | 實際驗證 |
| --- | --- | --- |
| D1 平台完整收錄 | 通過 | 四份現行文件明示before_p有仍抓、完整candidate包含已有情境；平台去重只作用於import-ready，不再以before_p已存在省略。全文檢查舊「不重抓／不重派／只有新情境交candidate」等規則已移除。 |
| D2 金額與自付優先 | 通過 | 計畫列現金、補助、原費用、家長負擔與公式；卡片改以數字為交付，申請／候補延後。C16專門抓具名明列自付，未明示保留null／官方公式，不做自行加減。 |
| D3 首抓新增頁面 | 通過 | 唯讀確認平台仍為allowance、childcare、preschool-fees三類；不存在nwt-birth-amounts。before_p已有economic_nwt_birth_1／2／3；C11-NWT仍要求完整三情境，預期新增新北市生育獎勵金頁。卡片固定category與交付範本逐欄一致。 |
| D4 完整候選與入庫 | 通過 | candidate完整／import-ready僅新增／CHANGES更新提案三者明確區分。DELIVERY_SPEC金額JSON在記憶體呼叫現有validate_batch通過；沒有建立Store或寫入正式資料。 |
| D5 簡短派工與驗收 | 通過 | prompt只指定卡號、遵守文件、是否匯入與交付結果；需求全部留在檔案。工作卡與所有相對連結驗證存在。 |

後續A1–A6尚未執行／未驗證：本次未確認新北官方現行級距或金額，沒有交真實候選，也沒有建立新分頁。三情境為派工目標，不是新查證結論；若現行來源改制，執行者須交差異。

後續I1–I4尚未執行／未驗證：平台資料未自動同步before_p。此修訂不代表網站已取得新數字。來源路線仍是本地基準，政策現行性及每個金額由之後抓取驗證。
