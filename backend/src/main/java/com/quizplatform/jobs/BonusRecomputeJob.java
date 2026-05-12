package com.quizplatform.jobs;

import com.quizplatform.application.service.PointsService;
import com.quizplatform.domain.BonusSnapshot;
import com.quizplatform.domain.Constants.BonusTypes;
import com.quizplatform.domain.Constants.PointEventTypes;
import com.quizplatform.infrastructure.persistence.BonusSnapshotRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Replaces the pg_cron 'recompute-bonuses-nightly' job. Same three buckets,
// same delta-only writes against bonus_snapshot — see docs/POINTS.md and the
// original recompute_bonuses() function from the deleted 003_functions.sql.
//
// 02:00 UTC daily. ShedLock guarantees only one replica runs it at a time.
@Component
public class BonusRecomputeJob {

    private static final Logger log = LoggerFactory.getLogger(BonusRecomputeJob.class);

    private final BonusSnapshotRepository snapshots;
    private final PointsService points;

    @PersistenceContext private EntityManager em;

    public BonusRecomputeJob(BonusSnapshotRepository snapshots, PointsService points) {
        this.snapshots = snapshots;
        this.points = points;
    }

    @Scheduled(cron = "0 2 * * * *", zone = "UTC")
    @SchedulerLock(name = "bonus_recompute", lockAtMostFor = "PT30M", lockAtLeastFor = "PT1M")
    @Transactional
    public void run() {
        log.info("BonusRecomputeJob start");
        recomputeOwnerQuality();
        recomputeOwnerPopularity();
        recomputeTopPerformer();
        log.info("BonusRecomputeJob end");
    }

    // 1) Owner quality: avg_rating * rating_count * 2 (min 3 ratings)
    private void recomputeOwnerQuality() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
            select author_id as user_id,
                   coalesce(sum(round(avg_rating * rating_count * 2)), 0)::int as pts
            from quizzes
            where status = 'published' and rating_count >= 3
            group by author_id
            """).getResultList();
        applyDelta(BonusTypes.OWNER_QUALITY, PointEventTypes.OWNER_QUALITY_DELTA,
            rows, "Owner quality bonus recalculated");
    }

    // 2) Owner popularity: sum(attempt_count) for published quizzes
    private void recomputeOwnerPopularity() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
            select author_id as user_id, coalesce(sum(attempt_count), 0)::int as pts
            from quizzes where status = 'published'
            group by author_id
            """).getResultList();
        applyDelta(BonusTypes.OWNER_POPULARITY, PointEventTypes.OWNER_POPULARITY_DELTA,
            rows, "Owner popularity bonus recalculated");
    }

    // 3) Top-performer: top 5 per quiz (min 5 unique attempters); 25/15/10/5/3.
    //    Done in SQL because window functions over a derived best_per_user are
    //    much cleaner that way than via JPQL.
    private void recomputeTopPerformer() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
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
              where q.status = 'published' and q.unique_attempter_count >= 5
            )
            select user_id, sum(
              case rnk when 1 then 25 when 2 then 15 when 3 then 10 when 4 then 5 when 5 then 3 else 0 end
            )::int as pts
            from ranked
            where rnk <= 5
            group by user_id
            """).getResultList();
        applyDelta(BonusTypes.TOP_PERFORMER, PointEventTypes.TOP_PERFORMER_DELTA,
            rows, "Top-performer bonus recalculated");
    }

    private void applyDelta(String bonusType, String eventType,
                            List<Object[]> rows, String descriptionPrefix) {
        Map<UUID, Integer> snapshot = new HashMap<>();
        for (BonusSnapshot s : snapshots.findByBonusType(bonusType)) {
            snapshot.put(s.getUserId(), s.getPoints());
        }

        for (Object[] r : rows) {
            UUID userId = (UUID) r[0];
            int newPts = ((Number) r[1]).intValue();
            int oldPts = snapshot.getOrDefault(userId, 0);
            int delta = newPts - oldPts;
            if (delta == 0) continue;

            points.award(userId, eventType, delta,
                String.format("%s (%d → %d)", descriptionPrefix, oldPts, newPts), null, null);

            em.createNativeQuery("""
                insert into bonus_snapshot (user_id, bonus_type, points)
                values (:uid, :bt, :pts)
                on conflict (user_id, bonus_type) do update
                  set points = excluded.points, updated_at = now()
                """)
                .setParameter("uid", userId)
                .setParameter("bt", bonusType)
                .setParameter("pts", newPts)
                .executeUpdate();

            // Suppress unused-warning on import
            if (false) { OffsetDateTime.now(); }
        }
    }
}
