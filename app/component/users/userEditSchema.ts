import { z } from "zod"

export const userEditSchema = z.object({
  perfixname: z.string().max(50).optional().nullable(),
  firstname: z.string().min(1, "required").max(100),
  lastname: z.string().min(1, "required").max(100),
  thaiid: z.string().optional().nullable(),
  bod: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  liveaddress: z.string().max(500).optional().nullable(),
  idcardaddress: z.string().max(500).optional().nullable(),
  province: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  educationstatus: z.string().optional().nullable(),
  maritalstatus: z.string().optional().nullable(),
  ethnicity: z.string().optional().nullable(),
  congenital_disease: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  other: z.string().optional().nullable(),
})

export type UserEditValues = z.infer<typeof userEditSchema>
