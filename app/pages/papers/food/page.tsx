// app/pages/papers/food/page.tsx
import FoodForm from "@/app/component/pdform/FoodForm";
// import Hamd from "@/app/component/pdform/HamdForm";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_thaiid?: string | string[] }>;
}) {
  const params = await searchParams;
  const thaiId = Array.isArray(params.patient_thaiid) 
    ? params.patient_thaiid[0] 
    : params.patient_thaiid;

    return <FoodForm thaiId={thaiId} />;
  }