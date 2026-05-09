package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AchievementEarnerType {
    SELF("self"),
    QUIZ_AUTHOR("quiz_author");

    private final String dbValue;
    AchievementEarnerType(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static AchievementEarnerType fromDb(String v) {
        for (var t : values()) if (t.dbValue.equals(v)) return t;
        throw new IllegalArgumentException("Unknown earner_type: " + v);
    }
}
