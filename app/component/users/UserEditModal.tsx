"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { type User, conditionOptions, provinceOptions } from "@/app/types/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { userEditSchema, type UserEditValues } from "./userEditSchema"

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

export default function UserEditModal({ open, user, onClose, onSaved }: UserEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [checkpdUser, setCheckpdUser] = useState<CheckpdUserLifestyle | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      condition: "",
      other: "",
    },
  })

  useEffect(() => {
    if (!open || !user) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      setCheckpdUser(null)
      setTestResult(null)
      try {
        const [publicUserRes, summaryRes, checkpdUserRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
          user.recorder
            ? supabase
                .from("user_record_summary")
                .select("condition,other,test_result")
                .eq("user_id", user.id)
                .eq("recorder", user.recorder)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .schema("checkpd")
            .from("users")
            .select("occupation,emolument,smoking,alcohol,coffee,milk,exercise,insecticide,narcotic,severe_head_injury,diagnosis,medicine,level_respond_medicine,relative")
            .eq("id", user.id)
            .maybeSingle(),
        ])

        if (cancelled) return
        if (publicUserRes.error) throw publicUserRes.error
        if (summaryRes.error) throw summaryRes.error

        const pu = publicUserRes.data as Record<string, unknown> | null
        const rs = summaryRes.data as Record<string, unknown> | null

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
          condition: toText(rs?.condition),
          other: toText(rs?.other),
        })

        setTestResult(toText(rs?.test_result) || null)
        setCheckpdUser(checkpdUserRes.error ? null : (checkpdUserRes.data as CheckpdUserLifestyle | null))
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

  const onSubmit = form.handleSubmit(async (values) => {
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

      if (user.recorder) {
        const { error: summaryErr } = await supabase
          .from("user_record_summary")
          .update({
            condition: nullOrValue(values.condition),
            other: nullOrValue(values.other),
          })
          .eq("user_id", user.id)
          .eq("recorder", user.recorder)
        if (summaryErr) throw summaryErr
      }

      onSaved(user)
      onClose()
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  })

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
                  <FormInput label="Other" register={form.register("other")} />
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
  return trimmed === "" ? null : trimmed
}
