// app/pages/papers/smell/page.tsx
import { supabase } from "@/lib/supabase";
import Smell from "@/app/component/pdform/SmellForm";

export default function SmellPage({

}: {
  searchParams: { [key: string]: string | undefined };
}) {
  

  return <Smell />;
}