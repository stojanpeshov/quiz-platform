package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.PublishResponse;
import com.quizplatform.application.dto.QuizDtos.UnpublishResponse;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Constants.PointEventTypes;
import com.quizplatform.domain.Constants.Points;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class PublishService {

    private final QuizRepository quizzes;
    private final UserContext userContext;
    private final PointsService points;
    private final AchievementService achievements;

    public PublishService(QuizRepository quizzes, UserContext userContext,
                          PointsService points, AchievementService achievements) {
        this.quizzes = quizzes; this.userContext = userContext;
        this.points = points; this.achievements = achievements;
    }

    @Transactional
    public PublishResponse publish(UUID quizId) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();

        var quiz = quizzes.findById(quizId)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (!quiz.getAuthorId().equals(userId) && !userContext.isAdmin())
            throw new AppException.Forbidden();
        if (quiz.getStatus() != QuizStatus.DRAFT)
            throw new AppException.Conflict("Only drafts can be published");

        // Award PUBLISH_QUIZ once per quiz (matches existing first-time semantics).
        boolean already = points.hasEarned(quiz.getAuthorId(), PointEventTypes.PUBLISH_QUIZ, quizId);

        quiz.setStatus(QuizStatus.PUBLISHED);
        quiz.setPublishedAt(OffsetDateTime.now());
        quizzes.save(quiz);

        if (!already) {
            points.award(quiz.getAuthorId(), PointEventTypes.PUBLISH_QUIZ, Points.PUBLISH_QUIZ,
                "Published a quiz", quizId, null);
        }

        var newlyEarned = achievements.evaluateAfterPublish(quiz.getAuthorId(), quizId);
        return new PublishResponse(true, newlyEarned);
    }

    @Transactional
    public UnpublishResponse unpublish(UUID quizId) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();

        var quiz = quizzes.findById(quizId)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (!quiz.getAuthorId().equals(userId) && !userContext.isAdmin())
            throw new AppException.Forbidden();
        if (quiz.getStatus() != QuizStatus.PUBLISHED)
            throw new AppException.Conflict("Only published quizzes can be unpublished");

        quiz.setStatus(QuizStatus.ARCHIVED);
        quiz.setArchivedAt(OffsetDateTime.now());
        quizzes.save(quiz);

        var draft = new Quiz();
        draft.setId(UUID.randomUUID());
        draft.setAuthorId(quiz.getAuthorId());
        draft.setTitle(quiz.getTitle());
        draft.setDescription(quiz.getDescription());
        draft.setDifficulty(quiz.getDifficulty());
        draft.setQuestions(quiz.getQuestions());
        draft.setQuestionCount(quiz.getQuestionCount());
        draft.setStatus(QuizStatus.DRAFT);
        draft.setParentQuizId(quiz.getId());
        draft.setCreatedAt(OffsetDateTime.now());
        quizzes.save(draft);

        return new UnpublishResponse(draft.getId());
    }
}
