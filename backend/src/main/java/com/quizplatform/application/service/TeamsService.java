package com.quizplatform.application.service;

import com.quizplatform.application.exception.AppException;
import com.quizplatform.config.PlatformProperties;
import com.quizplatform.config.UserContext;
import com.quizplatform.domain.Achievement;
import com.quizplatform.domain.Constants.PlatformSettingKeys;
import com.quizplatform.domain.PlatformSetting;
import com.quizplatform.domain.UserAchievement;
import com.quizplatform.infrastructure.persistence.AchievementRepository;
import com.quizplatform.infrastructure.persistence.AttemptRepository;
import com.quizplatform.infrastructure.persistence.PlatformSettingRepository;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.UserAchievementRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import com.quizplatform.infrastructure.teams.TeamsWebhookClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class TeamsService {

    private final UserContext userContext;
    private final UserAchievementRepository userAchievements;
    private final AchievementRepository achievements;
    private final QuizRepository quizzes;
    private final UserRepository users;
    private final AttemptRepository attempts;
    private final PlatformSettingRepository settings;
    private final TeamsWebhookClient webhook;
    private final PlatformProperties platform;

    public TeamsService(UserContext userContext, UserAchievementRepository userAchievements,
                        AchievementRepository achievements, QuizRepository quizzes,
                        UserRepository users, AttemptRepository attempts,
                        PlatformSettingRepository settings, TeamsWebhookClient webhook,
                        PlatformProperties platform) {
        this.userContext = userContext;
        this.userAchievements = userAchievements;
        this.achievements = achievements;
        this.quizzes = quizzes;
        this.users = users;
        this.attempts = attempts;
        this.settings = settings;
        this.webhook = webhook;
        this.platform = platform;
    }

    @Transactional
    public void share(UUID userAchievementId) {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        var userId = userContext.getUserId();

        UserAchievement ua = userAchievements.findById(userAchievementId)
            .orElseThrow(() -> new AppException.NotFound("Achievement not found"));
        if (!ua.getUserId().equals(userId))
            throw new AppException.NotFound("Achievement not found");
        if (ua.getSharedToTeamsAt() != null)
            throw new AppException.Conflict("Already shared");

        Map<String, String> map = new HashMap<>();
        for (PlatformSetting s : settings.findAllById(java.util.List.of(
            PlatformSettingKeys.TEAMS_WEBHOOK_URL, PlatformSettingKeys.TEAMS_NOTIFY_ENABLED))) {
            map.put(s.getKey(), s.getValue());
        }
        var webhookUrl = map.getOrDefault(PlatformSettingKeys.TEAMS_WEBHOOK_URL, "");
        var enabled = "true".equals(map.getOrDefault(PlatformSettingKeys.TEAMS_NOTIFY_ENABLED, "false"));
        if (!enabled || webhookUrl == null || webhookUrl.isBlank())
            throw new AppException.ServiceUnavailable("Teams integration not configured");

        Achievement ach = achievements.findById(ua.getAchievementId()).orElseThrow();
        var user = users.findById(userId).orElseThrow();
        var quizTitle = ua.getRefQuizId() == null
            ? null
            : quizzes.findById(ua.getRefQuizId()).map(q -> q.getTitle()).orElse(null);

        Integer scorePct = null;
        if (ua.getRefQuizId() != null) {
            // Best score for this quiz; the FE displays it on the card.
            scorePct = attempts.findAll().stream()
                .filter(a -> a.getUserId().equals(userId) && a.getQuizId().equals(ua.getRefQuizId()))
                .map(a -> a.getScorePct())
                .max(Integer::compareTo)
                .orElse(null);
        }

        var card = TeamsCardBuilder.build(
            ach, user.getName(), quizTitle, scorePct,
            user.getTotalPoints(), platform.publicUrl());

        webhook.post(webhookUrl, card);

        ua.setSharedToTeamsAt(OffsetDateTime.now());
        userAchievements.save(ua);
    }
}
