package com.quizplatform.jobs;

import com.quizplatform.application.service.AchievementService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Replaces pg_cron 'evaluate-achievements-nightly'. Delegates to
// AchievementService.evaluateNightly which contains the four rank-based /
// author-based evaluators ported from the original 007_achievements.sql:
// score_top_n, rating_top_n, quiz_attempt_count, quiz_avg_rating.
//
// 02:05 UTC daily — runs five minutes after BonusRecomputeJob.
@Component
public class NightlyAchievementJob {

    private static final Logger log = LoggerFactory.getLogger(NightlyAchievementJob.class);

    private final AchievementService achievements;

    public NightlyAchievementJob(AchievementService achievements) {
        this.achievements = achievements;
    }

    @Scheduled(cron = "0 5 2 * * *", zone = "UTC")
    @SchedulerLock(name = "nightly_achievements", lockAtMostFor = "PT15M", lockAtLeastFor = "PT1M")
    public void run() {
        log.info("NightlyAchievementJob start");
        achievements.evaluateNightly();
        log.info("NightlyAchievementJob end");
    }
}
