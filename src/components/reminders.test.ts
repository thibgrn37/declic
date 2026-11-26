import { describe, expect, it } from 'vitest';
import { buildIcs } from './Reminders';
import { freshState } from '../state/store';
import { addDays, todayKey } from '../state/dates';

describe('fichier agenda', () => {
  it('contient la séance récurrente et les rappels de compétition', () => {
    const s = freshState();
    s.profile = { name: '', sport: 'tennis', sportType: 'precision', level: 'regional', minutes: 10, perWeek: 4, experience: false, compName: 'Open, Lyon', compDate: addDays(todayKey(), 10) };
    const ics = buildIcs(s, { time: '07:15', days: [1, 3] });
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
    expect(ics).toContain('T071500');
    expect(ics).toContain('SUMMARY:Jour J : Open\\, Lyon');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTEND:');
  });
});
