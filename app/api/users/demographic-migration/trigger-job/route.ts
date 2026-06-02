import { NextResponse } from "next/server"
import { exec, execFile } from "node:child_process"

const GCLOUD_BIN = process.env.GCLOUD_BIN_PATH?.trim() || "gcloud"
const JOB_NAME = process.env.GCP_DEMOGRAPHIC_MIGRATION_JOB_NAME?.trim() || "migrate-demographic"
const JOB_REGION = process.env.GCP_DEMOGRAPHIC_MIGRATION_JOB_REGION?.trim() || "asia-southeast1"
const JOB_PROJECT = process.env.GCP_DEMOGRAPHIC_MIGRATION_JOB_PROJECT?.trim() || process.env.GCP_PROJECT_ID?.trim() || ""
const TRIGGER_URL = process.env.GCP_DEMOGRAPHIC_MIGRATION_TRIGGER_URL?.trim() || ""
const TRIGGER_BEARER = process.env.GCP_DEMOGRAPHIC_MIGRATION_TRIGGER_BEARER?.trim() || ""
const MAX_EXEC_MS = 60_000

function runJob(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = ["run", "jobs", "execute", JOB_NAME, "--region", JOB_REGION]
    if (JOB_PROJECT) args.push("--project", JOB_PROJECT)

    const isCmdScript = /\.(cmd|bat)$/i.test(GCLOUD_BIN)

    if (isCmdScript) {
      const command = `"${GCLOUD_BIN}" ${args.map((arg) => `"${arg}"`).join(" ")}`
      exec(command, { timeout: MAX_EXEC_MS }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`gcloud failed (${error.name}): ${error.message}\n${stderr || stdout || ""}`.trim()))
          return
        }
        resolve({ stdout, stderr })
      })
      return
    }

    execFile(GCLOUD_BIN, args, { timeout: MAX_EXEC_MS }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`gcloud failed (${error.name}): ${error.message}\n${stderr || stdout || ""}`.trim()))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function runJobViaHttp(): Promise<{ output: string; warning: string | null }> {
  if (!TRIGGER_URL) {
    throw new Error(
      "gcloud not found and GCP_DEMOGRAPHIC_MIGRATION_TRIGGER_URL is not set. " +
        "Set GCLOUD_BIN_PATH to gcloud path or configure an HTTP trigger URL."
    )
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (TRIGGER_BEARER) headers.Authorization = `Bearer ${TRIGGER_BEARER}`

  const res = await fetch(TRIGGER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobName: JOB_NAME, region: JOB_REGION, project: JOB_PROJECT || undefined }),
    cache: "no-store",
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP trigger failed: ${res.status} ${res.statusText} ${text}`.trim())
  }

  return { output: text || "HTTP trigger accepted", warning: null }
}

export async function POST() {
  try {
    const startedAt = new Date().toISOString()
    let output = ""
    let warning: string | null = null
    let mode: "gcloud" | "http" = "gcloud"

    try {
      const { stdout, stderr } = await runJob()
      output = stdout.trim()
      warning = stderr.trim() || null
    } catch (err) {
      const message = err instanceof Error ? err.message : "Manual demographic migration trigger failed"
      if (!message.includes("ENOENT")) throw err
      const httpRes = await runJobViaHttp()
      output = httpRes.output.trim()
      warning = httpRes.warning
      mode = "http"
    }

    return NextResponse.json({
      ok: true,
      startedAt,
      jobName: JOB_NAME,
      region: JOB_REGION,
      project: JOB_PROJECT || null,
      mode,
      output,
      warning,
    })
  } catch (err) {
    let message = err instanceof Error ? err.message : "Manual demographic migration trigger failed"
    if (message.includes("ENOENT")) {
      message =
        `gcloud command was not found in the server runtime (${GCLOUD_BIN}). ` +
        "Set GCLOUD_BIN_PATH to the full gcloud path or configure GCP_DEMOGRAPHIC_MIGRATION_TRIGGER_URL."
    }
    console.error("[users/demographic-migration/trigger-job]", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
