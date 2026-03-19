"use client";

import React from "react";

export type MocaOption = {
  label: string;
  score: number;
};

export type MocaItem = {
  id: number;
  section: string;
  title: string;
  instruction: string;
  image?: string;
  max: number;
  options: MocaOption[];
  type?: "score" | "practice";
};


export default function MocaCard({
  item,
  value,
  onChange,
}: {
  item: MocaItem;
  value: number;
  onChange: (score: number) => void;
}) {
  const isPractice = item.type === "practice";

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">

      {/* Section */}
      <div className="text-xs text-slate-400 font-semibold mb-1">
        {item.section}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base mb-2">
        {item.title}
      </h3>

      {/* Image */}
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="w-full max-w-sm mx-auto mb-3"
        />
      )}

      {/* Instruction */}
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        {item.instruction}
      </p>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {item.options.map((opt, idx) => {
          const selected = isPractice
            ? value === idx
            : value === opt.score;

          return (
            <button
              key={idx}
              onClick={() =>
                onChange(isPractice ? idx : opt.score)
              }
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition
                ${
                  selected
                    ? "bg-blue-500 text-white border-emerald-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

    </div>
  );
}
