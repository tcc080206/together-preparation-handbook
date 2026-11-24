# Finding an article and continuing through the handbook

**Design goal.** A reader starting on the default home page can reach either of the two pilot articles in two link activations. On arrival, they can identify the stage and chapter, return to the list they came from, or continue to a relevant task. The website and its accessible labels stay in Traditional Chinese. The Chinese examples below are interface copy.

This specification covers the navigation review of 21 November 2026. The review and shared configuration work are complete. The proposed interface changes await implementation and acceptance. [Implementation prompt](NAVIGATION_IMPLEMENTATION_PROMPT.en.md)

## What the reader encounters today

The review used fresh Chrome sessions at 390 × 844 and 1440 × 900. Both sessions followed the health-check journey, used the in-page return link and inspected four representative chapter pages. The mobile review also opened all 15 chapters and followed the childcare-spending journey. One activation means following a link or advancing one page, starting with 備孕 already selected on the home page.

| Reader's task | Observed journey | Acceptance target |
| --- | --- | --- |
| Find the general health check for both partners | 健康準備 → 健康檢查與用藥 → 雙方一般健康檢查. Three activations. The category links back to 備孕手冊 and the article links back to its category. Neither label tells the reader the full stage and chapter. | 健康準備 → 雙方一般健康檢查. Two activations. The article shows 備孕 › 健康準備. |
| Find monthly childcare spending | 費用與支持 → 育兒與托育先了解 → 下一頁 → 每月育兒與托育支出. Four activations. The reader must know to look on page 2. | 費用與支持 → 每月育兒與托育支出. Two activations. The full category and its second page remain reachable. |
| Continue after reading the hospital packing checklist | Chapter navigation appears above the article on mobile and in the sidebar on desktop. At the end of the checklist, the reader has to look back up the page. | From the chapter footer, activate 下一章・生活安排 once to reach the daily arrangements chapter within 生產準備. |
| Ask the hospital what to bring | One sentence asks the reader to sort supplies into three groups. On the postpartum page, another sentence lists the terms to compare across care arrangements. | Show three distinct packing questions on mobile and align comparable care terms in rows on desktop. Identify unanswered provider questions explicitly. |

The snapshot contained five stages, eight catalog categories, 31 guides and 50 reviewed records. Six chapters opened with two expandable questions and no article links or structured comparison. The general health-check guide already presents its preparation questions in three steps. Reuse that pattern where order matters. The two pilot articles are editorial selections. The review did not measure reader traffic.

## Navigation behavior

### Enter through a named task

Keep the five stage cards and the existing home shortcuts. In the preconception health chapter, place a direct link to 雙方一般健康檢查 (`items_d06b904d4d523a1e`) beside the health-check category. In the costs chapter, do the same for 每月育兒與托育支出 (`items_6a6ae4b5954ad582`). The article title is visible on entry. Each group can expose one or two named shortcuts and an explicit link to the complete category, such as 看健康檢查與用藥全部事項. The complete category shows every published article on entry. Saved filter and page URLs still open their scoped list.

The two-activation target applies to those two named journeys. A later editorial option is to feature a task in the selected stage's home panel, such as 住院準備清單 after selecting 生產準備. That option is outside the required pilot.

### Show where the article belongs and where the reader came from

On desktop, place 手冊首頁 › 備孕 › 健康準備 immediately above the article title when entered through that chapter. The stage opens its selected home index and the chapter opens its reader. On mobile, keep the stage and chapter links above the title and use the existing header link for home. A shared article can appear in several stages. Use its valid entry context. On a direct visit or reload without that context, use an unambiguous registered placement. If several placements fit, show the primary category and handbook index.

A reader who opened an article from page 2 of a category also sees a return link such as 返回「育兒與托育先了解」第 2 頁. Restore the originating stage, chapter, question or collapsed state, filters, page number and initiating link focus as applicable. Only accept valid same-site return destinations. Keep shared article URLs independently usable. Repeated follows of related links must keep return context bounded and allow browser Back to retrace A → B → C one step at a time.

### Finish a chapter

Use the shared chapter order, 費用與支持 → 健康準備 → 生活安排. Keep the current chapter visibly selected in the existing chapter navigation. Place the following controls after the content, with destination names in the links.

| Position | Footer controls |
| --- | --- |
| First chapter | 下一章・健康準備 |
| Middle chapter | 上一章・費用與支持 and 下一章・生活安排 |
| Last chapter | 上一章・健康準備 and 回本階段目錄. Any editorial transition to a later stage has its own label, such as 前往產後章節. At the end of the final stage, offer 手冊首頁. |

Stack links in reading order on mobile and align previous and next on opposite sides on desktop. Omit an unavailable direction. Keep 上一頁 and 下一頁 for pagination within a list. Following a chapter link updates the URL, visible selection and heading focus together.

### Move to an adjacent stage

The stage toolbar above the chapter reader places named previous and next stage links on the right, beside the existing return link. Use the registered stage order. Each link opens the destination’s first chapter, 費用與支持. Omit the unavailable direction at each end. Phone and desktop keep the controls beside the return link, whose text may wrap on narrow screens.

Acceptance requires one activation from 備孕 to 懷孕, both directions from 懷孕, and correct neighbors and boundaries across all five stages. Verify keyboard activation, the destination heading and chapter focus, browser Back to the initiating link, and the existing viewport regression. The chapter footer and home stage index retain their own destinations.

### Link to the reader's next question

The current article footer selects the first other guide in the same category and drops the starting context. Use one or two editorially chosen links near the question or comparison they answer. The existing parenting link into postpartum care shows how two stages can refer to one owned topic.

| Placement | Reader-facing link | Stable destination |
| --- | --- | --- |
| Pregnancy health, beside the questions about preparing for an appointment | Keep 查看產檢公費與補助 | Pregnancy costs, topic `prenatal-coverage` |
| Childbirth daily arrangements, under the discharge transport question `discharge-ride` | 比較月子中心、到宅與家人照護 | Postpartum costs, topic `postpartum-care-options` |
| After the comparison in 托嬰、保母、家人照顧怎麼選 (`items_95b572be1793ad97`) | 查看每月育兒與托育支出 | Published article `items_6a6ae4b5954ad582` |

Show article links only while the target is published. A topic target must resolve to its owning chapter. A topic with useful editorial questions and an explicit public-data gap is a valid destination. Omit duplicate, withdrawn and self-referential links. Omit the section when no useful target remains.

## Page layouts

Show the task, the difference the reader needs to identify, the applicable data status and the primary action on entry. Expand sources, long terms and secondary questions on demand. A short reminder can remain a paragraph. [Project UI patterns](../ui_samples.md)

| Page and decision | Default view on desktop | Mobile, detail and missing states |
| --- | --- | --- |
| Preconception health and costs. Which article should I open? | Group the named article shortcuts with their categories. Give the article title and the complete category link separate lines. | Use one column and allow full titles to wrap. The complete category opens its full article index. |
| Pregnancy costs. Who covers or charges for this service? | Give national coverage, the selected county and provider charges distinct labeled summaries. Show each available group's status. | Stack the groups. Keep the county picker. Expand an available record to see amount, unit, period and source. Show an explicit gap for the selected county even when national data exists. |
| Childbirth health. What do I ask the hospital about packing? | Show three rows labeled 院所提供, 需要自備 and 可現場購買. Pair each label with a question the reader can ask. Link 報到入口 to the existing admission question. | Stack each label above its question. Show 待向院所確認 for unknown answers. Keep the existing action to save the preparation question. |
| Postpartum costs. Which care arrangement fits my needs? | Compare facility care, in-home care and family help in columns, with shared rows for service hours, scope of work and billing unit. Distinguish questions to ask from reviewed provider quotes. | Keep the three-way selector. Present identical field labels in the same order for each choice. Expand one named quote for its period, surcharges, cancellation terms and source. A missing price reads 待補, including where family expenses are unknown. |
| Postpartum daily arrangements. Who will take over? | Present existing prompts as a handoff table with 時段, 要接手的事 and 向誰確認. Families set names and times in the existing personal plan. | Use the same labels in stacked groups. Each question can open its guidance or be saved. An unassigned person reads 未指定. |
| Parenting daily arrangements. What needs attention now? | Group existing destinations by situation, such as 新生兒返家, 托育候補 and 入園準備. Show a representative link for each. | Show the situation names first and reveal secondary links on expansion. Keep the cross-stage link to postpartum care. Timing information must come from reviewed records. |

## Shared configuration, data and scope

Shared code, environment settings, designs and tests already live in `frontend/`. Read chapter order and URLs from the shared stage module. Keep editorial content and relationships in the owning stage manifest, with references to stable IDs across stages. The legacy launcher, existing article and question URLs, and the local personal-plan storage key remain part of the compatibility contract. [Shared README](README.md) · [Stage navigation](web/stages.mjs) · [Workspace rules](../AGENTS.md)

Public facts come from the reviewed snapshot. Keep each amount with its provider, unit, region, period, limitations and source. A successful response with missing records still shows the relevant editorial questions and gaps. A service failure shows the existing retry action and retains reader context. Preserve personal dates, owners, notes, priorities, status and ordering. Data collection, eligibility decisions, subsidy totals, estimated prices, calculated medical dates, personal-data migration and public deployment are outside this change. [Publication rules](../data_validation/BEFORE_P.md)

## Definition of Done

### Design delivery

| Criterion | Status and evidence |
| --- | --- |
| Record reproducible journeys, observed depth and review coverage. | Passed. The review table identifies both starting paths, counts and destinations. The review covered all 15 mobile chapter entries and representative desktop pages. |
| Specify the decisions an implementer needs to make on entry, return, continuation and expansion. | Passed. The navigation rules cover direct entry, ambiguous ownership and chapter boundaries. The three related routes and six layout cases specify placement, content and missing states. |
| Identify shared ownership and give the implementer a verifiable handoff. | Passed. The shared README documents both launchers. The preceding review verified their snapshot parity and all 15 chapters using temporary data. The companion prompt maps implementation to the five acceptance cases below. |

### Implementation acceptance

All five cases are **unverified for the proposed interface**. Record a result and actual evidence for each case when delivering the implementation.

| ID | Required outcome and verification |
| --- | --- |
| N1 · Reach and orientation | From the default home page at 390 × 844 and 1440 × 900, open each pilot article in two activations. Check its ID and visible stage/chapter links. Also open an article through a saved filter URL and a saved page-two URL. Return and compare the list state and initiating focus. Open a copied article URL in a fresh session and reload it. Verify both a unique and an ambiguous parent. |
| N2 · Related reading | Follow all three editorial routes and check the destination IDs, cross-stage return and browser Back. Exercise a published target, a withdrawn target and a page without a relevant target. Follow a short link chain repeatedly and verify the return URL stays bounded. Save the same shared question from two routes and confirm a single plan entry. |
| N3 · Chapter sequence | With the keyboard, follow the available chapter links through all three chapters of all five stages. Check the URL, heading, current selection, focus and applicable first/last controls. Verify that any cross-stage link names its destination and that the final stage offers a route home. |
| N4 · Readability and data | Inspect all six layout cases on phone and desktop, including expanded content. Find all three packing groups by keyboard. Compare the same field across the three postpartum choices and open a source for a named quote. Use isolated fixtures for published data, missing records, null prices, a county gap and service failure followed by retry. |
| N5 · Compatibility and layout | Check legacy routes and IDs, saved dates, owners, notes, priorities, status and order. Capture default and expanded examples at both review sizes. Run the existing eight-viewport checks for the three-screen height limit and zero page-level horizontal overflow, plus the affected project checks in the README. Report passed, failed or unverified for each case with its route, assertion or screenshot. |

## 分類頁改版

以「找改善睡眠品質」實走 390 × 844 及 1440 × 900。從首頁點「健康準備」→「營養、生活與身心」→「改善睡眠品質」（`items_708766184916e476`），共三次操作。四篇文章均屬「先了解」，選「健康」仍顯示同四篇。文章返回可把焦點交還給原連結。[測試入口](http://localhost:8780/preconception/topics/wellbeing?from=%2Fstages%2Fpreconception%3Fchapter%3Dhealth)

| 頁面／任務 | 資訊類型及元件 | 手機及展開行為 |
| --- | --- | --- |
| 營養、生活與身心等六個短分類／找指定主題 | 查找資料。標題下直接顯示所有已發布文章，沿用經濟、健康、其他的排序。桌面為兩欄標題連結卡。 | 520 px 以下為單欄，標題可換行。預設顯示所有文章。「切換分類」收合，展開後可前往其他分類。 |
| 育兒與托育先了解／找支出、照顧方式或候補 | 查找資料。以「費用與支持」「先看照顧選擇」「提前安排與分工」三組呈現全部文章；先列支出與支持。 | 分組依閱讀順序堆疊。組內連結直接可用，沒有下一頁。 |
| 伴侶共識與生活安排／找要討論的問題 | 查找資料。沿用三組具體討論題，排除已下架文章。 | 分組依閱讀順序堆疊，預設顯示全部題目。 |

分類標題上方顯示「備孕」及對應的章名。桌面也顯示「手冊首頁」。從章節開啟分類後可返回原入口。文章仍在分類下一層，沒有新增首頁捷徑。舊 `facet`、`section` 及 `p` 書籤維持有效範圍與頁次，並提供「查看全部事項」。既有伴侶分類書籤仍開啟完整題目。沒有已發布文章時顯示空狀態及回章節入口，載入失敗時沿用手冊的重試。

### 分類頁完成定義

設計交付已具備具名路徑、範圍、桌面／手機元件、展開狀態與空值處理。實作只改八個分類的共用介面及相容行為。文章內容、縣市資料、費用／補助比較、個人安排與對外發布不在本次範圍。

| 驗收 | 驗證方式 |
| --- | --- |
| 八個分類可直接開啟全部已發布文章 | 核對每個分類的文章 ID、具名分組和排序。預設頁面沒有分類用的兩個選單、重複標籤、縣市選單或翻頁控件。 |
| 保留閱讀路徑與舊網址 | 在 390 × 844 和 1440 × 900 用鍵盤走「改善睡眠品質」。檢查分類分享網址、麵包屑、重新整理、站內返回與瀏覽器 Back 的焦點，並驗證保存的篩選與第 2 頁網址。 |
| 空值、錯誤與版面 | 測試已下架文章、空分類及 503 後重試。核對兩種尺寸截圖，執行八視窗限制、Python 單元測試與 JavaScript 語法檢查。 |

### 分類頁驗證結果

| 驗收 | 狀態與證據 |
| --- | --- |
| 八個分類的文章入口 | 通過。以現行 31 篇已發布文章核對每個分類的連結 ID。「營養、生活與身心」直接呈現四篇，「育兒與托育先了解」三組合計九篇。核對兩種尺寸的實際畫面。 [瀏覽器斷言](tests/navigation.mjs) |
| 閱讀路徑與舊網址 | 通過。手機與桌面均以三次鍵盤操作抵達「改善睡眠品質」。站內返回和瀏覽器 Back 還原文章連結的焦點，分類重新整理後可返回原章節。「孕前營養評估」的舊篩選及「每月育兒與托育支出」的舊第 2 頁均可進入並返回。另在 375 px 的新工作階段驗證直接進站、可見焦點及減少動態效果。 [瀏覽器斷言](tests/navigation.mjs) |
| 空值與錯誤 | 通過。以獨立瀏覽器攔截 API，驗證單篇下架、整類空值及 503 後重試，網址保持原本的章節來處。 [瀏覽器斷言](tests/navigation.mjs) |
| 版面及專案檢查 | 通過。完整 Chrome 回歸涵蓋八種視窗，每種檢查 59 條路徑，包含八個分類的預設與展開狀態。所有版面量測無水平溢出，最高為 2.91 個螢幕高度。Python 單元測試與 JavaScript 語法檢查均成功。 [驗證指令](README.md#驗證) |
