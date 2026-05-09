package com.quizplatform.web;

import com.quizplatform.application.dto.MiscDtos.LeaderboardResponse;
import com.quizplatform.application.service.LeaderboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {

    private final LeaderboardService leaderboards;
    public LeaderboardController(LeaderboardService leaderboards) { this.leaderboards = leaderboards; }

    @GetMapping
    public LeaderboardResponse get(
        @RequestParam(required = false) String view,
        @RequestParam(required = false) UUID quizId
    ) {
        return leaderboards.get(view, quizId);
    }
}
