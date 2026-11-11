import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, getView, saveEntry, saveMilestone, summarize } from '../assets/model.mjs';

const now = '2026-11-11T10:05:00Z';
const context = { id: 'new-demo', now, role: 'employee' };
const fields = {
  title: 'Improved facilitation', type: 'Learning', occurred: '2026-11-11',
  impact: 'The workshop reached a decision.', learning: 'Applied a new decision technique.',
  milestone: 'research', visibility: 'private', evidenceTitle: 'Workshop recap', evidenceNote: 'Synthetic recap',
};

test('employee sees their records and manager sees shared records from direct reports', () => {
  const state = seed();
  const employee = getView(state, 'employee');
  const manager = getView(state, 'manager');
  assert.deepEqual(employee.entries.map(item => item.id), ['pilot', 'synthesis', 'intake', 'reflection']);
  assert.deepEqual(manager.entries.map(item => item.id), ['pilot', 'synthesis', 'intake', 'sessions']);
  assert.equal(manager.milestones.some(item => item.id === 'private-milestone'), false);
  assert.equal(JSON.stringify(manager).includes('Private rehearsal notes'), false);
  assert.deepEqual(getView(state, 'unknown'), { entries: [], milestones: [] });
});

test('share and revoke controls govern manager evidence and counts', () => {
  const state = seed();
  const initial = saveEntry(state, fields, context);
  state.entries.push(initial);
  assert.equal(summarize(getView(state, 'manager')).evidenceCount, 2);
  const shared = saveEntry(state, { ...fields, visibility: 'shared', evidenceTitle: '', evidenceNote: '' }, context);
  state.entries[state.entries.length - 1] = shared;
  assert.equal(summarize(getView(state, 'manager')).evidenceCount, 3);
  assert.equal(shared.evidence[0].addedAt, now);
  const privateAgain = saveEntry(state, { ...fields, evidenceTitle: '', evidenceNote: '' }, context);
  state.entries[state.entries.length - 1] = privateAgain;
  assert.equal(summarize(getView(state, 'manager')).evidenceCount, 2);
});

test('editing appends timestamped evidence while preserving creation timestamp', () => {
  const state = seed();
  const next = saveEntry(state, fields, { ...context, id: 'synthesis' });
  assert.equal(next.recordedAt, '2026-11-09T07:15:00Z');
  assert.equal(next.evidence.length, 2);
  assert.equal(next.evidence[1].addedAt, now);
  assert.equal(next.learning, fields.learning);
  assert.equal(state.entries.find(item => item.id === 'synthesis').evidence.length, 1);
});

test('rejects missing application, invalid dates, and incomplete evidence pairs', () => {
  for (const [patch, error] of [
    [{ learning: ' ' }, /Learning application/],
    [{ occurred: '2026-02-31' }, /valid contribution date/],
    [{ evidenceNote: '' }, /Evidence reference/],
    [{ milestone: 'prototype' }, /one of your milestones/],
    [{ milestone: 'private-milestone', visibility: 'shared' }, /Choose a shared milestone/],
  ]) {
    assert.throws(() => saveEntry(seed(), { ...fields, ...patch }, context), error);
  }
});

const milestone = {
  title: 'Test the pilot', objective: 'activation', current: '3', target: '4', unit: 'checkpoints',
  due: '2026-11-20', status: 'On track', update: 'Readout is next.', visibility: 'shared',
};

test('milestones save measurable progress and reject inconsistent status and strategy', () => {
  const state = seed();
  assert.equal(saveMilestone(state, milestone, context).current, 3);
  assert.throws(() => saveMilestone(state, { ...milestone, current: '5' }, context), /Progress must be/);
  assert.throws(() => saveMilestone(state, { ...milestone, status: 'Complete' }, context), /reaches the target/);
  assert.throws(() => saveMilestone(state, { ...milestone, objective: 'unknown' }, context), /strategic objective/);
  assert.throws(() => saveMilestone(state, { ...milestone, visibility: 'private' }, { ...context, id: 'onboarding' }), /linked contributions private/);
});

test('manager cannot use employee write operations', () => {
  assert.throws(() => saveEntry(seed(), fields, { ...context, role: 'manager' }), /Switch to Employee/);
  assert.throws(() => saveMilestone(seed(), milestone, { ...context, role: 'manager' }), /Switch to Employee/);
  assert.throws(() => saveEntry(seed(), fields, { ...context, id: 'sessions' }), /another employee/);
  assert.throws(() => saveMilestone(seed(), milestone, { ...context, id: 'prototype' }), /another employee/);
});
