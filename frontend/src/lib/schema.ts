import { z } from "zod";

// Verbatim port of the project's lib/schema.ts. The FE Zod schema is the
// first line of validation (FE forms) and feeds the same JSON the BE
// FluentValidation validators check. Keep in sync with QuizValidators.cs.

const SingleChoiceQuestion = z.object({
  type: z.literal("single_choice"),
  question: z.string().min(3).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string().max(1000).nullish(),
}).refine(
  (q) => q.correctAnswer < q.options.length,
  { message: "correctAnswer index out of range", path: ["correctAnswer"] },
);

const MultipleChoiceQuestion = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().min(3).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctAnswers: z.array(z.number().int().nonnegative()).min(1),
  explanation: z.string().max(1000).nullish(),
}).refine(
  (q) => q.correctAnswers.every((i) => i < q.options.length),
  { message: "correctAnswers index out of range", path: ["correctAnswers"] },
).refine(
  (q) => new Set(q.correctAnswers).size === q.correctAnswers.length,
  { message: "duplicate indices in correctAnswers", path: ["correctAnswers"] },
);

const TrueFalseQuestion = z.object({
  type: z.literal("true_false"),
  question: z.string().min(3).max(1000),
  correctAnswer: z.boolean(),
  explanation: z.string().max(1000).nullish(),
});

const ShortTextQuestion = z.object({
  type: z.literal("short_text"),
  question: z.string().min(3).max(1000),
  correctAnswer: z.string().min(1).max(200),
  explanation: z.string().max(1000).nullish(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ShortTextQuestion,
]);

export const QuizSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  questions: z.array(QuestionSchema).min(1).max(50),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

export type Answer =
  | { type: "single_choice"; value: number }
  | { type: "multiple_choice"; value: number[] }
  | { type: "true_false"; value: boolean }
  | { type: "short_text"; value: string };

export function parseQuiz(input: unknown): Quiz {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  return QuizSchema.parse(raw);
}
