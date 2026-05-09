package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum QuizStatus {
    DRAFT("draft"),
    PUBLISHED("published"),
    ARCHIVED("archived");

    private final String dbValue;
    QuizStatus(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static QuizStatus fromDb(String v) {
        for (var s : values()) if (s.dbValue.equals(v)) return s;
        throw new IllegalArgumentException("Unknown status: " + v);
    }
}
