// app/pages/papers/ham-d/page.tsx
import Hamd from "@/app/component/pdform/HamdForm";

export default async function HamdPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <Hamd thaiId={thaiId} />;
}