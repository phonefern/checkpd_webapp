// app/pages/papers/tmse/page.tsx

import TmseForm from "@/app/component/pdform/TmseForm";


export default async function TmsePage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <TmseForm thaiId={thaiId} />;
}