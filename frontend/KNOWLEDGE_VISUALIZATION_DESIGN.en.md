# Knowledge visualization and reading design

The five-stage 一起準備 handbook should help readers understand a concept, compare options, or complete a preparation task. Show the answer or task near the title. Put supporting detail, sources, and optional interactions where they help the reader act. Keep the live interface in Traditional Chinese. The implementation prompt scopes the first release to four routes that exercise three different content patterns. [Implementation prompt](KNOWLEDGE_VISUALIZATION_IMPLEMENTATION_PROMPT.en.md)

## Current reading journey

The 21 November 2026 review inspected the desktop home page and representative desktop pages, all 15 chapter entries at 390 × 844 in Chrome emulation, and representative articles, category, plan, and settings pages. The live snapshot contained eight categories, 31 item guides, and 61 reviewed public records. Counts describe that review snapshot.

| Reader task | Observed behavior | Design target |
| --- | --- | --- |
| Understand the menstrual cycle | From the default home page, activate 健康準備 → 認識受孕 → 女性月經週期及排卵期. The three-link path opens a consultation prompt and public-data status, with a county selector above the title. | Reach the article in two link activations through a named shortcut in 健康準備. Show the cycle explanation on arrival. Keep 認識受孕 available. [Health chapter](http://localhost:8780/stages/preconception?chapter=health) · [Cycle article](http://localhost:8780/items/items_efaf52d747c28054) |
| Find a topic to discuss with a partner | All five topics carry 先了解 and 生活安排. The fifth topic requires 下一頁. The two filters and county selector appear before the topics. | Show all five topics on one page. Use question titles and useful discussion groups. [Partner discussion](http://localhost:8780/preconception/topics/partnership?from=%2Fstages%2Fpreconception%3Fchapter%3Ddaily) |
| Prepare for hospital admission | The packing question already groups supplies by 院所提供, 需要自備, and 可現場購買. The separate admission question covers when and how to contact the hospital. | Turn the existing groups into a checklist that readers can confirm with the hospital and resume later. Keep the admission question easy to reach. [Hospital preparation](http://localhost:8780/stages/childbirth?chapter=health) |
| Compare postpartum care | Desktop already has a comparison table. The phone layout shows one option at a time. The reviewed provider price was pending in the observed snapshot. | Reuse the desktop table and support an aligned two-option comparison on phones. Keep provider quotes and their availability next to the relevant option. [Postpartum care](http://localhost:8780/stages/postpartum?chapter=costs&topic=postpartum-care-options) |

The in-page return from the cycle article restored focus to its link in 認識受孕. The return from postpartum care restored focus to 新生兒返家前後的照護選擇 in the parenting chapter. Preserve this behavior for the new shortcut, comparisons, and related links. Existing chapter navigation handles sequential reading. Breadcrumbs locate an article on direct entry. [Navigation design](NAVIGATION_DESIGN.en.md)

## Pilot layouts and behavior

### Menstrual cycle and ovulation

**Task and format.** Scan four physiological changes and understand which ones occur together. Show the takeaway 「月經來的第一天，也是卵巢濾泡期的第一天。」 followed by four summary cards and a supporting two-track educational SVG with an adjacent text equivalent. The cards are the entry point for scanning. The figure explains how the changes overlap.

Place ovarian changes on one track and uterine lining changes on the other. Align the start of menstrual bleeding with the start of the follicular phase. Use a point or release marker for ovulation, then show the luteal phase on the ovarian track. Label the drawing 「示意，時間因人及週期而異」. The four summaries describe events and phases from two parts of the body. Their order or relative widths carry no duration information. [Endotext clinical reference](https://www.ncbi.nlm.nih.gov/books/NBK279054/)

| Summary | Surface and SVG | Example copy |
| --- | --- | --- |
| 月經期 | `#F7DEDB`, blood drop | 子宮內膜剝落，出現月經出血 |
| 濾泡期 | `#E3ECDB`, sprout | 濾泡發育，子宮內膜逐漸增厚 |
| 排卵 | `#F8E8C6`, sun | 成熟卵子由卵巢釋放 |
| 黃體期 | `#E2E6F2`, moon | 黃體分泌黃體素，維持子宮內膜 |

Use a full-width 2 × 2 grid from 520 px up. At 390 px, place the cards in one column. Each rounded pastel card has a matching line icon at top left and an index from 01 to 04 at top right, with the title and one-line summary below. The index identifies the card in reading order. All four cards and the figure are visible by default and the cards have no expanded state. This editorial section uses four required summaries. Missing or invalid article data follows the existing handbook retry path. Keep 回顧紀錄 and 諮詢時 below the explanation and retain their save action. Link 驗孕時間與方式 by its existing published ID `items_b8e9494ab24f080e`. Keep the regular article route `items_efaf52d747c28054` with the 健康準備 return context and preserve preparation bookmarks.

The reference-image revision is scoped to this article's summaries, their layout, and checks of the existing reading path. For its design handoff, the supplied image defines the four labels, summaries, icons, and desktop arrangement. For implementation acceptance, verify the four cards and both layouts at 1440 × 900 and 390 × 844, confirm text and index contrast of at least 4.5:1, and exercise direct entry, reload, keyboard preparation, and return focus. Check the existing eight viewport limits for page height and horizontal overflow. Changes to other articles, personal data, and public release are outside this revision.

The pilot includes the static figure after editorial and clinical review. A later disclosure may add a qualitative hormone curve with direct curve labels, line styles, and a text explanation. An optional keyboard-operable control may highlight the associated features on both tracks. The approved static explanation covers the full concept when a curve or interaction is unavailable. Personal cycle prediction is outside this design.

### Partner discussion

**Task and format.** Find a useful opening question. Use a compact grouped list on phone and desktop. Keep all five existing destinations visible in reading order under three headings. Use 生育意願與家庭規劃 for readiness and the number or spacing of children, 支出與空間 for spending and housing, and 照顧與備援 for care, pickup, and backup. Each link can carry a one-line description if it adds a concrete prompt. The category index follows the shared reading design. [Category index](NAVIGATION_DESIGN.en.md#分類頁改版)

An old page-two link still resolves to this category and exposes the fifth topic. Preserve any originating chapter and return focus. Render only available guide links. If none remain, show a short message with a route to 備孕・生活安排. Keep the existing guide IDs and use the same published entry for 家人照顧、接送與臨時備援 across stages.

### Hospital preparation

**Task and format.** Confirm what the hospital supplies and prepare what the family needs to bring. Keep the first packing question open on initial entry and expose a named 報到與聯絡 link to the existing `admission` question. Start with 待向院所確認 and use three prompts from the existing guidance about admission documents, supplies for the parent, and supplies for the baby. A labeled 新增物品 control lets the reader enter an item to ask about or prepare. Each item begins unclassified or uses the reader's prior classification. The reader can assign it to 院所提供, 需要自備, or 可現場購買. Within 需要自備, a labeled checkbox toggles 已備妥. Calculate progress from self-supply items only. If that group is empty, show 「尚未確認需要自備的用品」. An item moved out of that group stops contributing to progress.

Use three group columns on desktop and stacked groups with the same labels on phone. Keep row labels and status visible. Use the existing plan for optional owner and notes. The reader explicitly saves to 我的安排 using the existing `hospital-bag` question identity, with stable row IDs for checklist progress. Reload restores saved items, assignments, and checkmarks. Previously saved question entries read normally and initialize checklist state when first used. Show unsaved changes in the current view if local storage fails, with a retry control. Preserve the original saved content if it cannot be read. The labels record the reader's confirmations and preparations.

### Postpartum care comparison

**Task and format.** Compare what help is available, when it is available, and how it is billed. Reuse the existing three-option table on desktop. On phone, show the three options and the existing single-option detail first. An explicit comparison control opens the same rows for two options selected by the reader. A suitable initial pair is 月子中心／產後護理之家 and 到宅照護. The second option stays distinct and can be switched to 家人協助. Use stacked cells with repeated option names if the width cannot hold readable columns. Keep the existing `care` URL selection usable after reload. A shared URL opens the specified base option and follows the existing return behavior.

| Comparison row | 月子中心／產後護理之家 | 到宅照護 | 家人協助 |
| --- | --- | --- | --- |
| 何時有人接手 | Dates and overnight care | Shifts and overtime | Availability and backup |
| 哪些工作有包含 | Care, meals, and extras | Care, household tasks, and travel | Tasks the family can take on, breaks, and handoff |
| 費用怎麼看 | Per day or package, minimum stay and deposit | Per hour or shift, travel and overtime | Expenses to discuss, with the amount pending until known |

These rows are questions to ask. Keep reviewed provider quotes directly under the relevant option, separate from the prompts. The quote disclosure includes provider, location, price unit, effective period, terms, and source. Where quotes are absent, show 「具名服務報價資料待補」. A published quote with an unknown amount keeps its detail and displays 待補. Keep the national and selected-county status where applicable. Continue to 家人分工 and preserve the entry from 新生兒返家.

## Shared presentation and editorial rules

Use Soft Educational Infographic as a treatment within the current design. Apply Soft UI Evolution (#19) to warm surfaces and visible contrast, Flat Design (#12) to explanatory SVGs, Editorial Grid / Magazine (#66) to narrow text paired with wider figures, and Micro-interactions (#16) to useful selection, expansion, and completion feedback. Keep the current typefaces, spacing, focus, and controls. Keep the cycle palette local to the cards and figure and check contrast against the actual card text and index colors. [Shared styles](web/styles.css)

Reuse five patterns by task: a figure with labels and text equivalent, a timeline or ordered steps, aligned comparison rows, a detail disclosure, and a checklist. Use a 44 px interaction target, readable labels, controls that work by keyboard and touch, visible focus, and reduced-motion support. Label states and lines directly so readers can understand them without distinguishing colors. On phones, place the first answer or action above secondary panels. Add a linkable article outline when a longer article contains genuinely distinct sections. Short explanations, contact links, and guidance prompts can remain plain text.

Define page intent in the owning editorial content. A static knowledge block uses reviewed editorial copy and credible references. County or public-record status appears only for blocks where geography or a reviewed record changes the answer. Policy and provider blocks continue to use `data_validation` and show source, applicable period, area, unit, and limits. A failed data request offers retry and preserves the route. Personal form validation checks the user's input. Calculators additionally test their formulas, units, allowed inputs, and error states. Maintain stable IDs and existing shared URLs. [Workspace rules](../AGENTS.md) · [Display patterns](../ui_samples.md) · [Publication rules](../data_validation/BEFORE_P.md)

## Pilot order and later opportunities

Start the pilot with the cycle explanation and shortcut and the partner category simplification. They address immediate reading friction with limited rendering changes and an editorial review of the figure. Next, use the hospital checklist and postpartum comparison to exercise saved state and a responsive comparison. These require more implementation and verification because they interact with the plan or reviewed public records.

| Priority and reader task | Information type and desktop pattern | Phone and data behavior |
| --- | --- | --- |
| P1 · Find a named article or next action | Link to a named task inside the relevant chapter. Add keyword search for published titles, aliases, and chapter topics. Results show the stage and chapter. | Put a labeled search entry in the handbook. Add a stage filter when it changes actual results. An empty query offers common tasks, no matches offer a way to clear filters, and returning restores the query, result, and focus. |
| P1 · Prepare for a prenatal appointment | Put what to bring and what to ask in a checklist. A timeline can show reviewed general time windows. Keep national and county coverage and provider fees in distinct labeled groups. | Stack time windows and checklist groups. Show unknown coverage explicitly. The user sets any personal appointment date. [Visit preparation](http://localhost:8780/stages/pregnancy?chapter=health) · [Prenatal coverage](http://localhost:8780/stages/pregnancy?chapter=costs&topic=prenatal-coverage) |
| P1 · Review vaccine or registration steps | Group vaccine preparation by finding records and asking a clinician. Group birth registration and benefit applications by documents, filing, and follow-up. | Use preparation statuses such as 已找到紀錄 and 已向院所確認. Official vaccine records and application deadlines come from their respective official sources. [Vaccine preparation](http://localhost:8780/items/items_5223e253480bb40a) |
| P2 · Understand changes in childcare needs | Use a branching timeline for newborn care, childcare waitlists, and preschool entry. Open details for visits, documents, and backup care. | Use a vertical path with multiple entry points. Tie age windows and deadlines to reviewed sources. [Age transitions](http://localhost:8780/items/overview_care-age-transitions) |
| P2 · Compare monthly childcare and preschool costs | Side-by-side budget calculator for user-entered monthly fees and explicitly entered periodic charges and periods. Show the inputs used, the monthly equivalent and any missing components. Compare policy amounts in the existing matrix by age and care setting. | Stack editable figures and results. Keep a blank amount unknown and treat an explicit zero as zero. Give field-level errors for invalid amounts and periods. Show public caps and benefits alongside the estimate using their own units and dates. A bar chart is useful only for comparable amounts with the same area, period, unit, and fee scope. [Monthly spending](http://localhost:8780/items/items_6a6ae4b5954ad582) · [Preschool fees](http://localhost:8780/items/overview_kindergarten-preparation) · [Benefit matrix](http://localhost:8780/items/items_095c7855adf6a94c) |
| Separate assessment · Estimate pregnancy dates or check benefits | The handbook can show clinician-confirmed dates entered by the reader and locate individual official benefit scenarios. Estimated due dates or gestational age would require scoped approval and clinical review of the method, assumptions, unsupported inputs, and uncertainty. | For any future estimate, show the reference date and the method next to the result. Existing rules exclude medical action date calculation, automatic eligibility decisions, and subsidy totals. [ACOG dating guidance](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date) |

## Definition of Done

### Design delivery

| Criterion | Status and evidence |
| --- | --- |
| Record the current journey, page evidence, and review coverage. | **Passed.** The journey table gives the three-activation baseline, named destinations, and browser observations. The review covered all 15 mobile chapter entries and representative desktop pages. |
| Specify three representative content patterns, with default and expanded states on phone and desktop. | **Passed.** The cycle figure, hospital checklist, and postpartum comparison define reading order, controls, and applicable missing or error states. The partner category adds a scoped content simplification. |
| Define sources, compatibility, priorities, and an executable scope. | **Passed.** The layout and evidence requirements below match the companion prompt. The scope covers the four pilot routes and the named shortcut. Site-wide rollout, new data collection, public deployment, policy calculations, and medical date estimation are excluded from this delivery. [Pilot prompt](KNOWLEDGE_VISUALIZATION_IMPLEMENTATION_PROMPT.en.md) |

### Implementation acceptance

These conditions are **unverified for the proposed implementation**. Capture evidence for each case on the implemented pages.

| ID | Required behavior and verification |
| --- | --- |
| K1 · Entry and return | At 390 × 844 and 1440 × 900, verify two link activations from the default home page to `items_efaf52d747c28054`. Follow the existing category route too. Open a copied article URL directly, reload it, and verify stage and chapter. Assert both the in-page return and browser Back restore the originating link and focus, including the existing parenting-to-postpartum return. |
| K2 · Knowledge and simplification | Inspect the cycle page at both sizes. Confirm that the figure and equivalent text explicitly describe overlap and represent ovulation as an event. Verify that all four summaries precede preparation controls and that general knowledge has no county picker or public-record status. Have a clinical reviewer check copy and figure before release. Check keyboard access to the existing consultation action, and verify that all five partner links are visible and reachable on one page, including on an old `p=2` URL. |
| K3 · Checklist and saved data | Verify initial confirmation prompts, adding an item, transitions between the three groups, a zero-self-supply state, check/uncheck, and correct progress. Save, navigate away, reload, and reopen through the plan. Use isolated existing-plan fixtures to verify IDs, dates, owners, notes, priorities, status, and order. Simulate a failed write and retry without overwriting prior data. |
| K4 · Comparison and public evidence | Compare a named row across all three options on desktop and across two selectable options on mobile. Try an unavailable quote, a reviewed quote with a missing amount, a quote with source and period, a selected-county gap with national coverage, and a retry after a failed public response. Verify both `care` reload and return from postpartum to the originating parenting link. Validate policy cases with isolated fixtures. |
| K5 · Accessibility and regression | Check visible focus, focus order, keyboard completion, label and text alternatives, and reduced motion. Capture default and expanded pilot states at phone and desktop widths. Run the existing eight-viewport regression for the three-screen height and zero whole-page horizontal overflow limits, plus affected project checks. Report actual pass, fail, or unverified status for each case. [Verification commands](README.md#驗證) |

### Reference-image revision verification

| Scoped check | Result |
| --- | --- |
| Four cards | **Passed.** Compared Chrome captures at 1440 × 900 and 390 × 844 against the reference. The captures show the four tints, line icons, indexes, titles, and exact summaries in two columns and one column respectively. The minimum measured contrast for text and indexes was 4.57:1. [Browser assertions](tests/knowledge_pilot.mjs) |
| Article reading path | **Passed.** The home-to-article journey still took two link activations. The contextual URL loaded directly and after reload at both sizes. The breadcrumb showed 健康準備. Keyboard return from direct entry focused the chapter heading. The existing chapter journey checks cover return focus to the originating link and the consultation action. [Browser assertions](tests/knowledge_pilot.mjs) |
| Article viewport limits | **Passed.** Tested the contextual URL at all eight project viewports. There was zero horizontal overflow and the tallest result occupied 2.88 screens at 568 × 320. [Layout checks](tests/format_checks.mjs) |
| Project checks | **Passed.** The full Chrome regression, Python unit test, and JavaScript syntax checks exited successfully. [Verification commands](README.md#驗證) |
| Clinical review for public release | **Unverified.** The revised copy was checked against the existing reference. The review required by K2 remains pending for public release. [Endotext](https://www.ncbi.nlm.nih.gov/books/NBK279054/?report=reader) |
