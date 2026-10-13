async (page) => {
  // New-document inline-create flow verification (fixture-backed, no real Firebase).
  // Runs in Node with the passed Playwright `page` only. Uses page.route to serve
  // in-memory fixtures for services/storage.ts, services/fileService.ts and
  // contexts/AuthContext.tsx, blocks Firebase network, drives real app UI on the
  // supervisor-started Vite dev server at http://127.0.0.1:4175, returns per-kind JSON.
  const BASE = 'http://127.0.0.1:4175';
  const APP_ID = 'supervisor-fixture';
  const results = {};
  const dialogs = [];
  const ALERT_FN = '__docappFlowPushAlert_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  await page.goto('about:blank');
  try { await page.exposeFunction(ALERT_FN, (msg) => { dialogs.push(String(msg)); }); } catch (e) { /* already exposed on rerun */ }

  const until = async (fn, timeout = 9000, label = 'cond') => {
    const t0 = Date.now();
    for (;;) {
      let v = null;
      try { v = await fn(); } catch (e) { v = null; }
      if (v) return v;
      if (Date.now() - t0 > timeout) throw new Error('timeout: ' + label);
      await new Promise((r) => setTimeout(r, 150));
    }
  };
  const lastDialog = () => (dialogs.length ? dialogs[dialogs.length - 1] : '');

  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    // 1) Block Firebase network FIRST, before any app code, module fetch, or navigation.
    await page.route(/firestore\.googleapis\.com|firebaseio\.com|identitytoolkit|securetoken\.googleapis|firebaseinstallations|firebasestorage|gstatic\.com\/firebasejs/, (r) => r.abort());
    // 2) Discover the exact React dep URL via plain HTTP (no module execution, no page yet).
    const probeRes = await page.request.get(BASE + '/contexts/AuthContext.tsx', { timeout: 30000 });
    if (!probeRes.ok()) throw new Error('probe HTTP ' + probeRes.status());
    const probeSrc = await probeRes.text();
    const rm = probeSrc.match(/from\s+["']([^"']*\.vite\/deps\/react\.js\?[^"']*)["']/);
    const reactUrl = rm ? rm[1] : null;
    if (!reactUrl) throw new Error('react dep URL not discovered; refusing to run with duplicate React');

    const storageSrc = `
const NOW = Date.now();
const clone = (o) => JSON.parse(JSON.stringify(o));
const APP = { id: '${APP_ID}', name: 'Supervisor Fixture', description: 'fixture', version: '1.0.0', platform: 'Web', createdAt: NOW };
const stores = { planning: new Map(), reports: new Map(), prompts: new Map(), memos: new Map(), freeDocs: new Map(), notes: new Map(), issues: new Map(), screenshots: new Map() };
const writes = []; const deletes = []; const uploads = [];
let failNext = null;
const seedDoc = (col, doc) => stores[col].set(doc.id, clone(doc));
seedDoc('planning', { id: 'seed-planning-1', appId: '${APP_ID}', title: 'SEED planning', content: '# seed\\nseed planning body', createdAt: NOW, updatedAt: NOW, listSortRank: 5, fileInfoList: [] });
seedDoc('reports', { id: 'seed-report-1', appId: '${APP_ID}', title: 'SEED report', type: 'Interim', summary: 'seed report summary', createdAt: NOW, updatedAt: NOW, fileInfoList: [{ id: 'att-seed-1', name: 'seed.txt', url: 'https://fixture.local/seed.txt', size: 4, type: 'text/plain', date: NOW }] });
seedDoc('prompts', { id: 'seed-prompt-1', appId: '${APP_ID}', title: 'SEED prompt', prompt: '<p>seed prompt</p>', response: '<p>seed response</p>', tags: ['seed'], createdAt: NOW, updatedAt: NOW, fileInfoList: [] });
seedDoc('memos', { id: 'seed-memo-1', appId: '${APP_ID}', title: 'SEED memo', content: '<p>seed memo body</p>', createdAt: NOW, updatedAt: NOW, fileInfoList: [] });
seedDoc('freeDocs', { id: 'seed-task-1', appId: '${APP_ID}', title: 'SEED task', html: '<p>seed task body</p>', createdAt: NOW, updatedAt: NOW, fileInfoList: [] });
seedDoc('notes', { id: 'seed-note-1', appId: '${APP_ID}', title: 'SEED note', content: '<p>seed note body</p>', createdAt: NOW, updatedAt: NOW });
seedDoc('issues', { id: 'seed-issue-1', appId: '${APP_ID}', title: 'SEED issue', description: '<p>seed desc</p>', solution: '<p>seed sol</p>', status: 'Open', severity: 'Medium', createdAt: NOW, updatedAt: NOW, fileInfoList: [] });
function makeCol(name) {
  return {
    list: async (appId) => Array.from(stores[name].values()).filter((d) => !appId || d.appId === appId).map(clone),
    save: async (item) => {
      if (failNext && failNext.collection === name) { const msg = failNext.message; failNext = null; throw new Error(msg); }
      stores[name].set(item.id, clone(item));
      writes.push({ collection: name, id: item.id, at: Date.now() });
      return clone(item);
    },
    delete: async (id) => { stores[name].delete(id); deletes.push({ collection: name, id, at: Date.now() }); },
  };
}
export const storage = {
  getApps: async () => [clone(APP)],
  getApp: async (id) => (id === APP.id ? clone(APP) : undefined),
  saveApp: async (a) => clone(a),
  deleteApp: async (id) => { deletes.push({ collection: 'apps', id, at: Date.now() }); },
  planning: makeCol('planning'),
  reports: makeCol('reports'),
  prompts: makeCol('prompts'),
  memos: makeCol('memos'),
  freeDocs: makeCol('freeDocs'),
  notes: makeCol('notes'),
  issues: makeCol('issues'),
  screenshots: makeCol('screenshots'),
};
export const db = {};
export const firebaseStorage = {};
export const auth = { currentUser: { uid: 'fixture-uid', email: 'fixture@example.com' } };
window.__DOCAPP_FIXTURE__ = {
  writes, deletes, uploads,
  size: (col) => stores[col].size,
  writesFor: (col, id) => writes.filter((w) => w.collection === col && (!id || w.id === id)).map((w) => ({ ...w })),
  lastWrite: (col, id) => { const l = writes.filter((w) => w.collection === col && (!id || w.id === id)); return l.length ? { ...l[l.length - 1] } : null; },
  getDoc: (col, id) => clone(stores[col].get(id)),
  failNextSave: (col, message) => { failNext = { collection: col, message }; },
  clearFail: () => { failNext = null; },
  markWrites: () => writes.length,
  markDeletes: () => deletes.length,
};
`;
    const fileSrc = `
export const uploadFile = async (entityId, section, file) => {
  window.__DOCAPP_FIXTURE__.uploads.push({ entityId, section, name: file.name, size: file.size, type: file.type, at: Date.now() });
  return { id: 'up-' + Date.now() + '-' + file.name, name: file.name, url: 'https://fixture.local/' + encodeURIComponent(section) + '/' + encodeURIComponent(file.name), size: file.size, type: file.type, date: Date.now() };
};
export const deleteFile = async (url) => { window.__DOCAPP_FIXTURE__.deletes.push({ collection: '__files__', id: url, at: Date.now() }); };
export const getFilePathFromURL = (url) => url;
`;
    const authSrc = `
import React from '${reactUrl}';
const { createContext, useContext, useState } = React;
const AuthContext = createContext(undefined);
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (c === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return c;
};
export const AuthProvider = ({ children }) => {
  const [user] = useState({ uid: 'fixture-uid', email: 'fixture@example.com', displayName: 'Fixture' });
  const [loading] = useState(false);
  const value = { user, loading, signIn: async () => {}, signOut: async () => {} };
  return React.createElement(AuthContext.Provider, { value }, children);
};
`;
    await page.route('**/services/storage.ts*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: storageSrc }));
    await page.route('**/services/fileService.ts*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fileSrc }));
    await page.route('**/contexts/AuthContext.tsx*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: authSrc }));

    // 3) First app navigation happens only after Firebase blocking + fixture routes.
    await page.goto(BASE + '/#/app/' + APP_ID, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await until(async () => {
      const h = await page.locator('header h1').first().textContent().catch(() => null);
      return h && h.indexOf('Supervisor Fixture') >= 0 ? true : null;
    }, 20000, 'fixture app header');
    // Replace native alert in the TEST PAGE ONLY: record into dialogs, never block.
    await page.evaluate("(window.__docappFlowOrigAlert === undefined) && (window.__docappFlowOrigAlert = (window.alert ? window.alert.bind(window) : null)), window.alert = function (m) { try { window['" + ALERT_FN + "'](String(m)); } catch (e) { } };");

    const scope = () => page.locator('[data-edit-scope]');
    const saveBtn = () => page.locator('[data-edit-scope] [data-edit-save]');
    const titleInput = () => page.locator('[data-edit-scope] input:not([type="file"])').first();
    const overlayCount = () => page.locator('div.fixed.inset-0').count();
    const storeSize = (col) => page.evaluate('(window.__DOCAPP_FIXTURE__.size(' + JSON.stringify(col) + '))');
    const writesFor = (col, id) => page.evaluate("(window.__DOCAPP_FIXTURE__.writesFor(" + JSON.stringify(col) + (id ? "," + JSON.stringify(id) : "") + "))");
    const markWrites = () => page.evaluate('(window.__DOCAPP_FIXTURE__.markWrites())');
    const markDeletes = () => page.evaluate('(window.__DOCAPP_FIXTURE__.markDeletes())');

    const openTab = async (label) => {
      await page.locator('aside button').filter({ hasText: label }).first().click();
      await until(async () => {
        const n = await page.locator('aside button').filter({ hasText: label }).count().catch(() => 0);
        return n >= 0 ? true : null;
      }, 5000, 'tab ' + label);
      await new Promise((r) => setTimeout(r, 400));
    };
    const expectHeading = async (text) => {
      await until(async () => {
        const t = await scope().locator('h3').first().textContent().catch(() => null);
        return t && t.indexOf(text) >= 0 ? true : null;
      }, 8000, 'heading ' + text);
    };
    // Best-effort return to the list view so one case failure cannot hang later cases.
    const recoverToList = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const barnT = await page.locator('div.fixed.inset-0 h3').first().textContent({ timeout: 1000 }).catch(() => null);
          if (barnT && barnT.indexOf('새 BARN') >= 0) {
            await page.getByRole('button', { name: '취소' }).first().click({ timeout: 3000 });
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        } catch (ignored) {}
        try {
          if ((await page.locator('#unsaved-changes-title').count()) > 0) {
            await page.getByRole('button', { name: '아니오' }).click({ timeout: 3000 });
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        } catch (ignored) {}
        try {
          if ((await scope().count()) === 0) return;
          await page.getByRole('button', { name: '목록으로' }).first().click({ timeout: 3000 });
          await new Promise((r) => setTimeout(r, 500));
        } catch (ignored) {}
      }
    };

    const kinds = [
      { key: 'planning', col: 'planning', tab: '기획서', createBtn: '작성하기', draftH: '새 기획서 작성', savedH: '기획서 수정', editor: 'textarea', title: 'SUPERVISOR inline planning', body: 'inline planning body marker 4821', checkRank: true, rankSeed: 5 },
      { key: 'reports', col: 'reports', tab: '보고서', createBtn: '작성하기', draftH: '새 보고서 작성', savedH: '보고서 수정', editor: 'textarea', title: 'SUPERVISOR inline report', body: 'inline report body marker 4822', select: { index: 0, value: 'Final' } },
      { key: 'memos', col: 'memos', tab: '참고', createBtn: '작성하기', draftH: '새 참고 작성', savedH: '참고 수정', editor: 'tip', title: 'SUPERVISOR inline memo', body: 'inline memo body marker 4823' },
      { key: 'free', col: 'freeDocs', tab: 'TASK', createBtn: '작성하기', draftH: '새 TASK 작성', savedH: 'TASK 수정', editor: 'tip', title: 'SUPERVISOR inline task', body: 'inline task body marker 4824', checkEmptyBody: true },
      { key: 'notes', col: 'notes', tab: '메모', createBtn: '메모 추가', draftH: '새 메모 작성', savedH: '메모 수정', editor: 'tip', title: 'SUPERVISOR inline note', body: 'inline note body marker 4825' },
      { key: 'issues', col: 'issues', tab: '트러블슈팅', createBtn: '이슈 등록', draftH: '새 트러블슈팅 작성', savedH: '트러블슈팅 수정', editor: 'tip2', title: 'SUPERVISOR inline issue', body: 'inline issue body marker 4826', selects: [{ index: 0, value: 'High' }, { index: 1, value: 'InProgress' }] },
    ];

    for (const k of kinds) {
      try {
        await openTab(k.tab);
        const beforeW = await markWrites();
        const beforeD = await markDeletes();
        const sizeBefore = await storeSize(k.col);
        // Create opens inline draft editor, no modal, no write, no delete button.
        await page.getByRole('button', { name: k.createBtn }).first().click();
        await until(async () => ((await scope().count()) === 1 ? true : null), 8000, k.key + ' scope');
        await expectHeading(k.draftH);
        if ((await overlayCount()) !== 0) throw new Error('unexpected overlay/modal on create');
        if ((await markWrites()) !== beforeW) throw new Error('write happened before Save');
        if ((await page.getByRole('button', { name: '삭제', exact: true }).count()) !== 0) throw new Error('delete visible for draft');
        // Blank title rejected, draft retained.
        const dlgBefore = dialogs.length;
        await saveBtn().click();
        await until(() => (dialogs.length > dlgBefore ? true : null), 8000, k.key + ' blank-title dialog');
        if (lastDialog().indexOf('제목을 입력하세요') < 0) throw new Error('unexpected dialog: ' + lastDialog());
        if ((await markWrites()) !== beforeW) throw new Error('write on blank title');
        await expectHeading(k.draftH);
        // TASK body validation with title only.
        await titleInput().fill(k.title);
        if (k.checkEmptyBody) {
          const d2 = dialogs.length;
          await saveBtn().click();
          await until(() => (dialogs.length > d2 ? true : null), 8000, k.key + ' empty-body dialog');
          if (lastDialog().indexOf('내용을 입력하세요') < 0) throw new Error('unexpected dialog: ' + lastDialog());
          if ((await markWrites()) !== beforeW) throw new Error('write on empty body');
        }
        // Fill body (+ selects) and save.
        if (k.editor === 'textarea') {
          await scope().locator('textarea').first().fill(k.body);
        } else if (k.editor === 'tip') {
          await scope().locator('[contenteditable="true"]').first().fill(k.body);
        } else {
          await scope().locator('[contenteditable="true"]').nth(0).fill(k.body + ' desc');
          await scope().locator('[contenteditable="true"]').nth(1).fill(k.body + ' sol');
        }
        if (k.select) await scope().locator('select').nth(k.select.index).selectOption(k.select.value);
        if (k.selects) for (const s of k.selects) await scope().locator('select').nth(s.index).selectOption(s.value);
        await new Promise((r) => setTimeout(r, 400));
        await saveBtn().click();
        await expectHeading(k.savedH);
        await until(async () => ((await markWrites()) === beforeW + 1 ? true : null), 8000, k.key + ' first write');
        if ((await storeSize(k.col)) !== sizeBefore + 1) throw new Error('store size mismatch after save');
        if ((await page.getByRole('button', { name: '삭제', exact: true }).count()) === 0) throw new Error('delete missing after save');
        const w1 = await writesFor(k.col);
        const newId = w1[w1.length - 1].id;
        // First-save rank sits above the manually ranked seed; second save preserves it.
        if (k.checkRank) {
          const rank1 = await page.evaluate("(window.__DOCAPP_FIXTURE__.getDoc(" + JSON.stringify(k.col) + "," + JSON.stringify(newId) + ").listSortRank)");
          if (!(typeof rank1 === 'number' && rank1 < k.rankSeed)) throw new Error('first-save rank not above seed: ' + rank1);
          k._rank1 = rank1;
        }
        // Second save updates same document, no duplicate.
        await titleInput().fill(k.title + ' v2');
        await new Promise((r) => setTimeout(r, 300));
        await saveBtn().click();
        await until(async () => ((await writesFor(k.col, newId)).length === 2 ? true : null), 8000, k.key + ' second write');
        if ((await storeSize(k.col)) !== sizeBefore + 1) throw new Error('duplicate document on second save');
        if (k.checkRank) {
          const rank2 = await page.evaluate("(window.__DOCAPP_FIXTURE__.getDoc(" + JSON.stringify(k.col) + "," + JSON.stringify(newId) + ").listSortRank)");
          if (rank2 !== k._rank1) throw new Error('rank changed on second save: ' + rank2);
        }
        // Back to list and reopen saved doc; body/selects preserved.
        // Let guard baseline settle (syncBaseline uses rAF) before requesting exit.
        await until(async () => ((await saveBtn().isEnabled().catch(() => false)) ? true : null), 8000, k.key + ' save enabled');
        await page.evaluate("new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 150))))");
        await page.getByRole('button', { name: '목록으로' }).first().click();
        await until(async () => ((await scope().count()) === 0 ? true : null), 8000, k.key + ' back to list');
        await page.getByText(k.title + ' v2', { exact: true }).first().click();
        await until(async () => ((await scope().count()) === 1 ? true : null), 8000, k.key + ' reopen');
        await expectHeading(k.savedH);
        const tVal = await titleInput().inputValue();
        if (tVal !== k.title + ' v2') throw new Error('title not preserved: ' + tVal);
        if (k.editor === 'textarea') {
          const bVal = await scope().locator('textarea').first().inputValue();
          if (bVal.indexOf(k.body) < 0) throw new Error('body not preserved');
        } else if (k.editor === 'tip') {
          const bTxt = await scope().locator('[contenteditable="true"]').first().innerText();
          if (bTxt.indexOf(k.body) < 0) throw new Error('body not preserved');
        } else {
          const dTxt = await scope().locator('[contenteditable="true"]').nth(0).innerText();
          const sTxt = await scope().locator('[contenteditable="true"]').nth(1).innerText();
          if (dTxt.indexOf(k.body) < 0 || sTxt.indexOf(k.body) < 0) throw new Error('desc/sol not preserved');
        }
        if (k.select) {
          const v = await scope().locator('select').nth(k.select.index).inputValue();
          if (v !== k.select.value) throw new Error('select not preserved: ' + v);
        }
        if (k.selects) {
          for (const s of k.selects) {
            const v = await scope().locator('select').nth(s.index).inputValue();
            if (v !== s.value) throw new Error('select not preserved: ' + v);
          }
        }
        if ((await markDeletes()) !== beforeD) throw new Error('unexpected delete during flow');
        // Return to list for next kind.
        await page.getByRole('button', { name: '목록으로' }).first().click();
        await until(async () => ((await scope().count()) === 0 ? true : null), 8000, k.key + ' list again');
        results[k.key] = 'pass';
      } catch (e) {
        results[k.key] = 'fail: ' + (e && e.message ? e.message : String(e));
        await recoverToList();
      }
    }

    // Discard-changed-draft via unsaved dialog (planning): no write, no delete.
    try {
      await recoverToList();
      await openTab('기획서');
      const w0 = await markWrites(); const d0 = await markDeletes();
      await page.getByRole('button', { name: '작성하기' }).first().click();
      await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'discard scope');
      // Let the guard baseline settle over its frames before making the draft dirty.
      await page.evaluate("new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 150))))");
      await titleInput().fill('SUPERVISOR discard me');
      await new Promise((r) => setTimeout(r, 400));
      await page.getByRole('button', { name: '목록으로' }).first().click();
      await until(async () => {
        const t = await page.locator('#unsaved-changes-title').count().catch(() => 0);
        return t > 0 ? true : null;
      }, 8000, 'unsaved dialog');
      await page.getByRole('button', { name: '아니오' }).click();
      await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'discarded to list');
      if ((await markWrites()) !== w0) throw new Error('write on discard');
      if ((await markDeletes()) !== d0) throw new Error('delete on discard');
      results.discard = 'pass';
    } catch (e) {
      results.discard = 'fail: ' + (e && e.message ? e.message : String(e));
      await recoverToList();
    }

    // Untouched draft exits cleanly without dialog (memos).
    try {
      await recoverToList();
      await openTab('참고');
      const w0 = await markWrites();
      await page.getByRole('button', { name: '작성하기' }).first().click();
      await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'untouched scope');
      await new Promise((r) => setTimeout(r, 900));
      await page.getByRole('button', { name: '목록으로' }).first().click();
      await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'untouched exit');
      if ((await page.locator('#unsaved-changes-title').count()) !== 0) throw new Error('dialog on untouched draft');
      if ((await markWrites()) !== w0) throw new Error('write on untouched exit');
      results.untouched = 'pass';
    } catch (e) {
      results.untouched = 'fail: ' + (e && e.message ? e.message : String(e));
      await recoverToList();
    }

    // Failed save retains draft (notes).
    try {
      await recoverToList();
      await openTab('메모');
      await page.evaluate("(window.__DOCAPP_FIXTURE__.failNextSave('notes','fixture save failure'))");
      await page.getByRole('button', { name: '메모 추가' }).first().click();
      await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'failsave scope');
      await titleInput().fill('SUPERVISOR failed save');
      await scope().locator('[contenteditable="true"]').first().fill('failed body marker 4827');
      await new Promise((r) => setTimeout(r, 400));
      const d0 = dialogs.length;
      await saveBtn().click();
      await until(() => (dialogs.length > d0 ? true : null), 8000, 'failsave dialog');
      if (lastDialog().indexOf('저장에 실패') < 0) throw new Error('unexpected dialog: ' + lastDialog());
      await expectHeading('새 메모 작성');
      const tVal = await titleInput().inputValue();
      if (tVal !== 'SUPERVISOR failed save') throw new Error('draft title lost after failure');
      const bTxt = await scope().locator('[contenteditable="true"]').first().innerText();
      if (bTxt.indexOf('failed body marker 4827') < 0) throw new Error('draft body lost after failure');
      await page.evaluate('(window.__DOCAPP_FIXTURE__.clearFail())');
      await page.getByRole('button', { name: '목록으로' }).first().click();
      await until(async () => {
        const t = await page.locator('#unsaved-changes-title').count().catch(() => 0);
        return t > 0 ? true : null;
      }, 8000, 'failsave unsaved dialog');
      await page.getByRole('button', { name: '아니오' }).click();
      await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'failsave exit');
      results.failedSave = 'pass';
    } catch (e) {
      results.failedSave = 'fail: ' + (e && e.message ? e.message : String(e));
      await recoverToList();
    }

    // Attachment upload wiring (memos draft) + seeded attachment preservation (reports).
    try {
      await recoverToList();
      await openTab('참고');
      await page.getByRole('button', { name: '작성하기' }).first().click();
      await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'attach scope');
      await titleInput().fill('SUPERVISOR attach memo');
      await scope().locator('[contenteditable="true"]').first().fill('attach body marker 4828');
      await new Promise((r) => setTimeout(r, 400));
      const attachInput = page.locator('[data-edit-scope] input[id^="file-upload-memo-detail-"]');
      await until(async () => ((await attachInput.count()) > 0 ? true : null), 8000, 'attachment input');
      let attached = false;
      try {
        await attachInput.setInputFiles({ name: 'attach-proof.txt', mimeType: 'text/plain', buffer: Buffer.from('attach-bytes') });
        attached = true;
      } catch (e) {
        attached = false;
      }
      if (!attached) {
        await page.evaluate(`(() => {
          const input = document.querySelector('[data-edit-scope] input[id^="file-upload-memo-detail-"]');
          if (!input) throw new Error('attachment file input missing');
          const f = new File(['attach-bytes'], 'attach-proof.txt', { type: 'text/plain' });
          const dt = new DataTransfer();
          dt.items.add(f);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);
      }
      await until(async () => {
        const t = await scope().locator('text=attach-proof.txt').count().catch(() => 0);
        return t > 0 ? true : null;
      }, 8000, 'attachment row');
      await saveBtn().click();
      await until(async () => {
        const h = await scope().locator('h3').first().textContent().catch(() => '');
        return h && h.indexOf('참고 수정') >= 0 ? true : null;
      }, 8000, 'attach saved');
      const wlist = await writesFor('memos');
      const savedId = wlist[wlist.length - 1].id;
      const saved = await page.evaluate('(window.__DOCAPP_FIXTURE__.getDoc(' + JSON.stringify('memos') + ',' + JSON.stringify(savedId) + '))');
      const urls = (saved.fileInfoList || []).map((f) => f.url).join('|');
      if (urls.indexOf('attach-proof.txt') < 0) throw new Error('attachment missing in saved write');
      const ups = await page.evaluate("(window.__DOCAPP_FIXTURE__.uploads.filter((u) => u.name === 'attach-proof.txt'))");
      if (!ups.length) throw new Error('stub upload not recorded');
      if (ups[ups.length - 1].section !== 'memos/' + savedId) throw new Error('upload section mismatch: ' + ups[ups.length - 1].section);
      await page.getByRole('button', { name: '목록으로' }).first().click();
      await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'attach list');
      // Seeded report attachment preserved through save.
      await openTab('보고서');
      await page.getByText('SEED report', { exact: true }).first().click();
      await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'seed report open');
      if ((await scope().locator('text=seed.txt').count()) === 0) throw new Error('seed attachment not shown');
      await saveBtn().click();
      await new Promise((r) => setTimeout(r, 1200));
      const rw = await writesFor('reports', 'seed-report-1');
      if (!rw.length) throw new Error('seed report save missing');
      const rdoc = await page.evaluate("(window.__DOCAPP_FIXTURE__.getDoc('reports','seed-report-1'))");
      if (!((rdoc.fileInfoList || []).some((f) => f.url === 'https://fixture.local/seed.txt'))) throw new Error('seed attachment dropped on save');
      await page.getByRole('button', { name: '목록으로' }).first().click();
      results.attachments = 'pass';
    } catch (e) {
      results.attachments = 'fail: ' + (e && e.message ? e.message : String(e));
      await recoverToList();
    }

    // BARN create modal still exists (excluded view).
    try {
      await recoverToList();
      await openTab('BARN');
      await page.getByRole('button', { name: '로그 추가' }).first().click();
      await until(async () => ((await page.locator('div.fixed.inset-0').count()) > 0 ? true : null), 8000, 'barn modal');
      const t = await page.locator('div.fixed.inset-0 h3').first().textContent().catch(() => '');
      if (!t || t.indexOf('새 BARN') < 0) throw new Error('barn modal heading missing: ' + t);
      await page.getByRole('button', { name: '취소' }).first().click();
      results.barnModal = 'pass';
    } catch (e) {
      results.barnModal = 'fail: ' + (e && e.message ? e.message : String(e));
      await recoverToList();
    }

    // Fixed-title long-document scroll layout: all six kinds, desktop + mobile, draft + saved.
    let isMobileNav = false;
    const setVp = async (w, h) => {
      await page.setViewportSize({ width: w, height: h });
      isMobileNav = w < 1024;
      await new Promise((r) => setTimeout(r, 500));
    };
    const tabBtnR = (label) => (isMobileNav
      ? page.locator('nav.lg\\:hidden button').filter({ hasText: label }).first()
      : page.locator('aside button').filter({ hasText: label }).first());
    const openTabR = async (label) => {
      await tabBtnR(label).click();
      await new Promise((r) => setTimeout(r, 500));
    };
    const longText = (marker) => Array.from({ length: 120 }, (_, i) => 'LONG-' + marker + ' line ' + i + ' ' + 'x'.repeat(120)).join('\n');
    const longHtml = (marker) => Array.from({ length: 120 }, (_, i) => '<p>LONG-' + marker + ' line ' + i + ' ' + 'x'.repeat(120) + '</p>').join('');
    const settleEdit = async () => {
      await page.evaluate("new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 150))))");
    };
    const assertScrollLayout = async (label) => {
      const body = page.locator('[data-body-scroll]').first();
      const title = page.locator('[data-fixed-title] input:not([type="file"])').first();
      await until(async () => {
        const h = await body.evaluate((el) => el.scrollHeight - el.clientHeight).catch(() => 0);
        return h > 200 ? true : null;
      }, 8000, label + ' overflow');
      const y0 = await title.boundingBox().then((b) => (b ? b.y : null)).catch(() => null);
      if (y0 == null) throw new Error(label + ': title has no box');
      await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await until(async () => {
        const st = await body.evaluate((el) => el.scrollTop).catch(() => 0);
        return st > 300 ? true : null;
      }, 8000, label + ' scrolled');
      const box = await title.boundingBox().catch(() => null);
      if (!box) throw new Error(label + ': title hidden after scroll');
      if (Math.abs(box.y - y0) > 2) throw new Error(label + ': title moved ' + y0 + '->' + box.y);
      const vp = page.viewportSize();
      if (box.y < 0 || (vp && box.y > vp.height)) throw new Error(label + ': title outside viewport');
      if (!(await title.isVisible())) throw new Error(label + ': title not visible');
      const outer = await page.evaluate("({ y: window.scrollY || 0, main: (document.querySelector('main') ? document.querySelector('main').scrollTop : 0) })");
      if (outer.y !== 0 || outer.main !== 0) throw new Error(label + ': outer scrolled ' + JSON.stringify(outer));
    };
    const fillLongBody = async (k, marker) => {
      if (k.editor === 'textarea') {
        await scope().locator('textarea').first().fill(longText(marker));
      } else if (k.editor === 'tip') {
        await scope().locator('[contenteditable="true"]').first().fill(longHtml(marker));
      } else {
        await scope().locator('[contenteditable="true"]').nth(0).fill(longHtml(marker + '-d'));
        await scope().locator('[contenteditable="true"]').nth(1).fill(longHtml(marker + '-s'));
      }
      await new Promise((r) => setTimeout(r, 400));
    };
    for (const k of kinds) {
      for (const vp of [{ w: 1280, h: 900 }, { w: 390, h: 844 }]) {
        const vpTag = vp.w === 1280 ? '1280' : '390';
        // Draft layout.
        try {
          await recoverToList();
          await setVp(vp.w, vp.h);
          await openTabR(k.tab);
          await page.getByRole('button', { name: k.createBtn }).first().click();
          await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'scroll draft scope ' + k.key);
          await titleInput().fill('SUPERVISOR scroll ' + k.key);
          await fillLongBody(k, k.key + '-' + vpTag + '-draft');
          await assertScrollLayout('scroll-' + k.key + '-' + vpTag + '-draft');
          await page.getByRole('button', { name: '목록으로' }).first().click();
          await until(async () => {
            const t = await page.locator('#unsaved-changes-title').count().catch(() => 0);
            return t > 0 ? true : null;
          }, 8000, 'scroll draft dialog ' + k.key);
          await page.getByRole('button', { name: '아니오' }).click();
          await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'scroll draft exit ' + k.key);
          results['scroll-' + k.key + '-' + vpTag + '-draft'] = 'pass';
        } catch (e) {
          results['scroll-' + k.key + '-' + vpTag + '-draft'] = 'fail: ' + (e && e.message ? e.message : String(e));
          await recoverToList();
        }
        // Saved layout (reuse the v2 doc from the main flow).
        try {
          await recoverToList();
          await setVp(vp.w, vp.h);
          await openTabR(k.tab);
          await page.getByText(k.title + ' v2', { exact: true }).first().click();
          await until(async () => ((await scope().count()) === 1 ? true : null), 8000, 'scroll saved open ' + k.key);
          await expectHeading(k.savedH);
          await fillLongBody(k, k.key + '-' + vpTag + '-saved');
          await saveBtn().click();
          await expectHeading(k.savedH);
          await until(async () => ((await saveBtn().isEnabled().catch(() => false)) ? true : null), 8000, 'scroll saved enabled ' + k.key);
          await settleEdit();
          await assertScrollLayout('scroll-' + k.key + '-' + vpTag + '-saved');
          await page.getByRole('button', { name: '목록으로' }).first().click();
          await until(async () => ((await scope().count()) === 0 ? true : null), 8000, 'scroll saved exit ' + k.key);
          results['scroll-' + k.key + '-' + vpTag + '-saved'] = 'pass';
        } catch (e) {
          results['scroll-' + k.key + '-' + vpTag + '-saved'] = 'fail: ' + (e && e.message ? e.message : String(e));
          await recoverToList();
        }
      }
    }
    await setVp(1280, 900);
  } finally {
    try { await page.evaluate("(window.__DOCAPP_FLOW_RESULTS__ = " + JSON.stringify(results) + ")"); } catch (ignored) {}
    try { await page.evaluate("if (window.__docappFlowOrigAlert !== undefined) { window.alert = window.__docappFlowOrigAlert || window.alert; delete window.__docappFlowOrigAlert; }"); } catch (ignored) {}
    try { await page.removeExposedFunction(ALERT_FN); } catch (ignored) {}
    try { await page.unrouteAll({ behavior: 'wait' }); } catch (ignored) {}
  }
  return results;
}
