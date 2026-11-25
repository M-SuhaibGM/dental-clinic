import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toISODate, weekdayOf, toMinutes } from '../src/utils/dates.js';

test('toISODate uses local calendar fields (no UTC shift)', () => {
  assert.equal(toISODate(new Date(2030, 0, 7, 23, 59)), '2030-01-07');
  assert.equal(toISODate(new Date(2030, 11, 1, 0, 1)), '2030-12-01');
});

test('weekdayOf maps a calendar date to its weekday', () => {
  assert.equal(weekdayOf('2030-01-07'), 'Mon');
  assert.equal(weekdayOf('2030-01-13'), 'Sun');
  assert.equal(weekdayOf('2024-02-29'), 'Thu'); // leap day
});

test('toMinutes handles HH:MM and HH:MM:SS', () => {
  assert.equal(toMinutes('09:30'), 570);
  assert.equal(toMinutes('17:00:00'), 1020);
});
