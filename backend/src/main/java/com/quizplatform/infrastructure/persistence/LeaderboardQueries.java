package com.quizplatform.infrastructure.persistence;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

// Wraps the per_quiz_leaderboard(?) SQL function. Uses a native query so we can
// keep the function in /db/migrations/003_leaderboard.sql untouched (the
// ranking logic is denser in SQL than LINQ/JPQL).
@Component
public class LeaderboardQueries {

    @PersistenceContext
    private EntityManager em;

    @SuppressWarnings("unchecked")
    public List<PerQuizLeaderboardRow> perQuiz(UUID quizId) {
        var rows = em.createNativeQuery(
            "select user_id, user_name, best_score, attempts_used, rank " +
            "from per_quiz_leaderboard(:quizId)")
            .setParameter("quizId", quizId)
            .getResultList();

        return ((List<Object[]>) rows).stream()
            .map(r -> new PerQuizLeaderboardRow(
                (UUID) r[0],
                (String) r[1],
                ((Number) r[2]).intValue(),
                ((Number) r[3]).intValue(),
                ((Number) r[4]).intValue()))
            .toList();
    }
}
