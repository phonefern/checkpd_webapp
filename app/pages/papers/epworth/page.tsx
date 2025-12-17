// app/pages/papers/epworth/page.tsx
import EpworthForm from "@/app/component/pdform/EpworthForm";

export default async function EpworthPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <EpworthForm thaiId={thaiId} />;
}