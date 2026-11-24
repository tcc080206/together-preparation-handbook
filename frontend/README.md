# 一起準備

這是五個人生階段共用的手冊專案。開發、啟動與驗證以本目錄為準。

從工作區根目錄啟動共用手冊，開啟 [http://localhost:8780/](http://localhost:8780/)。

```sh
uv run --project frontend python frontend/server.py --port 8780
```

舊指令 `uv run --project before_p python before_p/server.py --port 8780` 也會啟動同一個服務。五個階段的文字、章內項目順序、提問和資料參照分別由 `before_p/stage.json`、`after_p/stage.json`、`childbirth/stage.json`、`postpartum/stage.json`、`childcare/stage.json` 維護。原生前端置於 `frontend/web/`。同一個瀏覽器與網址來源會沿用既有個人安排。

| 需要調整的項目 | 維護位置 |
| --- | --- |
| Python 版本、套件與鎖檔 | `frontend/.python-version`、`frontend/pyproject.toml`、`frontend/uv.lock`。請在 `frontend` 更新依賴與鎖檔。備孕目錄透過相對符號連結沿用這三個檔案。 |
| 階段登錄與輸入驗證 | [stage_sources.py](stage_sources.py) 的 `REGISTRY` 與章節欄位檢查。 |
| 共用章名、閱讀順序與網址 | [stages.mjs](web/stages.mjs) 的 `stageChapters` 與網址函式。各階段檔決定本章副標及章內項目順序。 |
| 資訊呈現與導覽 | [全站資訊類型對照](../ui_samples.md)、[導覽與閱讀設計](NAVIGATION_DESIGN.en.md)及[工作區規範](../AGENTS.md)。 |

`GET /api/handbook` 在 `data_validation` 的唯讀快照加上依序驗證過的階段清單。每個事項僅展示通過人工核對的記錄，來源可從詳情展開。階段檔錯誤會在本機伺服器列出檔案和欄位，手冊畫面會提供重試。資料庫或階段檔修復後可直接重試。

孕期 `prenatal-coverage` 與產後 `postpartum-care-options` 待資料目錄建立對應，屆時由各階段在 `guideId` 填入已發布事項 ID。產檢收費的院所記錄以 `提供者類型` 為 `院所` 和公開方案分組。產後具名服務以 `照護方式` 對應 `center`、`home`、`family` 或選項顯示名稱，地區篩選、價格單位、條款和來源由個別記錄提供。採集與人工核對依[資料入口及發布條件](../data_validation/BEFORE_P.md)。

## 驗證

從工作區根目錄執行。Python 檢查需要專案的 `jsonschema` 依賴，發布門檻測試會使用暫存資料庫。

```sh
uv sync --project frontend
source frontend/.venv/bin/activate
python3 -m unittest discover -s frontend/tests
for module in frontend/web/*.mjs frontend/tests/*.mjs; do node --check "$module" || exit 1; done
```

啟動本機伺服器後，在裝有 Playwright 和 Chrome 的環境執行瀏覽器檢查。可用 `PLAYWRIGHT_MODULE` 指定已安裝的模組，`HANDBOOK_URL` 指定測試網址，`HANDBOOK_SCREENSHOTS` 指定截圖目錄。若要讀取測試快照，可用 `--database /path/to/temporary.sqlite3` 啟動伺服器。瀏覽器檢查使用獨立的個人儲存，資料情境由測試攔截 API 注入。

```sh
node frontend/tests/handbook_ui.mjs
```

釋出 8780 後可執行雙入口檢查。它會依序啟動兩個入口，使用從唯讀來源備份的暫存資料庫、暫存階段檔和同一個隔離瀏覽器工作階段。

```sh
node frontend/tests/stage_launchers.mjs
```

現行版的設計依據見[五階段設計](STAGE_READING_DESIGN.md)及[文章與個人安排設計](UI_DESIGN.md)，既有實測結果見[五階段實作驗收](ACCEPTANCE.md)。

英文交接文件包括[導覽與閱讀設計英文版](NAVIGATION_DESIGN.en.md)及[給實作者的英文 prompt](NAVIGATION_IMPLEMENTATION_PROMPT.en.md)。
