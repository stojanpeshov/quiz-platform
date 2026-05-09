package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum QuizDifficulty {
    BEGINNER("beginner"),
    INTERMEDIATE("intermediate"),
    ADVANCED("advanced");

    private final String dbValue;
    QuizDifficulty(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static QuizDifficulty fromDb(String v) {
        for (var d : values()) if (d.dbValue.equals(v)) return d;
        throw new IllegalArgumentException("Unknown difficulty: " + v);
    }
}
