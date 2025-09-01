"use client";

import Link from "next/link";

export default function PapersPage() {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">เลือกแบบสอบถาม</h1>
      <div className="flex flex-col gap-4">
        <Link
          href="/pages/papers/check-in"
          className="px-4 py-3 bg-pink-600 text-white rounded-lg text-center hover:bg-green-700"
        >
          Check-In
        </Link>
        <Link
          href="/pages/papers/rome4"
          className="px-4 py-3 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700"
        >
          แบบสอบถาม ROME 4
        </Link>
        <Link
          href="/pages/papers/epworth"
          className="px-4 py-3 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
        >
          Epworth Sleepiness Scale
        </Link>
        <Link
          href="/pages/papers/ham-d"
          className="px-4 py-3 bg-red-600 text-white rounded-lg text-center hover:bg-red-700"
        >
          Hamilton Depression Scale
        </Link>
        <Link
          href="/pages/papers/sleep"
          className="px-4 py-3 bg-yellow-600 text-white rounded-lg text-center hover:bg-yellow-700"
        >
          Sleep Disorders Questionnaire
        </Link>
        <Link
          href="/pages/papers/smell"
          className="px-4 py-3 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700"
        >
          Smell Disorders Questionnaire
        </Link>
      </div>
    </div>
  );
}
