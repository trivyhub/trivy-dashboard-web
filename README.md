# TrivyHub

Self-hosted dashboard for [Trivy](https://trivy.dev) vulnerability reports. Push scan results from your CI pipelines and visualize them in one place.

## Features

- **Overview** — global risk score, CVE trend chart, top at-risk projects
- **Projects** — card grid with severity bars, risk score, environment filter
- **Project detail** — CVE evolution chart, diff vs previous scan, recent scans
- **Vulnerabilities** — paginated table with SLA age badge, severity filter, CSV export
- **Scan history** — full timeline per project with branch/commit/pipeline context, CVE drill-down
- **Members** — invite, role management (owner / admin / member / viewer)
- **API Keys** — create, copy, revoke
- **Settings** — change password, account info
- **Dark / Light mode** — toggle in sidebar, persisted

## Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 7 (SQLite or PostgreSQL) |
| Charts | Recharts |
| Icons | Lucide React |

---

## Deployment

### Option 1 — `docker run` (SQLite, zero config)

```bash
docker run -d \
  -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -v trivyhub-data:/app/data \
  ghcr.io/ton-org/trivyhub:latest
```

Open [http://localhost:3000](http://localhost:3000) and create your account.

---

### Option 2 — Docker Compose (PostgreSQL, recommended for production)

```bash
curl -O https://raw.githubusercontent.com/ton-org/trivyhub/main/docker-compose.yml
JWT_SECRET=$(openssl rand -hex 32) POSTGRES_PASSWORD=$(openssl rand -hex 16) docker compose up -d
```

---

### Option 3 — Kubernetes / Helm

```bash
helm install trivyhub ./helm/trivyhub \
  --set env.JWT_SECRET=$(openssl rand -hex 32) \
  --set env.DATABASE_URL=postgresql://trivyhub:secret@postgres:5432/trivyhub \
  --set ingress.enabled=true \
  --set ingress.host=trivyhub.votre-entreprise.com
```

With TLS:

```bash
helm install trivyhub ./helm/trivyhub \
  --set env.JWT_SECRET=$(openssl rand -hex 32) \
  --set env.DATABASE_URL=postgresql://... \
  --set ingress.enabled=true \
  --set ingress.host=trivyhub.votre-entreprise.com \
  --set ingress.tls=true \
  --set ingress.tlsSecretName=trivyhub-tls
```

### HTTPS with Caddy (recommended for VPS)

```
trivyhub.votre-entreprise.com {
    reverse_proxy localhost:3000
}
```

Caddy handles Let's Encrypt automatically.

---

## Pushing scan reports from CI

### 1. Generate an API token

In TrivyHub: **Settings → API Keys → New key**

### 2. Add to your pipeline

**GitLab CI:**

```yaml
trivy-scan:
  script:
    - trivy image --format json --output report.json $IMAGE
    - curl -X POST \
        -H "Authorization: Bearer $TRIVYHUB_TOKEN" \
        -F "project=$CI_PROJECT_NAME" \
        -F "file=@report.json" \
        -F "environment=production" \
        -F "branch=$CI_COMMIT_REF_NAME" \
        -F "commit=$CI_COMMIT_SHA" \
        -F "pipeline_url=$CI_JOB_URL" \
        -F "triggered_by=$GITLAB_USER_LOGIN" \
        https://trivyhub.votre-entreprise.com/api/v1/report
```

**GitHub Actions:**

```yaml
- name: Trivy scan
  run: trivy image --format json --output report.json $IMAGE

- name: Push to TrivyHub
  run: |
    curl -X POST \
      -H "Authorization: Bearer ${{ secrets.TRIVYHUB_TOKEN }}" \
      -F "project=${{ github.repository }}" \
      -F "file=@report.json" \
      -F "environment=production" \
      -F "branch=${{ github.ref_name }}" \
      -F "commit=${{ github.sha }}" \
      -F "pipeline_url=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \
      -F "triggered_by=${{ github.actor }}" \
      https://trivyhub.votre-entreprise.com/api/v1/report
```

### Optional fields

| Field | Description | Example |
|-------|-------------|---------|
| `project` | Project name (required) | `mon-api` |
| `file` | Trivy JSON report (required) | `@report.json` |
| `environment` | Target environment | `production` |
| `branch` | Git branch | `main` |
| `commit` | Git commit SHA | `abc1234` |
| `pipeline_url` | Link to CI job | `https://gitlab.com/...` |
| `pipeline_id` | CI job ID | `12345` |
| `triggered_by` | User who triggered | `alice` |
| `owner` | Team responsible | `team-backend` |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Secret for signing JWT tokens. Generate with `openssl rand -hex 32` |
| `DATABASE_URL` | No | PostgreSQL URL. Defaults to SQLite (`file:/app/data/trivyhub.db`) |

---

## Local development

```bash
git clone https://github.com/ton-org/trivyhub.git
cd trivyhub
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
