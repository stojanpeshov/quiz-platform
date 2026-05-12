package com.quizplatform.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.quizplatform.domain.enums.*;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "achievements")
public class Achievement {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "icon", nullable = false)
    private String icon;

    @Column(name = "condition_type", nullable = false)
    private AchievementConditionType conditionType;

    // JSONB; values vary by condition_type:
    //   {"n": 5}            → completion_count, publish_count, score_top_n, quiz_attempt_count, rating_top_n
    //   {"min_pct": 80}     → score_threshold
    //   {"points": 100}     → points_milestone
    //   {"min_rating": 4.5} → quiz_avg_rating
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "condition_value", nullable = false, columnDefinition = "jsonb")
    private JsonNode conditionValue;

    @Column(name = "scope", nullable = false)
    private AchievementScope scope = AchievementScope.GLOBAL;

    @Column(name = "earner_type", nullable = false)
    private AchievementEarnerType earnerType = AchievementEarnerType.SELF;

    @Column(name = "card_type", nullable = false)
    private AchievementCardType cardType;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public AchievementConditionType getConditionType() { return conditionType; }
    public void setConditionType(AchievementConditionType conditionType) { this.conditionType = conditionType; }
    public JsonNode getConditionValue() { return conditionValue; }
    public void setConditionValue(JsonNode conditionValue) { this.conditionValue = conditionValue; }
    public AchievementScope getScope() { return scope; }
    public void setScope(AchievementScope scope) { this.scope = scope; }
    public AchievementEarnerType getEarnerType() { return earnerType; }
    public void setEarnerType(AchievementEarnerType earnerType) { this.earnerType = earnerType; }
    public AchievementCardType getCardType() { return cardType; }
    public void setCardType(AchievementCardType cardType) { this.cardType = cardType; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
