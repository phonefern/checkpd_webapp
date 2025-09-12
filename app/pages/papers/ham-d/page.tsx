// app/pages/papers/ham-d/page.tsx
import { supabase } from "@/lib/supabase";
import HamdForm from "@/app/component/pdform/HamdForm";

export default function HamdPage({

}: {
  searchParams: { [key: string]: string | undefined };
}) {
  

  return <HamdForm />;
}
