package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.PointEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PointEventRepository extends JpaRepository<PointEvent, UUID> {

    boolean existsByUserIdAndEventTypeAndRefQuizId(UUID userId, String eventType, UUID refQuizId);

    Page<PointEvent> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
        select e from PointEvent e
        where (:userId is null or e.userId = :userId)
          and (:eventType is null or e.eventType = :eventType)
        order by e.createdAt desc
        """)
    Page<PointEvent> adminSearch(
        @Param("userId") UUID userId,
        @Param("eventType") String eventType,
        Pageable pageable);
}
