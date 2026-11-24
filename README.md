# 一起準備

從備孕到育兒的五階段手冊。讀者在手冊瀏覽內容與安排事項，資料維護者使用獨立的本機核對平台。以下指令從儲存庫根目錄執行。macOS、Linux 或 WSL 使用 Git clone 可保留舊入口需要的符號連結。

## 第一次啟動

準備 Git 與 [uv](https://docs.astral.sh/uv/getting-started/installation/)。uv 會依專案設定準備 Python 與套件。一般瀏覽手冊只需要這套環境。

1. 在第一個終端機啟動資料核對平台。

   ```sh
   uv sync --locked --project frontend
   uv run --locked --project data_validation python data_validation/server.py --port 8790
   ```

   開啟 [核對平台](http://localhost:8790/allowance) 載入分類與匯入批次。首次啟動會以版本庫中的 JSON 建立本機 SQLite。
2. 在第二個終端機啟動手冊。

   ```sh
   uv run --locked --project frontend python frontend/server.py --port 8780
   ```

   開啟 [手冊首頁](http://localhost:8780/)。若頁面提示重試，先確認第一步成功，再重新載入。新環境有五個階段，尚待人工核對的資料會顯示待補。
3. 使用 Ctrl+C 停止各服務。往後只閱讀手冊時，可以單獨啟動 8780。每位協作者各自保有核對紀錄；透過 Git 交換程式及 JSON 匯入批次。

## 從哪裡開始改

| 工作 | 位置 |
| --- | --- |
| 網站、共用環境、測試 | [frontend](frontend/README.md) |
| 階段內容 | 備孕 `before_p/`、懷孕 `after_p/`、生產準備 `childbirth/`、產後 `postpartum/`、育兒 `childcare/`，各有一份 `stage.json` |
| 新增資料、來源與人工核對 | [資料採集規格](data_validation/ADDING_DATA.md)、[核對平台](data_validation/README.md) |
| 研究草稿、題目與來源線索 | [docs/notes](docs/notes/) |
| 工作規範與閱讀元件 | [AGENTS.md](AGENTS.md)、[資訊呈現對照](ui_samples.md) |

新增 Python 模組沿用小寫底線命名，研究筆記用小寫連字號及副檔名。階段目錄、資料 ID、網址與舊啟動入口有既有引用，沿用現名。

## 提交與驗證

從 main 建立任務分支，例如 `git switch -c docs/setup-guide`。PR 說明影響的階段、測試結果，以及資料待補之處。介面變更附手機與桌面驗證。提交前用 `git diff --cached --stat` 檢查檔案範圍。

```sh
uv run --locked --project frontend python -m unittest discover -s frontend/tests
uv run --locked --project data_validation python -m unittest discover -s data_validation/tests
```

瀏覽器測試另需 Node.js 20 以上、npm 與 Google Chrome。在根目錄執行 `npm ci` 安裝鎖定的 Playwright，再依 [手冊測試指令](frontend/README.md#驗證) 或 [平台測試指令](data_validation/README.md#驗證) 操作。

Git 收錄現行程式、初始資料、匯入批次及研究規格。本機 SQLite、核對歷史、備份、研究工作底稿（`data_validation/work/`）及歷史封存（`data_validation/archive/`）由維護者另存。研究文件連往這兩個目錄的證據需由維護者提供。要接手既有核對進度，依平台 README 在停機後交接完整 data 目錄。

## 選用 UI/UX Pro Max

本機的 `.agents/skills/` 含多個個人工具，已列入 Git 忽略。協作者可直接進行開發與測試；使用 Codex 輔助設計時，可在專案根目錄自行執行 `npx ui-ux-pro-max-cli init --ai universal` 安裝至 `.agents/skills/`。這會取得上游提供的版本，本機舊安裝的版本尚未確認。[上游安裝說明](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation)
