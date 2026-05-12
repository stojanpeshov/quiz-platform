package com.quizplatform.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.quizplatform.application.dto.MiscDtos.AdminQuizListItem;
import com.quizplatform.application.dto.MiscDtos.AdminSettingsResponse;
import com.quizplatform.application.dto.MiscDtos.AdminStatsResponse;
import com.quizplatform.application.dto.MiscDtos.AdminUserDto;
import com.quizplatform.application.dto.MiscDtos.PointEventDto;
import com.quizplatform.application.dto.MiscDtos.TopQuiz;
import com.quizplatform.application.dto.MiscDtos.TopUser;
import com.quizplatform.application.dto.QuizDtos.AchievementDto;
import com.quizplatform.application.dto.QuizDtos.CreateAchievementRequest;
import com.quizplatform.application.dto.QuizDtos.UpdateAchievementRequest;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.domain.Achievement;
import com.quizplatform.domain.Constants.PlatformSettingKeys;
import com.quizplatform.domain.PlatformSetting;
import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.User;
import com.quizplatform.domain.enums.QuizStatus;
import com.quizplatform.domain.enums.UserRole;
import com.quizplatform.infrastructure.persistence.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminService {

    private static final Set<String> ALLOWED_SETTING_KEYS = Set.of(
        PlatformSettingKeys.TEAMS_WEBHOOK_URL, PlatformSettingKeys.TEAMS_NOTIFY_ENABLED);

    private final QuizRepository quizzes;
    private final UserRepository users;
    private final AchievementRepository achievements;
    private final UserAchievementRepository userAchievements;
    private final PlatformSettingRepository settings;
    private final PointEventRepository pointEvents;
    private final AttemptRepository attempts;
    private final RatingRepository ratings;

    @PersistenceContext private EntityManager em;

    public AdminService(QuizRepository quizzes, UserRepository users,
                        AchievementRepository achievements,
                        UserAchievementRepository userAchievements,
                        PlatformSettingRepository settings,
                        PointEventRepository pointEvents,
                        AttemptRepository attempts,
                        RatingRepository ratings) {
        this.quizzes = quizzes; this.users = users; this.achievements = achievements;
        this.userAchievements = userAchievements; this.settings = settings;
        this.pointEvents = pointEvents; this.attempts = attempts; this.ratings = ratings;
    }

    @Transactional(readOnly = true)
    public List<AdminQuizListItem> listQuizzes() {
        var rows = quizzes.findAll(PageRequest.of(0, 500,
            org.springframework.data.domain.Sort.by("createdAt").descending())).getContent();
        Map<UUID, User> authors = byId(users.findAllById(
            rows.stream().map(Quiz::getAuthorId).distinct().toList()));
        return rows.stream().map(q -> {
            var u = authors.get(q.getAuthorId());
            return new AdminQuizListItem(
                q.getId(), q.getTitle(), q.getStatus(), q.getDifficulty(),
                q.getAuthorId(), u == null ? null : u.getName(),
                u == null ? null : u.getEmail(),
                q.getAttemptCount(), q.getAvgRating(),
                q.getCreatedAt(), q.getPublishedAt());
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> listUsers(String q) {
        var rows = users.search(q == null ? "" : q);
        return rows.stream().limit(200).map(u -> new AdminUserDto(
            u.getId(), u.getEmail(), u.getName(), u.getRole(),
            u.getTotalPoints(), u.getCreatedAt(), u.getLastLoginAt())).toList();
    }

    @Transactional
    public void updateUserRole(UUID id, UserRole role) {
        var u = users.findById(id).orElseThrow(() -> new AppException.NotFound("User not found"));
        if (u.getRole() == UserRole.ADMIN && role != UserRole.ADMIN) {
            long admins = users.countByRole(UserRole.ADMIN);
            if (admins <= 1) throw new AppException.Conflict("Cannot demote the last admin");
        }
        u.setRole(role);
        users.save(u);
    }

    @Transactional(readOnly = true)
    public List<AchievementDto> listAchievements() {
        return achievements.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional
    public AchievementDto createAchievement(CreateAchievementRequest req) {
        var a = new Achievement();
        a.setId(UUID.randomUUID());
        a.setName(req.name());
        a.setDescription(req.description());
        a.setIcon(req.icon());
        a.setConditionType(req.conditionType());
        a.setConditionValue(req.conditionValue());
        a.setScope(req.scope());
        a.setEarnerType(req.earnerType());
        a.setCardType(req.cardType());
        a.setActive(true);
        a.setCreatedAt(OffsetDateTime.now());
        achievements.save(a);
        return toDto(a);
    }

    @Transactional
    public AchievementDto updateAchievement(UUID id, UpdateAchievementRequest req) {
        var a = achievements.findById(id)
            .orElseThrow(() -> new AppException.NotFound("Achievement not found"));
        if (req.name() != null) a.setName(req.name());
        if (req.description() != null) a.setDescription(req.description());
        if (req.icon() != null) a.setIcon(req.icon());
        if (req.conditionType() != null) a.setConditionType(req.conditionType());
        if (req.conditionValue() != null) a.setConditionValue(req.conditionValue());
        if (req.scope() != null) a.setScope(req.scope());
        if (req.earnerType() != null) a.setEarnerType(req.earnerType());
        if (req.cardType() != null) a.setCardType(req.cardType());
        if (req.active() != null) a.setActive(req.active());
        achievements.save(a);
        return toDto(a);
    }

    @Transactional
    public void deleteAchievement(UUID id) {
        if (userAchievements.existsByAchievementId(id)) {
            throw new AppException.Conflict(
                "Cannot delete: users have already earned this achievement. Deactivate it instead.");
        }
        achievements.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<PointEventDto> listEvents(UUID userId, String eventType, int page) {
        var pageable = PageRequest.of(Math.max(0, page - 1), 100);
        return pointEvents.adminSearch(userId, eventType, pageable).getContent().stream()
            .map(e -> new PointEventDto(e.getId(), e.getEventType(), e.getPoints(),
                e.getDescription(), e.getRefQuizId(), e.getCreatedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public AdminSettingsResponse getSettings() {
        Map<String, String> map = new java.util.HashMap<>();
        for (PlatformSetting s : settings.findAll()) map.put(s.getKey(), s.getValue());
        return new AdminSettingsResponse(map);
    }

    @Transactional
    public void updateSettings(Map<String, String> incoming) {
        for (var entry : incoming.entrySet()) {
            if (!ALLOWED_SETTING_KEYS.contains(entry.getKey())) continue;
            var existing = settings.findById(entry.getKey()).orElseGet(() -> {
                var s = new PlatformSetting(); s.setKey(entry.getKey()); return s;
            });
            existing.setValue(entry.getValue());
            settings.save(existing);
        }
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long userCount = users.count();
        long quizCount = quizzes.count();
        long publishedQuizCount = quizzes.countByStatus(QuizStatus.PUBLISHED);
        long attemptCount = attempts.count();
        long ratingCount = ratings.count();

        var since = OffsetDateTime.now().minusDays(7);
        var activeUsers = (Number) em.createNativeQuery("""
            select count(distinct user_id) from attempts where completed_at >= :since
            """).setParameter("since", since).getSingleResult();

        var topQuizzes = quizzes.listPublishedMostTaken().stream().limit(10)
            .map(q -> new TopQuiz(q.getId(), q.getTitle(), q.getAttemptCount(), q.getAvgRating()))
            .toList();

        var topUsers = users.findAll().stream()
            .sorted((a, b) -> Integer.compare(b.getTotalPoints(), a.getTotalPoints()))
            .limit(10)
            .map(u -> new TopUser(u.getId(), u.getName(), u.getEmail(), u.getTotalPoints()))
            .toList();

        return new AdminStatsResponse(userCount, quizCount, publishedQuizCount,
            attemptCount, ratingCount, activeUsers.longValue(), topQuizzes, topUsers);
    }

    @Transactional(readOnly = true)
    public String exportCsv() {
        // Cap at 10k rows like the C# export. Two-step join via id-set lookups
        // is more efficient than N+1 queries.
        var rows = attempts.findAll(PageRequest.of(0, 10_000,
            org.springframework.data.domain.Sort.by("completedAt").descending())).getContent();

        var userIds = rows.stream().map(a -> a.getUserId()).distinct().toList();
        var quizIds = rows.stream().map(a -> a.getQuizId()).distinct().toList();
        Map<UUID, User> userMap = byId(users.findAllById(userIds));
        Map<UUID, Quiz> quizMap = byIdQ(quizzes.findAllById(quizIds));

        var sb = new StringWriter();
        sb.write("attempt_id,user_email,user_name,quiz_title,attempt_number,score_pct,correct,total,completed_at\n");
        for (var a : rows) {
            var u = userMap.get(a.getUserId());
            var q = quizMap.get(a.getQuizId());
            sb.write(esc(a.getId().toString())); sb.write(',');
            sb.write(esc(u == null ? "" : u.getEmail())); sb.write(',');
            sb.write(esc(u == null ? "" : u.getName())); sb.write(',');
            sb.write(esc(q == null ? "" : q.getTitle())); sb.write(',');
            sb.write(String.valueOf(a.getAttemptNumber())); sb.write(',');
            sb.write(String.valueOf(a.getScorePct())); sb.write(',');
            sb.write(String.valueOf(a.getCorrectCount())); sb.write(',');
            sb.write(String.valueOf(a.getTotalCount())); sb.write(',');
            sb.write(a.getCompletedAt().toString());
            sb.write('\n');
        }
        return sb.toString();
    }

    private AchievementDto toDto(Achievement a) {
        return new AchievementDto(
            a.getId(), a.getName(), a.getDescription(), a.getIcon(),
            a.getConditionType(), a.getConditionValue(),
            a.getScope(), a.getEarnerType(), a.getCardType(),
            a.isActive(), a.getCreatedAt());
    }

    private static Map<UUID, User> byId(Collection<User> us) {
        var m = new java.util.HashMap<UUID, User>();
        for (var u : us) m.put(u.getId(), u);
        return m;
    }
    private static Map<UUID, Quiz> byIdQ(Collection<Quiz> qs) {
        var m = new java.util.HashMap<UUID, Quiz>();
        for (var q : qs) m.put(q.getId(), q);
        return m;
    }
    private static String esc(String s) {
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    @SuppressWarnings("unused")
    private static final class _Unused { JsonNode unusedJsonNodeRef; List<UUID> unused; HashSet<UUID> unusedSet; ArrayList<UUID> unused2; }
}
