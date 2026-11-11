export const people = {
  maya: { name: 'Maya Chen', initials: 'MC', role: 'Product Specialist', manager: 'jordan' },
  theo: { name: 'Theo Reyes', initials: 'TR', role: 'Design Specialist', manager: 'jordan' },
  jordan: { name: 'Jordan Ellis', initials: 'JE', role: 'Direct Manager' },
  iris: { name: 'Iris Patel', initials: 'IP', role: 'Research Specialist', manager: 'alex' },
};

export const objectives = [
  { id: 'activation', name: 'Improve new-user activation', color: 'mint', description: 'Help new users reach their first meaningful outcome sooner.' },
  { id: 'operations', name: 'Scale team operations', color: 'blue', description: 'Reduce repeat work and make handoffs easier to follow.' },
  { id: 'capability', name: 'Build product capability', color: 'lilac', description: 'Turn new skills into repeatable improvements in the way we work.' },
];

export const types = ['Contribution', 'Idea', 'Achievement', 'Learning'];
export const milestoneStatuses = ['On track', 'At risk', 'Complete'];

const milestones = [
  { id: 'onboarding', owner: 'maya', title: 'Launch the onboarding pilot', objective: 'activation', current: 3, target: 4, unit: 'pilot checkpoints', due: '2026-11-20', status: 'On track', update: 'Three checkpoints are complete. The final checkpoint is the pilot readout.' },
  { id: 'handoff', owner: 'maya', title: 'Standardize the intake handoff', objective: 'operations', current: 2, target: 4, unit: 'teams using the template', due: '2026-11-27', status: 'At risk', update: 'Two teams have adopted the template. One more needs a reviewer assigned this week.' },
  { id: 'research', owner: 'maya', title: 'Apply interview synthesis training', objective: 'capability', current: 2, target: 2, unit: 'sessions using the method', due: '2026-11-10', status: 'Complete', update: 'Two sessions used the new synthesis method. The team adopted the resulting theme map.' },
  { id: 'prototype', owner: 'theo', title: 'Validate the setup flow', objective: 'activation', current: 4, target: 5, unit: 'prototype sessions', due: '2026-11-23', status: 'On track', update: 'Four participants completed setup. The fifth session is scheduled.' },
  { id: 'private-milestone', owner: 'maya', visibility: 'private', title: 'Explore facilitation techniques', objective: 'capability', current: 1, target: 3, unit: 'practice sessions', due: '2026-12-11', status: 'On track', update: 'Private practice goal for future workshops.' },
];

const entries = [
  { id: 'pilot', owner: 'maya', type: 'Achievement', title: 'Completed the onboarding pilot dry run', impact: 'All 6 test accounts reached the first setup checkpoint. Two confusing prompts were flagged for revision.', milestone: 'onboarding', visibility: 'shared', occurred: '2026-11-11', recordedAt: '2026-11-11T03:30:00Z', evidence: [{ title: 'Pilot dry-run scorecard', note: 'Synthetic QA snapshot · 6 of 6 accounts reached setup.', addedAt: '2026-11-11T03:30:00Z' }] },
  { id: 'synthesis', owner: 'maya', type: 'Learning', title: 'Applied affinity mapping to pilot feedback', impact: 'Grouped 24 observations into 4 themes and used them to prioritize two onboarding fixes.', learning: 'Interview synthesis workshop → used affinity mapping in two feedback sessions.', milestone: 'research', visibility: 'shared', occurred: '2026-11-09', recordedAt: '2026-11-09T07:15:00Z', evidence: [{ title: 'Feedback synthesis notes', note: 'Synthetic summary · 24 observations, 4 themes, 2 proposed fixes.', addedAt: '2026-11-09T07:15:00Z' }] },
  { id: 'intake', owner: 'maya', type: 'Idea', title: 'Proposed a single intake checklist', impact: 'Two teams agreed to trial a standard checklist for request handoffs.', milestone: 'handoff', visibility: 'shared', occurred: '2026-11-06', recordedAt: '2026-11-06T04:45:00Z', evidence: [] },
  { id: 'reflection', owner: 'maya', type: 'Contribution', title: 'Drafted a personal facilitation reflection', impact: 'Captured questions and rehearsal notes for the next workshop.', milestone: 'private-milestone', visibility: 'private', occurred: '2026-11-05', recordedAt: '2026-11-05T08:00:00Z', evidence: [{ title: 'Private rehearsal notes', note: 'Synthetic reflection for Maya’s own use.', addedAt: '2026-11-05T08:00:00Z' }] },
  { id: 'sessions', owner: 'theo', type: 'Contribution', title: 'Tested the revised setup flow', impact: 'Four participants completed the main path and identified one unclear label.', milestone: 'prototype', visibility: 'shared', occurred: '2026-11-10', recordedAt: '2026-11-10T06:00:00Z', evidence: [] },
  { id: 'unrelated', owner: 'iris', type: 'Achievement', title: 'Published the research inventory', impact: 'Made five synthetic studies searchable for a separate team.', milestone: '', visibility: 'shared', occurred: '2026-11-08', recordedAt: '2026-11-08T06:00:00Z', evidence: [] },
];

export function seed() {
  return structuredClone({ entries, milestones });
}

export function getView(state, role) {
  if (role === 'employee') {
    return {
      entries: state.entries.filter(item => item.owner === 'maya'),
      milestones: state.milestones.filter(item => item.owner === 'maya'),
    };
  }
  if (role !== 'manager') return { entries: [], milestones: [] };
  const visibleMilestones = state.milestones.filter(item => people[item.owner]?.manager === 'jordan' && item.visibility !== 'private');
  const ids = new Set(visibleMilestones.map(item => item.id));
  return {
    milestones: visibleMilestones,
    entries: state.entries
      .filter(item => people[item.owner]?.manager === 'jordan' && item.visibility === 'shared')
      .map(item => ({ ...item, milestone: ids.has(item.milestone) ? item.milestone : '' })),
  };
}

function required(value, label, max) {
  const clean = String(value ?? '').trim();
  if (!clean || clean.length > max) throw new Error(`${label} must contain 1–${max} characters.`);
  return clean;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function saveEntry(state, fields, { id, now, role }) {
  if (role !== 'employee') throw new Error('Switch to Employee to save a contribution.');
  const previous = state.entries.find(item => item.id === id);
  if (previous && previous.owner !== 'maya') throw new Error('This contribution belongs to another employee.');
  if (!types.includes(fields.type)) throw new Error('Choose a contribution type.');
  if (!['private', 'shared'].includes(fields.visibility)) throw new Error('Choose who can see this contribution.');
  if (!validDate(fields.occurred)) throw new Error('Enter a valid contribution date.');
  const linked = state.milestones.find(item => item.id === fields.milestone && item.owner === 'maya');
  if (fields.milestone && !linked) throw new Error('Choose one of your milestones.');
  if (linked?.visibility === 'private' && fields.visibility === 'shared') {
    throw new Error('Choose a shared milestone or leave the milestone blank before sharing.');
  }
  const evidence = [...(previous?.evidence ?? [])];
  if (fields.evidenceTitle?.trim() || fields.evidenceNote?.trim()) {
    evidence.push({
      title: required(fields.evidenceTitle, 'Evidence title', 100),
      note: required(fields.evidenceNote, 'Evidence reference', 400),
      addedAt: now,
    });
  }
  return {
    id, owner: 'maya', type: fields.type, title: required(fields.title, 'Title', 100),
    impact: required(fields.impact, 'Outcome', 500), milestone: linked?.id ?? '',
    visibility: fields.visibility, occurred: fields.occurred, recordedAt: previous?.recordedAt ?? now,
    learning: fields.type === 'Learning' ? required(fields.learning, 'Learning application', 400) : '',
    evidence,
  };
}

export function saveMilestone(state, fields, { id, role }) {
  if (role !== 'employee') throw new Error('Switch to Employee to save a milestone.');
  const previous = state.milestones.find(item => item.id === id);
  if (previous && previous.owner !== 'maya') throw new Error('This milestone belongs to another employee.');
  const current = Number(fields.current);
  const target = Number(fields.target);
  if (String(fields.current).trim() === '' || !Number.isInteger(current) || !Number.isInteger(target) ||
    current < 0 || target < 1 || current > target || target > 1000000) {
    throw new Error('Progress must be between zero and the target, using whole numbers.');
  }
  if (!milestoneStatuses.includes(fields.status) || (fields.status === 'Complete') !== (current === target)) {
    throw new Error('Use Complete when progress reaches the target.');
  }
  if (!objectives.some(item => item.id === fields.objective)) throw new Error('Choose a strategic objective.');
  if (!validDate(fields.due)) throw new Error('Enter a valid due date.');
  if (!['private', 'shared'].includes(fields.visibility)) throw new Error('Choose who can see this milestone.');
  if (fields.visibility === 'private' && state.entries.some(item => item.milestone === id && item.visibility === 'shared')) {
    throw new Error('Make the linked contributions private before making this milestone private.');
  }
  return {
    id, owner: 'maya', title: required(fields.title, 'Title', 100), objective: fields.objective,
    current, target, unit: required(fields.unit, 'Progress unit', 60), due: fields.due,
    status: fields.status, update: required(fields.update, 'Progress update', 500), visibility: fields.visibility,
  };
}

export function summarize(view) {
  const achievements = view.entries.filter(item => item.type === 'Achievement');
  const risks = view.milestones.filter(item => item.status === 'At risk');
  return { achievements, risks, evidenceCount: view.entries.reduce((total, entry) => total + entry.evidence.length, 0) };
}
