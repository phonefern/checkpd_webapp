// app/pages/papers/moca/page.tsx
import MocaForm from "@/app/component/pdform/MocaForm";


export default async function MocaPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <MocaForm thaiId={thaiId} />;
}