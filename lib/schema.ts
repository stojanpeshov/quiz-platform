import { z } from "zod";

/**
 * The unified quiz schema.
 * This is the contract employees' LLM outputs must match.
 * Validated on every import (paste JSON) and on every form submit.
 */

const SingleChoiceQuestion = z.object({
  type: z.literal("single_choice"),
  question: z.string().min(3).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string().max(1000).optional(),
}).refine(
  (q) => q.correctAnswer < q.options.length,
  { message: "correctAnswer index out of range", path: ["correctAnswer"] }
);

const MultipleChoiceQuestion = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().min(3).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctAnswers: z.array(z.number().int().nonnegative()).min(1),
  explanation: z.string().max(1000).optional(),
}).refine(
  (q) => q.correctAnswers.every((i) => i < q.options.length),
  { message: "correctAnswers index out of range", path: ["correctAnswers"] }
).refine(
  (q) => new Set(q.correctAnswers).size === q.correctAnswers.length,
  { message: "duplicate indices in correctAnswers", path: ["correctAnswers"] }
);

const TrueFalseQuestion = z.object({
  type: z.literal("true_false"),
  question: z.string().min(3).max(1000),
  correctAnswer: z.boolean(),
  explanation: z.string().max(1000).optional(),
});

const ShortTextQuestion = z.object({
  type: z.literal("short_text"),
  question: z.string().min(3).max(1000),
  correctAnswer: z.string().min(1).max(200),
  explanation: z.string().max(1000).optional(),
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
  questions: z.array(QuestionSchema).min(1).max(50),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

/**
 * Strip correct answers from a quiz before sending to a taker.
 * The client never sees the answer key until they submit.
 */
export function stripAnswers(quiz: Quiz): unknown {
  return {
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((q) => {
      switch (q.type) {
        case "single_choice":
          return { type: q.type, question: q.question, options: q.options };
        case "multiple_choice":
          return { type: q.type, question: q.question, options: q.options };
        case "true_false":
          return { type: q.type, question: q.question };
        case "short_text":
          return { type: q.type, question: q.question };
      }
    }),
  };
}

/**
 * Parse a raw JSON string or object and return a validated Quiz.
 * Throws ZodError on invalid input — the UI should surface the error path.
 */
export function parseQuiz(input: unknown): Quiz {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  return QuizSchema.parse(raw);
}
