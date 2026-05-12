package com.quizplatform.application.service;

import com.quizplatform.domain.PointEvent;
import com.quizplatform.infrastructure.persistence.PointEventRepository;
import com.quizplatform.infrastructure.persistence.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

// Replaces the SQL `award_points` SECURITY DEFINER function. Insert into
// point_events + increment users.total_points atomically. Caller must run
// inside a transaction (every mutation path does).
@Service
public class PointsService {

    private final PointEventRepository pointEvents;
    private final UserRepository users;

    public PointsService(PointEventRepository pointEvents, UserRepository users) {
        this.pointEvents = pointEvents;
        this.users = users;
    }

    @Transactional
    public UUID award(UUID userId, String eventType, int points, String description,
                      UUID refQuizId, UUID refAttemptId) {
        var ev = new PointEvent();
        ev.setId(UUID.randomUUID());
        ev.setUserId(userId);
        ev.setEventType(eventType);
        ev.setPoints(points);
        ev.setDescription(description);
        ev.setRefQuizId(refQuizId);
        ev.setRefAttemptId(refAttemptId);
        ev.setCreatedAt(OffsetDateTime.now());
        pointEvents.save(ev);

        users.incrementTotalPoints(userId, points);
        return ev.getId();
    }

    @Transactional(readOnly = true)
    public boolean hasEarned(UUID userId, String eventType, UUID quizId) {
        return pointEvents.existsByUserIdAndEventTypeAndRefQuizId(userId, eventType, quizId);
    }
}
