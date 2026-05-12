package com.quizplatform.domain;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "bonus_snapshot")
@IdClass(BonusSnapshot.PK.class)
public class BonusSnapshot {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "bonus_type", nullable = false)
    private String bonusType;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getBonusType() { return bonusType; }
    public void setBonusType(String bonusType) { this.bonusType = bonusType; }
    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static class PK implements Serializable {
        private UUID userId;
        private String bonusType;
        public PK() {}
        public PK(UUID userId, String bonusType) { this.userId = userId; this.bonusType = bonusType; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(userId, pk.userId) && Objects.equals(bonusType, pk.bonusType);
        }
        @Override public int hashCode() { return Objects.hash(userId, bonusType); }
    }
}
