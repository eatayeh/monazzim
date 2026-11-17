/* Daily Checklist — vanilla JS, no build step.
 * State lives in localStorage under STORE_KEY. See CLAUDE.md for the data model. */
(() => {
  'use strict';

  const STORE_KEY = 'daily-checklist:v1';
  const $ = (s) => document.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Dates (always local time) ----------
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => keyOf(new Date());
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

  // ---------- Seed data ----------
  function seed() {
    const t = todayKey();
    const ex = (name, detail, target = 3) => ({ id: uid(), name, detail, target });
    return {
      version: 1,
      sections: [
        {
          id: uid(), name: 'Tongue & throat', note: 'Myofunctional exercises for sleep apnea. Aim for 3 rounds a day.',
          goalDays: 90, startDate: t,
          items: [
            ex('Tongue slide', 'Tongue tip just behind the upper front teeth, slide it backward along the roof of the mouth. 20 times.'),
            ex('Tongue suction', 'Suck the whole tongue flat up against the roof of the mouth. Hold 3–5 s. 20 times.'),
            ex('Back of tongue down', 'Tip touching the lower front teeth, push the back of the tongue down to the floor of the mouth. 20 times.'),
            ex('Tongue push-up', 'Press the tongue tip hard against the roof of the mouth. Hold 5 s. 10 times.'),
            ex('Vowel sounds', 'Say A-E-I-O-U loud and exaggerated, short bursts and long holds. About 3 minutes.'),
            ex('Yawn and hold', 'Open wide and lift the back of the throat as if starting a yawn. Hold 5 s. 10 times.'),
            ex('Cheek suction', 'Suck the cheeks in between the teeth (fish face). Hold 5 s. 10 times.'),
            ex('Finger press', 'Finger inside the cheek pushes out while the cheek pushes back in. 10 per side.'),
            ex('Smile lift', 'Lift one mouth corner up high, then the other. Alternate 10 times.'),
          ],
        },
        {
          id: uid(), name: 'Daily habits', note: '', goalDays: 0, startDate: t,
          items: [
            ex('Chew on both sides at meals', 'Alternate sides while chewing. Swallow with teeth together and tongue on the roof of the mouth.', 1),
          ],
        },
      ],
      log: {}, // { 'YYYY-MM-DD': { itemId: count } }
    };
  }

  // ---------- Persistence ----------
  let state;
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.sections)) return s; }
    } catch (e) { /* fall through to seed */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save — storage is full or blocked.'); }
  }
  state = load();
  save();

  // Ask the browser not to evict our data (best effort).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- Derived values ----------
  const allItems = () => state.sections.flatMap((s) => s.items);
  const countFor = (day, itemId) => (state.log[day] && state.log[day][itemId]) || 0;

  function dayProgress(day, items = allItems()) {
    let need = 0, got = 0;
    for (const it of items) { const t = Math.max(1, it.target | 0); need += t; got += Math.min(t, countFor(day, it.id)); }
    return need ? got / need : 0;
  }
  function streak() {
    let d = new Date(), n = 0;
    if (dayProgress(keyOf(d)) < 1) d = addDays(d, -1); // today not finished yet doesn't break the streak
    while (dayProgress(keyOf(d)) >= 1) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- Rendering ----------
  let view = 'today', editing = false, selectedDay = null, renderedDay = todayKey();
  const checkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function checkButton(day, it) {
    const t = Math.max(1, it.target | 0), c = Math.min(t, countFor(day, it.id));
    const cls = c >= t ? 'full' : c > 0 ? 'part' : '';
    const inner = c >= t ? checkSVG : (t > 1 ? `${c}/${t}` : '');
    return `<button class="check ${cls}" data-act="tick" data-day="${day}" data-id="${it.id}" aria-label="${esc(it.name)}: ${c} of ${t} done">${inner}</button>`;
  }

  function sectionHTML(sec, day, { edit = false } = {}) {
    const total = sec.items.reduce((a, it) => a + Math.max(1, it.target | 0), 0);
    const done = sec.items.reduce((a, it) => a + Math.min(Math.max(1, it.target | 0), countFor(day, it.id)), 0);
    let program = '';
    if (sec.goalDays > 0 && sec.startDate && !edit) {
      const n = Math.min(sec.goalDays, Math.max(0, daysBetween(sec.startDate, day) + 1));
      const pct = Math.round((n / sec.goalDays) * 100);
      program = `<div class="program"><div class="program-bar"><i style="width:${pct}%"></i></div><small>Day ${n} of ${sec.goalDays}</small></div>`;
    }
    const items = sec.items.map((it, i) => `
      <div class="item ${countFor(day, it.id) >= Math.max(1, it.target | 0) ? 'is-full' : ''}">
        ${edit ? '' : checkButton(day, it)}
        <div class="item-body">
          <span class="item-name">${esc(it.name)}</span>
          ${it.target > 1 ? `<span class="item-target">${it.target}× a day</span>` : ''}
          ${it.detail && !edit ? `<details class="how"><summary>How</summary><p>${esc(it.detail)}</p></details>` : ''}
        </div>
        ${edit ? `<div class="item-tools">
          <button class="icon-btn" data-act="item-up" data-sec="${sec.id}" data-id="${it.id}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" data-act="item-edit" data-sec="${sec.id}" data-id="${it.id}" aria-label="Edit">✎</button>
          <button class="icon-btn del" data-act="item-del" data-sec="${sec.id}" data-id="${it.id}" aria-label="Delete">✕</button>
        </div>` : ''}
      </div>`).join('');
    return `
      <article class="routine">
        <div class="routine-head">
          <h2>${esc(sec.name)}</h2>
          ${edit ? `<div class="routine-tools">
            <button class="icon-btn" data-act="sec-up" data-sec="${sec.id}" aria-label="Move routine up">↑</button>
            <button class="icon-btn" data-act="sec-edit" data-sec="${sec.id}" aria-label="Edit routine">✎</button>
            <button class="icon-btn del" data-act="sec-del" data-sec="${sec.id}" aria-label="Delete routine">✕</button>
          </div>` : `<span class="routine-meta">${done}/${total}</span>`}
        </div>
        ${sec.note && !edit ? `<p class="routine-note">${esc(sec.note)}</p>` : ''}
        ${program}
        ${items || (edit ? '' : '<p class="routine-note">No items yet.</p>')}
        ${edit ? `<button class="ghost add-item" data-act="item-add" data-sec="${sec.id}">+ Add item</button>` : ''}
      </article>`;
  }

  function renderHeader() {
    const now = new Date();
    $('#date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    $('#title').textContent = { today: 'Today', history: 'History', settings: 'Settings' }[view];
    const p = dayProgress(todayKey());
    $('#ring-fg').style.strokeDashoffset = String(119.4 * (1 - p));
    $('#ring-pct').textContent = `${Math.round(p * 100)}%`;
    $('#ring').classList.toggle('full', p >= 1);
  }

  function renderToday() {
    const day = todayKey();
    $('#sections').innerHTML = state.sections.length
      ? state.sections.map((s) => sectionHTML(s, day, { edit: editing })).join('')
      : '<p class="empty">Nothing here yet. Tap “Edit list” to add a routine.</p>';
    $('#toggle-edit').textContent = editing ? 'Done editing' : 'Edit list';
    $('#add-section').hidden = !editing;
  }

  function renderHistory() {
    const today = new Date(), tk = keyOf(today);
    const days = Object.keys(state.log).filter((k) => k <= tk);
    const perfect = days.filter((k) => dayProgress(k) >= 1).length;
    $('#stats').innerHTML = `
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${perfect}</b><span>full days</span></div>
      <div class="stat"><b>${days.filter((k) => dayProgress(k) > 0).length}</b><span>active days</span></div>`;

    // 12 columns (weeks) × 7 rows (Mon–Sun), last column = this week.
    const dow = (today.getDay() + 6) % 7; // Mon=0
    const start = addDays(today, -dow - 7 * 11);
    let html = '';
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (let r = 0; r < 7; r++) {
      html += `<span class="lbl">${labels[r]}</span>`;
      for (let c = 0; c < 12; c++) {
        const d = addDays(start, c * 7 + r), k = keyOf(d);
        if (k > tk) { html += '<button class="future" tabindex="-1" aria-hidden="true"></button>'; continue; }
        const p = dayProgress(k);
        const bg = p > 0 ? `background:color-mix(in srgb, var(--done) ${Math.round(20 + p * 80)}%, var(--heat0))` : '';
        html += `<button data-act="pick-day" data-day="${k}" class="${k === tk ? 'today' : ''} ${k === selectedDay ? 'sel' : ''}" style="${bg}" aria-label="${d.toDateString()}: ${Math.round(p * 100)}%"></button>`;
      }
    }
    $('#heat').innerHTML = html;

    if (selectedDay) {
      const label = parseKey(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      $('#day-detail').innerHTML = `<h2 class="h2">${label} · ${Math.round(dayProgress(selectedDay) * 100)}%</h2>` +
        state.sections.map((s) => sectionHTML(s, selectedDay)).join('');
    } else $('#day-detail').innerHTML = '';
  }

  function render() {
    renderedDay = todayKey();
    renderHeader();
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
    ['today', 'history', 'settings'].forEach((v) => { $(`#view-${v}`).hidden = v !== view; });
    if (view === 'today') renderToday();
    if (view === 'history') renderHistory();
  }

  // ---------- Toast with optional undo ----------
  let toastTimer;
  function toast(msg, undo) {
    const el = $('#toast');
    el.innerHTML = esc(msg) + (undo ? ' <button type="button">Undo</button>' : '');
    if (undo) el.querySelector('button').onclick = () => { undo(); el.classList.remove('show'); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 2500);
  }

  // ---------- Dialog helper ----------
  function ask(title, fields) {
    return new Promise((resolve) => {
      const dlg = $('#dlg');
      $('#dlg-title').textContent = title;
      $('#dlg-fields').innerHTML = fields.map((f) => `
        <label class="field"><span>${esc(f.label)}</span>
          ${f.type === 'textarea'
            ? `<textarea name="${f.name}" rows="3">${esc(f.value)}</textarea>`
            : `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(f.value)}" ${f.required ? 'required' : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.type === 'number' ? 'inputmode="numeric"' : ''}>`}
          ${f.help ? `<small>${esc(f.help)}</small>` : ''}
        </label>`).join('');
      dlg.onclose = () => {
        if (dlg.returnValue !== 'ok') return resolve(null);
        const out = {};
        fields.forEach((f) => { const v = dlg.querySelector(`[name="${f.name}"]`).value; out[f.name] = f.type === 'number' ? Number(v) || 0 : v.trim(); });
        resolve(out);
      };
      dlg.returnValue = '';
      dlg.showModal();
      const first = dlg.querySelector('input,textarea'); if (first) first.focus();
    });
  }
  function confirmBox(title) {
    return new Promise((resolve) => {
      const dlg = $('#dlg');
      $('#dlg-title').textContent = title;
      $('#dlg-fields').innerHTML = '';
      $('#dlg-ok').textContent = 'Yes';
      dlg.onclose = () => { $('#dlg-ok').textContent = 'Save'; resolve(dlg.returnValue === 'ok'); };
      dlg.returnValue = '';
      dlg.showModal();
    });
  }

  // ---------- Actions ----------
  const findSec = (id) => state.sections.find((s) => s.id === id);
  const move = (arr, i) => { if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; };

  function tick(day, id) {
    const it = allItems().find((x) => x.id === id); if (!it) return;
    const t = Math.max(1, it.target | 0);
    const wasFull = dayProgress(day) >= 1;
    const log = (state.log[day] ||= {});
    const next = ((log[id] || 0) + 1) % (t + 1); // cycles 0..target, then back to 0
    if (next === 0) delete log[id]; else log[id] = next;
    if (!Object.keys(log).length) delete state.log[day];
    save();
    if (navigator.vibrate) navigator.vibrate(next === t ? 20 : 8);
    render();
    if (day === todayKey() && !wasFull && dayProgress(day) >= 1) toast('All done for today 🎉');
  }

  const itemFields = (it = {}) => [
    { name: 'name', label: 'Name', value: it.name || '', required: true },
    { name: 'target', label: 'Times per day', type: 'number', min: 1, value: it.target || 1, help: 'e.g. 3 for three rounds a day' },
    { name: 'detail', label: 'How to do it (optional)', type: 'textarea', value: it.detail || '' },
  ];
  const secFields = (s = {}) => [
    { name: 'name', label: 'Routine name', value: s.name || '', required: true },
    { name: 'note', label: 'Note (optional)', value: s.note || '' },
    { name: 'goalDays', label: 'Program length in days (optional)', type: 'number', min: 0, value: s.goalDays || 0, help: 'Shows “Day X of N”. Use 0 for none.' },
    { name: 'startDate', label: 'Program start date', type: 'date', value: s.startDate || todayKey() },
  ];

  async function onAction(btn) {
    const { act, sec: secId, id, day } = btn.dataset;
    const sec = secId && findSec(secId);
    switch (act) {
      case 'tick': return tick(day, id);
      case 'pick-day': selectedDay = selectedDay === day ? null : day; return render();
      case 'item-add': {
        const v = await ask('New item', itemFields()); if (!v || !v.name) return;
        sec.items.push({ id: uid(), name: v.name, detail: v.detail, target: Math.max(1, v.target) });
        break;
      }
      case 'item-edit': {
        const it = sec.items.find((x) => x.id === id);
        const v = await ask('Edit item', itemFields(it)); if (!v || !v.name) return;
        Object.assign(it, { name: v.name, detail: v.detail, target: Math.max(1, v.target) });
        break;
      }
      case 'item-up': move(sec.items, sec.items.findIndex((x) => x.id === id)); break;
      case 'item-del': {
        const i = sec.items.findIndex((x) => x.id === id), [removed] = sec.items.splice(i, 1);
        save(); render();
        return toast(`Deleted “${removed.name}”`, () => { sec.items.splice(i, 0, removed); save(); render(); });
      }
      case 'sec-edit': {
        const v = await ask('Edit routine', secFields(sec)); if (!v || !v.name) return;
        Object.assign(sec, { name: v.name, note: v.note, goalDays: Math.max(0, v.goalDays), startDate: v.startDate || todayKey() });
        break;
      }
      case 'sec-up': move(state.sections, state.sections.findIndex((s) => s.id === secId)); break;
      case 'sec-del': {
        const i = state.sections.indexOf(sec), [removed] = state.sections.splice(i, 1);
        save(); render();
        return toast(`Deleted “${removed.name}”`, () => { state.sections.splice(i, 0, removed); save(); render(); });
      }
      default: return;
    }
    save(); render();
  }

  // ---------- Wiring ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (btn && !btn.disabled) onAction(btn);
  });
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(); window.scrollTo(0, 0); }));
  $('#toggle-edit').addEventListener('click', () => { editing = !editing; render(); });
  $('#add-section').addEventListener('click', async () => {
    const v = await ask('New routine', secFields()); if (!v || !v.name) return;
    state.sections.push({ id: uid(), name: v.name, note: v.note, goalDays: Math.max(0, v.goalDays), startDate: v.startDate || todayKey(), items: [] });
    save(); render();
  });

  $('#export').addEventListener('click', async () => {
    const text = JSON.stringify(state);
    const box = $('#backup-box'); box.hidden = false; box.value = text;
    try { await navigator.clipboard.writeText(text); toast('Backup copied — paste it into Notes or an email to yourself.'); }
    catch { box.select(); toast('Select the text below and copy it.'); }
  });
  $('#import').addEventListener('click', async () => {
    const box = $('#backup-box');
    if (box.hidden || !box.value.trim()) { box.hidden = false; box.value = ''; box.focus(); return toast('Paste your backup in the box, then tap Restore again.'); }
    try {
      const s = JSON.parse(box.value);
      if (!s || !Array.isArray(s.sections) || typeof s.log !== 'object') throw new Error('bad');
      if (!(await confirmBox('Replace everything with this backup?'))) return;
      state = s; save(); box.value = ''; box.hidden = true; view = 'today'; render(); toast('Backup restored.');
    } catch { toast('That doesn’t look like a valid backup.'); }
  });
  $('#reset').addEventListener('click', async () => {
    if (!(await confirmBox('Erase all routines and history? This cannot be undone.'))) return;
    state = seed(); save(); view = 'today'; selectedDay = null; render(); toast('Reset to the starter list.');
  });

  // Roll over to a new day if the app stays open past midnight or returns from background.
  const checkDay = () => { if (todayKey() !== renderedDay) render(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
  setInterval(checkDay, 60 * 1000);

  // Offline support.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  render();
})();
