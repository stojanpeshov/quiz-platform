package com.quizplatform.application.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.quizplatform.domain.answer.Answer;
import com.quizplatform.domain.enums.*;
import com.quizplatform.domain.question.PublicQuestion;
import com.quizplatform.domain.question.Question;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

// Wire payloads. Field names match the JSON the FE already consumes.
// Spring's auto-configured ObjectMapper produces lowerCamelCase by default.
public final class QuizDtos {
    private QuizDtos() {}

    // GET /api/quizzes — list summaries
    public record QuizSummary(
        UUID id,
        String title,
        String description,
        QuizDifficulty difficulty,
        UUID authorId,
        String authorName,
        int questionCount,
        BigDecimal avgRating,
        int ratingCount,
        int attemptCount,
        QuizStatus status,
        OffsetDateTime publishedAt
    ) {}

    // GET /api/quizzes/{id} for owners/admins
    public record QuizDetail(
        UUID id,
        UUID authorId,
        String authorName,
        String title,
        String description,
        QuizDifficulty difficulty,
        List<Question> questions,
        int questionCount,
        QuizStatus status,
        BigDecimal avgRating,
        int ratingCount,
        int attemptCount,
        int uniqueAttempterCount,
        UUID parentQuizId,
        OffsetDateTime createdAt,
        OffsetDateTime publishedAt,
        OffsetDateTime archivedAt
    ) {}

    // GET /api/quizzes/{id} for non-owners (answers stripped)
    public record QuizPublic(
        UUID id,
        UUID authorId,
        String authorName,
        String title,
        String description,
        QuizDifficulty difficulty,
        List<PublicQuestion> questions,
        int questionCount,
        QuizStatus status,
        BigDecimal avgRating,
        int ratingCount,
        int attemptCount,
        OffsetDateTime publishedAt
    ) {}

    public record CreateQuizRequest(@Valid @NotNull QuizPayload quiz) {}
    public record UpdateQuizRequest(@Valid @NotNull QuizPayload quiz) {}

    // Mirrors QuizSchema in lib/schema.ts. The polymorphic Question array is
    // validated by a custom @AssertTrue in com.quizplatform.application.validation.
    public record QuizPayload(
        @NotBlank @Size(min = 3, max = 120) String title,
        @NotNull @Size(max = 500) String description,
        @NotNull QuizDifficulty difficulty,
        @NotNull @Size(min = 1, max = 50) List<Question> questions
    ) {}

    public record SubmitAttemptRequest(@NotNull List<Answer> answers) {}

    public record SubmitAttemptResponse(
        UUID attemptId,
        int attemptNumber,
        int score,
        int correctCount,
        int totalCount,
        List<PerQuestionResult> perQuestion,
        List<Question> questions,
        List<EarnedAchievementDto> newlyEarned
    ) {}

    public record PerQuestionResult(boolean correct, Object expected) {}

    public record RateRequest(@Min(1) @Max(5) int stars) {}
    public record RateResponse(boolean ok, List<EarnedAchievementDto> newlyEarned) {}
    public record PublishResponse(boolean ok, List<EarnedAchievementDto> newlyEarned) {}
    public record UnpublishResponse(UUID newDraftId) {}

    // -- achievement subset returned with newlyEarned --
    public record EarnedAchievementDto(
        UUID userAchievementId,
        UUID achievementId,
        String name,
        String description,
        String icon,
        AchievementCardType cardType,
        UUID refQuizId,
        UUID refAttemptId
    ) {}

    public record AchievementDto(
        UUID id,
        String name,
        String description,
        String icon,
        AchievementConditionType conditionType,
        JsonNode conditionValue,
        AchievementScope scope,
        AchievementEarnerType earnerType,
        AchievementCardType cardType,
        boolean active,
        OffsetDateTime createdAt
    ) {}

    public record CreateAchievementRequest(
        @NotBlank String name,
        @NotBlank String description,
        @NotBlank String icon,
        @NotNull AchievementConditionType conditionType,
        @NotNull JsonNode conditionValue,
        @NotNull AchievementScope scope,
        @NotNull AchievementEarnerType earnerType,
        @NotNull AchievementCardType cardType
    ) {}

    public record UpdateAchievementRequest(
        String name,
        String description,
        String icon,
        AchievementConditionType conditionType,
        JsonNode conditionValue,
        AchievementScope scope,
        AchievementEarnerType earnerType,
        AchievementCardType cardType,
        Boolean active
    ) {}

    public record UserAchievementDto(
        UUID id,
        OffsetDateTime earnedAt,
        OffsetDateTime sharedToTeamsAt,
        UUID refQuizId,
        UUID refAttemptId,
        AchievementSummary achievement,
        QuizRef quiz
    ) {}

    public record AchievementSummary(
        UUID id, String name, String description, String icon,
        AchievementCardType cardType, AchievementScope scope, AchievementConditionType conditionType
    ) {}

    public record QuizRef(UUID id, String title) {}

    public record ShareToTeamsRequest(@NotNull UUID userAchievementId) {}
}
