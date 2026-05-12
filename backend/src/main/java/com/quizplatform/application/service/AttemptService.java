package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.SubmitAttemptResponse;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Attempt;
import com.quizplatform.domain.Constants.PointEventTypes;
import com.quizplatform.domain.Constants.Points;
import com.quizplatform.domain.answer.Answer;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.infrastructure.persistence.AttemptRepository;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

// POST /api/quizzes/{id}/take. Replaces the enforce_attempt_cap trigger with
// a transactional row-locked check, then grades, awards points, evaluates
// achievements. Mirrors app/api/quizzes/[id]/take/route.ts.
@Service
public class AttemptService {

    private final QuizRepository quizzes;
    private final AttemptRepository attempts;
    private final UserContext userContext;
    private final GradingService grading;
    private final QuizAggregatesService aggregates;
    private final PointsService points;
    private final AchievementService achievements;

    public AttemptService(
        QuizRepository quizzes,
        AttemptRepository attempts,
        UserContext userContext,
        GradingService grading,
        QuizAggregatesService aggregates,
        PointsService points,
        AchievementService achievements
    ) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.userContext = userContext;
        this.grading = grading;
        this.aggregates = aggregates;
        this.points = points;
        this.achievements = achievements;
    }

    @Transactional
    public SubmitAttemptResponse submit(UUID quizId, List<Answer> answers) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();

        var quiz = quizzes.findById(quizId)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new AppException.Conflict("Quiz is not published");
        }

        // Lock existing attempts for this (user, quiz) pair so concurrent submits
        // can't both pass the count check. Replaces enforce_attempt_cap trigger.
        var existing = attempts.lockExisting(quizId, userId);
        if (existing.size() >= 3) {
            throw new AppException.Conflict("Attempt cap of 3 reached for this quiz");
        }

        var graded = grading.grade(quiz, answers);
        var attempt = new Attempt();
        attempt.setId(UUID.randomUUID());
        attempt.setQuizId(quizId);
        attempt.setUserId(userId);
        attempt.setScorePct(graded.scorePct());
        attempt.setCorrectCount(graded.correctCount());
        attempt.setTotalCount(graded.totalCount());
        attempt.setAnswers(answers);
        attempt.setAttemptNumber(existing.size() + 1);
        attempt.setCompletedAt(OffsetDateTime.now());
        attempts.save(attempt);

        aggregates.refresh(quizId);

        // Awards (matches lib/points.ts):
        points.award(userId, PointEventTypes.COMPLETE_ATTEMPT, Points.COMPLETE_ATTEMPT,
            "Completed a quiz", quizId, attempt.getId());

        if (graded.scorePct() >= 80
            && !points.hasEarned(userId, PointEventTypes.SCORE_80_FIRST_TIME, quizId)) {
            points.award(userId, PointEventTypes.SCORE_80_FIRST_TIME, Points.SCORE_80_FIRST_TIME,
                "First-time 80%+ score", quizId, attempt.getId());
        }
        if (graded.scorePct() == 100
            && !points.hasEarned(userId, PointEventTypes.SCORE_100_FIRST_TIME, quizId)) {
            points.award(userId, PointEventTypes.SCORE_100_FIRST_TIME, Points.SCORE_100_FIRST_TIME,
                "First-time 100% score", quizId, attempt.getId());
        }

        var newlyEarned = achievements.evaluateAfterAttempt(
            userId, quizId, attempt.getId(), graded.scorePct());

        return new SubmitAttemptResponse(
            attempt.getId(), attempt.getAttemptNumber(), graded.scorePct(),
            graded.correctCount(), graded.totalCount(), graded.perQuestion(),
            quiz.getQuestions(), newlyEarned);
    }
}
