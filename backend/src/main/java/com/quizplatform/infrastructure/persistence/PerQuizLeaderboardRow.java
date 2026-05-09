package com.quizplatform.infrastructure.persistence;

import java.util.UUID;

// Projection for the per_quiz_leaderboard(p_quiz_id) SQL function (V003__leaderboard.sql).
// Spring Data treats classes with a single public constructor as DTO projections.
public record PerQuizLeaderboardRow(
    UUID userId,
    String userName,
    int bestScore,
    int attemptsUsed,
    int rank
) {}
