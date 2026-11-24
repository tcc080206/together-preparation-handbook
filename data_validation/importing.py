"""Validated, append-only JSON batch imports. No external dependencies."""
import hashlib
import json
import re
from datetime import date
from urllib.parse import urlsplit

DEFAULT_CATEGORIES = [
    {'id': 'allowance', 'title': '育兒津貼與就學補助', 'description': '中央未滿2歲、2歲至學齡未滿5歲，以及學齡滿5歲至入國小前。', 'order': 10, 'review_fields': ['金額', '條件', '限制'], 'field_types': {'金額': 'integer', '條件': 'text', '限制': 'text'}},
    {'id': 'childcare', 'title': '托育補助', 'description': '未滿2歲，一般家庭第1名公共化與準公共托育基本額。其他級距及2–3歲延長補助未收錄。', 'order': 20, 'review_fields': ['金額', '條件', '限制'], 'field_types': {'金額': 'integer', '條件': 'text', '限制': 'text'}}
]

def nonempty(value, label):
    if not isinstance(value, str) or not value.strip() or len(value) > 10000:
        raise ValueError(f'{label}需為非空文字（最多10000字）')
    return value

def valid_value(value, kind):
    if not isinstance(value, str) or not value.strip() or len(value) > 10000:
        raise ValueError('修正值需為非空文字（最多10000字）')
    if kind == 'integer' and not re.fullmatch(r'[0-9]+', value):
        raise ValueError('數值欄位需為非負整數')
    if kind == 'date':
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            raise ValueError('日期需為YYYY-MM-DD')
        date.fromisoformat(value)

def validate_batch(payload):
    if not isinstance(payload, dict) or payload.get('schema_version') != 1:
        raise ValueError('schema_version需為1')
    if set(payload) != {'schema_version', 'batch_id', 'category', 'records'}:
        raise ValueError('批次欄位需為schema_version、batch_id、category、records')
    nonempty(payload['batch_id'], 'batch_id')
    category = payload['category']
    if not isinstance(category, dict) or set(category) - {'id', 'title', 'description', 'order', 'review_fields', 'field_types'}:
        raise ValueError('分類設定欄位無效')
    cid = category.get('id')
    if not isinstance(cid, str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,63}', cid) or cid in {'api', 'app', 'style', 'index'}:
        raise ValueError('分類id需為小寫英數／連字號，且不能使用保留名稱')
    for name in ('title', 'description'):
        nonempty(category.get(name), f'分類{name}')
    if type(category.get('order')) is not int:
        raise ValueError('分類order需為整數')
    fields = category.get('review_fields')
    if not isinstance(fields, list) or not 1 <= len(fields) <= 5 or any(not isinstance(f, str) or not f.strip() or '::' in f for f in fields) or len(set(fields)) != len(fields):
        raise ValueError('review_fields需為1至5個不重複欄名')
    types = category.get('field_types', {})
    if not isinstance(types, dict) or set(types) - set(fields) or any(t not in ('text', 'integer', 'date') for t in types.values()):
        raise ValueError('field_types僅允許重要欄位的text、integer、date')
    category = {**category, 'field_types': {f: types.get(f, 'integer' if f == '金額' else 'text') for f in fields}}
    records = payload['records']
    if not isinstance(records, list) or len(records) > 1000:
        raise ValueError('records需為陣列，每批最多1000筆')
    seen = set()
    for r in records:
        if not isinstance(r, dict) or set(r) != {'id', 'type', 'title', 'fields', 'sources', 'checked_at', 'provenance'}:
            raise ValueError('record欄位需為id、type、title、fields、sources、checked_at、provenance')
        rid = nonempty(r['id'], 'record id')
        if '::' in rid or rid in seen:
            raise ValueError(f'重複或無效ID：{rid}')
        seen.add(rid)
        if r['type'] != cid:
            raise ValueError(f'{rid}的type與分類id不符')
        for name in ('title', 'provenance'):
            nonempty(r[name], name)
        values = r['fields']
        if not isinstance(values, dict) or any(not isinstance(k, str) or not k.strip() or '::' in k or (v is not None and (not isinstance(v, str) or len(v)>10000)) for k, v in values.items()):
            raise ValueError(f'{rid}的fields需為文字或null')
        if set(fields) - set(values):
            raise ValueError(f'{rid}缺少指定核對欄位')
        for f in fields:
            if values[f] is not None:
                valid_value(values[f], category['field_types'][f])
        if '金額' in values and (not {'提供者','地區','單位','條件'} <= set(values) or not ({'適用起日','金額適用起日'} & set(values)) or '適用迄日' not in values):
            raise ValueError(f'{rid}金額資料缺提供者、地區、單位、條件或期間欄位（未知填null）')
        if r['checked_at'] is not None:
            valid_value(r['checked_at'], 'date')
        if not isinstance(r['sources'], list) or not r['sources']:
            raise ValueError(f'{rid}至少需一個來源')
        for source in r['sources']:
            if not isinstance(source, dict) or set(source) != {'title', 'url', 'locator'}:
                raise ValueError('來源需含title、url、locator')
            for name in ('title', 'url', 'locator'):
                nonempty(source[name], f'來源{name}')
            url = urlsplit(source['url'])
            if url.scheme not in ('https', 'http') or not url.hostname or url.username or url.password:
                raise ValueError('來源需為http(s)網址且不可包含登入資訊')
    return {**payload, 'category': category}

class ImportMixin:
    def setup_categories(self):
        with self.connect() as c:
            c.executescript('CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, body TEXT); CREATE TABLE IF NOT EXISTS imports(batch TEXT PRIMARY KEY, digest TEXT, filename TEXT, payload TEXT);')
            for category in DEFAULT_CATEGORIES:
                c.execute('INSERT OR IGNORE INTO categories VALUES(?,?)', (category['id'], json.dumps(category, ensure_ascii=False)))

    def categories(self, c):
        return sorted((json.loads(body) for body, in c.execute('SELECT body FROM categories')), key=lambda x: (x['order'], x['id']))

    def scan_imports(self):
        results = []
        for path in sorted(self.path.parent.joinpath('imports').glob('*.json')):
            try:
                if path.stat().st_size > 5_000_000:
                    raise ValueError('單檔上限5MB')
                raw = path.read_text(encoding='utf-8-sig')
                payload = json.loads(raw)
                digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
                payload = validate_batch(payload)
                category = payload['category']
                with self.connect() as c:
                    c.execute('BEGIN IMMEDIATE')
                    prior = c.execute('SELECT digest FROM imports WHERE batch=?', (payload['batch_id'],)).fetchone()
                    if prior:
                        if prior[0] != digest:
                            raise ValueError('batch_id已匯入但內容不同；請還原原檔，新資料使用新批次')
                        results.append({'file':path.name,'status':'existing','count':0})
                        continue
                    known = {x['id']:x for x in self.categories(c)}
                    if category['id'] in known and category != known[category['id']]:
                        raise ValueError('既有分類設定不同；新增資料須沿用原分類設定')
                    records = self.records(c)
                    additions = []
                    for record in payload['records']:
                        if record['id'] in records:
                            if records[record['id']] != record:
                                raise ValueError(f"ID衝突：{record['id']}，不覆寫既有資料或人工修正")
                        else:
                            additions.append(record)
                    c.execute('INSERT OR IGNORE INTO categories VALUES(?,?)', (category['id'], json.dumps(category, ensure_ascii=False)))
                    for record in additions:
                        c.execute('INSERT INTO records VALUES(?,?)', (record['id'], json.dumps(record, ensure_ascii=False)))
                    c.execute('INSERT INTO imports VALUES(?,?,?,?)', (payload['batch_id'], digest, path.name, raw))
                    self.event(c, payload['batch_id'], 'import', {'category':category['id'],'filename':path.name,'digest':digest,'category_before':known.get(category['id']),'category_after':category,'before':None,'after':additions})
                    c.execute('UPDATE meta SET revision=revision+1')
                results.append({'file':path.name,'status':'imported','count':len(additions)})
            except (ValueError, TypeError, KeyError, OSError) as exc:
                results.append({'file':path.name,'status':'error','error':str(exc)})
        return results
