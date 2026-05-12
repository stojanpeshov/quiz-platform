package com.quizplatform.web;

import com.quizplatform.application.dto.QuizDtos.*;
import com.quizplatform.application.service.AttemptService;
import com.quizplatform.application.service.PublishService;
import com.quizplatform.application.service.QuizService;
import com.quizplatform.application.service.RatingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;
    private final AttemptService attemptService;
    private final PublishService publishService;
    private final RatingService ratingService;

    public QuizController(QuizService quizService, AttemptService attemptService,
                          PublishService publishService, RatingService ratingService) {
        this.quizService = quizService;
        this.attemptService = attemptService;
        this.publishService = publishService;
        this.ratingService = ratingService;
    }

    // GET /api/quizzes
    @GetMapping
    public Map<String, Object> list(
        @RequestParam(required = false) String sort,
        @RequestParam(required = false) Integer mine,
        @RequestParam(required = false) Integer excludeMine
    ) {
        var rows = quizService.list(sort, mine != null && mine == 1,
            excludeMine != null && excludeMine == 1);
        return Map.of("quizzes", rows);
    }

    // POST /api/quizzes
    @PostMapping
    public ResponseEntity<Map<String, UUID>> create(@Valid @RequestBody CreateQuizRequest body) {
        var id = quizService.create(body.quiz());
        return ResponseEntity.created(URI.create("/api/quizzes/" + id))
            .body(Map.of("id", id));
    }

    // GET /api/quizzes/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        var r = quizService.get(id);
        if (r.detail() == null && r.pub() == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Not found"));
        }
        Object quiz = r.detail() != null ? r.detail() : r.pub();
        return ResponseEntity.ok(java.util.Collections.unmodifiableMap(
            new java.util.LinkedHashMap<String, Object>() {{
                put("quiz", quiz);
                put("myRating", r.myRating());
            }}));
    }

    // PATCH /api/quizzes/{id}
    @PatchMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable UUID id,
                                        @Valid @RequestBody UpdateQuizRequest body) {
        quizService.update(id, body.quiz());
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/quizzes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        quizService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // POST /api/quizzes/{id}/take
    @PostMapping("/{id}/take")
    public SubmitAttemptResponse take(@PathVariable UUID id,
                                      @Valid @RequestBody SubmitAttemptRequest body) {
        return attemptService.submit(id, body.answers());
    }

    // POST /api/quizzes/{id}/publish
    @PostMapping("/{id}/publish")
    public PublishResponse publish(@PathVariable UUID id) { return publishService.publish(id); }

    // POST /api/quizzes/{id}/unpublish
    @PostMapping("/{id}/unpublish")
    public UnpublishResponse unpublish(@PathVariable UUID id) { return publishService.unpublish(id); }

    // POST /api/quizzes/{id}/rate
    @PostMapping("/{id}/rate")
    public RateResponse rate(@PathVariable UUID id, @Valid @RequestBody RateRequest body) {
        return ratingService.rate(id, body.stars());
    }

    @SuppressWarnings("unused")
    private static final List<?> _ignored = List.of(); // silences the var-args nag
}
