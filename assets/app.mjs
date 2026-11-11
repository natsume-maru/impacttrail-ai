import { seed, people, objectives, types, milestoneStatuses, getView, saveEntry, saveMilestone, summarize } from './model.mjs';

const icons = {
  trail: '<path d="M3 17 9 11l4 4 7-9M15 6h5v5"/><circle cx="4" cy="18" r="1"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  journal: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 8h4M3 16h4m4-7h5m-5 5h5"/>',
  flag: '<path d="M5 22V4m0 1c5-5 9 5 15 0v11c-6 5-10-5-15 0"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="m8 13-2 8 6-3 6 3-2-8"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(1 1) scale(.9)"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2m1-15a3 3 0 0 1 0 6m5 9v-2a5 5 0 0 0-3-4"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  reset: '<path d="M3 12a9 9 0 1 1 3 7M3 6v6h6"/>',
  alert: '<path d="m12 3 10 17H2L12 3Zm0 6v4m0 3v1"/>',
  learning: '<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6"/>',
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

const storageKey = 'impacttrail.demo.v1';
const main = document.querySelector('main');
const modal = document.querySelector('dialog');
const nav = document.querySelector('nav');
const status = document.querySelector('#status');
const pages = {
  overview: ['Overview', 'overview'],
  journal: ['Contribution log', 'journal'],
  milestones: ['Milestones', 'flag'],
  strategy: ['Strategy', 'target'],
};
let state = seed();
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved?.entries) && Array.isArray(saved?.milestones)) state = saved;
} catch {
  storageAvailable = false;
}
let role = 'employee';
let filter = 'All';
let toastTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const date = value => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const stamp = value => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC';
const objectiveFor = milestone => objectives.find(objective => objective.id === milestone?.objective);
const sorted = entries => [...entries].sort((a, b) => b.occurred.localeCompare(a.occurred) || b.recordedAt.localeCompare(a.recordedAt));
const button = (label, action, symbol = 'plus') => `<button class="primary" type="button" data-action="${action}">${icon(symbol)}${label}</button>`;
const pageLink = (label, page) => `<a class="text-link" href="#${page}">${label} ${icon('arrow')}</a>`;
const empty = text => `<p class="empty">${text}</p>`;
const currentPage = () => Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
const typeIcon = { Achievement: 'award', Learning: 'learning', Idea: 'target', Contribution: 'journal' };
const visibility = item => item.visibility === 'private' ? 'Private' : 'Shared';

function notify(message) {
  clearTimeout(toastTimer);
  status.textContent = message;
  status.classList.add('shown');
  toastTimer = setTimeout(() => status.classList.remove('shown'), 4000);
}

function persist(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  render();
  notify(storageAvailable ? message : message + ' Browser storage is unavailable. Changes last for this session.');
}

function objectiveBadge(objective) {
  return objective ? `<span class="objective ${objective.color}"><i></i>${objective.name}</span>` : '';
}

function milestoneCard(item) {
  const percent = Math.floor(item.current / item.target * 100);
  const tone = item.status === 'At risk' ? 'risk' : item.status === 'Complete' ? 'complete' : 'track';
  return `<article class="milestone">
    <div class="milestone-top">${objectiveBadge(objectiveFor(item))}<span class="badge ${tone}">${esc(item.status)}</span></div>
    <h3><button class="item-link" data-action="milestone" data-id="${esc(item.id)}">${esc(item.title)}</button></h3>
    <div class="milestone-metric"><span>${item.current} / ${item.target} ${esc(item.unit)}</span><strong>${percent}%</strong></div>
    <progress class="${tone}" value="${item.current}" max="${item.target}" aria-label="${esc(item.title)} progress"></progress>
    <div class="milestone-footer"><span>Due ${date(item.due)}</span>${role === 'manager' ? esc(people[item.owner].name) : item.visibility === 'private' ? 'Private' : ''}</div>
  </article>`;
}

function entryList(entries, view) {
  if (!entries.length) return empty('No contributions match this view.');
  return `<ul class="entry-list">${sorted(entries).map(item => {
    const milestone = view.milestones.find(candidate => candidate.id === item.milestone);
    return `<li>
      <span class="entry-icon ${item.type.toLowerCase()}">${icon(typeIcon[item.type])}</span>
      <div class="entry-body">
        <button class="item-link" data-action="entry" data-id="${esc(item.id)}">${esc(item.title)}</button>
        <div class="entry-meta">${item.type}${role === 'manager' ? ' · ' + esc(people[item.owner].name) : ''} · ${date(item.occurred)}</div>
        ${objectiveBadge(objectiveFor(milestone))}
      </div>
      <div class="entry-tags">${item.evidence.length ? `<span class="evidence-count" title="Evidence references">${icon('link')}${item.evidence.length}</span>` : ''}
        ${role === 'employee' ? `<span class="badge ${item.visibility === 'private' ? 'private' : 'shared'}">${icon(item.visibility === 'private' ? 'lock' : 'people')}${visibility(item)}</span>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>`;
}

function header(title, description, action = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function metric(symbol, tone, value, label, detail) {
  return `<article class="metric"><span class="metric-icon ${tone}">${icon(symbol)}</span><span class="metric-label">${label}</span><strong>${value}</strong><small>${detail}</small></article>`;
}

function overview(view) {
  const summary = summarize(view);
  const employee = role === 'employee';
  return `<section class="hero">
    <div class="hero-copy"><div class="hero-label"><i></i>${employee ? 'EMPLOYEE WORKSPACE' : 'DIRECT MANAGER WORKSPACE'}</div>
    <h1>${employee ? 'Your impact, in focus.' : 'Team outcomes, in focus.'}</h1>
    <p>${employee ? 'Capture the work that matters, connect it to strategy, and build a record of your impact.' : 'Review shared outcomes, milestone progress, and where your direct reports need support.'}</p>
    ${employee ? button('Log contribution', 'new-entry') : pageLink('Review milestones', 'milestones')}</div>
    <div class="hero-art" aria-hidden="true">
      <svg viewBox="0 0 530 290" fill="none">
        <g stroke="#6a9690" opacity=".18"><path d="M0 56h530M0 100h530M0 144h530M0 188h530M0 232h530M60 0v290M104 0v290M148 0v290M192 0v290M236 0v290M280 0v290M324 0v290M368 0v290M412 0v290M456 0v290M500 0v290"/></g>
        <path d="m28 271 84-66h66l71-74h70l75-75h104" stroke="#75efc0" stroke-width="1.5"/>
        <path d="m102 290 76-57h59l62-62h74l69-70h65" stroke="#7ed0c5" stroke-opacity=".5" stroke-dasharray="4 6"/>
        <g fill="#102f36" stroke="#87f4ce" stroke-width="2"><circle cx="112" cy="205" r="5"/><circle cx="249" cy="131" r="6"/><circle cx="394" cy="56" r="7"/></g>
        <g stroke="#87f4ce" stroke-opacity=".35"><circle cx="394" cy="56" r="18"/><circle cx="394" cy="56" r="28"/><circle cx="249" cy="131" r="15"/></g>
      </svg>
    </div>
  </section>
  <section class="metrics" aria-label="Workspace totals">
    ${metric('journal', 'green', view.entries.length, employee ? 'Contributions logged' : 'Shared contributions', employee ? 'Across your contribution log' : 'From direct reports')}
    ${metric('flag', 'blue', view.milestones.length, employee ? 'Milestones tracked' : 'Shared milestones', `${view.milestones.filter(item => item.status === 'Complete').length} complete`)}
    ${metric('award', 'purple', summary.achievements.length, 'Achievements', 'Outcomes recorded')}
    ${employee ? metric('link', 'amber', summary.evidenceCount, 'Evidence references', 'Timestamped supporting material') : metric('alert', 'amber', summary.risks.length, 'Milestones at risk', 'May need your support')}
  </section>
  ${employee ? '' : `<div class="privacy-note">${icon('lock')}<span>Jordan sees only items shared by direct reports. Private entries and their evidence are hidden from this view.</span></div>`}
  <section class="section">
    <div class="section-heading"><div><h2>Milestone progress</h2><p>${employee ? 'Track measurable outcomes tied to your team’s strategy.' : 'Use the progress update on each milestone to guide your next check-in.'}</p></div>${pageLink('All milestones', 'milestones')}</div>
    <div class="milestone-grid">${(employee ? view.milestones : [...summary.risks, ...view.milestones.filter(item => item.status !== 'At risk')]).slice(0, 3).map(milestoneCard).join('') || empty('No milestones are visible yet.')}</div>
  </section>
  <section class="section">
    <div class="section-heading"><div><h2>${employee ? 'Recent contributions' : 'Recent shared outcomes'}</h2><p>Open any contribution to review the outcome and its evidence.</p></div>${pageLink('View contribution log', 'journal')}</div>
    ${entryList(sorted(view.entries).slice(0, 4), view)}
  </section>`;
}

function render() {
  const page = currentPage();
  const view = getView(state, role);
  const employee = role === 'employee';
  const person = people[employee ? 'maya' : 'jordan'];
  document.querySelector('#breadcrumb').textContent = 'Workspace / ' + pages[page][0];
  document.querySelector('#profile').innerHTML = `<span class="avatar">${person.initials}</span><span><strong>${person.name}</strong><small>${person.role}</small></span>`;
  nav.innerHTML = Object.entries(pages).map(([id, [label, symbol]]) =>
    `<a href="#${id}" ${id === page ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</a>`).join('');
  document.querySelectorAll('[data-role]').forEach(el => el.setAttribute('aria-pressed', String(role === el.dataset.role)));
  if (page === 'overview') {
    main.innerHTML = overview(view);
  } else if (page === 'journal') {
    const entries = view.entries.filter(item => filter === 'All' || item.type === filter);
    main.innerHTML = header('Contribution log', employee ? 'Capture work, ideas, achievements, and applied learning.' : 'Review contributions that your direct reports chose to share.', employee ? button('Log contribution', 'new-entry') : '')
      + `<div class="filters" role="group" aria-label="Contribution type">${['All', ...types].map(type => `<button aria-pressed="${type === filter}" data-filter="${type}">${type}</button>`).join('')}</div>`
      + entryList(entries, view);
  } else if (page === 'milestones') {
    main.innerHTML = header('Milestones', 'Track progress toward measurable outcomes and see what needs attention.', employee ? button('New milestone', 'new-milestone') : '')
      + `<div class="milestone-grid">${view.milestones.map(milestoneCard).join('') || empty('No milestones are visible yet.')}</div>`;
  } else {
    main.innerHTML = header('Strategy', 'See how milestone progress and contributions connect to Studio North’s objectives.')
      + objectives.map(objective => {
        const milestones = view.milestones.filter(item => item.objective === objective.id);
        const aligned = view.entries.filter(entry => milestones.some(item => item.id === entry.milestone));
        return `<section class="strategy section">${objectiveBadge(objective)}<h2>${objective.name}</h2><p>${objective.description}</p>
          <p class="strategy-count">${milestones.length} linked milestones · ${aligned.length} aligned contributions</p>
          <div class="milestone-grid">${milestones.map(milestoneCard).join('') || empty('No visible milestones are linked to this objective.')}</div></section>`;
      }).join('');
  }
}

function showDialog(title, body) {
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button type="button" class="close" data-close aria-label="Close">×</button></div>${body}`;
  if (!modal.open) modal.showModal();
  modal.querySelector('.close').focus();
}

function contributionDetail(item, view) {
  const milestone = view.milestones.find(candidate => candidate.id === item.milestone);
  showDialog(esc(item.title), `
    <div class="detail-meta">${item.type} · ${esc(people[item.owner].name)} · ${date(item.occurred)}${role === 'employee' ? ' · ' + visibility(item) : ''}</div>
    <h3>Outcome</h3><p>${esc(item.impact)}</p>
    ${item.learning ? `<h3>Learning applied</h3><p>${esc(item.learning)}</p>` : ''}
    ${milestone ? `<h3>Linked milestone</h3><p>${esc(milestone.title)}</p>${objectiveBadge(objectiveFor(milestone))}` : ''}
    <h3>Evidence</h3>
    ${item.evidence.length ? `<ul class="evidence-list">${item.evidence.map(ref => `<li><strong>${esc(ref.title)}</strong><p>${esc(ref.note)}</p><small>Added ${stamp(ref.addedAt)}</small></li>`).join('')}</ul>` : '<p>No evidence added yet.</p>'}
    <div class="dialog-footer"><small>Recorded ${stamp(item.recordedAt)}</small>${role === 'employee' ? button('Edit contribution', 'edit-entry', 'journal') : ''}</div>`);
}

function milestoneDetail(item) {
  showDialog(esc(item.title), `${objectiveBadge(objectiveFor(item))}
    <h3>Progress update</h3><p>${esc(item.update)}</p>
    <dl class="details"><dt>Owner</dt><dd>${esc(people[item.owner].name)}</dd><dt>Progress</dt><dd>${item.current} / ${item.target} ${esc(item.unit)}</dd>
    <dt>Status</dt><dd>${esc(item.status)}</dd><dt>Due</dt><dd>${date(item.due)}</dd>${role === 'employee' ? `<dt>Visibility</dt><dd>${visibility(item)}</dd>` : ''}</dl>
    ${role === 'employee' ? `<div class="dialog-footer">${button('Update milestone', 'edit-milestone', 'flag')}</div>` : ''}`);
}

const field = (label, name, value, attrs = '') =>
  `<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
const area = (label, name, value, attrs = '') =>
  `<label>${label}<textarea name="${name}" rows="3" ${attrs}>${esc(value)}</textarea></label>`;
const select = (label, name, options, value) => `<label>${label}<select name="${name}">${options.map(([id, text]) =>
  `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
const choice = (options) => options.map(value => [value, value]);
const privacyOptions = [['private', 'Private · Only in employee view'], ['shared', 'Shared · Visible to direct manager']];
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function editForm(kind, item, view) {
  const entry = kind === 'entry';
  const editing = Boolean(item);
  const visibilityField = select('Visibility', 'visibility', privacyOptions, item?.visibility ?? (editing && !entry ? 'shared' : 'private'));
  const fields = entry ? `
    <div class="form-row">${select('Type', 'type', choice(types), item?.type)}${field('Contribution date', 'occurred', item?.occurred ?? today(), 'type="date" required')}</div>
    ${field('Title', 'title', item?.title, 'required maxlength="100"')}
    ${area('Outcome', 'impact', item?.impact, 'required maxlength="500" placeholder="What changed because of this work?"')}
    <div id="learning-field">${area('Learning applied', 'learning', item?.learning, 'maxlength="400" placeholder="What did you learn, and how did you use it?"')}</div>
    ${select('Linked milestone', 'milestone', [['', 'No milestone'], ...view.milestones.map(m => [m.id, m.title])], item?.milestone ?? '')}
    ${visibilityField}
    <fieldset><legend>Add evidence <small>Optional</small></legend>
      ${field('Evidence title', 'evidenceTitle', '', 'maxlength="100"')}
      ${area('Evidence reference', 'evidenceNote', '', 'maxlength="400" placeholder="Describe the synthetic artifact or paste a reference."')}
    </fieldset>` : `
    ${field('Title', 'title', item?.title, 'required maxlength="100"')}
    ${select('Strategic objective', 'objective', objectives.map(o => [o.id, o.name]), item?.objective)}
    <div class="form-row">${field('Current progress', 'current', item?.current ?? 0, 'type="number" min="0" step="1" required')}${field('Target', 'target', item?.target ?? 1, 'type="number" min="1" max="1000000" step="1" required')}</div>
    ${field('Progress unit', 'unit', item?.unit, 'required maxlength="60" placeholder="e.g. teams using the checklist"')}
    <div class="form-row">${field('Due date', 'due', item?.due ?? today(), 'type="date" required')}${select('Status', 'status', choice(milestoneStatuses), item?.status)}</div>
    ${area('Progress update', 'update', item?.update, 'required maxlength="500" placeholder="What moved forward or needs support?"')}
    ${visibilityField}`;
  showDialog(entry ? editing ? 'Edit contribution' : 'Log contribution' : editing ? 'Update milestone' : 'New milestone',
    `<form>${fields}<p class="form-error" role="alert"></p><div class="dialog-footer"><button type="button" class="secondary" data-close>Cancel</button><button class="primary" type="submit">Save ${entry ? 'contribution' : 'milestone'}</button></div></form>`);
  const form = modal.querySelector('form');
  if (entry) {
    const updateLearning = () => {
      const active = form.elements.type.value === 'Learning';
      form.querySelector('#learning-field').hidden = !active;
      form.elements.learning.required = active;
    };
    form.elements.type.addEventListener('change', updateLearning);
    updateLearning();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form));
    const id = item?.id ?? globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const options = { role, id, now: new Date().toISOString() };
    try {
      const key = entry ? 'entries' : 'milestones';
      const next = entry ? saveEntry(state, fields, options) : saveMilestone(state, fields, options);
      state = { ...state, [key]: [next, ...state[key].filter(row => row.id !== id)] };
      modal.close();
      persist(entry ? 'Contribution saved.' : 'Milestone saved.');
      main.focus();
    } catch (error) {
      form.querySelector('.form-error').textContent = error.message;
    }
  });
}

let activeItem;
main.addEventListener('click', event => {
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) {
    filter = filterButton.dataset.filter;
    render();
    main.querySelector('[aria-pressed="true"]').focus();
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const view = getView(state, role);
  const { action, id } = target.dataset;
  if (action === 'entry') {
    activeItem = view.entries.find(item => item.id === id);
    if (activeItem) contributionDetail(activeItem, view);
  } else if (action === 'milestone') {
    activeItem = view.milestones.find(item => item.id === id);
    if (activeItem) milestoneDetail(activeItem);
  } else if (role === 'employee') {
    editForm(action === 'new-entry' ? 'entry' : 'milestone', null, view);
  }
});

modal.addEventListener('click', event => {
  if (event.target.closest('[data-close]')) modal.close();
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (role === 'employee' && activeItem && ['edit-entry', 'edit-milestone'].includes(action)) {
    editForm(action === 'edit-entry' ? 'entry' : 'milestone', activeItem, getView(state, role));
  }
  if (event.target.closest('[data-confirm-reset]')) {
    modal.close();
    state = seed();
    filter = 'All';
    persist('Synthetic demo restored.');
  }
});

document.querySelector('#roles').addEventListener('click', event => {
  const target = event.target.closest('[data-role]');
  if (!target || target.dataset.role === role) return;
  role = target.dataset.role;
  filter = 'All';
  activeItem = undefined;
  render();
  notify(role === 'manager' ? 'Showing shared outcomes for Jordan’s direct reports.' : 'Showing Maya’s employee workspace.');
});
document.querySelector('#reset').addEventListener('click', () => {
  showDialog('Reset demo?', '<p>This replaces changes in this browser with the original synthetic records.</p><div class="dialog-footer"><button class="secondary" data-close>Cancel</button><button class="primary" data-confirm-reset>Reset demo</button></div>');
});
window.addEventListener('hashchange', () => { filter = 'All'; render(); main.focus(); });
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  if (modal.open) modal.close();
  try {
    const saved = JSON.parse(event.newValue);
    state = Array.isArray(saved?.entries) && Array.isArray(saved?.milestones) ? saved : seed();
    render();
  } catch {
    notify('The demo could not load changes from another tab.');
  }
});
render();
