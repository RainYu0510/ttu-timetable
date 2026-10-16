"""Independently check exported recurrence dates with python-dateutil."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dateutil.rrule import rrulestr

text = Path('test-output/demo.ics').read_text(encoding='utf-8').replace('\n ', '')
events = text.split('BEGIN:VEVENT\n')[1:]
assert len(events) == 6
taipei = timezone(timedelta(hours=8))
for event in events:
    fields = dict(line.split(':', 1) for line in event.split('END:VEVENT')[0].splitlines() if ':' in line)
    start = datetime.strptime(fields['DTSTART;TZID=Asia/Taipei'], '%Y%m%dT%H%M%S').replace(tzinfo=taipei)
    end = datetime.strptime(fields['DTEND;TZID=Asia/Taipei'], '%Y%m%dT%H%M%S').replace(tzinfo=taipei)
    occurrences = list(rrulestr(fields['RRULE'], dtstart=start))
    assert len(occurrences) == 19
    assert end > start
    assert occurrences[0].date().isoformat() >= '2026-09-07'
    assert occurrences[-1].date().isoformat() <= '2027-01-15'
    assert all(d.weekday() == start.weekday() for d in occurrences)
    assert fields['TRIGGER'] == '-PT10M'
print('PASS: independent parser validated 6 events, 114 occurrences, Taipei timezone and reminders.')
