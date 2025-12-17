// interfaces/question.ts
export interface Question {
  id: number;
  text: string;
  image?: string;
}

export interface Answer {
  questionId: number;
  value: number; // 1 = yes, 0 = no
}