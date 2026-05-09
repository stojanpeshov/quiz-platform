package com.quizplatform.application.service;

import com.quizplatform.infrastructure.persistence.QuizRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Replaces refresh_quiz_aggregates() and trg_refresh_on_*. Same single UPDATE
// recomputing avg_rating / rating_count / attempt_count / unique_attempter_count.
@Service
public class QuizAggregatesService {

    private final QuizRepository quizzes;
    public QuizAggregatesService(QuizRepository quizzes) { this.quizzes = quizzes; }

    @Transactional
    public void refresh(UUID quizId) { quizzes.refreshAggregates(quizId); }
}
