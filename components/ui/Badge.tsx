import type { Severity } from "@/lib/types";

const SEV_CLASS: Record<Severity, string> = {
  CRITICAL: "critical",
  HIGH:     "high",
  MEDIUM:   "medium",
  LOW:      "low",
  UNKNOWN:  "info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`sev ${SEV_CLASS[severity] ?? "info"}`}>{severity}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  const color = role === "owner" ? "var(--violet)" : role === "admin" ? "var(--accent)" : "var(--fg-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 500,
      fontFamily: "var(--font-mono)",
      background: `color-mix(in oklab, ${color}, transparent 85%)`,
      color,
    }}>
      {role}
    </span>
  );
}
