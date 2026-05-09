package com.quizplatform.web;

import com.quizplatform.application.dto.MiscDtos.*;
import com.quizplatform.application.dto.QuizDtos.AchievementDto;
import com.quizplatform.application.dto.QuizDtos.CreateAchievementRequest;
import com.quizplatform.application.dto.QuizDtos.UpdateAchievementRequest;
import com.quizplatform.application.exception.AppException;
import com.quizplatform.application.service.AdminService;
import com.quizplatform.config.UserContext;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

// All endpoints under /api/admin require an authenticated admin. The model is
// "ApplicationUser is admin if its DB row's role = ADMIN" — populated into
// UserContext by JwtToUserContextFilter. Each method first verifies the role.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;
    private final UserContext userContext;

    public AdminController(AdminService admin, UserContext userContext) {
        this.admin = admin;
        this.userContext = userContext;
    }

    private void ensureAdmin() {
        if (!userContext.isAuthenticated()) throw new AppException.Unauthorized();
        if (!userContext.isAdmin()) throw new AppException.Forbidden();
    }

    @GetMapping("/quizzes")
    public Map<String, Object> quizzes() { ensureAdmin(); return Map.of("quizzes", admin.listQuizzes()); }

    @GetMapping("/users")
    public Map<String, Object> users(@RequestParam(required = false) String q) {
        ensureAdmin();
        return Map.of("users", admin.listUsers(q));
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<Void> setRole(@PathVariable UUID id,
                                        @Valid @RequestBody UpdateUserRoleRequest body) {
        ensureAdmin();
        admin.updateUserRole(id, body.role());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/achievements")
    public Map<String, Object> achievements() {
        ensureAdmin();
        return Map.of("achievements", admin.listAchievements());
    }

    @PostMapping("/achievements")
    public ResponseEntity<Map<String, AchievementDto>> createAchievement(
        @Valid @RequestBody CreateAchievementRequest body) {
        ensureAdmin();
        return ResponseEntity.status(201).body(Map.of("achievement", admin.createAchievement(body)));
    }

    @PatchMapping("/achievements/{id}")
    public Map<String, AchievementDto> updateAchievement(
        @PathVariable UUID id, @RequestBody UpdateAchievementRequest body) {
        ensureAdmin();
        return Map.of("achievement", admin.updateAchievement(id, body));
    }

    @DeleteMapping("/achievements/{id}")
    public ResponseEntity<Void> deleteAchievement(@PathVariable UUID id) {
        ensureAdmin();
        admin.deleteAchievement(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events")
    public Map<String, Object> events(
        @RequestParam(required = false) UUID userId,
        @RequestParam(required = false) String eventType,
        @RequestParam(required = false) Integer page
    ) {
        ensureAdmin();
        return Map.of("events", admin.listEvents(userId, eventType, page == null || page < 1 ? 1 : page));
    }

    @GetMapping("/settings")
    public AdminSettingsResponse getSettings() { ensureAdmin(); return admin.getSettings(); }

    @PatchMapping("/settings")
    public ResponseEntity<Void> updateSettings(@Valid @RequestBody UpdateSettingsRequest body) {
        ensureAdmin();
        admin.updateSettings(body.settings());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() { ensureAdmin(); return admin.getStats(); }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export() {
        ensureAdmin();
        var csv = admin.exportCsv().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attempts.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv);
    }
}
