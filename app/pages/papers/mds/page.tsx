// app/pages/papers/mds/page.tsx

import MdsForm from "@/app/component/pdform/MdsForm";
// import TmseForm from "@/app/component/pdform/TmseForm";


export default async function MdsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <MdsForm thaiId={thaiId} />;
}