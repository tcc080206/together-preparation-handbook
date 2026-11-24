# 本地盤點與來源路線

盤點日期2026-11-17。派工以修訂版金額優先計畫為準；來源路線不構成免抓清單。本文件列出現有來源作為抓取起點，未重查遠端可用性與現行性；URL不是金額證據，仍須保存正文／附件及定位。不可將帶歷史日期的連結當現行版。

## 先讀哪些檔案

- [before_p README](../../before_p/README.md)：目前架構、主資料位置與必要檢查。
- [來源流程](../../before_p/V2_2_DESIGN.md)、[政策欄位](../../before_p/V2_3_DESIGN.md)、[閱讀組](../../before_p/V2_4_DESIGN.md)。
- [既有交接書](../../before_p/DATA_HANDOFF.md)、[B0結果](../../before_p/structured/handoffs/b0-20261113/HANDOFF.md)、[互斥更正](../../before_p/structured/handoffs/relation-correction-20261113/RESULT.md)。舊交接書數量是歷史值，現況以下方盤點為準。
- [事實](../../before_p/structured/curated/facts.json)、[閱讀](../../before_p/structured/curated/reading.json)、[覆蓋](../../before_p/structured/curated/coverage.json)、[來源登錄](../../before_p/structured/source_registry.json)、[來源索引](../../before_p/SOURCES.md)。
- [平台匯入契約](../ADDING_DATA.md)。SQLite請用mode=ro讀取，不呼叫會掃描匯入的GET API做設計盤點。

## 平台已有分類與記錄

| 分類ID | 名稱 | 筆數 | 重要欄位 |
| --- | --- | --- | --- |
| allowance | 育兒津貼與就學補助 | 9 | 金額、條件、限制 |
| childcare | 托育補助 | 2 | 金額、條件、限制 |
| preschool-fees | 2–5歲幼兒園每月繳費上限 | 12 | 金額、條件、限制 |

以下是平台既有ID，指定情境仍須完整重查；入庫時沿用ID去重。before_p有而平台沒有的數字仍須完整新增到平台，不得略過：

### allowance

- `economic_allowance_1_r2`：未滿2歲育兒津貼：第1名
- `economic_allowance_2_r2`：未滿2歲育兒津貼：第2名
- `economic_allowance_3_r2`：未滿2歲育兒津貼：第3名以上
- `moe_2to5_1`：2歲至學齡未滿5歲育兒津貼：第1名
- `moe_2to5_2`：2歲至學齡未滿5歲育兒津貼：第2名
- `moe_2to5_3`：2歲至學齡未滿5歲育兒津貼：第3名以上
- `moe_5toSchool_1`：學齡滿5歲至入國小前就學補助：第1名
- `moe_5toSchool_2`：學齡滿5歲至入國小前就學補助：第2名
- `moe_5toSchool_3`：學齡滿5歲至入國小前就學補助：第3名以上

### childcare

- `economic_childcare_public_general_first_20261113_r2`：公共化托育：一般家庭第1名
- `economic_childcare_quasi_general_first_20261113_r2`：準公共托育：一般家庭第1名

### preschool-fees

- `preschool-fee-public-first`：公立幼兒園・第1胎
- `preschool-fee-public-second`：公立幼兒園・第2胎
- `preschool-fee-public-third-plus`：公立幼兒園・第3胎以上
- `preschool-fee-public-low-income`：公立幼兒園・低收入戶／中低收入戶
- `preschool-fee-nonprofit-first`：非營利幼兒園・第1胎
- `preschool-fee-nonprofit-second`：非營利幼兒園・第2胎
- `preschool-fee-nonprofit-third-plus`：非營利幼兒園・第3胎以上
- `preschool-fee-nonprofit-low-income`：非營利幼兒園・低收入戶／中低收入戶
- `preschool-fee-quasi-public-first`：準公共幼兒園・第1胎
- `preschool-fee-quasi-public-second`：準公共幼兒園・第2胎
- `preschool-fee-quasi-public-third-plus`：準公共幼兒園・第3胎以上
- `preschool-fee-quasi-public-low-income`：準公共幼兒園・低收入戶／中低收入戶

## before_p需直接支援的閱讀頁

| 頁面／閱讀組 | 穩定ID | 首要工作卡 |
| --- | --- | --- | --- |
| 育兒津貼與托育補助／central-childcare-choice | items_095c7855adf6a94c | C01–C07 |
| 照顧方式／care-options | items_95b572be1793ad97 | C04、C06、C09 |
| 月支出 | items_6a6ae4b5954ad582 | C04–C07、C09 |
| 年齡銜接／care-age | overview_care-age-transitions | C02、C03、C05、C08 |
| 幼兒園準備 | overview_kindergarten-preparation | C05、C08 |
| 候補參觀／care-waiting | items_8073100ae7b19ae7 | C10 |
| 留停與公司支持／leave-support | items_90513227d0b87997 | C13-BENEFIT先抓收入數字；公司福利只留HR問題 |
| 家人備援／care-family | items_6decd49134f902e1 | 無需強制抓政策，個人分工不作公共事實 |
| 地方生育獎勵 | items_670cb76ccb808008 | C11、C12（新增公共給付引用由整合者判斷） |
| 孕前健檢 | items_5b5ed9c0e5123e5f | C14 |
| 一般健檢 | items_d06b904d4d523a1e | C14的語意區分；不套用孕前補助 |
| AMH／遺傳諮詢 | items_05966383c5a41441／items_dc0ec93ab961fc90 | C14、C15 |

其餘導讀不因存在頁面就製造政策資料。先完成指定問題，健康生活方式及個人財務安排不在本輪抓取範圍。

## before_p官方來源登錄（32個）

PDF網址可能含版本參數；優先從對應入口確認現行附件，保留原鏈及最終URL。來源代號帶directory的是發現入口，不能當金額證據。

| source_id | 本地標題與來源起點 |
| --- | --- |
| `directory_tw_family` | [安心懷孕及友善生養的措施與設施](https://www.gov.tw/News_Content_26_635581) |
| `directory_tw_fertility` | [孕前檢查與試管嬰兒補助](https://www.gov.tw/News_Content_26_853077) |
| `tw_childcare` | [未滿2歲幼兒照顧政策專區](https://www.mohw.gov.tw/TCHMD/cp-5130-58003-1.html) |
| `tw_children` | [兒少福利](https://www.mohw.gov.tw/cp-88-223-1.html) |
| `tw_leave` | [育嬰留職停薪給付權益](https://www.mol.gov.tw/1607/1632/1640/82107/post) |
| `tpe_check` | [孕前健康檢查補助金額與項目](https://health.gov.taipei/News_Content.aspx?n=AC64F0F68D7CF40E&s=CF0A62501EA4E084&sms=87415A8B9CE81B16) |
| `nwt_check` | [婚後孕前健康檢查](https://www.health.ntpc.gov.tw/basic/?node=10587) |
| `nwt_birth` | [生育獎勵金](https://welfare.ntpc.gov.tw/viewService/show/1008103?actionName=list2&fromOpa=1) |
| `tpe_birth` | [生育獎勵金發放辦法歷史版本](https://laws.gov.taipei/law/LawSearch/LawArticleContent/FL081869?date=20250909) |
| `tpe_support_current` | [臺北市友善托育補助實施計畫](https://laws.gov.taipei/Law/LawSearch/LawArticleContent/FL079829)；原登錄來源，執行時重查現行版本與附件 |
| `tpe_friendly` | [友善托育補助相關法規](https://dosw.gov.taipei/cp.aspx?n=46A2CAA8E124546D) |
| `tpe_fee` | [托育類型說明](https://welfare.gov.taipei/Kids/BabyCare/BabyCare102) |
| `nwt_kg` | [準公共幼兒園收費管理規範](https://kidedu.ntpc.edu.tw/p/16-1000-12997.php?Lang=zh-tw) |
| `tw_kg` | [全國教保資訊網](https://www.ece.moe.edu.tw/) |
| `tpe_upgrade` | [115年7月友善托育升級](https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&s=F4979C77DBCEAE5E) |
| `tpe_office_fee` | [臺北市政府員工子女托嬰中心收費](https://dop.gov.taipei/cp.aspx?n=260FA2363139D739) |
| `nwt_public_directory` | [新北市公共托育中心最新消息](https://www.sw.ntpc.gov.tw/home.jsp?id=274&parentpath=0,4,36) |
| `nwt_115_public` | [115年度公共托育中心招生簡章](https://www.sw.ntpc.gov.tw/userfiles/1102400/files/115%E5%B9%B4%E5%BA%A6%E6%96%B0%E5%8C%97%E5%B8%82%E6%94%BF%E5%BA%9C%E5%A7%94%E8%A8%97%E8%BE%A6%E7%90%86%E5%85%AC%E5%85%B1%E6%89%98%E8%82%B2%E4%B8%AD%E5%BF%83%E6%8B%9B%E7%94%9F%E7%B0%A1%E7%AB%A0-%E5%85%AC%E5%91%8A%E7%89%88.pdf) |
| `nwt_guoguang_fee` | [三峽國光公共托育中心招生簡章](https://www.sw.ntpc.gov.tw/userfiles/1102400/files/%E6%8B%9B%E7%94%9F%E7%B0%A1%E7%AB%A0(%E4%B8%89%E5%B3%BD%E5%9C%8B%E5%85%89)-%E5%AD%97%E5%85%A8%E9%BB%91114_12_8(%E5%85%AC%E5%91%8A%E7%89%88-%E5%B7%B2%E8%93%8B%E5%9C%93%E6%88%B3%E7%AB%A0).pdf) |
| `tpe_115_support` | [1150701起兒童托育補助一覽表](https://www-ws.gov.taipei/Download.ashx?u=LzAwMS9VcGxvYWQvMzU4L3JlbGZpbGUvMTY0OTUvMTE1NTcyLzFiMmRjYTE3LTBmOGYtNDE5Ny04NzAzLTEwNjZlYTBkZmM3My5wZGY%3d&n=5pys5biC5YWS56ul57aT5r%2bf6KOc5Yqp5LiA6Ka96KGoXzExNTA3MDHotbdfMTE1MDQxM%2bS%2fri5wZGY%3d&icon=..pdf) |
| `nwt_115_quotes` | [新北市合作聯盟暨準公共化托嬰中心名冊（統計至115年8月31日）](https://www.sw.ntpc.gov.tw/userfiles/1102400/files/115%E5%B9%B4%E5%90%88%E4%BD%9C%E8%81%AF%E7%9B%9F%E6%9A%A8%E6%BA%96%E5%85%AC%E5%85%B1%E5%8C%96%E5%90%8D%E5%86%8A%E5%85%AC%E5%91%8A1150901%E4%BF%AE(1).pdf) |
| `tw_allowance_apply` | [育有未滿2歲兒童育兒津貼申辦](https://www.gov.tw/News_Content_2_375315) |
| `tpe_support_current` | [臺北市友善托育補助實施計畫現行條文](https://laws.gov.taipei/Law/LawSearch/LawArticleContent/FL079829) |
| `tw_childcare_rules` | [中央托育作業要點與申報附件專區](https://www.sfaa.gov.tw/sfaa/list/detail/5d3/5KH) |
| `tw_childcare_faq` | [未滿2歲托育補助FAQ入口](https://www.sfaa.gov.tw/sfaa/list/detail/5d3/5KG) |
| `tw_childcare_rules_pdf` | [中央托育作業要點（1140716修正後全文）](https://www.sfaa.gov.tw/www_download_attach.php/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3%28%E5%B8%82%29%E6%94%BF%E5%BA%9C%E8%BE%A6%E7%90%86%E6%9C%AA%E6%BB%BF%E4%BA%8C%E6%AD%B2%E5%85%92%E7%AB%A5%E6%89%98%E8%82%B2%E5%85%AC%E5%85%B1%E5%8C%96%E5%8F%8A%E6%BA%96%E5%85%AC%E5%85%B1%E6%9C%8D%E5%8B%99%E4%BD%9C%E6%A5%AD%E8%A6%81%E9%BB%9E%28%E4%BF%AE%E6%AD%A3%E5%BE%8C%E5%85%A8%E6%96%87%29.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPR2fvqTpG0-24ahUxMepZJiv9dpKD825YRMc2avSUdmwsqMillI25oixpN5YOyDaB2SYHqRF5aGiXHJ7_hpkVba6kPAqLY0_92QpBQ83RfatD&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |
| `tw_childcare_faq_pdf` | [未滿2歲托育補助問答集（1140101起適用）](https://www.sfaa.gov.tw/www_download_attach.php/%E6%9C%AA%E6%BB%BF2%E6%AD%B2%E6%89%98%E8%82%B2%E8%A3%9C%E5%8A%A9%E5%95%8F%E7%AD%94%E9%9B%86.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPRyYZe0pzpRlJwh9G63aTsb1QMfJZ0D8SgWgWFGOHAi2TmFEXsF9dlHfFn-k6JWtafjFPJoEK9vMiKAokcrz29SQxkBxAhcM_6gyvoUrGoCdh&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |
| `tw_childcare_form_pdf` | [中央托育附表一申報表](https://www.sfaa.gov.tw/www_download_attach.php/%E9%99%84%E8%A1%A8%E4%B8%80-%E7%94%B3%E5%A0%B1%E8%A1%A8.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPR3O57Xj8MFzvxTda9DwJVMzsEbQplLsSMRZ55GpdpP_YBHI7UvCcG7JWcehHn5GPBHxbosJxejP_z2Zl_Wd1yJ2OiO7bbq5_2189WW-M2tWX&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |
| `tw_childcare_order_pdf` | [中央托育1140716修正發布令](https://www.sfaa.gov.tw/www_download_attach.php/1140716-%E7%99%BC%E5%B8%83%E4%BB%A4.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPR7bOtKssA8XSgwZzK6hqLBgmQ87yUSlNSEPCqrq71tUUlEqyhmy4UVXVNNbWo2Tl2iQzMrCxPKMfTqMv0i8jEFVf6oPFO1MKYF6BJ3HAXbSW&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |
| `tw_allowance_rules` | [中央育兒津貼作業要點入口](https://www.sfaa.gov.tw/sfaa/list/detail/5d3/5Kp) |
| `tw_allowance_faq` | [中央育兒津貼FAQ入口](https://www.sfaa.gov.tw/sfaa/list/detail/5d3/5Iu) |
| `tw_allowance_rules_pdf` | [中央育兒津貼作業要點（1140106修正）](https://www.sfaa.gov.tw/www_download_attach.php/%E8%82%B2%E6%9C%89%E6%9C%AA%E6%BB%BF%E4%BA%8C%E6%AD%B2%E5%85%92%E7%AB%A5%E8%82%B2%E5%85%92%E6%B4%A5%E8%B2%BC%E7%94%B3%E9%A0%98%E4%BD%9C%E6%A5%AD%E8%A6%81%E9%BB%9E.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPR2qvKu7SnPaNuotmebOSVQSkvD-aMDOhqZ_FjFsiat5RBR1AYdz3gWgPysAr8IWla0EKculMSHt4i2_Py16hsgf_m0IgP8wgUHkzAzTtfajy&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |
| `tw_allowance_faq_pdf` | [中央育兒津貼FAQ（1140101起適用）](https://www.sfaa.gov.tw/www_download_attach.php/%E6%9C%AA%E6%BB%BF2%E6%AD%B2%E8%82%B2%E5%85%92%E6%B4%A5%E8%B2%BC%E5%95%8F%E7%AD%94%E9%9B%86.pdf?f=_OSL256_o_8t6Ku_dviccCk1YSIPR-5wAu-9PoegqlqJhBqdEvC65aqWFN84KXM3i7L4RDXF_xiT1ibwCjY0vuT32neUpHXZNTEWldF8o5xjCUd_66n4OTGcGRgnqQZaK7YCPOVh&g=_OSL256_99ft9RbTq5wUeETjAxvVLydFfhrajrlsPHSUqMsW6cQ&view_pdf=1) |

## 平台新增來源路線

以下為平台現有2歲以上津貼與幼兒園費用記錄中的來源。C02／C05先讀這些，再追真正當期主管規定：

- [教育部作業要點](https://edu.law.moe.gov.tw/LawContent.aspx?id=GL001909)：第3點資格、第4點數額、第6點申請；115年8月28日修正
- [教育部數額表（附表一）](https://edu.law.moe.gov.tw/Download.ashx?FileID=215028&id=GL001909&type=LAW)：第1頁，111年8月1日起：第一名5000、第二名6000、第三名以上7000
- [行政院：我國少子女化對策計畫2.0（115–118年）](https://gec.ey.gov.tw/File/A50A211F09DDAB92?A=C)：表5-3-3「降低公共化幼兒園就學費用情形」，書頁52／PDF第56頁，111.8起列
- [國家教育研究院：教育年報學前教育章](https://teric.naer.edu.tw/wSite/PDFReader?fileName=1749719058036&format=pdf&xmlId=2067961)：公立、非營利、準公共家長每月繳費表及表下注記（不包含項目）
- [基隆市教育處：幼兒園收費及補助說明](https://kids.kl.edu.tw/230)：收費計算基準第1至3點；僅引用計算範圍，不引用基隆市公立地方優惠金額

## 證據定位與時效提醒

讀before_p既有raw/<source>/<snapshot>/metadata.json確認final_url、SHA256與原件，不從source_registry一個舊snapshot_id猜最新快照。source_id找不到就回報，不能捏造本地檔名。

政策建議30日重查、價格90日；公告改制或跨年度立即查。這是工作節奏，不是證明資料有效的規則。2026-11-17執行卡以當日現行制度為目標，未來版本獨立列；學年度須使用官方定義，不把西元年直接當學年度。
