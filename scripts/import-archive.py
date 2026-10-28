"""Recover only LOTS index data from the supplied saved-page ZIP. Never execute it."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from zipfile import ZipFile


class IndexParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.records = []
        self.cells = None
        self.cell = -1
        self.href = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr' and 'extension-row' in attrs.get('class', '').split():
            self.cells, self.cell, self.href = [], -1, None
        if self.cells is not None:
            if tag == 'td':
                self.cells.append('')
                self.cell += 1
            if tag == 'a' and self.cell == 0:
                self.href = attrs.get('href', '')

    def handle_data(self, text):
        if self.cells is not None and self.cell >= 0:
            self.cells[self.cell] += text

    def handle_endtag(self, tag):
        if tag != 'tr' or self.cells is None:
            return
        if len(self.cells) != 3:
            raise ValueError('Unexpected LOTS table structure')
        domain, tags, provider = [' '.join(cell.split()) for cell in self.cells]
        if not re.fullmatch(r'(?:\*\.)?[a-z0-9.-]+', domain):
            raise ValueError(f'Invalid domain: {domain}')
        if not re.fullmatch(r'/web/\d{14}/https://lots-project.com/site/[a-f0-9]+', self.href or ''):
            raise ValueError('Unexpected detail URL')
        if bytes.fromhex(self.href.rsplit('/', 1)[-1]).decode() != domain:
            raise ValueError('Detail URL does not match its domain')
        tags = tags.split()
        if not tags or not set(tags) <= {'Phishing', 'C&C', 'Download', 'Exfiltration'} or not provider:
            raise ValueError('Invalid tags or provider')
        self.records.append(dict(domain=domain, tags=tags, provider=provider,
                                 archive_url='https://web.archive.org' + self.href))
        self.cells = None


archive = Path(sys.argv[1] if len(sys.argv) > 1 else 'web.archive.org.zip')
with ZipFile(archive) as saved:
    candidates = []
    for info in saved.infolist():
        if re.fullmatch(r'web.archive.org/web/\d{14}/https.html', info.filename):
            if info.file_size > 5_000_000:
                raise ValueError('Saved page exceeds import size limit')
            page = saved.read(info).decode('utf-8')
            if 'id="main-table"' in page:
                candidates.append((info.filename, page))
    if len(candidates) != 1:
        raise ValueError('Expected exactly one LOTS index page')
    member, page = candidates[0]
parser = IndexParser()
parser.feed(page)
records = parser.records
if len(records) != 175 or len({r['domain'] for r in records}) != 175:
    raise ValueError('Expected 175 unique archive entries')
stamp = member.split('/')[2]
date = f'{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}'
data = dict(name='Living Off Trusted Sites (LOTS) Project', snapshot=date,
            source=f'https://web.archive.org/web/{stamp}/https://lots-project.com/',
            provenance=dict(archive_file=archive.name, archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                            html_member=member, html_sha256=hashlib.sha256(page.encode()).hexdigest()),
            list=[r['domain'] for r in records], records=records)
Path('data/lots.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print(f'Recovered {len(records)} records, {len({r["provider"] for r in records})} providers from {date}')
