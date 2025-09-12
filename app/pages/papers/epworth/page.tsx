// app/pages/papers/epworth/page.tsx
import { supabase } from "@/lib/supabase";
import EpworthForm from "@/app/component/pdform/EpworthForm";

export default function EpworthPage({

}: {
  searchParams: { [key: string]: string | undefined };
}) {
  

  return <EpworthForm />;
}
