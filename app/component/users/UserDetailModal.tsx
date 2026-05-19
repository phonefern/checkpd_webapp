"use client"

import { useMemo, useState } from "react"
import { type User, formatToThaiTime } from "@/app/types/user"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import PatientHistoryModal from "./PatientHistoryModal"
import { getConditionBadge, getRiskBadge } from "./UserTable"
import { useDetailData } from "./useDetailData"

interface UserDetailModalProps {
  open: boolean
  user: User | null
  onClose: () => void
  hasScreeningThaiId: (thaiid: string) => boolean
}

export default function UserDetailModal({ open, user, onClose, hasScreeningThaiId }: UserDetailModalProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const { loading, error, publicUser, recordSummary, checkpdUser, checkpdSummary, diagnosisV2, coreScores, perTest } = useDetailData({
    id: user?.id,
    recorder: user?.recorder,
    recordId: user?.record_id,
  })

  const canOpenHistory = Boolean(user?.thaiid && hasScreeningThaiId(user.thaiid))

  const profileRows = useMemo(
    () => [
      { label: "Prefix", value: toText(publicUser?.perfixname) },
      { label: "First name", value: toText(publicUser?.firstname) },
      { label: "Last name", value: toText(publicUser?.lastname) },
      { label: "Thai ID", value: toText(publicUser?.thaiid) || user?.thaiid || "-" },
      { label: "Date of birth", value: formatDate(toText(publicUser?.bod)) },
      { label: "Age", value: toText(publicUser?.age) },
      { label: "Gender", value: toText(publicUser?.gender) },
      { label: "Phone", value: toText(publicUser?.phonenumber) },
      { label: "Email", value: toText(publicUser?.email) },
      { label: "Live address", value: toText(publicUser?.liveaddress) },
      { label: "ID-card address", value: toText(publicUser?.idcardaddress) },
      { label: "Province", value: toText(publicUser?.province) },
      { label: "Region", value: toText(publicUser?.region) },
      { label: "Area", value: toText(publicUser?.area) },
      { label: "Education", value: toText(publicUser?.educationstatus) },
      { label: "Occupation", value: toText(checkpdUser?.occupation) || toText(publicUser?.occupation) },
      { label: "Marital status", value: toText(publicUser?.maritalstatus) },
      { label: "Ethnicity", value: toText(publicUser?.ethnicity) },
      { label: "Source", value: toText(publicUser?.source) || user?.source },
      { label: "Timestamp", value: formatToThaiTime(toText(publicUser?.timestamp) || user?.timestamp) },
      { label: "Last update", value: formatToThaiTime(toText(publicUser?.lastupdate) || user?.last_update) },
    ],
    [publicUser, checkpdUser, user]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {user?.firstname} {user?.lastname}
          </DialogTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {getRiskBadge(user?.prediction_risk ?? null)}
            {getConditionBadge(user?.condition ?? null)}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded bg-slate-200/70" />
            <div className="h-16 animate-pulse rounded bg-slate-200/70" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border bg-white p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Profile</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {profileRows.map((row) => (
                  <InfoCell key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </section>

            <section className="rounded-lg border bg-white p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Clinical Flags & Scores</h3>
              {!diagnosisV2 ? (
                <div className="text-sm text-slate-500">ไม่มีข้อมูลจาก core.patient_diagnosis_v2</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCell label="Diagnosis Condition" value={toText(diagnosisV2.condition)} />
                  <InfoCell label="HY Stage" value={toText(diagnosisV2.hy_stage)} />
                  <InfoCell label="Disease Duration" value={toText(diagnosisV2.disease_duration)} />
                  <InfoCell label="RBD Suspected" value={toYesNo(diagnosisV2.rbd_suspected)} />
                  <InfoCell label="Hyposmia" value={toYesNo(diagnosisV2.hyposmia)} />
                  <InfoCell label="Constipation" value={toYesNo(diagnosisV2.constipation)} />
                  <InfoCell label="Depression" value={toYesNo(diagnosisV2.depression)} />
                  <InfoCell label="EDS" value={toYesNo(diagnosisV2.eds)} />
                  <InfoCell label="ANS Dysfunction" value={toYesNo(diagnosisV2.ans_dysfunction)} />
                  <InfoCell label="Mild Parkinsonian Sign" value={toYesNo(diagnosisV2.mild_parkinsonian_sign)} />
                  <InfoCell label="Family History PD" value={toYesNo(diagnosisV2.family_history_pd)} />
                  <InfoCell label="ADL Score" value={formatScore(diagnosisV2.adl_score)} />
                  <InfoCell label="SCOPA-AUT Score" value={formatScore(diagnosisV2.scopa_aut_score)} />
                  <InfoCell label="FDOPA PET Score" value={toText(diagnosisV2.fdopa_pet_score)} />
                  <InfoCell label="MOCA Total Score" value={formatScore(coreScores?.moca_total)} />
                  <InfoCell label="HAM-D Total Score" value={formatScore(coreScores?.hamd_total)} />
                  <InfoCell label="HAM-D Severity" value={toText(coreScores?.hamd_severity)} />
                  <InfoCell label="MDS-UPDRS Total Score" value={formatScore(coreScores?.mds_updrs_total)} />
                  <InfoCell label="Epworth Total Score" value={formatScore(coreScores?.epworth_total)} />
                  <InfoCell label="Smell Test Total Score" value={formatScore(coreScores?.smell_total)} />
                  <InfoCell label="TMSE Total Score" value={formatScore(coreScores?.tmse_total)} />
                  <InfoCell label="RBD Questionnaire Total Score" value={formatScore(coreScores?.rbd_total)} />
                  <InfoCell label="Rome IV Total Score" value={formatScore(coreScores?.rome4_total)} />
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-white p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">CheckPD Summary</h3>
              <p className="mb-2 mt-1 text-xs text-slate-500">ข้อมูลจาก CheckPD มือถือ (อ่านอย่างเดียว)</p>
              {!checkpdSummary ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">ไม่มีข้อมูล CheckPD</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCell label="Tremor resting" value={formatHz(checkpdSummary.tremor_resting_hz)} />
                  <InfoCell label="Tremor postural" value={formatHz(checkpdSummary.tremor_postural_hz)} />
                  <InfoCell label="Balance" value={formatHz(checkpdSummary.balance_hz)} />
                  <InfoCell label="Gait" value={formatHz(checkpdSummary.gait_hz)} />
                  <InfoCell label="Dual-tap left" value={toText(checkpdSummary.dual_tap_left_score)} />
                  <InfoCell label="Dual-tap right" value={toText(checkpdSummary.dual_tap_right_score)} />
                  <InfoCell label="Questionnaire" value={formatQuestionnaire(checkpdSummary.questionnaire_total)} />
                  <InfoCell label="Test result" value={toText(checkpdSummary.test_result)} />
                  <InfoCell label="Condition" value={toText(checkpdSummary.condition)} />
                  <InfoCell label="Overall prediction" value={formatRiskText(checkpdSummary.prediction_risk)} />
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-white p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Per-test Predictions</h3>
              {perTest.length === 0 ? (
                <div className="text-sm text-slate-500">ไม่มีข้อมูลการทดสอบ</div>
              ) : (
                <div className={`space-y-1 ${perTest.length > 20 ? "max-h-72 overflow-y-auto pr-2" : ""}`}>
                  {perTest.map((row, idx) => (
                    <div key={`${row.source}-${row.test_type}-${row.recorded_at ?? idx}`} className="flex flex-wrap items-center gap-2 rounded border bg-slate-50 px-2 py-1 text-xs">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium">{row.test_type}</span>
                      <span className={`rounded px-1.5 py-0.5 ${row.prediction_risk === true ? "bg-red-100 text-red-700" : row.prediction_risk === false ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {formatRiskText(row.prediction_risk)}
                      </span>
                      <span className="text-slate-500">{formatDateTime(row.recorded_at)}</span>
                      {row.approver && <span className="text-slate-700">approver: {row.approver}</span>}
                      {row.note && <span className="text-slate-700">note: {row.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <DialogFooter className="items-center sm:justify-between">
          {/* <div>
            {canOpenHistory && (
              <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
                ดูประวัติการคัดกรอง
              </Button>
            )}
          </div> */}
          <Button type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>


    </Dialog>
  )
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value || "-"}</div>
    </div>
  )
}

function toText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return null
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("th-TH")
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("th-TH")
}

function formatHz(value: unknown) {
  if (typeof value !== "number") return "-"
  return `${value.toFixed(3)} Hz`
}

function formatQuestionnaire(value: unknown) {
  if (typeof value !== "number") return "-"
  return `${value} / 20`
}

function formatRiskText(value: unknown) {
  if (value === true) return "Risk"
  if (value === false) return "No-risk"
  return "Unknown"
}

function toYesNo(value: unknown) {
  if (value === true) return "Yes"
  if (value === false) return "No"
  return "-"
}

function formatScore(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  if (typeof value === "string" && value.trim() !== "") return value
  return "-"
}
