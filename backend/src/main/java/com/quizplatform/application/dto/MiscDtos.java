package com.quizplatform.application.dto;

import com.quizplatform.domain.enums.QuizDifficulty;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.domain.enums.UserRole;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class MiscDtos {
    private MiscDtos() {}

    public record PointEventDto(
        UUID id, String eventType, int points, String description,
        UUID refQuizId, OffsetDateTime createdAt
    ) {}

    public record MePointsResponse(int totalPoints, List<PointEventDto> events, int page) {}

    // Single shape used by all four leaderboard views; unused fields are null.
    public record LeaderboardRow(
        UUID id,
        String name,
        String title,
        Integer attemptCount,
        BigDecimal avgRating,
        Integer ratingCount,
        Integer totalPoints,
        Integer bestScore,
        Integer attemptsUsed,
        Integer rank
    ) {}

    public record LeaderboardResponse(String view, List<LeaderboardRow> rows) {}

    public record AdminUserDto(
        UUID id, String email, String name, UserRole role,
        int totalPoints, OffsetDateTime createdAt, OffsetDateTime lastLoginAt
    ) {}

    public record UpdateUserRoleRequest(@NotNull UserRole role) {}

    public record AdminStatsResponse(
        long userCount, long quizCount, long publishedQuizCount,
        long attemptCount, long ratingCount, long activeUsers7d,
        List<TopQuiz> topQuizzes, List<TopUser> topUsers
    ) {}

    public record TopQuiz(UUID id, String title, int attemptCount, BigDecimal avgRating) {}
    public record TopUser(UUID id, String name, String email, int totalPoints) {}

    public record AdminSettingsResponse(Map<String, String> settings) {}
    public record UpdateSettingsRequest(@NotNull Map<String, String> settings) {}

    public record AdminQuizListItem(
        UUID id, String title, QuizStatus status, QuizDifficulty difficulty,
        UUID authorId, String authorName, String authorEmail,
        int attemptCount, BigDecimal avgRating,
        OffsetDateTime createdAt, OffsetDateTime publishedAt
    ) {}
}
