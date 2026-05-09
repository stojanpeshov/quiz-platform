package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AchievementScope {
    GLOBAL("global"),
    PER_QUIZ("per_quiz");

    private final String dbValue;
    AchievementScope(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static AchievementScope fromDb(String v) {
        for (var s : values()) if (s.dbValue.equals(v)) return s;
        throw new IllegalArgumentException("Unknown scope: " + v);
    }
}
