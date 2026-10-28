import { matches, toCSV } from './catalog.mjs';
const $ = id => document.getElementById(id);
const rows = [...$('rows').children];
const rowByDomain = new Map(rows.map(row => [row.dataset.domain, row]));
const records = JSON.parse($('record-data').textContent).map(record => ({...record, row:rowByDomain.get(record.domain)}));
const search = $('search');
const scope = $('scope');
const provider = $('provider');
const origin = $('origin');
const dialog = $('detail');
let activeDomain = '';
let activeTag = '';
let sortKey = 'domain';
let descending = false;
let previousFocus;
function syncInputs() {
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  origin.value = ['archive','research'].includes(params.get('origin')) ? params.get('origin') : '';
  scope.value = ['hostname', 'subdomains'].includes(params.get('scope')) ? params.get('scope') : 'all';
  provider.value = [...provider.options].some(o => o.value === params.get('provider')) ? params.get('provider') : '';
  activeTag = ['Phishing','C&C','Download','Exfiltration'].includes(params.get('tag')) ? params.get('tag') : '';
}
function applyFilters(updateURL = true) {
  const filters = {query:search.value.trim(), provider:provider.value, scope:scope.value, tag:activeTag, origin:origin.value};
  let count = 0;
  for (const record of records) {
    record.row.hidden = !matches(record, filters);
    if (!record.row.hidden) count++;
  }
  $('count').textContent = `${count} of ${records.length} domains${activeTag ? ` · ${activeTag}` : ''}`;
  $('empty').hidden = count !== 0;
  $('export').disabled = count === 0;
  document.querySelectorAll('[data-category]').forEach(link => {
    const selected = link.dataset.category === activeTag;
    link.classList.toggle('selected', selected);
    selected ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
  });
  if (updateURL) {
    const url = new URL(location.href);
    for (const [key,value] of Object.entries({q:filters.query, provider:provider.value, scope:scope.value === 'all' ? '' : scope.value, tag:activeTag, origin:origin.value})) {
      value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
    }
    history.replaceState(null, '', url);
  }
}
for (const id of ['controls','theme','sort','sort-provider','export']) $(id).hidden = false;
for (const id of ['static-heading','static-provider']) $(id).hidden = true;
search.addEventListener('input', () => applyFilters());
scope.addEventListener('change', () => applyFilters());
origin.addEventListener('change', () => applyFilters());
provider.addEventListener('change', () => applyFilters());
$('reset').addEventListener('click', () => { search.value = ''; scope.value = 'all'; provider.value = ''; origin.value = ''; activeTag = ''; applyFilters(); search.focus(); });
function sortBy(key) {
  descending = sortKey === key ? !descending : false;
  sortKey = key;
  const sorted = [...records].sort((a,b) => (a[key].localeCompare(b[key]) || a.domain.localeCompare(b.domain)) * (descending ? -1 : 1));
  $('rows').replaceChildren(...sorted.map(r => r.row));
  for (const [id,k] of [['sort','domain'],['sort-provider','provider']]) {
    $(id).parentElement.setAttribute('aria-sort', k === key ? descending ? 'descending' : 'ascending' : 'none');
    $(id).querySelector('span').textContent = k === key ? descending ? '↓' : '↑' : '↕';
  }
}
$('sort').addEventListener('click', () => sortBy('domain'));
$('sort-provider').addEventListener('click', () => sortBy('provider'));
function openHash() {
  let domain;
  try { domain = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const record = records.find(r => r.domain === domain || (domain.startsWith('.') && r.domain === '*' + domain));
  if (!record) { if (dialog.open) dialog.close(); return; }
  activeDomain = record.domain;
  $('detail-title').textContent = record.domain;
  $('detail-scope').textContent = record.domain.startsWith('*.') ? 'Subdomains' : 'Hostname';
  $('detail-provider').textContent = record.provider;
  $('detail-tags').replaceChildren(...record.tags.map(tag => { const span = document.createElement('span'); span.className = `tag tag-${tag === 'C&C' ? 'c2' : tag.toLowerCase()}`; span.textContent = tag; return span; }));
  const researched = record.origin === 'research';
  $('detail-source').textContent = researched ? `New addition · reviewed ${record.reviewed_on}` : 'Original LOTS index · October 6, 2026';
  $('archive-note').hidden = researched;
  $('research-detail').hidden = !researched;
  $('archive-link').href = researched ? record.sources[0].url : record.archive_url;
  $('archive-link').textContent = researched ? 'Read primary report' : 'Original LOTS detail page';
  if (researched) {
    $('detail-summary').textContent = record.summary;
    $('detail-evidence').replaceChildren(...record.sources.map(source => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url; link.textContent = source.title;
      li.append(link, document.createTextNode(` — ${source.publisher}, published ${source.published}`));
      return li;
    }));
    $('detail-window').textContent = `Reported activity: ${record.observed_window}`;
    $('detail-basis').textContent = `Domain scope: ${record.domain_basis}`;
    if (record.domain_reference) {
      const link = document.createElement('a'); link.href = record.domain_reference.url; link.textContent = 'Provider documentation';
      $('detail-basis').append(document.createTextNode(' '), link);
    }
    $('detail-activity').textContent = `Status: ${record.activity_status}.`;
    $('detail-hunts').replaceChildren(...record.hunting_notes.map(note => { const li = document.createElement('li'); li.textContent = note; return li; }));
  }
  $('copy-status').textContent = '';
  if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
}
function clearRecordHash() {
  let current;
  try { current = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if ([activeDomain, activeDomain.replace(/^\*/, '')].includes(current)) history.replaceState(null, '', location.pathname + location.search);
}
dialog.addEventListener('close', () => { clearRecordHash(); previousFocus?.focus(); });
$('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
window.addEventListener('hashchange', openHash);
window.addEventListener('popstate', () => { syncInputs(); applyFilters(false); openHash(); });
document.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a');
  if (!link) return;
  if (link.hasAttribute('data-record')) {
    event.preventDefault();
    const domain = link.closest('tr').dataset.domain;
    if (location.hash === '#' + encodeURIComponent(domain)) openHash();
    else location.hash = encodeURIComponent(domain);
  } else if (link.dataset.category || link.dataset.tag || link.dataset.providerFilter || link.dataset.example) {
    event.preventDefault();
    if (link.dataset.category) activeTag = activeTag === link.dataset.category ? '' : link.dataset.category;
    if (link.dataset.tag) activeTag = link.dataset.tag;
    if (link.dataset.providerFilter) provider.value = link.dataset.providerFilter;
    if (link.dataset.example) { search.value = link.dataset.example; provider.value = ''; activeTag = ''; scope.value = 'all'; origin.value = ''; }
    applyFilters();
    if (link.dataset.tag || link.dataset.providerFilter) {
      search.focus({preventScroll:true});
      $('catalog').scrollIntoView({block:'start'});
    }
  }
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(activeDomain); $('copy-status').textContent = 'Domain copied.'; }
  catch { $('copy-status').textContent = `Copy this domain: ${activeDomain}`; }
});
$('export').addEventListener('click', () => {
  const visible = [...$('rows').children].filter(row => !row.hidden).map(row => records.find(r => r.row === row));
  const url = URL.createObjectURL(new Blob([toCSV(visible)],{type:'text/csv;charset=utf-8'}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lots-results.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function setTheme(theme) { document.documentElement.dataset.theme = theme; $('theme').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`); }
let theme;
try { theme = localStorage.getItem('lots-theme'); } catch {}
setTheme(['dark','light'].includes(theme) ? theme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(next); try { localStorage.setItem('lots-theme', next); } catch {} });
document.addEventListener('keydown', e => { if (e.key === '/' && !dialog.open && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); search.focus(); } });
syncInputs();
applyFilters(false);
openHash();
