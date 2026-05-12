package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AchievementConditionType {
    SCORE_THRESHOLD("score_threshold"),
    SCORE_TOP_N("score_top_n"),
    COMPLETION_COUNT("completion_count"),
    PUBLISH_COUNT("publish_count"),
    POINTS_MILESTONE("points_milestone"),
    QUIZ_ATTEMPT_COUNT("quiz_attempt_count"),
    QUIZ_AVG_RATING("quiz_avg_rating"),
    RATING_TOP_N("rating_top_n");

    private final String dbValue;
    AchievementConditionType(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static AchievementConditionType fromDb(String v) {
        for (var c : values()) if (c.dbValue.equals(v)) return c;
        throw new IllegalArgumentException("Unknown condition_type: " + v);
    }
}
