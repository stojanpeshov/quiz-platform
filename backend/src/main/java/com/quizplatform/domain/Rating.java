package com.quizplatform.domain;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "ratings")
@IdClass(Rating.PK.class)
public class Rating {

    @Id
    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "stars", nullable = false)
    private short stars;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getQuizId() { return quizId; }
    public void setQuizId(UUID quizId) { this.quizId = quizId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public short getStars() { return stars; }
    public void setStars(short stars) { this.stars = stars; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static class PK implements Serializable {
        private UUID quizId;
        private UUID userId;
        public PK() {}
        public PK(UUID quizId, UUID userId) { this.quizId = quizId; this.userId = userId; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(quizId, pk.quizId) && Objects.equals(userId, pk.userId);
        }
        @Override public int hashCode() { return Objects.hash(quizId, userId); }
    }
}
