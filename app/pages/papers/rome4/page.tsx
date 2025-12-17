// app/pages/papers/rome4/page.tsx
import Rome4 from "@/app/component/pdform/Rome4Form";


export default async function Rome4Page({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

  return <Rome4 thaiId={thaiId} />;
}