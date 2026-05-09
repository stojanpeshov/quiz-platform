package com.quizplatform.application.service;

import com.quizplatform.application.dto.MiscDtos.LeaderboardResponse;
import com.quizplatform.application.dto.MiscDtos.LeaderboardRow;
import com.quizplatform.domain.Quiz;
import com.quizplatform.infrastructure.persistence.LeaderboardQueries;
import com.quizplatform.infrastructure.persistence.QuizRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class LeaderboardService {

    private final QuizRepository quizzes;
    private final UserRepository users;
    private final LeaderboardQueries perQuiz;

    public LeaderboardService(QuizRepository quizzes, UserRepository users, LeaderboardQueries perQuiz) {
        this.quizzes = quizzes; this.users = users; this.perQuiz = perQuiz;
    }

    @Transactional(readOnly = true)
    public LeaderboardResponse get(String view, UUID quizId) {
        return switch (view == null ? "global" : view) {
            case "best_rated" -> {
                var rows = quizzes.listPublishedTopRated().stream()
                    .filter(q -> q.getRatingCount() >= 3)
                    .limit(20)
                    .map(this::quizToRow)
                    .toList();
                yield new LeaderboardResponse("best_rated", rows);
            }
            case "most_taken" -> {
                var rows = quizzes.listPublishedMostTaken().stream()
                    .limit(20)
                    .map(this::quizToRow)
                    .toList();
                yield new LeaderboardResponse("most_taken", rows);
            }
            case "global" -> {
                var rows = users.findAll().stream()
                    .sorted((a, b) -> Integer.compare(b.getTotalPoints(), a.getTotalPoints()))
                    .limit(50)
                    .map(u -> new LeaderboardRow(
                        u.getId(), u.getName(), null, null, null, null, u.getTotalPoints(), null, null, null))
                    .toList();
                yield new LeaderboardResponse("global", rows);
            }
            case "per_quiz" -> {
                if (quizId == null) yield new LeaderboardResponse("per_quiz", List.of());
                var rows = perQuiz.perQuiz(quizId).stream()
                    .map(r -> new LeaderboardRow(
                        r.userId(), r.userName(), null, null, null, null, null,
                        r.bestScore(), r.attemptsUsed(), r.rank()))
                    .toList();
                yield new LeaderboardResponse("per_quiz", rows);
            }
            default -> new LeaderboardResponse(view, List.of());
        };
    }

    private LeaderboardRow quizToRow(Quiz q) {
        return new LeaderboardRow(
            q.getId(), null, q.getTitle(), q.getAttemptCount(), q.getAvgRating(),
            q.getRatingCount(), null, null, null, null);
    }
}
