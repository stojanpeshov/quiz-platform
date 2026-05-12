package com.quizplatform.application.service;

import com.quizplatform.application.dto.MiscDtos.MePointsResponse;
import com.quizplatform.application.dto.MiscDtos.PointEventDto;
import com.quizplatform.application.dto.QuizDtos.AchievementSummary;
import com.quizplatform.application.dto.QuizDtos.QuizRef;
import com.quizplatform.application.dto.QuizDtos.UserAchievementDto;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Achievement;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.User;
import com.quizplatform.infrastructure.persistence.AchievementRepository;
import com.quizplatform.infrastructure.persistence.PointEventRepository;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.UserAchievementRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MeService {

    private static final int PAGE_SIZE = 50;

    private final UserContext userContext;
    private final UserRepository users;
    private final PointEventRepository pointEvents;
    private final UserAchievementRepository userAchievements;
    private final AchievementRepository achievements;
    private final QuizRepository quizzes;

    public MeService(UserContext userContext, UserRepository users,
                     PointEventRepository pointEvents, UserAchievementRepository userAchievements,
                     AchievementRepository achievements, QuizRepository quizzes) {
        this.userContext = userContext;
        this.users = users;
        this.pointEvents = pointEvents;
        this.userAchievements = userAchievements;
        this.achievements = achievements;
        this.quizzes = quizzes;
    }

    @Transactional(readOnly = true)
    public MePointsResponse getMyPoints(int page) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();
        int totalPoints = users.findById(userId).map(User::getTotalPoints).orElse(0);
        var pageable = PageRequest.of(Math.max(0, page - 1), PAGE_SIZE);
        var rows = pointEvents.findByUserIdOrderByCreatedAtDesc(userId, pageable).getContent();
        var dtos = rows.stream().map(e -> new PointEventDto(
            e.getId(), e.getEventType(), e.getPoints(), e.getDescription(),
            e.getRefQuizId(), e.getCreatedAt())).toList();
        return new MePointsResponse(totalPoints, dtos, page);
    }

    @Transactional(readOnly = true)
    public List<UserAchievementDto> getMyAchievements() {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        return loadFor(userContext.getUserId());
    }

    public record UserAchievementsResult(String name, List<UserAchievementDto> achievements) {}

    @Transactional(readOnly = true)
    public UserAchievementsResult getUserAchievements(UUID userId) {
        var name = users.findById(userId).map(User::getName)
            .orElseThrow(() -> new AppException.NotFound("User not found"));
        return new UserAchievementsResult(name, loadFor(userId));
    }

    private List<UserAchievementDto> loadFor(UUID userId) {
        var rows = userAchievements.findForUser(userId);
        if (rows.isEmpty()) return List.of();

        var achIds = rows.stream().map(r -> r.getAchievementId()).distinct().toList();
        Map<UUID, Achievement> achMap = achievements.findAllById(achIds).stream()
            .collect(Collectors.toMap(Achievement::getId, a -> a));

        var quizIds = rows.stream().map(r -> r.getRefQuizId())
            .filter(java.util.Objects::nonNull).distinct().toList();
        Map<UUID, Quiz> quizMap = quizIds.isEmpty()
            ? Map.of()
            : quizzes.findAllById(quizIds).stream().collect(Collectors.toMap(Quiz::getId, q -> q));

        return rows.stream().map(ua -> {
            var ach = achMap.get(ua.getAchievementId());
            var quiz = ua.getRefQuizId() == null ? null : quizMap.get(ua.getRefQuizId());
            return new UserAchievementDto(
                ua.getId(), ua.getEarnedAt(), ua.getSharedToTeamsAt(),
                ua.getRefQuizId(), ua.getRefAttemptId(),
                ach == null ? null : new AchievementSummary(
                    ach.getId(), ach.getName(), ach.getDescription(), ach.getIcon(),
                    ach.getCardType(), ach.getScope(), ach.getConditionType()),
                quiz == null ? null : new QuizRef(quiz.getId(), quiz.getTitle()));
        }).toList();
    }
}
