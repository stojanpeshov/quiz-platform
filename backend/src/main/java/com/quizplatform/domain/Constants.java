package com.quizplatform.domain;

// Mirrors lib/points.ts POINTS constants (immediate award amounts) and the
// event-type / bonus-type / platform-setting key strings used across the app.
// Nightly bonus amounts (25/15/10/5/3 for top-performer ranks) are formulas,
// so they live in BonusRecomputeJob next to the SQL.
public final class Constants {
    private Constants() {}

    public static final class Points {
        public static final int PUBLISH_QUIZ = 20;
        public static final int COMPLETE_ATTEMPT = 5;
        public static final int SCORE_80_FIRST_TIME = 10;
        public static final int SCORE_100_FIRST_TIME = 15;
        public static final int RATE_QUIZ = 1;
    }

    public static final class PointEventTypes {
        // Immediate
        public static final String PUBLISH_QUIZ = "publish_quiz";
        public static final String COMPLETE_ATTEMPT = "complete_attempt";
        public static final String SCORE_80_FIRST_TIME = "score_80_first_time";
        public static final String SCORE_100_FIRST_TIME = "score_100_first_time";
        public static final String RATE_QUIZ = "rate_quiz";
        // Nightly delta events
        public static final String OWNER_QUALITY_DELTA = "owner_quality_delta";
        public static final String OWNER_POPULARITY_DELTA = "owner_popularity_delta";
        public static final String TOP_PERFORMER_DELTA = "top_performer_delta";
    }

    public static final class BonusTypes {
        public static final String OWNER_QUALITY = "owner_quality";
        public static final String OWNER_POPULARITY = "owner_popularity";
        public static final String TOP_PERFORMER = "top_performer";
    }

    public static final class PlatformSettingKeys {
        public static final String TEAMS_WEBHOOK_URL = "teams_webhook_url";
        public static final String TEAMS_NOTIFY_ENABLED = "teams_notify_enabled";
    }
}
