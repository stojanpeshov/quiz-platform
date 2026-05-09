package com.quizplatform.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "point_events")
public class PointEvent {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "ref_quiz_id")
    private UUID refQuizId;

    @Column(name = "ref_attempt_id")
    private UUID refAttemptId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UUID getRefQuizId() { return refQuizId; }
    public void setRefQuizId(UUID refQuizId) { this.refQuizId = refQuizId; }
    public UUID getRefAttemptId() { return refAttemptId; }
    public void setRefAttemptId(UUID refAttemptId) { this.refAttemptId = refAttemptId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
