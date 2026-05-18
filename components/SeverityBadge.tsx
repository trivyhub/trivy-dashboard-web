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
