"""Read a consistent, reviewed snapshot for the preparation handbook."""
import json
import sqlite3
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def snapshot(database=ROOT / 'data/platform.sqlite3'):
    catalog = json.loads((ROOT / 'handbook.json').read_text())
    categories = {category for guide in catalog['item_guides'] for category in guide['category_ids']}
    with closing(sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)) as db:
        db.execute('BEGIN')
        fields = {key: json.loads(body)['review_fields'] for key, body in db.execute('SELECT id, body FROM categories')}
        reviews = {key: json.loads(body) for key, body in db.execute('SELECT key, body FROM reviews')}
        public = []
        for body, in db.execute('SELECT body FROM records ORDER BY id'):
            row = json.loads(body)
            required = fields.get(row['type'])
            if row['type'] not in categories or not required:
                continue
            for name in required:
                review = reviews.get(row['id'] + '::' + name, {})
                if (review.get('status') != 'correct' or 'base_value' not in review
                        or name not in row['fields'] or review['base_value'] != row['fields'][name]):
                    break
            else:
                public.append({key: row[key] for key in ('id','type','title','fields','sources','checked_at')})
    return {**catalog, 'records': public}
