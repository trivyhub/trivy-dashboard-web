"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(orgName, email, password);
      saveAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--accent-dim)";
    e.target.style.boxShadow = "0 0 0 3px oklch(0.86 0.18 130 / 0.12)";
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--border-strong)";
    e.target.style.boxShadow = "none";
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent), var(--violet))",
            display: "grid", placeItems: "center",
            color: "#08080b",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            boxShadow: "0 0 32px var(--accent-glow)",
            position: "relative",
            overflow: "hidden",
            margin: "0 auto 16px",
          }}>
            T
            <span style={{
              position: "absolute", inset: 0,
              background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.18), transparent 30%)",
              animation: "brand-spin 4s linear infinite",
            }}/>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", margin: 0 }}>
            Create your organization
          </h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 6 }}>
            You will be the owner
          </p>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 14,
          padding: 24,
        }}>
          {error && (
            <div style={{
              background: "oklch(0.65 0.24 22 / 0.08)",
              border: "1px solid oklch(0.65 0.24 22 / 0.20)",
              color: "var(--sev-critical)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Organization name", type: "text", value: orgName, onChange: setOrgName, placeholder: "acme", required: true },
              { label: "Email", type: "email", value: email, onChange: setEmail, placeholder: "admin@company.com", required: true },
              { label: "Password", type: "password", value: password, onChange: setPassword, placeholder: "Min. 8 characters", required: true, minLength: 8 },
            ].map(({ label, type, value, onChange, placeholder, required, minLength }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-muted)" }}>{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  required={required}
                  minLength={minLength}
                  style={inputStyle}
                  placeholder={placeholder}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
                color: "#08080b",
                border: "none",
                borderRadius: 8,
                padding: "10px",
                fontSize: 13,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "filter 160ms ease, transform 160ms ease",
                boxShadow: "0 0 0 1px oklch(0.78 0.18 130), 0 8px 24px -8px var(--accent-glow)",
                marginTop: 4,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.filter = "none";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {loading ? "Creating…" : "Create organization"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--fg-dim)", marginTop: 16 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
