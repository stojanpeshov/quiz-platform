package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AchievementCardType {
    SCORE_MILESTONE("score_milestone"),
    TOP_PERFORMER("top_performer"),
    COMPLETION_MILESTONE("completion_milestone"),
    QUIZ_PUBLISHED("quiz_published"),
    POINTS_MILESTONE("points_milestone"),
    QUIZ_POPULAR("quiz_popular");

    private final String dbValue;
    AchievementCardType(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static AchievementCardType fromDb(String v) {
        for (var c : values()) if (c.dbValue.equals(v)) return c;
        throw new IllegalArgumentException("Unknown card_type: " + v);
    }
}
