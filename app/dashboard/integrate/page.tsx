"use client";
import { useEffect, useState } from "react";
import { apiKeysApi } from "@/lib/api";
import type { APIKey } from "@/lib/types";
import { Copy, Check, Terminal, GitBranch } from "lucide-react";
import { toast } from "@/components/ui/Toast";

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast("Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-3)" }}>
        <span style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>{label}</span>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: copied ? "var(--accent)" : "var(--fg-faint)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
          {copied ? <Check size={12}/> : <Copy size={12}/>}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg)", overflowX: "auto", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <Icon size={15} style={{ color: "var(--fg-dim)" }}/>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

export default function IntegratePage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("<YOUR_TOKEN>");
  const [host, setHost] = useState("https://trivyhub.votre-entreprise.com");
  const [project, setProject] = useState("mon-projet");

  useEffect(() => {
    apiKeysApi.list().then(k => {
      const active = (k ?? []).filter(k => !k.revoked);
      setKeys(active);
      if (active.length > 0) setSelectedKey(`tvd_••••••${active[0].key_prefix.slice(-4)}`);
    });
  }, []);

  const curlBase = `curl -X POST \\
  -H "Authorization: Bearer $TRIVYHUB_TOKEN" \\
  -F "project=${project}" \\
  -F "file=@report.json" \\
  -F "environment=production" \\
  -F "branch=main" \\
  -F "commit=\$(git rev-parse HEAD)" \\
  ${host}/api/v1/report`;

  const gitlab = [
    "trivy-scan:",
    "  script:",
    "    - trivy image --format json --output report.json $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA",
    "    - curl -X POST \\",
    '        -H "Authorization: Bearer $TRIVYHUB_TOKEN" \\',
    '        -F "project=$CI_PROJECT_NAME" \\',
    '        -F "file=@report.json" \\',
    '        -F "environment=production" \\',
    '        -F "branch=$CI_COMMIT_REF_NAME" \\',
    '        -F "commit=$CI_COMMIT_SHA" \\',
    '        -F "pipeline_url=$CI_JOB_URL" \\',
    '        -F "triggered_by=$GITLAB_USER_LOGIN" \\',
    `        ${host}/api/v1/report`,
  ].join("\n");

  const gha = [
    "- name: Trivy scan",
    "  run: trivy image --format json --output report.json $IMAGE",
    "",
    "- name: Push to TrivyHub",
    "  run: |",
    "    curl -X POST \\",
    '      -H "Authorization: Bearer ${{ secrets.TRIVYHUB_TOKEN }}" \\',
    '      -F "project=${{ github.repository }}" \\',
    '      -F "file=@report.json" \\',
    '      -F "environment=production" \\',
    '      -F "branch=${{ github.ref_name }}" \\',
    '      -F "commit=${{ github.sha }}" \\',
    '      -F "pipeline_url=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \\',
    '      -F "triggered_by=${{ github.actor }}" \\',
    `      ${host}/api/v1/report`,
  ].join("\n");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>CI/CD Integration</h1>
        <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>Push Trivy scan reports from your pipelines</p>
      </div>

      {/* Config */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Instance URL</label>
          <input
            value={host}
            onChange={e => setHost(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none", fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Project name</label>
          <input
            value={project}
            onChange={e => setProject(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Token selector */}
      {keys.length > 0 && (
        <div style={{ marginBottom: 24, padding: "14px 16px", background: "oklch(0.86 0.18 130 / 0.06)", border: "1px solid oklch(0.86 0.18 130 / 0.2)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "var(--fg-dim)", marginBottom: 8 }}>
            You have <strong>{keys.length}</strong> active API key{keys.length > 1 ? "s" : ""}. Set <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--surface-3)", padding: "1px 5px", borderRadius: 4 }}>TRIVYHUB_TOKEN</code> in your CI secrets.
          </div>
          {keys.length > 1 && (
            <select
              onChange={e => setSelectedKey(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--fg)", outline: "none" }}
            >
              {keys.map(k => <option key={k.id} value={k.key_prefix}>{k.name} ({k.key_prefix}…)</option>)}
            </select>
          )}
        </div>
      )}

      {keys.length === 0 && (
        <div style={{ marginBottom: 24, padding: "14px 16px", background: "oklch(0.65 0.24 22 / 0.06)", border: "1px solid oklch(0.65 0.24 22 / 0.2)", borderRadius: 10, fontSize: 13, color: "var(--fg-dim)" }}>
          No API keys yet. <a href="/dashboard/api-keys" style={{ color: "var(--accent)", textDecoration: "none" }}>Create one →</a>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Section title="Generic curl" icon={Terminal}>
          <CopyBlock label="bash" code={curlBase}/>
          <p style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 12, marginBottom: 0 }}>
            Set <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>TRIVYHUB_TOKEN</code> as an environment variable or replace it directly in the command.
          </p>
        </Section>

        <Section title="GitLab CI" icon={GitBranch}>
          <CopyBlock label=".gitlab-ci.yml" code={gitlab}/>
          <p style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 12, marginBottom: 0 }}>
            Add <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>TRIVYHUB_TOKEN</code> in <strong>Settings → CI/CD → Variables</strong> (masked).
          </p>
        </Section>

        <Section title="GitHub Actions" icon={GitBranch}>
          <CopyBlock label=".github/workflows/scan.yml" code={gha}/>
          <p style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 12, marginBottom: 0 }}>
            Add <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>TRIVYHUB_TOKEN</code> in <strong>Settings → Secrets and variables → Actions</strong>.
          </p>
        </Section>

        {/* Optional fields reference */}
        <Section title="All optional fields" icon={Terminal}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Field", "Description", "Example"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["project", "Project name (required)", "mon-api"],
                ["file", "Trivy JSON report (required)", "@report.json"],
                ["environment", "Target environment", "production"],
                ["branch", "Git branch", "main"],
                ["commit", "Git commit SHA", "abc1234"],
                ["pipeline_url", "Link to CI job", "https://gitlab.com/..."],
                ["pipeline_id", "CI job ID", "12345"],
                ["triggered_by", "User who triggered", "alice"],
                ["owner", "Team responsible", "team-backend"],
              ].map(([field, desc, example]) => (
                <tr key={field} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{field}</td>
                  <td style={{ padding: "8px 12px", color: "var(--fg-dim)" }}>{desc}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
