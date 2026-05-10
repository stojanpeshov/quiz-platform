// Shapes returned by the .NET API. Kept manual instead of generated to stay
// in sync with QuizPlatform.Application.Dtos by name; serializer camelCases.

export type Role = "user" | "admin";
export type QuizStatus = "draft" | "published" | "archived";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface QuizSummary {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  authorId: string;
  authorName: string | null;
  questionCount: number;
  avgRating: number;
  ratingCount: number;
  attemptCount: number;
  status: QuizStatus;
  publishedAt: string | null;
}

export interface EarnedAchievement {
  userAchievementId: string;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  cardType: string;
  refQuizId: string | null;
  refAttemptId: string | null;
}
