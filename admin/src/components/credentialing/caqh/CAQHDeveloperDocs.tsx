"use client";

import { Icon } from "@/components/Icon";

// Static developer reference (prototype L9205-9336).
export function CAQHDeveloperDocs() {
  return (
    <div className="space-y-4">
      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-3">Direct CAQH ProView API — Implementation Reference</h3>
        <div className="text-xs text-ink-light space-y-3">
          <div>
            <div className="font-semibold text-ink mb-1">Authentication</div>
            <div className="font-mono p-2 rounded" style={{ background: "var(--bg-soft)" }}>
              Authorization: Basic {"<"}base64(username:password){">"}
            </div>
          </div>
          <div>
            <div className="font-semibold text-ink mb-1">Get provider data (Credentialing API)</div>
            <div className="font-mono p-2 rounded text-[11px]" style={{ background: "var(--bg-soft)" }}>
              POST {"<"}base_url{">"}/CredentialingAPI/getProviderData<br />
              Content-Type: application/xml<br />
              <br />
              {"<request>"}<br />
              &nbsp;&nbsp;{"<organizationId>PO_12345</organizationId>"}<br />
              &nbsp;&nbsp;{"<caqhProviderId>12345678</caqhProviderId>"}<br />
              {"</request>"}
            </div>
            <div className="mt-2">Returns XML with provider demographics, education, work history, license, malpractice, etc. — but ONLY if the provider has authorized your PO and their profile is in &quot;Complete&quot; status.</div>
          </div>
          <div>
            <div className="font-semibold text-ink mb-1">Check provider status (ProView Status Check API)</div>
            <div className="font-mono p-2 rounded text-[11px]" style={{ background: "var(--bg-soft)" }}>
              POST {"<"}base_url{">"}/ProViewStatusCheckAPI/getStatus<br />
              <br />
              {"<request>"}<br />
              &nbsp;&nbsp;{"<organizationId>PO_12345</organizationId>"}<br />
              &nbsp;&nbsp;{"<caqhProviderId>12345678</caqhProviderId>"}<br />
              {"</request>"}
            </div>
            <div className="mt-2">Returns: application status, last attestation date, authorization status for your PO.</div>
          </div>
          <div>
            <div className="font-semibold text-ink mb-1">Add provider to roster</div>
            <div className="font-mono p-2 rounded text-[11px]" style={{ background: "var(--bg-soft)" }}>
              POST {"<"}base_url{">"}/RosterAPI/addProviders
            </div>
            <div className="mt-2">Returns a batch_id. Poll <code className="bg-bg-soft px-1 rounded">/RosterAPI/getBatchStatus?id={"{batch_id}"}</code> until complete.</div>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-3">JavaScript example — make the actual API call</h3>
        <pre className="p-3 rounded text-[11px] overflow-x-auto font-mono" style={{ background: "var(--bg-soft)", lineHeight: 1.5 }}>{`// Server-side only — never call CAQH from browser (CORS, credentials)
async function fetchCaqhProvider(caqhId) {
  const auth = Buffer
    .from(\`\${CAQH_USER}:\${CAQH_PASS}\`)
    .toString('base64');

  const body = \`<request>
    <organizationId>\${CAQH_ORG_ID}</organizationId>
    <caqhProviderId>\${caqhId}</caqhProviderId>
  </request>\`;

  const response = await fetch(
    'https://api.caqh.org/v2/CredentialingAPI/getProviderData',
    {
      method: 'POST',
      headers: {
        'Authorization': \`Basic \${auth}\`,
        'Content-Type': 'application/xml',
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(\`CAQH API error: \${response.status}\`);
  }
  const xml = await response.text();
  // Parse XML with your library of choice (xml2js, fast-xml-parser, etc.)
  return parseProviderXml(xml);
}`}</pre>
      </div>

      <div className="card card-pad" style={{ background: "var(--warn-soft)" }}>
        <div className="flex items-start gap-2 text-xs">
          <Icon name="AlertTriangle" size={13} style={{ color: "#a16207" }} />
          <div className="text-ink">
            <strong>Security reminders:</strong>
            <ul className="mt-1 ml-5 list-disc">
              <li>NEVER call CAQH APIs from the browser — credentials would be exposed. All calls must go through your backend.</li>
              <li>Store credentials in environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) — never in code.</li>
              <li>CAQH rate limits apply — typically 100 requests/minute per PO. Implement exponential backoff.</li>
              <li>Cache provider data for at least 24 hours — pulling the same provider repeatedly violates CAQH terms.</li>
              <li>Provider data is PHI. All transport must be TLS 1.2+; storage must be encrypted at rest.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-3">Aggregator API example (CertifyOS pattern)</h3>
        <pre className="p-3 rounded text-[11px] overflow-x-auto font-mono" style={{ background: "var(--bg-soft)", lineHeight: 1.5 }}>{`async function fetchProviderViaAggregator(caqhId) {
  const response = await fetch(
    \`https://api.certifyos.com/v1/providers/\${caqhId}\`,
    {
      headers: {
        'Authorization': \`Bearer \${AGGREGATOR_API_KEY}\`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(\`Aggregator error: \${response.status}\`);
  }
  return await response.json(); // already structured JSON
}`}</pre>
        <div className="text-xs text-ink-light mt-2">
          Aggregators typically return JSON (vs CAQH&apos;s XML), handle the underlying CAQH authentication, and bundle related services (OIG, SAM, license verification) into one call. Costs more, integrates faster.
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-2">Resources</h3>
        <ul className="text-xs space-y-1.5">
          <li><Icon name="ExternalLink" size={10} className="inline mr-1 text-accent" /><a href="https://www.caqh.org/contact-us" target="_blank" rel="noreferrer" className="text-accent hover:underline">Request CAQH PO access</a></li>
          <li><Icon name="ExternalLink" size={10} className="inline mr-1 text-accent" /><a href="https://proview.caqh.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">CAQH ProView (provider portal)</a></li>
          <li><Icon name="ExternalLink" size={10} className="inline mr-1 text-accent" /><a href="https://docs.mulesoft.com/caqh-connector/latest/" target="_blank" rel="noreferrer" className="text-accent hover:underline">MuleSoft CAQH connector docs</a> (reference implementation)</li>
          <li><Icon name="ExternalLink" size={10} className="inline mr-1 text-accent" /><a href="https://www.certifyos.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">CertifyOS</a> · <a href="https://www.andros.co" target="_blank" rel="noreferrer" className="text-accent hover:underline">Andros</a> · <a href="https://www.verifiable.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">Verifiable</a> · <a href="https://www.medallion.co" target="_blank" rel="noreferrer" className="text-accent hover:underline">Medallion</a> (aggregators)</li>
        </ul>
      </div>
    </div>
  );
}
