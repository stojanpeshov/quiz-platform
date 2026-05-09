package com.quizplatform.domain;

import com.quizplatform.domain.enums.QuizDifficulty;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.domain.question.Question;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
public class Quiz {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", nullable = false)
    private String description = "";

    // JSONB column carrying the polymorphic Question array.
    // Hibernate 6's @JdbcTypeCode(SqlTypes.JSON) handles the type-mapping;
    // Jackson handles the discriminator. The CHECK constraint lives in the
    // FE Zod schema and the BE Bean Validation rules; the DB just stores text.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "questions", nullable = false, columnDefinition = "jsonb")
    private List<Question> questions = new ArrayList<>();

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "status", nullable = false)
    private QuizStatus status = QuizStatus.DRAFT;

    @Column(name = "difficulty", nullable = false)
    private QuizDifficulty difficulty = QuizDifficulty.INTERMEDIATE;

    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount = 0;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "unique_attempter_count", nullable = false)
    private int uniqueAttempterCount = 0;

    @Column(name = "parent_quiz_id")
    private UUID parentQuizId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "archived_at")
    private OffsetDateTime archivedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }
    public QuizStatus getStatus() { return status; }
    public void setStatus(QuizStatus status) { this.status = status; }
    public QuizDifficulty getDifficulty() { return difficulty; }
    public void setDifficulty(QuizDifficulty difficulty) { this.difficulty = difficulty; }
    public BigDecimal getAvgRating() { return avgRating; }
    public void setAvgRating(BigDecimal avgRating) { this.avgRating = avgRating; }
    public int getRatingCount() { return ratingCount; }
    public void setRatingCount(int ratingCount) { this.ratingCount = ratingCount; }
    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }
    public int getUniqueAttempterCount() { return uniqueAttempterCount; }
    public void setUniqueAttempterCount(int uniqueAttempterCount) { this.uniqueAttempterCount = uniqueAttempterCount; }
    public UUID getParentQuizId() { return parentQuizId; }
    public void setParentQuizId(UUID parentQuizId) { this.parentQuizId = parentQuizId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime publishedAt) { this.publishedAt = publishedAt; }
    public OffsetDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(OffsetDateTime archivedAt) { this.archivedAt = archivedAt; }
}
