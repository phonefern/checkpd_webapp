"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PDScreeningForm from "@/app/component/pdform/PDScreeningForm";

function CheckInContent() {
  const searchParams = useSearchParams();
  const thaiid =
    searchParams.get("thaiid") ||
    searchParams.get("patient_thaiid") ||
    "";
  const firstName =
    searchParams.get("firstName") ||
    searchParams.get("first_name") ||
    "";
  const lastName =
    searchParams.get("lastName") ||
    searchParams.get("last_name") ||
    "";
  const gender = searchParams.get("gender") || "";
  const age = searchParams.get("age") || "";
  const next = searchParams.get("next") || undefined;

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <PDScreeningForm
        initialValues={{
          thaiid,
          firstName,
          lastName,
          gender,
          age,
        }}
        redirectTo={next}
      />
    </main>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 bg-gray-100">
          <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
            กำลังโหลด...
          </div>
        </main>
      }
    >
      <CheckInContent />
    </Suspense>
  );
} 