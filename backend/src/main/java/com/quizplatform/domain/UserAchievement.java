package com.quizplatform.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_achievements")
public class UserAchievement {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "achievement_id", nullable = false)
    private UUID achievementId;

    @CreationTimestamp
    @Column(name = "earned_at", nullable = false, updatable = false)
    private OffsetDateTime earnedAt;

    @Column(name = "shared_to_teams_at")
    private OffsetDateTime sharedToTeamsAt;

    @Column(name = "ref_quiz_id")
    private UUID refQuizId;

    @Column(name = "ref_attempt_id")
    private UUID refAttemptId;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getAchievementId() { return achievementId; }
    public void setAchievementId(UUID achievementId) { this.achievementId = achievementId; }
    public OffsetDateTime getEarnedAt() { return earnedAt; }
    public void setEarnedAt(OffsetDateTime earnedAt) { this.earnedAt = earnedAt; }
    public OffsetDateTime getSharedToTeamsAt() { return sharedToTeamsAt; }
    public void setSharedToTeamsAt(OffsetDateTime sharedToTeamsAt) { this.sharedToTeamsAt = sharedToTeamsAt; }
    public UUID getRefQuizId() { return refQuizId; }
    public void setRefQuizId(UUID refQuizId) { this.refQuizId = refQuizId; }
    public UUID getRefAttemptId() { return refAttemptId; }
    public void setRefAttemptId(UUID refAttemptId) { this.refAttemptId = refAttemptId; }
}
