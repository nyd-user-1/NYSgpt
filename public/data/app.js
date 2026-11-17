// Data Library pages: run a query against the public API and list a table's fields.
(() => {
  const API = document.body.dataset.api;
  const keyOf = () => { const i = document.querySelector('input.key'); const k = (i && i.value.trim()) || localStorage.getItem('nysgpt-data-key') || ''; if (k) localStorage.setItem('nysgpt-data-key', k); return k; };
  document.querySelectorAll('input.key').forEach(i => { i.value = localStorage.getItem('nysgpt-data-key') || ''; });
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const table = (cols, rows) => `<table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td title="${esc(v)}">${esc(v === null ? '' : v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const mb = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(1) + ' MB';
  document.addEventListener('click', async e => {
    const run = e.target.closest('[data-run]');
    if (run) {
      const box = run.closest('.run'), status = box.querySelector('.status'), out = box.querySelector('.result'), sql = box.querySelector('textarea').value;
      run.disabled = true; status.textContent = 'Running…'; const t0 = performance.now();
      try {
        const r = await fetch(API + '/query', { method: 'POST', headers: { 'content-type': 'application/json', ...(keyOf() ? { 'x-api-key': keyOf() } : {}) }, body: JSON.stringify({ sql }) });
        const j = await r.json();
        if (!r.ok) { status.textContent = ''; out.innerHTML = `<p class="note">${esc(j.error || 'Query failed')}${(j.upgrade || j.plans) ? ` <a href="#pricing">See plans</a>` : ''}</p>`; }
        else { status.textContent = `${j.rows.length} rows · ${((performance.now() - t0) / 1000).toFixed(1)} s · ${mb(j.bytes_scanned || 0)} scanned`; out.innerHTML = table(j.columns, j.rows); }
      } catch (err) { status.textContent = ''; out.innerHTML = '<p class="note">The request did not complete. Try again.</p>'; }
      run.disabled = false; return;
    }
    const row = e.target.closest('[data-table]');
    if (row) {
      e.preventDefault(); const [db, t] = row.dataset.table.split('.'); const out = document.getElementById('fields');
      document.querySelectorAll('.row.on').forEach(x => x.classList.remove('on')); row.classList.add('on'); out.innerHTML = '<p class="note">Loading fields…</p>';
      try {
        const j = await (await fetch(`${API}/table?database=${encodeURIComponent(db)}&table=${encodeURIComponent(t)}`, { headers: keyOf() ? { 'x-api-key': keyOf() } : {} })).json();
        if (j.error) { out.innerHTML = `<p class="note">Listing a table's fields needs a key. <a href="#pricing">See plans</a></p>`; return; }
        out.innerHTML = `<h4>${esc(db)}.${esc(t)}${j.rows ? ' · ' + Number(j.rows).toLocaleString('en-US') + ' rows' : ''}</h4>` + table(['Field', 'Type', 'Description'], (j.fields || []).map(f => [f.name, f.type, f.description]));
        const ta = document.querySelector('.run textarea'); if (ta) ta.value = `SELECT * FROM ${db}.${t} LIMIT 5`;
      } catch (err) { out.innerHTML = '<p class="note">Could not load the fields.</p>'; }
    }
  });
})();
