"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type PerTestPredictionRow = {
  source: "vibration" | "tap" | "pinch" | "questionnaire" | "voice" | "prediction"
  test_type: string
  prediction_risk: boolean | null
  recorded_at: string | null
  approver?: string | null
  note?: string | null
}

type DetailDataState = {
  loading: boolean
  error: string | null
  publicUser: Record<string, unknown> | null
  recordSummary: Record<string, unknown> | null
  checkpdUser: Record<string, unknown> | null
  checkpdSummary: Record<string, unknown> | null
  diagnosisV2: Record<string, unknown> | null
  coreScores: Record<string, unknown> | null
  perTest: PerTestPredictionRow[]
}

export function useDetailData(params: { id?: string; recorder?: string; recordId?: string }) {
  const [state, setState] = useState<DetailDataState>({
    loading: false,
    error: null,
    publicUser: null,
    recordSummary: null,
    checkpdUser: null,
    checkpdSummary: null,
    diagnosisV2: null,
    coreScores: null,
    perTest: [],
  })

  useEffect(() => {
    const { id, recorder, recordId } = params
    if (!id) return

    let cancelled = false
    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const [publicUserRes, recordSummaryRes, checkpdUserRes, checkpdSummaryExactRes, checkpdRecordsRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", id).maybeSingle(),
          recordId
            ? supabase.from("user_record_summary").select("*").eq("user_id", id).eq("record_id", recordId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.schema("checkpd").from("users").select("*").eq("id", id).maybeSingle(),
          recorder
            ? supabase.schema("checkpd").from("record_summary").select("*").eq("user_id", id).eq("recorder", recorder).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.schema("checkpd").from("records").select("id,record_id,recorder,recorded_at").eq("user_id", id),
        ])

        if (publicUserRes.error) throw publicUserRes.error
        if (recordSummaryRes.error) throw recordSummaryRes.error

        let checkpdSummary = checkpdSummaryExactRes.data as Record<string, unknown> | null
        if (!checkpdSummary) {
          const fallbackRes = await supabase
            .schema("checkpd")
            .from("record_summary")
            .select("*")
            .eq("user_id", id)
            .order("last_record_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle()
          if (!fallbackRes.error) checkpdSummary = fallbackRes.data as Record<string, unknown> | null
        }

        const summaryRow = (recordSummaryRes.data as Record<string, unknown> | null) ?? null
        const publicUser = (publicUserRes.data as Record<string, unknown> | null) ?? null
        const thaiId = asText(summaryRow?.thaiid) || asText(publicUser?.thaiid)

        let diagnosisV2: Record<string, unknown> | null = null
        let coreScores: Record<string, unknown> | null = null
        if (thaiId) {
          const patientRes = await supabase
            .schema("core")
            .from("patients_v2")
            .select("id")
            .eq("thaiid", thaiId)
            .order("submission_timestamp", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle<{ id: number }>()
          if (patientRes.error) throw patientRes.error

          if (patientRes.data?.id) {
            const patientId = patientRes.data.id
            const [diagnosisRes, mocaRes, hamdRes, mdsRes, epworthRes, smellRes, tmseRes, rbdRes, rome4Res] = await Promise.all([
              supabase
                .schema("core")
                .from("patient_diagnosis_v2")
                .select(
                  "rbd_suspected,hyposmia,constipation,depression,eds,ans_dysfunction,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,fdopa_pet_score,condition,hy_stage,disease_duration"
                )
                .eq("patient_id", patientId)
                .maybeSingle(),
              supabase.schema("core").from("moca_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("hamd_v2").select("patient_id,total_score,severity_level").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("mds_updrs_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("epworth_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("smell_test_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("tmse_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("rbd_questionnaire_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
              supabase.schema("core").from("rome4_v2").select("patient_id,total_score").eq("patient_id", patientId).maybeSingle(),
            ])
            if (diagnosisRes.error) throw diagnosisRes.error
            if (mocaRes.error) throw mocaRes.error
            if (hamdRes.error) throw hamdRes.error
            if (mdsRes.error) throw mdsRes.error
            if (epworthRes.error) throw epworthRes.error
            if (smellRes.error) throw smellRes.error
            if (tmseRes.error) throw tmseRes.error
            if (rbdRes.error) throw rbdRes.error
            if (rome4Res.error) throw rome4Res.error
            diagnosisV2 = (diagnosisRes.data as Record<string, unknown> | null) ?? null
            coreScores = {
              moca_total: asNumber((mocaRes.data as Record<string, unknown> | null)?.total_score),
              hamd_total: asNumber((hamdRes.data as Record<string, unknown> | null)?.total_score),
              hamd_severity: asText((hamdRes.data as Record<string, unknown> | null)?.severity_level),
              mds_updrs_total: asNumber((mdsRes.data as Record<string, unknown> | null)?.total_score),
              epworth_total: asNumber((epworthRes.data as Record<string, unknown> | null)?.total_score),
              smell_total: asNumber((smellRes.data as Record<string, unknown> | null)?.total_score),
              tmse_total: asNumber((tmseRes.data as Record<string, unknown> | null)?.total_score),
              rbd_total: asNumber((rbdRes.data as Record<string, unknown> | null)?.total_score),
              rome4_total: asNumber((rome4Res.data as Record<string, unknown> | null)?.total_score),
            }
          }
        }

        const checkpdRecords = (checkpdRecordsRes.data ?? []) as Array<{ id: number }>
        const recordPks = checkpdRecords.map((r) => r.id)

        let perTest: PerTestPredictionRow[] = []
        if (recordPks.length > 0) {
          const [vib, tap, pinch, quest, voice, pred] = await Promise.all([
            supabase.schema("checkpd").from("vibration").select("test_type,prediction_risk,recorded_at,record_pk").in("record_pk", recordPks),
            supabase.schema("checkpd").from("tap").select("test_type,prediction_risk,recorded_at,record_pk").in("record_pk", recordPks),
            supabase.schema("checkpd").from("pinch").select("test_type,prediction_risk,recorded_at,record_pk").in("record_pk", recordPks),
            supabase.schema("checkpd").from("questionnaire").select("total,prediction_risk,recorded_at,record_pk").in("record_pk", recordPks),
            supabase.schema("checkpd").from("voice").select("test_type,prediction_risk,recorded_at,record_pk").in("record_pk", recordPks),
            supabase.schema("checkpd").from("prediction").select("risk,prediction_type,approver,note,created_at,record_pk").in("record_pk", recordPks),
          ])

          perTest = [
            ...((vib.data ?? []).map((r: Record<string, unknown>) => ({
              source: "vibration" as const,
              test_type: asText(r.test_type) || "vibration",
              prediction_risk: asBool(r.prediction_risk),
              recorded_at: asText(r.recorded_at) || null,
            }))),
            ...((tap.data ?? []).map((r: Record<string, unknown>) => ({
              source: "tap" as const,
              test_type: asText(r.test_type) || "tap",
              prediction_risk: asBool(r.prediction_risk),
              recorded_at: asText(r.recorded_at) || null,
            }))),
            ...((pinch.data ?? []).map((r: Record<string, unknown>) => ({
              source: "pinch" as const,
              test_type: asText(r.test_type) || "pinch",
              prediction_risk: asBool(r.prediction_risk),
              recorded_at: asText(r.recorded_at) || null,
            }))),
            ...((quest.data ?? []).map((r: Record<string, unknown>) => ({
              source: "questionnaire" as const,
              test_type: "questionnaire",
              prediction_risk: asBool(r.prediction_risk),
              recorded_at: asText(r.recorded_at) || null,
            }))),
            ...((voice.data ?? []).map((r: Record<string, unknown>) => ({
              source: "voice" as const,
              test_type: asText(r.test_type) || "voice",
              prediction_risk: asBool(r.prediction_risk),
              recorded_at: asText(r.recorded_at) || null,
            }))),
            ...((pred.data ?? []).map((r: Record<string, unknown>) => ({
              source: "prediction" as const,
              test_type: asText(r.prediction_type) || "prediction",
              prediction_risk: asBool(r.risk),
              recorded_at: asText(r.created_at) || null,
              approver: asText(r.approver) || null,
              note: asText(r.note) || null,
            }))),
          ].sort((a, b) => {
            const at = a.recorded_at ? new Date(a.recorded_at).getTime() : 0
            const bt = b.recorded_at ? new Date(b.recorded_at).getTime() : 0
            return bt - at
          })
        }

        if (cancelled) return
        setState({
          loading: false,
          error: null,
          publicUser: (publicUserRes.data as Record<string, unknown> | null) ?? null,
          recordSummary: (recordSummaryRes.data as Record<string, unknown> | null) ?? null,
          checkpdUser: (checkpdUserRes.data as Record<string, unknown> | null) ?? null,
          checkpdSummary,
          diagnosisV2,
          coreScores,
          perTest,
        })
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [params.id, params.recorder, params.recordId])

  return state
}

function asText(value: unknown) {
  return typeof value === "string" ? value : null
}

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}
