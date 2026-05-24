import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

const TRIVY_TYPE_TO_LANG: Record<string, string> = {
  gobinary: "Go", gomodule: "Go",
  npm: "Node", yarn: "Node", pnpm: "Node",
  pip: "Python", pipenv: "Python", poetry: "Python",
  cargo: "Rust",
  jar: "Java", gradle: "Java", maven: "Java",
  gemspec: "Ruby", bundler: "Ruby",
  nuget: "C#",
  composer: "PHP",
  swift: "Swift",
  terraform: "Terraform",
  cloudformation: "IaC",
  dockerfile: "Docker",
  ubuntu: "Docker", debian: "Docker", alpine: "Docker", centos: "Docker", redhat: "Docker",
};

export async function POST(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  let project_name: string | undefined;
  let environment: string | undefined;
  let owner: string | undefined;
  let pipeline_id: string | undefined;
  let pipeline_url: string | undefined;
  let branch: string | undefined;
  let commit: string | undefined;
  let triggered_by: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let report: any;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    project_name = form.get("project") as string ?? form.get("project_name") as string;
    environment = (form.get("environment") as string) || undefined;
    owner = (form.get("owner") as string) || undefined;
    pipeline_id = (form.get("pipeline_id") as string) || undefined;
    pipeline_url = (form.get("pipeline_url") as string) || undefined;
    branch = (form.get("branch") as string) || undefined;
    commit = (form.get("commit") as string) || undefined;
    triggered_by = (form.get("triggered_by") as string) || undefined;
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    report = JSON.parse(await file.text());
  } else {
    const body = await req.json();
    ({ project_name, environment, owner, pipeline_id, pipeline_url, branch, commit, triggered_by, report } = body);
  }

  if (!project_name || !report) {
    return NextResponse.json({ error: "project (or project_name) and file (or report) required" }, { status: 400 });
  }

  const env = environment || "production";

  const project = await prisma.project.upsert({
    where: { organizationId_name: { organizationId: claims.organizationId, name: project_name } },
    update: { owner: owner ?? "", environment: env },
    create: { organizationId: claims.organizationId, name: project_name, owner: owner ?? "", environment: env },
  });

  const digest = report.Metadata?.RepoDigests?.[0] ?? "";

  const langSet = new Set<string>();
  if (report.ArtifactType === "container_image") langSet.add("Docker");
  for (const result of report.Results ?? []) {
    const lang = TRIVY_TYPE_TO_LANG[result.Type];
    if (lang) langSet.add(lang);
  }

  const scan = await prisma.scan.create({
    data: {
      projectId: project.id,
      imageName: report.ArtifactName ?? "",
      imageDigest: digest,
      pipelineId: pipeline_id || null,
      pipelineUrl: pipeline_url || null,
      branch: branch || null,
      commit: commit || null,
      triggeredBy: triggered_by || null,
      rawJson: JSON.stringify(report),
      langs: JSON.stringify([...langSet]),
    },
  });

  const vulnsToInsert: {
    scanId: number; cveId: string; severity: string; packageName: string;
    installedVersion: string; fixedVersion: string; title: string;
    description: string; primaryUrl: string; isFixed: boolean; cvssScore: number | null;
  }[] = [];

  for (const result of report.Results ?? []) {
    for (const v of result.Vulnerabilities ?? []) {
      let cvssScore: number | null = null;
      if (v.CVSS) {
        for (const source of ["nvd", "redhat"]) {
          if (v.CVSS[source]?.V3Score > 0) {
            cvssScore = v.CVSS[source].V3Score;
            break;
          }
        }
        if (cvssScore === null) {
          for (const d of Object.values(v.CVSS) as { V3Score?: number }[]) {
            if (d.V3Score && d.V3Score > 0) { cvssScore = d.V3Score; break; }
          }
        }
      }
      vulnsToInsert.push({
        scanId: scan.id,
        cveId: v.VulnerabilityID,
        severity: v.Severity,
        packageName: v.PkgName,
        installedVersion: v.InstalledVersion ?? "",
        fixedVersion: v.FixedVersion ?? "",
        title: v.Title ?? "",
        description: v.Description ?? "",
        primaryUrl: v.PrimaryURL ?? "",
        isFixed: false,
        cvssScore,
      });
    }
  }

  if (vulnsToInsert.length > 0) {
    await prisma.vulnerability.createMany({ data: vulnsToInsert });
  }

  return NextResponse.json(
    { scan_id: scan.id, project: project.name, vulnerabilities_stored: vulnsToInsert.length },
    { status: 201 }
  );
}
