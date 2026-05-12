package com.quizplatform.application.service;

import com.quizplatform.application.dto.QuizDtos.EarnedAchievementDto;
import com.quizplatform.domain.Achievement;
import com.quizplatform.domain.UserAchievement;
import com.quizplatform.domain.enums.AchievementConditionType;
import com.quizplatform.domain.enums.AchievementScope;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.infrastructure.persistence.AchievementRepository;
import com.quizplatform.infrastructure.persistence.AttemptRepository;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.UserAchievementRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Real-time port of lib/achievements.ts (evaluateAfterAttempt / Publish / Rating).
// Nightly evaluators (score_top_n, rating_top_n, quiz_attempt_count, quiz_avg_rating)
// live on this same service and are called by NightlyAchievementJob.
@Service
public class AchievementService {

    private static final List<AchievementConditionType> REALTIME_TYPES = List.of(
        AchievementConditionType.SCORE_THRESHOLD,
        AchievementConditionType.COMPLETION_COUNT,
        AchievementConditionType.PUBLISH_COUNT,
        AchievementConditionType.POINTS_MILESTONE);

    private final AchievementRepository achievements;
    private final UserAchievementRepository userAchievements;
    private final UserRepository users;
    private final AttemptRepository attempts;
    private final QuizRepository quizzes;

    @PersistenceContext
    private EntityManager em;

    public AchievementService(
        AchievementRepository achievements,
        UserAchievementRepository userAchievements,
        UserRepository users,
        AttemptRepository attempts,
        QuizRepository quizzes
    ) {
        this.achievements = achievements;
        this.userAchievements = userAchievements;
        this.users = users;
        this.attempts = attempts;
        this.quizzes = quizzes;
    }

    @Transactional
    public List<EarnedAchievementDto> evaluateAfterAttempt(UUID userId, UUID quizId, UUID attemptId, int scorePct) {
        var defs = achievements.findByActiveTrueAndConditionTypeIn(REALTIME_TYPES);
        if (defs.isEmpty()) return List.of();

        long totalCompletions = attempts.countByUserId(userId);
        int totalPoints = users.findById(userId).map(u -> u.getTotalPoints()).orElse(0);

        var earned = new ArrayList<EarnedAchievementDto>();
        for (var ach : defs) {
            boolean met = false;
            UUID refQuizId = null;
            switch (ach.getConditionType()) {
                case SCORE_THRESHOLD -> {
                    met = scorePct >= ach.getConditionValue().get("min_pct").asInt();
                    refQuizId = ach.getScope() == AchievementScope.PER_QUIZ ? quizId : null;
                }
                case COMPLETION_COUNT -> met = totalCompletions >= ach.getConditionValue().get("n").asInt();
                case POINTS_MILESTONE -> met = totalPoints >= ach.getConditionValue().get("points").asInt();
                default -> {}
            }
            if (!met) continue;
            var newId = tryInsert(userId, ach.getId(), refQuizId, attemptId);
            if (newId == null) continue;
            earned.add(toDto(ach, newId, refQuizId, attemptId));
        }
        return earned;
    }

    @Transactional
    public List<EarnedAchievementDto> evaluateAfterPublish(UUID userId, UUID quizId) {
        var defs = achievements.findByActiveTrueAndConditionTypeIn(List.of(
            AchievementConditionType.PUBLISH_COUNT,
            AchievementConditionType.POINTS_MILESTONE));
        if (defs.isEmpty()) return List.of();

        long publishedCount = quizzes.countByAuthorIdAndStatus(userId, QuizStatus.PUBLISHED);
        int totalPoints = users.findById(userId).map(u -> u.getTotalPoints()).orElse(0);

        var earned = new ArrayList<EarnedAchievementDto>();
        for (var ach : defs) {
            boolean met = switch (ach.getConditionType()) {
                case PUBLISH_COUNT -> publishedCount >= ach.getConditionValue().get("n").asInt();
                case POINTS_MILESTONE -> totalPoints >= ach.getConditionValue().get("points").asInt();
                default -> false;
            };
            if (!met) continue;
            var newId = tryInsert(userId, ach.getId(), null, null);
            if (newId == null) continue;
            earned.add(toDto(ach, newId, null, null));
            // unused-warning suppression for quizId — kept on signature to mirror lib/achievements.ts
            if (false) System.out.print(quizId);
        }
        return earned;
    }

    @Transactional
    public List<EarnedAchievementDto> evaluateAfterRating(UUID userId) {
        var defs = achievements.findByActiveTrueAndConditionType(AchievementConditionType.POINTS_MILESTONE);
        if (defs.isEmpty()) return List.of();

        int totalPoints = users.findById(userId).map(u -> u.getTotalPoints()).orElse(0);
        var earned = new ArrayList<EarnedAchievementDto>();
        for (var ach : defs) {
            if (totalPoints < ach.getConditionValue().get("points").asInt()) continue;
            var newId = tryInsert(userId, ach.getId(), null, null);
            if (newId == null) continue;
            earned.add(toDto(ach, newId, null, null));
        }
        return earned;
    }

    @Transactional
    public void evaluateNightly() {
        // Each block mirrors evaluate_nightly_achievements() from the original
        // 007_achievements.sql migration. ON CONFLICT DO NOTHING combined with
        // ua_global_unique / ua_per_quiz_unique gives idempotent inserts.

        // ---------------- score_top_n ----------------
        for (var ach : achievements.findByActiveTrueAndConditionType(AchievementConditionType.SCORE_TOP_N)) {
            int n = ach.getConditionValue().get("n").asInt();
            em.createNativeQuery("""
                with best_per_user as (
                  select quiz_id, user_id,
                         max(score_pct) as best_score,
                         count(*) as attempts_used
                  from attempts group by quiz_id, user_id
                ),
                ranked as (
                  select b.quiz_id, b.user_id,
                         row_number() over (
                           partition by b.quiz_id
                           order by b.best_score desc, b.attempts_used asc
                         ) as rnk
                  from best_per_user b
                  join quizzes q on q.id = b.quiz_id
                  where q.status = 'published'
                )
                insert into user_achievements (user_id, achievement_id, ref_quiz_id)
                select user_id, :achId, quiz_id
                from ranked
                where rnk <= :n
                on conflict do nothing
                """)
                .setParameter("achId", ach.getId())
                .setParameter("n", n)
                .executeUpdate();
        }

        // ---------------- rating_top_n ----------------
        for (var ach : achievements.findByActiveTrueAndConditionType(AchievementConditionType.RATING_TOP_N)) {
            int n = ach.getConditionValue().get("n").asInt();
            em.createNativeQuery("""
                with ranked as (
                  select id as quiz_id, author_id as user_id,
                         row_number() over (order by avg_rating desc, rating_count desc) as rnk
                  from quizzes
                  where status = 'published' and rating_count >= 3
                )
                insert into user_achievements (user_id, achievement_id, ref_quiz_id)
                select user_id, :achId, quiz_id
                from ranked
                where rnk <= :n
                on conflict do nothing
                """)
                .setParameter("achId", ach.getId())
                .setParameter("n", n)
                .executeUpdate();
        }

        // ---------------- quiz_attempt_count ----------------
        for (var ach : achievements.findByActiveTrueAndConditionType(AchievementConditionType.QUIZ_ATTEMPT_COUNT)) {
            int n = ach.getConditionValue().get("n").asInt();
            em.createNativeQuery("""
                insert into user_achievements (user_id, achievement_id, ref_quiz_id)
                select author_id, :achId, id
                from quizzes
                where status = 'published' and attempt_count >= :n
                on conflict do nothing
                """)
                .setParameter("achId", ach.getId())
                .setParameter("n", n)
                .executeUpdate();
        }

        // ---------------- quiz_avg_rating ----------------
        for (var ach : achievements.findByActiveTrueAndConditionType(AchievementConditionType.QUIZ_AVG_RATING)) {
            var minRating = ach.getConditionValue().get("min_rating").decimalValue();
            em.createNativeQuery("""
                insert into user_achievements (user_id, achievement_id, ref_quiz_id)
                select author_id, :achId, id
                from quizzes
                where status = 'published' and rating_count >= 3 and avg_rating >= :minRating
                on conflict do nothing
                """)
                .setParameter("achId", ach.getId())
                .setParameter("minRating", minRating)
                .executeUpdate();
        }
    }

    // Insert via ON CONFLICT DO NOTHING; if a row was inserted return its id,
    // otherwise null (already earned). The unique partial indexes from
    // 004_achievements.sql give us "global = once per user" / "per_quiz = once
    // per (user, quiz)".
    private UUID tryInsert(UUID userId, UUID achievementId, UUID refQuizId, UUID refAttemptId) {
        var newId = UUID.randomUUID();
        var ua = new UserAchievement();
        ua.setId(newId);
        ua.setUserId(userId);
        ua.setAchievementId(achievementId);
        ua.setRefQuizId(refQuizId);
        ua.setRefAttemptId(refAttemptId);
        try {
            // We use the raw ON CONFLICT path so the partial indexes do their job;
            // saveAndFlush would translate the unique-violation into an exception.
            int rows = userAchievements.insertIfAbsent(newId, userId, achievementId, refQuizId, refAttemptId);
            return rows == 1 ? newId : null;
        } catch (org.springframework.dao.DataIntegrityViolationException ignore) {
            return null;
        }
    }

    private static EarnedAchievementDto toDto(Achievement ach, UUID userAchievementId, UUID refQuizId, UUID refAttemptId) {
        return new EarnedAchievementDto(
            userAchievementId, ach.getId(), ach.getName(), ach.getDescription(), ach.getIcon(),
            ach.getCardType(), refQuizId, refAttemptId);
    }
}
