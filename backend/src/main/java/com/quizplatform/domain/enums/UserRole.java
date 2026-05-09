package com.quizplatform.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

// Persisted as TEXT with a CHECK constraint in 001_initial.sql:
//   role text not null default 'user' check (role in ('user', 'admin'))
public enum UserRole {
    USER("user"),
    ADMIN("admin");

    private final String dbValue;
    UserRole(String dbValue) { this.dbValue = dbValue; }

    @JsonValue
    public String dbValue() { return dbValue; }

    @JsonCreator
    public static UserRole fromDb(String v) {
        for (var r : values()) if (r.dbValue.equals(v)) return r;
        throw new IllegalArgumentException("Unknown role: " + v);
    }
}
