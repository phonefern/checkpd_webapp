"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { type User, conditionOptions, provinceOptions } from "@/app/types/user"
import { useSession } from "@/app/providers/SessionProvider"
import { useAccessProfile } from "@/app/hooks/useAccessProfile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { userEditSchema, type UserEditValues } from "./userEditSchema"
import { OtherDiagnosisSelect } from "@/app/component/diagnosis/OtherDiagnosisSelect"

interface UserEditModalProps {
  open: boolean
  user: User | null
  onClose: () => void
  onSaved: (user: User) => void
}

type CheckpdUserLifestyle = {
  occupation: string | null
  emolument: string | null
  smoking: string | null
  alcohol: string | null
  coffee: string | null
  milk: string | null
  exercise: string | null
  insecticide: string | null
  narcotic: string | null
  severe_head_injury: string | null
  diagnosis: string | null
  medicine: string | null
  level_respond_medicine: string | null
  relative: string | null
}

type SummaryRow = {
  recorder: string | null
  record_id: string | null
  thaiid: string | null
  condition: string | null
  other: string | null
  test_result: string | null
}

type AssessmentScores = {
  adl: number | null
  scopa_aut: number | null
  fdopa_pet_score: string | null
  moca: number | null
  hamd: number | null
  hamd_severity: string | null
  mds_updrs: number | null
  epworth: number | null
  smell: number | null
  tmse: number | null
  rbd_questionnaire: number | null
  rome4: number | null
}

type ProdromalFlags = {
  rbd_suspected: boolean
  hyposmia: boolean
  constipation: boolean
  depression: boolean
  eds: boolean
  ans_dysfunction: boolean
  mild_parkinsonian_sign: boolean
  family_history_pd: boolean
}

const EMPTY_ASSESSMENTS: AssessmentScores = {
  adl: null,
  scopa_aut: null,
  fdopa_pet_score: null,
  moca: null,
  hamd: null,
  hamd_severity: null,
  mds_updrs: null,
  epworth: null,
  smell: null,
  tmse: null,
  rbd_questionnaire: null,
  rome4: null,
}

const EMPTY_FLAGS: ProdromalFlags = {
  rbd_suspected: false,
  hyposmia: false,
  constipation: false,
  depression: false,
  eds: false,
  ans_dysfunction: false,
  mild_parkinsonian_sign: false,
  family_history_pd: false,
}

export default function UserEditModal({ open, user, onClose, onSaved }: UserEditModalProps) {
  const { session } = useSession()
  const { accessProfile } = useAccessProfile(session)
  const canUseProdromalAssist =
    accessProfile.role === "doctor" || accessProfile.role === "admin" || accessProfile.role === "super_admin"
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [checkpdUser, setCheckpdUser] = useState<CheckpdUserLifestyle | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [summaryRecorder, setSummaryRecorder] = useState<string | null>(null)
  const [assessments, setAssessments] = useState<AssessmentScores>(EMPTY_ASSESSMENTS)
  const [prodromalFlags, setProdromalFlags] = useState<ProdromalFlags>(EMPTY_FLAGS)

  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      condition: "",
      other: "",
    },
  })
  const otherValue = form.watch("other")

  useEffect(() => {
    if (!open || !user) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      setCheckpdUser(null)
      setTestResult(null)
      setSummaryRecorder(null)
      setAssessments(EMPTY_ASSESSMENTS)
      setProdromalFlags(EMPTY_FLAGS)
      try {
        const summaryPromise = (async () => {
          if (user.recorder) {
            const byRecorder = await supabase
              .from("user_record_summary")
              .select("recorder,record_id,thaiid,condition,other,test_result")
              .eq("user_id", user.id)
              .eq("recorder", user.recorder)
              .maybeSingle<SummaryRow>()
            if (byRecorder.error) throw byRecorder.error
            if (byRecorder.data) return byRecorder.data
          }

          if (user.record_id) {
            const byRecordId = await supabase
              .from("user_record_summary")
              .select("recorder,record_id,thaiid,condition,other,test_result")
              .eq("user_id", user.id)
              .eq("record_id", user.record_id)
              .order("last_update", { ascending: false, nullsFirst: false })
              .limit(1)
              .maybeSingle<SummaryRow>()
            if (byRecordId.error) throw byRecordId.error
            if (byRecordId.data) return byRecordId.data
          }

          const latest = await supabase
            .from("user_record_summary")
            .select("recorder,record_id,thaiid,condition,other,test_result")
            .eq("user_id", user.id)
            .order("last_update", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle<SummaryRow>()
          if (latest.error) throw latest.error
          return latest.data
        })()

        const [publicUserRes, summaryRow, checkpdUserRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
          summaryPromise,
          supabase
            .schema("checkpd")
            .from("users")
            .select("occupation,emolument,smoking,alcohol,coffee,milk,exercise,insecticide,narcotic,severe_head_injury,diagnosis,medicine,level_respond_medicine,relative")
            .eq("id", user.id)
            .maybeSingle(),
        ])

        if (cancelled) return
        if (publicUserRes.error) throw publicUserRes.error

        const pu = publicUserRes.data as Record<string, unknown> | null
        const rs = summaryRow as SummaryRow | null

        form.reset({
          perfixname: toText(pu?.perfixname),
          firstname: toText(pu?.firstname),
          lastname: toText(pu?.lastname),
          thaiid: toText(pu?.thaiid),
          bod: toDateInputString(toText(pu?.bod)),
          gender: (toText(pu?.gender) as "male" | "female" | "other" | "") || null,
          phonenumber: toText(pu?.phonenumber),
          email: toText(pu?.email),
          liveaddress: toText(pu?.liveaddress),
          idcardaddress: toText(pu?.idcardaddress),
          province: toText(pu?.province),
          area: toText(pu?.area),
          educationstatus: toText(pu?.educationstatus),
          maritalstatus: toText(pu?.maritalstatus),
          ethnicity: toText(pu?.ethnicity),
          congenital_disease: toText(pu?.congenital_disease),
          condition: toConditionFormValue(rs?.condition),
          other: toText(rs?.other),
        })

        setTestResult(toText(rs?.test_result) || null)
        setSummaryRecorder(rs?.recorder ?? user.recorder ?? null)
        setCheckpdUser(checkpdUserRes.error ? null : (checkpdUserRes.data as CheckpdUserLifestyle | null))
        const thaiId = toText(rs?.thaiid) || toText(pu?.thaiid)
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
                  "rbd_suspected,hyposmia,constipation,depression,eds,ans_dysfunction,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,fdopa_pet_score"
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

            const diagnosis = (diagnosisRes.data as Record<string, unknown> | null) ?? null
            const moca = (mocaRes.data as Record<string, unknown> | null) ?? null
            const hamd = (hamdRes.data as Record<string, unknown> | null) ?? null
            const mds = (mdsRes.data as Record<string, unknown> | null) ?? null
            const epworth = (epworthRes.data as Record<string, unknown> | null) ?? null
            const smell = (smellRes.data as Record<string, unknown> | null) ?? null
            const tmse = (tmseRes.data as Record<string, unknown> | null) ?? null
            const rbd = (rbdRes.data as Record<string, unknown> | null) ?? null
            const rome4 = (rome4Res.data as Record<string, unknown> | null) ?? null
            setProdromalFlags({
              rbd_suspected: Boolean(diagnosis?.rbd_suspected),
              hyposmia: Boolean(diagnosis?.hyposmia),
              constipation: Boolean(diagnosis?.constipation),
              depression: Boolean(diagnosis?.depression),
              eds: Boolean(diagnosis?.eds),
              ans_dysfunction: Boolean(diagnosis?.ans_dysfunction),
              mild_parkinsonian_sign: Boolean(diagnosis?.mild_parkinsonian_sign),
              family_history_pd: Boolean(diagnosis?.family_history_pd),
            })

            setAssessments({
              adl: toNullableNumber(diagnosis?.adl_score),
              scopa_aut: toNullableNumber(diagnosis?.scopa_aut_score),
              fdopa_pet_score: toText(diagnosis?.fdopa_pet_score) || null,
              moca: toNullableNumber(moca?.total_score),
              hamd: toNullableNumber(hamd?.total_score),
              hamd_severity: toText(hamd?.severity_level) || null,
              mds_updrs: toNullableNumber(mds?.total_score),
              epworth: toNullableNumber(epworth?.total_score),
              smell: toNullableNumber(smell?.total_score),
              tmse: toNullableNumber(tmse?.total_score),
              rbd_questionnaire: toNullableNumber(rbd?.total_score),
              rome4: toNullableNumber(rome4?.total_score),
            })
          }
        }
      } catch (err) {
        if (cancelled) return
        setFetchError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, user, form])

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (!user) return
      setSaving(true)
      try {
        const usersPayload = {
          perfixname: nullOrValue(values.perfixname),
          firstname: nullOrValue(values.firstname),
          lastname: nullOrValue(values.lastname),
          thaiid: nullOrValue(values.thaiid),
          bod: nullOrValue(values.bod),
          gender: nullOrValue(values.gender),
          phonenumber: nullOrValue(values.phonenumber),
          email: nullOrValue(values.email),
          liveaddress: nullOrValue(values.liveaddress),
          idcardaddress: nullOrValue(values.idcardaddress),
          province: nullOrValue(values.province),
          area: nullOrValue(values.area),
          educationstatus: nullOrValue(values.educationstatus),
          maritalstatus: nullOrValue(values.maritalstatus),
          ethnicity: nullOrValue(values.ethnicity),
          congenital_disease: nullOrValue(values.congenital_disease),
        }

        const { error: publicErr } = await supabase.from("users").update(usersPayload).eq("id", user.id)
        if (publicErr) throw publicErr

        const recorderToUse = summaryRecorder ?? user.recorder ?? (user.source === "staff" ? "staff" : "user")

        if (recorderToUse) {
          const summaryPayload = {
            thaiid: nullOrValue(values.thaiid),
            condition: nullOrValue(values.condition),
            other: nullOrValue(values.other),
          }

          const { data: updatedRows, error: summaryUpdateErr } = await supabase
            .from("user_record_summary")
            .update(summaryPayload)
            .eq("user_id", user.id)
            .eq("recorder", recorderToUse)
            .select("user_id")

          if (summaryUpdateErr) throw summaryUpdateErr

          if (!updatedRows || updatedRows.length === 0) {
            const { error: summaryInsertErr } = await supabase
              .from("user_record_summary")
              .insert({
                user_id: user.id,
                recorder: recorderToUse,
                record_id: nullOrValue(user.record_id),
                ...summaryPayload,
              })
            if (summaryInsertErr) throw summaryInsertErr
          }
        }

        onSaved(user)
        onClose()
      } catch (err) {
        alert(`Failed to update: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setSaving(false)
      }
    },
    (errors) => {
      console.warn("UserEditModal validation errors:", errors)
      alert("กรุณากรอก First Name และ Last Name ให้ครบ")
    }
  )

  const lifestyleRows = useMemo(
    () => [
      { label: "อาชีพ", value: checkpdUser?.occupation },
      { label: "รายได้", value: checkpdUser?.emolument },
      { label: "สูบบุหรี่", value: checkpdUser?.smoking },
      { label: "ดื่มสุรา", value: checkpdUser?.alcohol },
      { label: "ดื่มกาแฟ", value: checkpdUser?.coffee },
      { label: "ดื่มนม", value: checkpdUser?.milk },
      { label: "ออกกำลังกาย", value: checkpdUser?.exercise },
      { label: "สารกำจัดศัตรูพืช", value: checkpdUser?.insecticide },
      { label: "สารเสพติด", value: checkpdUser?.narcotic },
      { label: "บาดเจ็บศีรษะรุนแรง", value: checkpdUser?.severe_head_injury },
    ],
    [checkpdUser]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit User: {user?.firstname} {user?.lastname}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded bg-slate-200/70" />
            <div className="h-16 animate-pulse rounded bg-slate-200/70" />
          </div>
        ) : fetchError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fetchError}</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
                <TabsTrigger value="clinical">Clinical</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <FormInput label="Prefix" register={form.register("perfixname")} />
                  <FormInput label="First Name" register={form.register("firstname")} />
                  <FormInput label="Last Name" register={form.register("lastname")} />
                  <FormInput label="Thai ID" register={form.register("thaiid")} />
                  <FormInput label="Date of Birth" type="date" register={form.register("bod")} />
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <select className="w-full rounded-md border border-slate-300 p-2 text-sm" {...form.register("gender")}>
                      <option value="">-</option>
                      <option value="male">male</option>
                      <option value="female">female</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                  <FormInput label="Phone" register={form.register("phonenumber")} />
                  <FormInput label="Email" type="email" register={form.register("email")} />
                  <FormTextArea label="Live Address" register={form.register("liveaddress")} helper="จังหวัดจะถูกคำนวณใหม่จากที่อยู๋เมื่อบันทึก" />
                  <FormTextArea label="ID-card Address" register={form.register("idcardaddress")} />
                  <div className="space-y-1">
                    <Label>Province</Label>
                    <select className="w-full rounded-md border border-slate-300 p-2 text-sm" {...form.register("province")}>
                      <option value="">-</option>
                      {provinceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <FormInput label="Area" register={form.register("area")} />
                  <FormInput label="Education" register={form.register("educationstatus")} />
                  <FormInput label="Marital Status" register={form.register("maritalstatus")} />
                  <FormInput label="Ethnicity" register={form.register("ethnicity")} />
                </div>
              </TabsContent>

              <TabsContent value="lifestyle" className="space-y-2">
                <p className="text-xs text-slate-500">แก้ไขจากแอปมือถือ (CheckPD) เท่านั้น</p>
                {!checkpdUser ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">ไม่มีข้อมูล CheckPD</div>
                ) : (
                  <div className="grid gap-2 rounded-md border bg-slate-50 p-3 sm:grid-cols-2">
                    {lifestyleRows.map((row) => (
                      <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="clinical" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <FormTextArea label="Congenital disease" register={form.register("congenital_disease")} />
                  <div className="space-y-1">
                    <Label>Condition</Label>
                    <select className="w-full rounded-md border border-slate-300 p-2 text-sm" {...form.register("condition")}>
                      {conditionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Other</Label>
                    <OtherDiagnosisSelect
                      value={otherValue}
                      onChange={(next) => form.setValue("other", next, { shouldDirty: true, shouldValidate: true })}
                    />
                  </div>
                  <ReadOnlyRow label="Test Result" value={testResult} />
                </div>

                <div className="rounded-md border bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">ข้อมูลจาก CheckPD (อ่านอย่างเดียว)</p>
                  {!checkpdUser ? (
                    <div className="text-sm text-slate-500">ไม่มีข้อมูล CheckPD</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ReadOnlyRow label="Diagnosis" value={checkpdUser.diagnosis} />
                      <ReadOnlyRow label="Medicine" value={checkpdUser.medicine} />
                      <ReadOnlyRow label="Response to medicine" value={checkpdUser.level_respond_medicine} />
                      <ReadOnlyRow label="Relative" value={checkpdUser.relative} />
                    </div>
                  )}
                </div>

                {canUseProdromalAssist && (
                  <div className="rounded-md border bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">
                      Prodromal Flags (from core.patient_diagnosis_v2)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ReadOnlyCheckRow label="Suspected RBD" checked={prodromalFlags.rbd_suspected} />
                      <ReadOnlyCheckRow label="Hyposmia" checked={prodromalFlags.hyposmia} />
                      <ReadOnlyCheckRow label="Constipation" checked={prodromalFlags.constipation} />
                      <ReadOnlyCheckRow label="Depression" checked={prodromalFlags.depression} />
                      <ReadOnlyCheckRow label="EDS" checked={prodromalFlags.eds} />
                      <ReadOnlyCheckRow label="ANS dysfunction" checked={prodromalFlags.ans_dysfunction} />
                      <ReadOnlyCheckRow label="Mild Parkinsonian Sign" checked={prodromalFlags.mild_parkinsonian_sign} />
                      <ReadOnlyCheckRow label="Family History PD" checked={prodromalFlags.family_history_pd} />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <ReadOnlyRow label="ADL Score" value={toDisplayNumber(assessments.adl)} />
                      <ReadOnlyRow label="SCOPA-AUT Score" value={toDisplayNumber(assessments.scopa_aut)} />
                      <ReadOnlyRow label="FDOPA PET Score" value={assessments.fdopa_pet_score} />
                      <ReadOnlyRow label="MOCA Total Score" value={toDisplayNumber(assessments.moca)} />
                      <ReadOnlyRow label="HAM-D Total Score" value={toDisplayNumber(assessments.hamd)} />
                      <ReadOnlyRow label="HAM-D Severity" value={assessments.hamd_severity} />
                      <ReadOnlyRow label="MDS-UPDRS Total Score" value={toDisplayNumber(assessments.mds_updrs)} />
                      <ReadOnlyRow label="Epworth Total Score" value={toDisplayNumber(assessments.epworth)} />
                      <ReadOnlyRow label="Smell Test Total Score" value={toDisplayNumber(assessments.smell)} />
                      <ReadOnlyRow label="TMSE Total Score" value={toDisplayNumber(assessments.tmse)} />
                      <ReadOnlyRow label="RBD Questionnaire Total Score" value={toDisplayNumber(assessments.rbd_questionnaire)} />
                      <ReadOnlyRow label="Rome IV Total Score" value={toDisplayNumber(assessments.rome4)} />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormInput({
  label,
  register,
  type = "text",
}: {
  label: string
  register: UseFormRegisterReturn
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} {...register} />
    </div>
  )
}

function FormTextArea({
  label,
  register,
  helper,
}: {
  label: string
  register: UseFormRegisterReturn
  helper?: string
}) {
  return (
    <div className="space-y-1 md:col-span-2">
      <Label>{label}</Label>
      <textarea className="w-full rounded-md border border-slate-300 p-2 text-sm" rows={3} {...register} />
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-sm font-medium text-slate-800">{value?.trim() || "-"}</div>
    </div>
  )
}

function ReadOnlyCheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
      <input type="checkbox" checked={checked} readOnly className="h-4 w-4" />
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  )
}

function toText(value: unknown): string {
  if (typeof value === "string") return value
  if (value == null) return ""
  return String(value)
}

function toDateInputString(value: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function nullOrValue(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === "" || trimmed.toLowerCase() === "null") return null
  return trimmed
}

function toConditionFormValue(value: string | null | undefined) {
  const raw = (value ?? "").trim().toLowerCase()
  if (raw === "" || raw === "-" || raw === "null") return "null"
  if (raw === "pd" || raw.includes("parkinson") || raw.includes("newly diagnosis")) return "pd"
  if (raw === "pdm" || raw.includes("prodromal") || raw.includes("high risk") || raw.includes("high-risk")) return "pdm"
  if (raw === "ctrl" || raw.includes("control") || raw.includes("healthy") || raw === "normal") return "ctrl"
  return "other"
}

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toDisplayNumber(value: number | null): string | null {
  if (value == null) return null
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
