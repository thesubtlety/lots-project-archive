# LOTS Archive

An independent, lightweight reconstruction of the **Living Off Trusted Sites** reference by mrd0x and contributors. A plain, LOLBAS-inspired table combining 175 recovered entries with nine independently researched additions (184 total), evidence links, and hunting context.

## Run locally

Requires Node.js 22+ and Python 3 for preview. No dependency installation required.

```sh
npm run check
npm run preview
```

Open http://127.0.0.1:8888 . Edit `src/`, then run `npm run build`. Production files are generated in `dist/`; do not edit that directory directly. Serve over HTTP so JavaScript modules load correctly. If a previous preview is running, stop it with Ctrl+C before restarting.

## Recovered source

`data/lots.json` comes directly from the user-supplied `web.archive.org.zip`, whose saved LOTS index is dated **October 6, 2026 at 18:43:31 UTC**:

https://web.archive.org/web/20261006184331/https://lots-project.com/

The saved index contains 175 unique domains, 123 distinct provider names, and four original tags: Phishing (145 entries), C&C (75), Download (100), and Exfiltration (64). Entries may have multiple tags. Names, wildcard spelling, tag order, and original detail links are preserved. There are 74 wildcard entries. This replaces the earlier MISP-based fallback.

Only the index was included; full original detail pages and their research references were not included. Each local detail page presents the recovered index fields and links to its original LOTS page on Wayback, which may or may not be available. No abuse categories are inferred. Presence here does not establish that a domain or its current operator is malicious.

The JSON includes the ZIP filename, SHA-256 of the ZIP and saved HTML, and HTML member path for reproducibility. To import the same archive again:

```sh
npm run import:archive
npm run check
```

The importer uses Python's standard library, reads the index directly from the ZIP without extracting it, validates record counts and hex-encoded detail URLs, and never executes archived scripts. The local ZIP is ignored by Git and is not deployed. Ordinary builds need only the checked-in JSON. Original LOTS content remains attributed to its creators; no new license is asserted over it.

## Independent research and licensing

New entries live separately in `data/research.json`, with primary-source citations, report dates, stated activity windows, explicit domain-scope limits, review dates, and untested hunting hypotheses. The nine additions are documented in [RESEARCH.md](RESEARCH.md). They include hosting, object storage, developer tunnels, model repositories, hosted databases, and security-link wrappers. These are not live malicious-domain indicators.

The build emits:

- `dist/data/lots.json`: the unchanged historical archive.
- `dist/data/research.json`: independently researched additions.
- `dist/data/catalog.json`: the combined index, with `origin` on every record.
- `dist/data/lots.csv`: combined rows with dataset, source URLs, report dates, and review dates.

The [MIT license](LICENSE) covers original code and independently written documentation/research notes. It does not relicense the original LOTS collection or cited reports. See [THIRD_PARTY_DATA.md](THIRD_PARTY_DATA.md) for provenance and the limits of the publication assessment. A public repository with an open-source code license does not establish an open-data license for every included source.

To contribute additions or revalidate inherited entries, follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Browsing

- Search domains, tags, or provider names. Combine terms with AND, e.g. `+phishing #microsoft`.
- Use `+c2` or `+C&C` for command and control; quoted providers work, e.g. `#"Amazon Web Services"`.
- Click a category, row tag, or provider to filter. Click the selected category again to remove it, or use Reset to clear everything.
- Filter by original archive/research additions and hostname/subdomain entries. Sort by domain or service provider.
- Search and filters are encoded in the URL; domain modals have shareable hash links. Open domain links in a new tab to see their standalone static pages.
- Download the complete JSON/CSV or export the current results in their displayed order.
- `/` focuses search; Escape closes a record. A theme toggle remembers light/dark preference.
- All 184 entries and standalone detail pages are pre-rendered and readable without JavaScript.

No external fonts, runtime libraries, tracking, backend, or live-domain requests. Archive and report links are explicit outbound navigation.

## GitHub Pages

The included `.github/workflows/pages.yml` builds, checks, and deploys `dist/` when `main` changes. Relative URLs support both `username.github.io/` and `username.github.io/lots-archive/`. There is no custom-domain configuration.

1. Push the source files to the chosen repository's `main` branch.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Run **Deploy GitHub Pages** from Actions, or push a change to `main`.

For a new repository, after restoring GitHub CLI authentication:

```sh
gh auth login --hostname github.com
git init -b main
git add .
git commit -m "Restore LOTS archive as a searchable GitHub Pages site"
gh repo create lots-archive --public --source=. --remote=origin --push
```

Then enable GitHub Actions in Pages settings and rerun the workflow. For an existing repository, review its existing files before connecting and pushing.

## Validation

`npm run check` validates JavaScript syntax, builds the static site, and runs Node's built-in tests for data integrity, evidence metadata and per-tag source coverage, compound queries, intersecting filters, CSV/HTML escaping, generated detail pages/asset paths, and client filtering/record dialogs. The DOM-double controller test is not a browser rendering test. Visual browser QA still needs to be completed: the available Computer Use service denied permission during this session.

Visual direction and rationale: [DESIGN.md](DESIGN.md).
