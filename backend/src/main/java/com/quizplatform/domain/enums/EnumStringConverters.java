package com.quizplatform.domain.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// JPA converters for the snake_case TEXT columns (role, status, difficulty,
// condition_type, scope, earner_type, card_type). Each enum has @JsonValue /
// @JsonCreator for the wire format; these classes do the same job for the DB.

public final class EnumStringConverters {
    private EnumStringConverters() {}

    @Converter(autoApply = true)
    public static class UserRoleConverter implements AttributeConverter<UserRole, String> {
        public String convertToDatabaseColumn(UserRole r) { return r == null ? null : r.dbValue(); }
        public UserRole convertToEntityAttribute(String v) { return v == null ? null : UserRole.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class QuizStatusConverter implements AttributeConverter<QuizStatus, String> {
        public String convertToDatabaseColumn(QuizStatus s) { return s == null ? null : s.dbValue(); }
        public QuizStatus convertToEntityAttribute(String v) { return v == null ? null : QuizStatus.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class QuizDifficultyConverter implements AttributeConverter<QuizDifficulty, String> {
        public String convertToDatabaseColumn(QuizDifficulty d) { return d == null ? null : d.dbValue(); }
        public QuizDifficulty convertToEntityAttribute(String v) { return v == null ? null : QuizDifficulty.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class AchievementConditionTypeConverter implements AttributeConverter<AchievementConditionType, String> {
        public String convertToDatabaseColumn(AchievementConditionType c) { return c == null ? null : c.dbValue(); }
        public AchievementConditionType convertToEntityAttribute(String v) { return v == null ? null : AchievementConditionType.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class AchievementScopeConverter implements AttributeConverter<AchievementScope, String> {
        public String convertToDatabaseColumn(AchievementScope s) { return s == null ? null : s.dbValue(); }
        public AchievementScope convertToEntityAttribute(String v) { return v == null ? null : AchievementScope.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class AchievementEarnerTypeConverter implements AttributeConverter<AchievementEarnerType, String> {
        public String convertToDatabaseColumn(AchievementEarnerType t) { return t == null ? null : t.dbValue(); }
        public AchievementEarnerType convertToEntityAttribute(String v) { return v == null ? null : AchievementEarnerType.fromDb(v); }
    }

    @Converter(autoApply = true)
    public static class AchievementCardTypeConverter implements AttributeConverter<AchievementCardType, String> {
        public String convertToDatabaseColumn(AchievementCardType c) { return c == null ? null : c.dbValue(); }
        public AchievementCardType convertToEntityAttribute(String v) { return v == null ? null : AchievementCardType.fromDb(v); }
    }
}
