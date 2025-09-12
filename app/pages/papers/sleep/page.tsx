// app/pages/papers/sleep/page.tsx
import { supabase } from "@/lib/supabase";
import Sleep from "@/app/component/pdform/SleepForm";

export default function SleepPage({

}: {
  searchParams: { [key: string]: string | undefined };
}) {
  

  return <Sleep />;
}