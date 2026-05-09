package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.RateResponse;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Constants.PointEventTypes;
import com.quizplatform.domain.Constants.Points;
import com.quizplatform.domain.Rating;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.infrastructure.persistence.AttemptRepository;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.RatingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class RatingService {

    private final QuizRepository quizzes;
    private final RatingRepository ratings;
    private final AttemptRepository attempts;
    private final UserContext userContext;
    private final QuizAggregatesService aggregates;
    private final PointsService points;
    private final AchievementService achievements;

    public RatingService(
        QuizRepository quizzes, RatingRepository ratings, AttemptRepository attempts,
        UserContext userContext, QuizAggregatesService aggregates,
        PointsService points, AchievementService achievements
    ) {
        this.quizzes = quizzes; this.ratings = ratings; this.attempts = attempts;
        this.userContext = userContext; this.aggregates = aggregates;
        this.points = points; this.achievements = achievements;
    }

    @Transactional(readOnly = true)
    public Short getMyRating(UUID quizId) {
        if (!userContext.isAuthenticated()) return null;
        return ratings.findByQuizIdAndUserId(quizId, userContext.getUserId())
            .map(Rating::getStars).orElse(null);
    }

    @Transactional
    public RateResponse rate(UUID quizId, int stars) {
        if (stars < 1 || stars > 5) throw new AppException.BadRequest("stars must be 1..5");
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();

        var quiz = quizzes.findById(quizId)
            .orElseThrow(() -> new AppException.NotFound("Quiz not found"));
        if (quiz.getStatus() != QuizStatus.PUBLISHED)
            throw new AppException.Conflict("Quiz is not published");
        if (quiz.getAuthorId().equals(userId))
            throw new AppException.Conflict("Cannot rate your own quiz");
        if (!attempts.existsByQuizIdAndUserId(quizId, userId))
            throw new AppException.Conflict("Must attempt the quiz before rating");

        var existing = ratings.findByQuizIdAndUserId(quizId, userId).orElse(null);
        boolean firstTime = existing == null;
        if (existing == null) {
            var r = new Rating();
            r.setQuizId(quizId);
            r.setUserId(userId);
            r.setStars((short) stars);
            r.setCreatedAt(OffsetDateTime.now());
            r.setUpdatedAt(OffsetDateTime.now());
            ratings.save(r);
        } else {
            existing.setStars((short) stars);
            existing.setUpdatedAt(OffsetDateTime.now());
            ratings.save(existing);
        }

        aggregates.refresh(quizId);

        if (firstTime) {
            points.award(userId, PointEventTypes.RATE_QUIZ, Points.RATE_QUIZ,
                "Rated a quiz", quizId, null);
        }

        var newlyEarned = achievements.evaluateAfterRating(userId);
        return new RateResponse(true, newlyEarned);
    }
}
