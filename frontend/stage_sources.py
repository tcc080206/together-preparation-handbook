"""Read and validate the handbook's editorial entry files."""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

WORKSPACE = Path(__file__).resolve().parents[1]
REGISTRY = {
    'preconception': 'before_p/stage.json',
    'pregnancy': 'after_p/stage.json',
    'childbirth': 'childbirth/stage.json',
    'postpartum': 'postpartum/stage.json',
    'childcare': 'childcare/stage.json',
}
CHAPTERS = ('costs', 'health', 'daily')
KEY = re.compile(r'[a-z0-9][a-z0-9_-]*', re.ASCII)


def require(valid, location, message):
    if not valid:
        raise ValueError(f'{location}: {message}')


def unique_object(pairs):
    obj = {}
    for key, value in pairs:
        require(key not in obj, key, 'duplicate JSON key')
        obj[key] = value
    return obj


def is_text(value):
    return isinstance(value, str) and bool(value.strip())


def is_key(value):
    return isinstance(value, str) and bool(KEY.fullmatch(value))


def check_text(obj, fields, location):
    for field in fields:
        require(is_text(obj.get(field)), f'{location}.{field}', 'expected nonempty text')


def check_related(refs, topics, location):
    require(isinstance(refs, list), location, 'expected an array of related links')
    for ref in refs:
        require(isinstance(ref, dict), location, 'expected a related link object')
        check_text(ref, ('label',), location)
        keys = set(ref) - {'label'}
        if keys == {'guideId'}:
            require(is_key(ref['guideId']), location, 'expected a guide ID')
        else:
            require(keys in ({'stageId', 'topicId'}, {'stageId', 'topicId', 'question'}), location,
                    'expected a topic or question reference')
            target = ref['stageId'], ref['topicId']
            require(all(map(is_key, target)) and target in topics, location, 'unknown topic')
            if 'question' in ref:
                require(any(q['key'] == ref['question'] for q in topics[target]['questions']),
                        location, 'unknown question')


def check_reading_content(stage, path):
    discussions = stage.get('discussionGroups', {})
    require(isinstance(discussions, dict), path, 'expected discussion groups by category')
    for category, groups in discussions.items():
        loc = f'{path}:discussionGroups.{category}'
        require(is_key(category) and isinstance(groups, list) and groups, loc, 'expected category and groups')
        used = set()
        for group in groups:
            require(isinstance(group, dict), loc, 'expected a discussion group')
            check_text(group, ('title',), loc)
            guides = group.get('guides')
            require(isinstance(guides, list) and guides and all(map(is_key, guides)), loc, 'expected guide IDs')
            require(len(set(guides)) == len(guides) and used.isdisjoint(guides), loc, 'duplicate discussion guide')
            used.update(guides)
    knowledge = stage.get('guideKnowledge', {})
    require(isinstance(knowledge, dict), path, 'expected knowledge sections by guide')
    for guide, content in knowledge.items():
        loc = f'{path}:guideKnowledge.{guide}'
        require(is_key(guide) and isinstance(content, dict) and content.get('type') == 'menstrual-cycle',
                loc, 'expected a known knowledge figure')
        check_text(content, ('takeaway', 'summary'), loc)
        phases = content.get('phases')
        require(isinstance(phases, dict) and set(phases) == {'menstruation', 'follicular', 'ovulation', 'luteal'}
                and all(isinstance(row, list) and len(row) == 2 and all(map(is_text, row)) for row in phases.values()),
                loc, 'expected the four figure labels and explanations')
        source = content.get('source')
        require(isinstance(source, dict), loc, 'expected an editorial source')
        check_text(source, ('title', 'url'), loc + '.source')
        url = urlsplit(source['url'])
        require(url.scheme == 'https' and bool(url.hostname), loc + '.source.url', 'expected an HTTPS reference')


def load_stages(root=WORKSPACE):
    stages, topics, prompt_owners, knowledge_owners, discussion_owners = {}, {}, {}, {}, {}
    for stage_id, relative in REGISTRY.items():
        path = root / relative
        try:
            stage = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_object)
        except (OSError, ValueError) as error:
            raise ValueError(f'{path}: {error}') from error
        require(isinstance(stage, dict) and stage.get('id') == stage_id, path, f'expected id {stage_id}')
        check_text(stage, ('title', 'summary', 'intro'), path)
        check_reading_content(stage, path)
        for field, owners in (('guideKnowledge', knowledge_owners), ('discussionGroups', discussion_owners)):
            for key in stage.get(field, {}):
                require(key not in owners, f'{path}:{field}.{key}', f'already owned by {owners.get(key)}')
                owners[key] = relative
        chapters = stage.get('chapters')
        require(isinstance(chapters, dict) and set(chapters) == set(CHAPTERS),
                f'{path}:chapters', f'expected {", ".join(CHAPTERS)}')
        for chapter, definition in chapters.items():
            loc = f'{path}:chapters.{chapter}'
            require(isinstance(definition, dict), loc, 'expected an object')
            check_text(definition, ('subtitle',), loc)
            require(isinstance(definition.get('entries'), list), loc + '.entries', 'expected an array')
        require(isinstance(stage.get('topics'), list), f'{path}:topics', 'expected an array')
        question_keys = set()
        for index, topic in enumerate(stage['topics']):
            loc = f'{path}:topics[{index}]'
            require(isinstance(topic, dict) and is_key(topic.get('id')), loc + '.id', 'expected a topic key')
            target = stage_id, topic['id']
            loc += f' ({topic["id"]})'
            require(target not in topics, loc, 'duplicate topic ID')
            require(topic.get('chapter') in CHAPTERS, loc + '.chapter', 'unknown chapter')
            check_text(topic, ('title',), loc)
            require(topic.get('guideId') is None or is_key(topic['guideId']), loc + '.guideId', 'expected a guide ID or null')
            require(topic.get('display') in (None, 'prenatal', 'care'), loc + '.display', 'unknown display')
            require(topic.get('layout') in (None, 'handoff'), loc + '.layout', 'unknown layout')
            if topic.get('display') == 'care':
                choices = topic.get('choices')
                require(isinstance(choices, list) and choices, loc + '.choices', 'expected care choices')
                choice_keys = set()
                for choice in choices:
                    require(isinstance(choice, dict) and is_key(choice.get('id')), loc + '.choices', 'expected a choice ID')
                    require(choice['id'] not in choice_keys, loc + '.choices', f'duplicate choice {choice["id"]}')
                    check_text(choice, ('label', 'prompt'), loc + '.choices')
                    comparison = choice.get('comparison')
                    require(isinstance(comparison, list) and len(comparison) == 3 and all(map(is_text, comparison)),
                            loc + '.choices.comparison', 'expected service hours, scope, and billing questions')
                    choice_keys.add(choice['id'])
            require(isinstance(topic.get('questions'), list), loc + '.questions', 'expected an array')
            for question in topic['questions']:
                require(isinstance(question, dict) and is_key(question.get('key')), loc + '.questions', 'expected a question key')
                key = question['key']
                require(key not in question_keys, loc + '.questions', f'duplicate question key {key}')
                check_text(question, ('title', 'notes'), f'{loc}.questions.{key}')
                if 'packing' in question:
                    groups = question['packing']
                    require(isinstance(groups, list) and len(groups) == 3 and
                            all(isinstance(row, list) and len(row) == 2 and all(map(is_text, row)) for row in groups),
                            f'{loc}.questions.{key}.packing', 'expected three labels and questions')
                question_keys.add(key)
            topics[target] = topic
        prompts = stage.get('guidePrompts', {})
        require(isinstance(prompts, dict), f'{path}:guidePrompts', 'expected an object')
        for guide, sheet in prompts.items():
            loc = f'{path}:guidePrompts.{guide}'
            require(guide not in prompt_owners, loc, f'already owned by {prompt_owners.get(guide)}')
            require(is_key(guide) and isinstance(sheet, list) and len(sheet) >= 3
                    and all(map(is_text, sheet)) and sheet[0] in ('steps', 'talk', 'scenario', 'care'),
                    loc, 'expected a preparation sheet with a renderer, heading and entries')
            columns = 4 if sheet[0] == 'care' else 2
            require(all(len(entry.split('|')) == columns for entry in sheet[2:]), loc, 'invalid preparation entry columns')
            prompt_owners[guide] = relative
        stages[stage_id] = stage

    placements = set()
    for stage_id, stage in stages.items():
        stage_loc = str(root / REGISTRY[stage_id])
        for topic in stage['topics']:
            for question in topic['questions']:
                if 'related' in question:
                    check_related(question['related'], topics, f'{stage_loc}:{topic["id"]}.{question["key"]}.related')
        guide_related = stage.get('guideRelated', {})
        require(isinstance(guide_related, dict) and all(map(is_key, guide_related)), stage_loc, 'invalid guideRelated')
        for guide, refs in guide_related.items():
            check_related(refs, topics, f'{stage_loc}:guideRelated.{guide}')
        for chapter, definition in stage['chapters'].items():
            for index, entry in enumerate(definition['entries']):
                loc = f'{root / REGISTRY[stage_id]}:chapters.{chapter}.entries[{index}]'
                require(isinstance(entry, dict), loc, 'expected an entry object')
                require('label' not in entry or is_text(entry['label']), loc + '.label', 'expected nonempty text')
                keys = set(entry) - {'label'}
                if keys == {'stageId', 'topicId'}:
                    target = entry['stageId'], entry['topicId']
                    require(all(map(is_key, target)) and target in topics, loc, f'unknown editorial topic {target}')
                    if target[0] == stage_id and topics[target]['chapter'] == chapter:
                        require(target not in placements, loc, f'duplicate canonical placement for {target[1]}')
                        placements.add(target)
                elif keys == {'readingSectionIndex'}:
                    value = entry['readingSectionIndex']
                    require(stage_id == 'preconception' and type(value) is int and 0 <= value <= 2,
                            loc, 'expected a preconception catalog section index (0–2)')
                else:
                    require(keys == {'guideId'} and is_key(entry.get('guideId')), loc, 'expected one topic, guide or reading section reference')
            shortcuts = definition.get('shortcuts', {})
            require(isinstance(shortcuts, dict) and all(
                is_key(category) and isinstance(ids, list) and 1 <= len(ids) <= 2
                and all(map(is_key, ids)) and len(set(ids)) == len(ids) for category, ids in shortcuts.items()
            ), stage_loc, 'expected one or two distinct guide IDs per shortcut category')
            if shortcuts:
                require(any('readingSectionIndex' in entry for entry in definition['entries']),
                        stage_loc, 'shortcuts require a catalog section')
            situations = definition.get('situations', [])
            require(isinstance(situations, list), stage_loc, 'expected situations array')
            known = {entry.get('guideId', entry.get('topicId')) for entry in definition['entries']}
            used = set()
            for group in situations:
                require(isinstance(group, dict), stage_loc, 'expected a situation object')
                check_text(group, ('title',), stage_loc)
                refs = group.get('entries')
                require(isinstance(refs, list) and refs and all(map(is_key, refs)), stage_loc,
                        'expected situation references')
                require(set(refs) <= known and len(set(refs)) == len(refs) and used.isdisjoint(refs),
                        stage_loc, 'unknown or duplicate situation reference')
                used.update(refs)
    for owner, topic in topics.keys() - placements:
        raise ValueError(f'{root / REGISTRY[owner]}:topics.{topic}: missing canonical chapter entry')
    return list(stages.values())
