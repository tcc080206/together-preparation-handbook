# 金額抓取交付契約（修訂版）

本版依2026-11-17使用者指示取代舊版補缺口流程。[工作單](WORK_ORDERS.md)指定情境全部重查、完整交付；**before_p有資料不是略過理由，平台內去重只決定怎麼匯入，不決定抓不抓。**

## 1. 工作範圍

每次一張完整子卡。讀工作區AGENTS、[單卡執行流程](EXECUTION_GUIDE.md)、[計畫](COLLECTION_PLAN.md)、該卡及[SOURCE_MAP](SOURCE_MAP.md)對應來源。

工作包放 `data_validation/work/<完整卡號>/<執行日期>-<run>/`。不修改before_p、程式或既有快照，不直接寫正式SQLite；正式資料僅由下述新增匯入流程接入；不呼叫平台核准／套用API，不預設review狀態。before_p的fetch／review／promote／release工具有連帶寫入，不在本任務執行。

使用者指定「執行＋完整卡號」即按[單卡執行流程](EXECUTION_GUIDE.md)完成抓取、驗證及本機新增匯入，不另詢問是否匯入。檢查通過後將**只含新增記錄**的import-ready副本原子放入data/imports，再讀平台確認分頁。使用者明說只抓取、只要工作包或禁止匯入時，僅交工作包及可新增檔，不自動匯入；只做設計時不抓取或改資料。任何情況不得替使用者標✅或換ID覆寫同情境。

## 2. 抓取順序

1. 列出工作卡全部情境。唯讀檢查平台與before_p基準，記錄兩邊有無資料，但全部繼續查。
2. 追官方現行正文／附表或機構公開價格，核對執行日適用版本。原有快照可協助定位；未重新確認的舊來源不能當今日已查證。
3. 每卡原則最多6個證據文件、3組針對性搜尋；同網域至少間隔2秒、逾時25秒、不自動重試。登入／驗證碼／403停止該路徑，不對外聯繫。超過預算列精確缺口與續卡，不捏造結果。
4. 保存原件、標題、表頭、註腳、頁碼、URL／final URL、取得時間及SHA256；OCR數字／負號／註腳須目視影像確認。
5. 先提取金額或公式，再列會影響數字的條件。每筆標「補助／原費用／明列自付／公式」；不要把文件清單當主要交付。
6. 每個情境產生完整candidate，已有記錄仍含完整fields與sources。純缺證據者列REPORT缺口，不為新增頁面填舊值或假來源。
7. 平台沒有的情境放import-ready；平台相同的保留完整candidate但略過新增；平台不同的列CHANGES待更新，不改ID繞過衝突。
8. 驗證A1–A6。一般執行任務依預設範圍匯入可新增資料並確認分頁；只抓取等限制範圍不匯入，明示本次未上線。

結果標記supported、conflict、not-found、blocked、官方明示的not-applicable。已有before_p數字不代表supported；只有原件與精確定位才支持本次結論。

## 3. 必交檔案

```text
REPORT.md               # 全情境矩陣、金額涵蓋、缺口、A1–A6實際狀態
candidate-<type>.json    # 本卡完整候選，包含平台已有記錄；不得只交差異
import-ready-<type>.json # 僅平台不存在的情境；無新增就不建，說明原因
EVIDENCE.md             # 每個數字、金額性質、單位、關鍵條件及期間的原文證據
MAPPING.md              # 情境→平台ID→before_p舊ID，及新增／一致／需更新
CHANGES.md              # 舊值、新值與原因；無變動也明示
SNAPSHOTS.md            # source id、URL、final URL、原件路徑、SHA256、取得狀態
raw/                    # 原始文件，OCR不能取代原件
```

資料全部歸平台工作目錄保存，before_p僅為消費端。candidate按原型態分檔，每檔符合現行batch契約；平台分類不同可拆檔。REPORT必須統計「指定情境、完整候選、平台新增、平台一致、平台需更新、來源未決」，不能用0新增宣稱無需抓取。

## 4. 固定格式與數字規則

現行JSON頂層只有schema_version、batch_id、category、records；record只有id、type、title、fields、sources、checked_at、provenance。參照[匯入契約](../ADDING_DATA.md)。證據／映射側檔不新增JSON頂層欄。

- 定額或明列自付：review_fields為金額、條件、限制；金額為integer，其他text。
- 公式：review_fields為給付公式、條件、限制；皆text。自付公式則改用自付公式。不要含金額欄硬塞公式。
- fields背景必含提供者、地區、單位、金額性質、適用起日、適用迄日；金額必為純非負整數文字或null。期間未知為null，不能將公告日或抓取日當生效日。
- 金額性質：定額現金／補助上限／加發額／原費用／家長繳費上限／明列自付，不能混稱。
- 條件只優先列改變數字或領取資格的年齡、序位、收入身分、戶籍、服務與時段；限制優先列核實、上限、互斥及排除費項。
- checked_at是實際對照原文日期，只有下載或搜尋就null。provenance明示模型候選及未決處，不宣稱使用者核准。
- 每個非null數字都有直接來源，不以搜尋摘要、入口或before_p舊值作證。

### 自付資料必須遵守

先查官方／機構明列的自付額。fields另列「原費用」「原費用單位」「補助／減免說明」「自付來源類型」「費用包含」「費用排除」「情境對應ID」。原費用未知用null，不能反推補助前原價。

金額欄若表示自付，金額性質必為明列自付或家長繳費上限，限制必說明未包含的費項。原價及補助是不同事實記錄，用情境對應ID連結；自付未明示時金額為null，說明缺什麼，不自行計算。官方有完整公式則以自付公式型交付，不自行代入假設價格、補助額或資格。現金獎勵沒有對應消費，不硬加自付欄。

### C11-NWT金額範本（只示意結構，非實際資料）

```json
{
  "schema_version": 1,
  "batch_id": "c11-nwt-20261117-01-complete",
  "category": {
    "id": "nwt-birth-amounts",
    "title": "新北市生育獎勵金",
    "description": "新北市地方生育獎勵金，第1名、第2名及第3名以上；依現行官方出生日期、序位與戶籍條件。一次性現金給付，不含中央保險生育給付。",
    "order": 40,
    "review_fields": ["金額", "條件", "限制"],
    "field_types": {"金額": "integer", "條件": "text", "限制": "text"}
  },
  "records": [{
    "id": "nwt-birth-amounts-first",
    "type": "nwt-birth-amounts",
    "title": "新北市生育獎勵金：第1名",
    "fields": {
      "金額": null,
      "條件": null,
      "限制": null,
      "提供者": null,
      "地區": "TW-NWT",
      "單位": null,
      "金額性質": "定額現金",
      "適用起日": null,
      "適用迄日": null
    },
    "sources": [{"title": "請替換為現行官方依據", "url": "https://example.com/", "locator": "請替換為金額表列與註腳"}],
    "checked_at": null,
    "provenance": "僅格式範例，不得直接匯入"
  }]
}
```

實際交付補齊三個情境，三筆各有對應證據，不能直接使用示例URL。完整candidate與import-ready必須用不同batch_id後綴（例如-complete與-new），不可將完整candidate直接丟入imports碰運氣。

## 5. 平台去重與before_p映射

語意鍵為地區＋方案＋服務＋年齡＋序位／身分＋金額性質＋期間。平台已有情境沿用其ID；before_p有而平台沒有的情境必須新建平台record，不能只交CHANGES。若尚無同名分類，使用卡片設定；分類已存在完整複製SQLite設定。

C11-NWT設定固定。其他新分類依卡片slug，title用地區＋數字主題，description明示範圍，order用卡號×100。重要欄位只三個。欄位、分類與ID不能因不同模型產出而重複。

| 情況 | 完整抓取與candidate | import-ready |
| --- | --- | --- |
| before_p有，平台無 | 要，包含全部數字與證據 | 要，屬平台新增 |
| 兩邊都無 | 要，有實際證據才建候選 | 要 |
| 平台有且一致 | 要，本次證據保存 | 不新增，不改review |
| 平台有但不同 | 要，沿用ID列CHANGES | 不新增，待既有資料更新流程 |
| 來源無法支持 | 問題與缺口必交，值不猜 | 不為新增分頁匯入假資料 |

現有importer只做新增；不是更新器。較弱模型不改SQLite，不換日期ID繞過衝突；平台更新提案及證據保存於work以免遺失。平台主資料完整收錄後，before_p的版本化整合另行驗證，目前沒有自動回寫。

## 6. 證據與驗證

EVIDENCE每列含：record ID、欄位、原文、source URL／snapshot、頁碼／表列／註腳、SHA256、有效期、supported／conflict等狀態。公式保留全部變數、計算基礎與上限；金額、費用性質、單位與條件可有不同證據。

MAPPING列：語意情境、平台ID或null、before_p ID或null、本次candidate ID、新增／一致／需更新。CHANGES列原值→新值、原因及證據。REPORT逐列列指定情境的完成狀態。

從工作區根目錄執行只讀格式驗證，folder換成任務目錄；不建立Store、不掃描正式imports：

```sh
uv run --project data_validation python -B - <<'PY'
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path('data_validation').resolve()))
from importing import validate_batch
folder = Path('data_validation/work/C11-NWT/2026-11-17-01')
files = list(folder.glob('candidate-*.json')) + list(folder.glob('import-ready-*.json'))
if not files:
    raise SystemExit('沒有候選：須回報來源缺口，不得宣稱金額抓取完成。')
for path in files:
    batch = validate_batch(json.loads(path.read_text()))
    print(path.name, len(batch['records']), '筆：格式通過')
PY
```

執行包含匯入的任務時：先唯讀比對平台ID與分類、檢查證據及import-ready範圍，再用新檔名以.tmp寫完後改為.json放data/imports。重新整理或GET資料API觸發匯入，檢查import_results無錯誤、分類網址可用、預期筆數與來源正確、初始未核對。重複匯入不應多出記錄。失敗時回報原因，不能改既有資料來讓匯入通過。

若缺來源或級距與預期不同，交部分完成與下一步；格式通過不是政策核准。before_p網站更新不在抓取／新增匯入授權範圍內。

完整驗證、暫存資料庫操作、匯入前後保留比對及交付DoD依[單卡執行流程](EXECUTION_GUIDE.md)。C11-NWT固定分類與ID見[卡片規格](C11-NWT.md)，實際完成證據見該卡工作包，不將格式範本視為現行政策資料。
