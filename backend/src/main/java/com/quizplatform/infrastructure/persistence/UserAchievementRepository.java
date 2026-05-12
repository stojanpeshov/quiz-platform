package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, UUID> {

    boolean existsByAchievementId(UUID achievementId);

    @Query("""
        select ua from UserAchievement ua
        where ua.userId = :userId
        order by ua.earnedAt desc
        """)
    List<UserAchievement> findForUser(@Param("userId") UUID userId);

    /**
     * Insert (user, achievement, refQuizId, refAttemptId) using ON CONFLICT DO NOTHING
     * so the partial unique indexes (ua_global_unique / ua_per_quiz_unique) make
     * duplicate inserts a silent no-op. Returns the inserted id, or null if skipped.
     */
    @Modifying
    @Query(value = """
        insert into user_achievements (id, user_id, achievement_id, ref_quiz_id, ref_attempt_id)
        values (:id, :userId, :achievementId, :refQuizId, :refAttemptId)
        on conflict do nothing
        """, nativeQuery = true)
    int insertIfAbsent(
        @Param("id") UUID id,
        @Param("userId") UUID userId,
        @Param("achievementId") UUID achievementId,
        @Param("refQuizId") UUID refQuizId,
        @Param("refAttemptId") UUID refAttemptId);
}
