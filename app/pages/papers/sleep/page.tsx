// app/pages/papers/sleep/page.tsx
import Sleep from "@/app/component/pdform/SleepForm";


export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <Sleep thaiId={thaiId} />;
}