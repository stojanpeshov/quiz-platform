package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.*;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.application.validation.QuestionListValidator;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.User;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.domain.question.PublicQuestion;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class QuizService {

    private final QuizRepository quizzes;
    private final UserRepository users;
    private final UserContext userContext;
    private final RatingService ratings;

    public QuizService(QuizRepository quizzes, UserRepository users,
                       UserContext userContext, RatingService ratings) {
        this.quizzes = quizzes; this.users = users;
        this.userContext = userContext; this.ratings = ratings;
    }

    @Transactional(readOnly = true)
    public List<QuizSummary> list(String sort, boolean mine, boolean excludeMine) {
        var userId = userContext.getUserId();
        List<Quiz> rows;
        if (mine) {
            rows = quizzes.findOwn(userId);
        } else {
            rows = switch (sort == null ? "" : sort) {
                case "rated" -> quizzes.listPublishedTopRated();
                case "popular" -> quizzes.listPublishedMostTaken();
                default -> quizzes.listPublishedRecent();
            };
            if (excludeMine && userId != null) {
                rows = rows.stream().filter(q -> !q.getAuthorId().equals(userId)).toList();
            }
        }

        var authorIds = rows.stream().map(Quiz::getAuthorId).distinct().toList();
        Map<UUID, String> nameById = users.findAllById(authorIds).stream()
            .collect(java.util.stream.Collectors.toMap(User::getId, User::getName));

        return rows.stream().map(q -> new QuizSummary(
            q.getId(), q.getTitle(), q.getDescription(), q.getDifficulty(),
            q.getAuthorId(), nameById.get(q.getAuthorId()),
            q.getQuestionCount(), q.getAvgRating(), q.getRatingCount(),
            q.getAttemptCount(), q.getStatus(), q.getPublishedAt())).toList();
    }

    public record GetResult(QuizDetail detail, QuizPublic pub, Short myRating) {}

    @Transactional(readOnly = true)
    public GetResult get(UUID id) {
        var userId = userContext.getUserId();
        var quiz = quizzes.findById(id).orElse(null);
        if (quiz == null) return new GetResult(null, null, null);

        // Drafts visible only to author/admin.
        if (quiz.getStatus() == QuizStatus.DRAFT
            && !quiz.getAuthorId().equals(userId)
            && !userContext.isAdmin()) {
            return new GetResult(null, null, null);
        }

        boolean isOwnerOrAdmin = quiz.getAuthorId().equals(userId) || userContext.isAdmin();
        var myRating = ratings.getMyRating(id);
        var authorName = users.findById(quiz.getAuthorId()).map(User::getName).orElse(null);

        if (isOwnerOrAdmin) {
            return new GetResult(new QuizDetail(
                quiz.getId(), quiz.getAuthorId(), authorName, quiz.getTitle(), quiz.getDescription(),
                quiz.getDifficulty(), quiz.getQuestions(), quiz.getQuestionCount(), quiz.getStatus(),
                quiz.getAvgRating(), quiz.getRatingCount(), quiz.getAttemptCount(),
                quiz.getUniqueAttempterCount(), quiz.getParentQuizId(),
                quiz.getCreatedAt(), quiz.getPublishedAt(), quiz.getArchivedAt()),
                null, myRating);
        }

        var stripped = quiz.getQuestions().stream().map(PublicQuestion::from).toList();
        return new GetResult(null, new QuizPublic(
            quiz.getId(), quiz.getAuthorId(), authorName, quiz.getTitle(), quiz.getDescription(),
            quiz.getDifficulty(), stripped, quiz.getQuestionCount(), quiz.getStatus(),
            quiz.getAvgRating(), quiz.getRatingCount(), quiz.getAttemptCount(), quiz.getPublishedAt()),
            myRating);
    }

    @Transactional
    public UUID create(QuizPayload payload) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        QuestionListValidator.validate(payload.questions());

        var quiz = new Quiz();
        quiz.setId(UUID.randomUUID());
        quiz.setAuthorId(userContext.getUserId());
        quiz.setTitle(payload.title());
        quiz.setDescription(payload.description());
        quiz.setDifficulty(payload.difficulty());
        quiz.setQuestions(payload.questions());
        quiz.setQuestionCount(payload.questions().size());
        quiz.setStatus(QuizStatus.DRAFT);
        quiz.setCreatedAt(OffsetDateTime.now());
        quizzes.save(quiz);
        return quiz.getId();
    }

    @Transactional
    public void update(UUID id, QuizPayload payload) {
        var quiz = quizzes.findById(id)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        if (!quiz.getAuthorId().equals(userContext.getUserId()) && !userContext.isAdmin())
            throw new AppException.Forbidden();
        if (quiz.getStatus() != QuizStatus.DRAFT)
            throw new AppException.Conflict("Published quizzes are immutable; unpublish to edit.");

        QuestionListValidator.validate(payload.questions());
        quiz.setTitle(payload.title());
        quiz.setDescription(payload.description());
        quiz.setDifficulty(payload.difficulty());
        quiz.setQuestions(payload.questions());
        quiz.setQuestionCount(payload.questions().size());
        quizzes.save(quiz);
    }

    @Transactional
    public void delete(UUID id) {
        var quiz = quizzes.findById(id)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        if (!quiz.getAuthorId().equals(userContext.getUserId()) && !userContext.isAdmin())
            throw new AppException.Forbidden();
        quizzes.delete(quiz);
    }

    @SuppressWarnings("unused")
    private static final Comparator<Quiz> BY_RECENT =
        Comparator.<Quiz, OffsetDateTime>comparing(
            q -> q.getPublishedAt() != null ? q.getPublishedAt() : q.getCreatedAt()).reversed();
}
