// app/pages/papers/rome4/page.tsx
import { supabase } from "@/lib/supabase";
import Rome4 from "@/app/component/pdform/Rome4Form";

export default function Rome4Page({

}: {
  searchParams: { [key: string]: string | undefined };
}) {
  

  return <Rome4 />;
}