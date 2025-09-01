"use client";

import React, { useState } from "react";

const questions = [
  "ต้องเบ่งอุจจาระอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "อุจจาระแข็งหรือก้อนนานในการถ่ายอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "มีความรู้สึกว่าอุจจาระไม่หมดอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "มีความรู้สึกว่ามีสิ่งกีดขวางที่ทวารหนัก/ลำไส้ตรงอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "ต้องใช้มือช่วยในการขับถ่ายอย่างน้อย 25% ของการขับถ่ายทั้งหมด (เช่น การใช้มือช่วยดัน การหนุนท้อง)",
  "ขับถ่ายอุจจาระน้อยกว่า 3 ครั้งต่อสัปดาห์ (หากไม่ได้ใช้วิธีอื่นช่วย)",
];

export default function Rome4() {
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(questions.length).fill(null)
  );

  const handleAnswer = (index: number, value: boolean) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const totalScore = answers.filter((a) => a === true).length;

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-6">แบบประเมิน ROME 4</h1>
      <p className="mb-4 text-center">
        ท่านมีอาการดังต่อไปนี้มาเป็นระยะเวลาอย่างน้อย <strong>3 เดือน</strong> หรือไม่
      </p>

      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 w-[70%] text-left">
              อาการ
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center w-[15%]">
              ใช่
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center w-[15%]">
              ไม่ใช่
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-3 py-2">{q}</td>
              <td className="border border-gray-300 text-center">
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === true}
                  onChange={() => handleAnswer(i, true)}
                />
              </td>
              <td className="border border-gray-300 text-center">
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === false}
                  onChange={() => handleAnswer(i, false)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between">
        <p className="font-bold">
          รวมคะแนน:{" "}
          <span className="text-blue-600">{totalScore}</span> / {questions.length}
        </p>
        <p className="font-bold">
          ผลการประเมิน:{" "}
          <span className={totalScore >= 2 ? "text-red-600" : "text-green-600"}>
            {totalScore >= 2
              ? "มีโอกาสเป็นท้องผูกเรื้อรัง"
              : "ปกติ (ไม่มีสัญญาณชัดเจนของท้องผูก)"}
          </span>
        </p>
      </div>
    </div>
  );
}
