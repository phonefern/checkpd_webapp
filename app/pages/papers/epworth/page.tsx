"use client";

import React, { useState } from "react";

const questions = [
  "1. ขณะนั่งอ่านหนังสือ",
  "2. ขณะดูโทรทัศน์",
  "3. ขณะนั่งเฉยๆ นอกบ้าน ในที่สาธารณะ เช่น ในห้องสมุด หรือโรงภาพยนตร์",
  "4. ขณะนั่งเป็นผู้โดยสารในรถหรือไฟ เครื่องบิน ติดต่อกันเป็นเวลานาน",
  "5. ขณะนั่งเงียบๆ หลังรับประทานอาหารกลางวัน โดยไม่ได้ดื่ม เครื่องดื่มแอลกอฮอล์",
  "6. ขณะนั่งเอนหลังพักผ่อนช่วงบ่ายตามโอกาส",
  "7. ขณะขับรถ (หรือยานพาหนะอื่น) แล้วรถ (หรือยานพาหนะอื่น) ต้องหยุดนิ่ง 2-3 นาทีตามจังหวะการจราจร",
];

export default function Epworth() {
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));

  const handleAnswer = (index: number, value: number) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const totalScore = answers.reduce((acc, val) => acc + val, 0);

  let result = "ปกติ";
  if (totalScore >= 7 && totalScore <= 9) {
    result = "มีแนวโน้มง่วงผิดปกติ";
  } else if (totalScore > 9) {
    result = "ผิดปกติขั้นต้น";
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-4">
        แบบทดสอบวัดระดับความผิดปกติของการหายใจขณะนอนหลับ 
      </h1>
      <h1 className="text-xl font-semibold text-center mb-4">Epworth sleepiness scale</h1>
      <p className="mb-4 text-center">
        <strong>คำชี้แจง</strong>: ในสถานการณ์ต่างๆ ดังต่อไปนี้ ท่านมีโอกาสงีบหลับ หรือเผลอหลับ โดยที่ไม่ได้รู้สึกอ่อนเพลียมาก หรือน้อยเพียงใด อยู่ในระดับที่รุนแรงหรือไม่</p>
      <p className="mb-4 text-center">
        (0= ไม่เคยเลย, 1 = มีโอกาสเล็กน้อย, 2 = มีโอกาสปานกลาง, 3= มีโอกาสสูงมาก)
      </p>
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 w-[70%] text-left">
              สถานการณ์
            </th>
            {[0, 1, 2, 3].map((score) => (
              <th
                key={score}
                className="border border-gray-300 px-3 py-2 text-center w-[8%]"
              >
                {score}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-3 py-2">{q}</td>
              {[0, 1, 2, 3].map((score) => (
                <td key={score} className="border border-gray-300 text-center">
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === score}
                    onChange={() => handleAnswer(i, score)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between">
        <p className="font-bold">
          รวมคะแนน:{" "}
          <span className="text-blue-600">{totalScore}</span> / {questions.length * 3}
        </p>
        <p className="font-bold">
          ผลการประเมิน:{" "}
          <span
            className={
              totalScore > 9
                ? "text-red-600"
                : totalScore >= 7
                ? "text-orange-600"
                : "text-green-600"
            }
          >
            {result}
          </span>
        </p>
      </div>
    </div>
  );
}
