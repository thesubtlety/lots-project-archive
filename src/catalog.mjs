export function escapeHTML(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
export function validateData(data) {
  if (data.records?.length !== 175 || new Set(data.records.map(r => r.domain)).size !== 175) throw new Error('Expected 175 unique archive records');
  const allowed = new Set(['Phishing','C&C','Download','Exfiltration']);
  for (const record of data.records) {
    if (!/^(?:\*\.)?[a-z0-9.-]+$/.test(record.domain) || !record.provider || !record.tags.length || record.tags.some(t => !allowed.has(t))) throw new Error(`Invalid record: ${record.domain}`);
    if (!/^https:\/\/web\.archive\.org\/web\/\d{14}\/https:\/\/lots-project\.com\/site\/[a-f0-9]+$/.test(record.archive_url)) throw new Error(`Invalid archive URL: ${record.domain}`);
  }
  if (JSON.stringify(data.list) !== JSON.stringify(data.records.map(r => r.domain))) throw new Error('Domain list does not match records');
}
export function validateResearchData(data, archive) {
  if (!Array.isArray(data.records) || !data.records.length) throw new Error('Missing research records');
  const domains = new Set(archive.records.map(r => r.domain));
  const allowed = new Set(['Phishing','C&C','Download','Exfiltration']);
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  const validURL = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
  if (!validDate(data.reviewed_on)) throw new Error('Invalid research review date');
  for (const r of data.records) {
    if (!/^(?:\*\.)?[a-z0-9.-]+$/.test(r.domain) || domains.has(r.domain)) throw new Error(`Duplicate or invalid research domain: ${r.domain}`);
    domains.add(r.domain);
    if (r.origin !== 'research' || !r.provider || !r.summary || !r.domain_basis || !r.observed_window || !r.activity_status || !validDate(r.reviewed_on) || r.reviewed_on > data.reviewed_on || !r.hunting_notes?.length) throw new Error(`Incomplete research record: ${r.domain}`);
    if (!r.tags?.length || r.tags.some(t => !allowed.has(t))) throw new Error(`Invalid research tags: ${r.domain}`);
    if (!r.sources?.length || r.sources.some(source => !source.title || !source.publisher || !validDate(source.published) || source.published > r.reviewed_on || !validURL(source.url) || !source.supported_tags?.length || source.supported_tags.some(tag => !r.tags.includes(tag)))) throw new Error(`Invalid research evidence: ${r.domain}`);
    if (r.tags.some(tag => !r.sources.some(source => source.supported_tags.includes(tag)))) throw new Error(`Unsupported tag: ${r.domain}`);
    if (r.domain_reference && !validURL(r.domain_reference.url)) throw new Error(`Invalid domain reference: ${r.domain}`);
  }
}
export function matches(record, {query = '', provider = '', scope = 'all', tag = '', origin = ''} = {}) {
  if (origin && record.origin !== origin) return false;
  if (provider && record.provider !== provider) return false;
  if (scope !== 'all' && scope !== (record.domain.startsWith('*.') ? 'subdomains' : 'hostname')) return false;
  if (tag && !record.tags.includes(tag)) return false;
  // AND terms; quoted provider names are accepted, e.g. #"Amazon Web Services".
  const terms = query.match(/(?:[+#]?"[^"]*"|\S+)/g) || [];
  return terms.every(term => {
    const kind = term[0];
    const text = (kind === '+' || kind === '#' ? term.slice(1) : term).replaceAll('"', '').toLowerCase();
    if (!text) return true;
    if (kind === '+') return record.tags.some(t => t.toLowerCase() === text || (text === 'c2' && t === 'C&C'));
    if (kind === '#') return record.provider.toLowerCase().includes(text);
    return [record.domain, record.provider, ...record.tags].some(v => v.toLowerCase().includes(text));
  });
}
export function toCSV(records) {
  const cell = value => `"${String(value).replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`;
  return [['Domain','Provider','Tags','Dataset','Source URLs','Report dates','Reviewed on'], ...records.map(r => [r.domain,r.provider,r.tags.join('; '),r.origin || 'archive',r.sources?.map(s => s.url).join('; ') || r.archive_url || '',r.sources?.map(s => s.published).join('; ') || '',r.reviewed_on || ''])].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
