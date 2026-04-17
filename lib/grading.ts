import type { Quiz, Question } from "./schema";

export type Answer =
  | { type: "single_choice"; value: number }
  | { type: "multiple_choice"; value: number[] }
  | { type: "true_false"; value: boolean }
  | { type: "short_text"; value: string };

export type GradedResult = {
  correctCount: number;
  totalCount: number;
  scorePct: number;
  perQuestion: Array<{ correct: boolean; expected: unknown }>;
};

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function gradeQuestion(q: Question, a: Answer | undefined): boolean {
  if (!a || a.type !== q.type) return false;
  switch (q.type) {
    case "single_choice":
      return a.type === "single_choice" && a.value === q.correctAnswer;
    case "multiple_choice": {
      if (a.type !== "multiple_choice") return false;
      const expected = new Set(q.correctAnswers);
      const given = new Set(a.value);
      if (expected.size !== given.size) return false;
      for (const v of expected) if (!given.has(v)) return false;
      return true;
    }
    case "true_false":
      return a.type === "true_false" && a.value === q.correctAnswer;
    case "short_text":
      return (
        a.type === "short_text" &&
        normalizeText(a.value) === normalizeText(q.correctAnswer)
      );
  }
}

export function gradeQuiz(quiz: Quiz, answers: Answer[]): GradedResult {
  const perQuestion = quiz.questions.map((q, i) => {
    const correct = gradeQuestion(q, answers[i]);
    const expected =
      q.type === "multiple_choice"
        ? q.correctAnswers
        : "correctAnswer" in q
        ? q.correctAnswer
        : null;
    return { correct, expected };
  });
  const correctCount = perQuestion.filter((r) => r.correct).length;
  const totalCount = quiz.questions.length;
  const scorePct = Math.round((correctCount / totalCount) * 100);
  return { correctCount, totalCount, scorePct, perQuestion };
}
