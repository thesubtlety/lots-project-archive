import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { matches, validateData, validateResearchData, toCSV, escapeHTML } from '../src/catalog.mjs';
const data = JSON.parse(readFileSync('data/lots.json','utf8'));
const research = JSON.parse(readFileSync('data/research.json','utf8'));
const combined = [...data.records.map(r => ({...r,origin:'archive'})),...research.records];
const select = filters => data.records.filter(record => matches(record,filters));
test('archive data retains 175 records and 123 published provider names', () => {
  validateData(data);
  assert.equal(new Set(data.records.map(r => r.provider)).size,123);
  assert.equal(data.snapshot,'2026-10-06');
  const github = data.records.find(r => r.domain === 'github.com');
  assert.deepEqual(github.tags,['Phishing','Download']);
  assert.equal(github.provider,'Github');
  assert.ok(github.archive_url.endsWith('/site/6769746875622e636f6d'));
  assert.throws(() => validateData({...data,records:[...data.records.slice(1),data.records[1]]}));
});
test('plain searches, compound tags, providers, and quoted names compose correctly', () => {
  assert.equal(select({query:'github'}).length,3);
  assert.ok(select({query:'+phishing #microsoft'}).length > 0);
  assert.ok(select({query:'+phishing #microsoft'}).every(r => r.tags.includes('Phishing') && r.provider === 'Microsoft'));
  assert.ok(select({query:'+#not-a-tag'}).length === 0);
  assert.equal(select({query:'#"Amazon Web Services"'}).length,select({provider:'Amazon Web Services'}).length);
  assert.deepEqual(select({query:'+c2'}),select({query:'+C&C'}));
  assert.equal(select({query:'no-such-domain.example'}).length,0);
  assert.equal(select({query:'   '}).length,175);
});
test('wildcard and tag filters intersect, and never infer new tags', () => {
  assert.equal(select({scope:'subdomains'}).length,74);
  const filtered = select({scope:'subdomains',tag:'Exfiltration',provider:'Microsoft'});
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(r => r.domain.startsWith('*.') && r.provider === 'Microsoft' && r.tags.includes('Exfiltration')));
  assert.equal(select({query:'github.com',tag:'Exfiltration'}).length,0);
});
test('CSV exports just the selected records with quoting and formula protection', () => {
  const csv = toCSV(select({query:'github.com'}));
  assert.equal(csv.split('\r\n').filter(Boolean).length,2);
  assert.ok(csv.includes('"Phishing; Download"'));
  const special = toCSV([{domain:'=TEST()',provider:'A "quoted", name',tags:['C&C'],archive_url:'https://example.com'}]);
  assert.ok(special.includes('"\'=TEST()"'));
  assert.ok(special.includes('"A ""quoted"", name"'));
});
test('HTML output escapes source values', () => {
  assert.equal(escapeHTML('<script a="b">&\''), '&lt;script a=&quot;b&quot;&gt;&amp;&#39;');
});
test('built site is complete and assets work beneath a GitHub Pages subpath', () => {
  const html = readFileSync('dist/index.html','utf8');
  assert.equal((html.match(/<tr data-domain=/g) || []).length,combined.length);
  assert.ok(!html.includes('{{'));
  assert.ok(!html.includes('<!-- ROWS -->'));
  assert.ok(!html.includes('Not recovered from the original archive'));
  assert.equal(readdirSync('dist/site').length,combined.length);
  for (const record of combined) {
    const path = `dist/site/${Buffer.from(record.domain).toString('hex')}.html`;
    assert.ok(existsSync(path));
    const detail = readFileSync(path,'utf8');
    assert.ok(detail.includes(escapeHTML(record.provider)));
    assert.ok(detail.includes(escapeHTML(record.archive_url || record.sources[0].url)));
    assert.ok(detail.includes('href="../style.css"'));
  }
  for (const local of ['./style.css','./app.js','./data/lots.json','./data/catalog.json','./data/research.json','./data/lots.csv']) assert.ok(html.includes(local));
  assert.equal(readFileSync('dist/data/lots.csv','utf8').split('\r\n').filter(Boolean).length,combined.length+1);
  assert.ok(!/<script[^>]+src="https?:/.test(html));
});


test('research additions are separate, dated, sourced per tag, and never overwrite the archive', () => {
  validateResearchData(research,data);
  assert.equal(research.records.length,9);
  assert.equal(combined.length,184);
  assert.equal(combined.filter(r => matches(r,{origin:'research'})).length,9);
  assert.equal(combined.filter(r => matches(r,{origin:'archive'})).length,175);
  assert.equal(combined.filter(r => matches(r,{origin:'research',query:'+c2 #microsoft'}))[0].domain,'*.devtunnels.ms');
  const missingEvidence = structuredClone(research);
  missingEvidence.records[0].tags.push('Exfiltration');
  assert.throws(() => validateResearchData(missingEvidence,data),/Unsupported tag/);
  const duplicate = structuredClone(research);
  duplicate.records[0].domain = 'github.com';
  assert.throws(() => validateResearchData(duplicate,data),/Duplicate/);
  const unsafe = structuredClone(research);
  unsafe.records[0].sources[0].url = 'javascript:alert(1)';
  assert.throws(() => validateResearchData(unsafe,data),/Invalid research evidence/);
  const future = structuredClone(research);
  future.records[0].sources[0].published = '2027-01-01';
  assert.throws(() => validateResearchData(future,data),/Invalid research evidence/);
  const supabase = research.records.find(r => r.domain === '*.supabase.co');
  assert.ok(supabase.domain_basis.includes('not an observed suffix IOC'));
  assert.ok(supabase.domain_reference.url.startsWith('https://supabase.com/'));
  assert.deepEqual(JSON.parse(readFileSync('dist/data/lots.json','utf8')),data);
  const exported = JSON.parse(readFileSync('dist/data/catalog.json','utf8'));
  assert.equal(exported.records.filter(r => r.origin === 'research').length,9);
});
test('research detail pages expose limitations, sources, dates, and hunting hypotheses', () => {
  for (const record of research.records) {
    const detail = readFileSync(`dist/site/${Buffer.from(record.domain).toString('hex')}.html`,'utf8');
    for (const source of record.sources) {
      assert.ok(detail.includes(escapeHTML(source.url)));
      assert.ok(detail.includes(source.published));
    }
    assert.ok(detail.includes('not tested detection rules'));
    assert.ok(detail.includes('current activity not verified'));
    assert.ok(detail.includes(escapeHTML(record.domain_basis)));
  }
});
