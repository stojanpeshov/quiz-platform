package com.quizplatform.web;

import com.quizplatform.application.dto.MiscDtos.MePointsResponse;
import com.quizplatform.application.dto.QuizDtos.ShareToTeamsRequest;
import com.quizplatform.application.service.MeService;
import com.quizplatform.application.service.TeamsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class MeController {

    private final MeService meService;
    private final TeamsService teamsService;

    public MeController(MeService meService, TeamsService teamsService) {
        this.meService = meService;
        this.teamsService = teamsService;
    }

    // GET /api/me/points?page=
    @GetMapping("/me/points")
    public MePointsResponse myPoints(@RequestParam(required = false) Integer page) {
        return meService.getMyPoints(page == null || page < 1 ? 1 : page);
    }

    // GET /api/me/achievements
    @GetMapping("/me/achievements")
    public Map<String, Object> myAchievements() {
        return Map.of("achievements", meService.getMyAchievements());
    }

    // GET /api/users/{id}/achievements
    @GetMapping("/users/{id}/achievements")
    public Map<String, Object> userAchievements(@PathVariable UUID id) {
        var r = meService.getUserAchievements(id);
        var out = new LinkedHashMap<String, Object>();
        out.put("user", Map.of("id", id, "name", r.name()));
        out.put("achievements", r.achievements());
        return out;
    }

    // POST /api/share/teams
    @PostMapping("/share/teams")
    public Map<String, Object> share(@Valid @RequestBody ShareToTeamsRequest body) {
        teamsService.share(body.userAchievementId());
        return Map.of("ok", true);
    }
}
