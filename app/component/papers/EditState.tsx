// ===== 1) ย้ายออกไปไว้ระดับไฟล์ =====
import React, { memo } from "react";
import type { EditScores } from "./types";

// เอาออกมาอยู่นอก ProdromalDetailsSection
export const YearInput = memo(function YearInput({
  label, name, value, onChange, error
}: {
  label: string;
  name: string;
  value: string | number | "";
  onChange: (name: string, val: string) => void;
  error?: string;
}) {
  const inputId = `year-input-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        id={inputId}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(name, e.target.value === "" ? "" : e.target.value)}
        className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-500" : "border-gray-300"}`}
        placeholder="ตัวเลขเท่านั้น"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
});

export const TextInput = memo(function TextInput({
  label, name, value, onChange, error
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, val: string) => void;
  error?: string;
}) {
  const inputId = `text-input-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(name, e.target.value.replace(/[^a-zA-Zก-๙\s]/g, ""))}
        className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-500" : "border-gray-300"}`}
        placeholder="ตัวอักษรเท่านั้น"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
});

export const ScoreInput = memo(function ScoreInput({
  label, name, value, onChange, error
}: {
  label: string;
  name: keyof EditScores;
  value: number | null;
  onChange: (name: keyof EditScores, val: string) => void;
  error?: string;
}) {
  const inputId = `score-input-${name as string}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        id={inputId}
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${error ? "border-red-500" : "border-gray-300"}`}
        placeholder="ตัวเลขเท่านั้น"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
});

export const CheckBox = memo(function CheckBox({
  label, name, checked, onChange
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (name: string, val: boolean) => void;
}) {
  const inputId = `checkbox-${name}`;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(name, e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
      />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
});
