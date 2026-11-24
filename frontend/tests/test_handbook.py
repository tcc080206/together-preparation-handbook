import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'data_validation'
sys.path.insert(0, str(ROOT))
from handbook import snapshot
from server import Store


class HandbookTest(unittest.TestCase):
    def test_publication(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / 'data/imports', root / 'imports')
            shutil.copy(ROOT / 'data/records.json', root)
            store = Store(root)
            catalog = snapshot(store.path)
            self.assertEqual(31, len(catalog['item_guides']))
            self.assertFalse(catalog['records'])
            state = store.read()
            categories = {row['id'] for row in state['categories']}
            self.assertEqual(categories, {c for g in catalog['item_guides'] for c in g['category_ids']})
            row = next(r for r in state['records'] if r['type'] == 'allowance')
            def save(field, status):
                store.write('save', dict(type='allowance', revision=store.read()['revision'],
                          entries=[dict(id=row['id'], field=field, status=status)]))
            save('條件', 'correct')
            self.assertFalse(snapshot(store.path)['records'])
            save('限制', 'correct')
            save('金額', 'correct')
            self.assertEqual([row['id']], [r['id'] for r in snapshot(store.path)['records']])
            save('條件', 'pending')
            self.assertFalse(snapshot(store.path)['records'])
            save('條件', 'correct')
            row['fields']['金額'] = '123'
            with store.connect() as db:
                db.execute('UPDATE records SET body=? WHERE id=?', (json.dumps(row), row['id']))
            self.assertFalse(snapshot(store.path)['records'])
