# Adding and reviewing entries

Keep recovered LOTS content in `data/lots.json` unchanged unless correcting the importer against the supplied archive. Add independently researched records to `data/research.json`; do not silently rewrite the archive or present new findings as original LOTS content.

A research entry needs:

1. A legitimate shared service and the narrowest useful hostname or suffix. Explain wildcard generalization. Distinguish provider documentation from hostnames actually observed in an incident.
2. At least one primary incident report describing actor use. A theoretical capability, a proof of concept alone, or a search-engine snippet is insufficient. Link to the original research.
3. For each tag, a source that actually supports that role. A phishing page that redirects to a payload elsewhere is not automatically a payload-host entry. A service used for delivery is not automatically a command channel.
4. Publisher, report publication date, activity window as stated, and review date. Write “not specified” rather than infer dates. Review dates must not be represented as live last-seen dates.
5. A short original summary, domain-scope explanation, and hunting ideas clearly marked as untested hypotheses. Preserve attribution-confidence limits when naming an actor.
6. A statement that current activity is unverified unless a separately documented observation supports it. Record takedowns when the source reports them. Never imply an entire provider is malicious.

Use the existing schema: `domain`, `provider`, `tags`, `origin`, `reviewed_on`, `activity_status`, `observed_window`, `domain_basis`, `summary`, `hunting_notes`, and `sources`. Each source declares `supported_tags`; optional `domain_reference` documents a service-to-domain inference. Do not add live payload URLs as clickable links.

Run `npm run check`. It checks archive integrity, evidence metadata, duplicate domains, tag coverage, export behavior, the client controller, and generated pages. Code validation does not prove a source supports a claim: the contributor and reviewer must read the report.

Maintain the plain table and readable typography. New data should not require new visual decoration. See [DESIGN.md](DESIGN.md) and [THIRD_PARTY_DATA.md](THIRD_PARTY_DATA.md).
