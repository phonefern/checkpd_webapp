// app/pages/papers/smell/page.tsx
import Smell from "@/app/component/pdform/SmellForm";


export default async function SmellPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <Smell thaiId={thaiId} />;
}