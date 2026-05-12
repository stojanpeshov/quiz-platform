package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.Attempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, UUID> {

    long countByUserId(UUID userId);

    boolean existsByQuizIdAndUserId(UUID quizId, UUID userId);

    // Locks the existing attempts for this (user, quiz) pair so a concurrent
    // submission can't race past the 3-attempt cap. Replaces the
    // enforce_attempt_cap trigger from the original schema.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Attempt a where a.quizId = :quizId and a.userId = :userId")
    List<Attempt> lockExisting(@Param("quizId") UUID quizId, @Param("userId") UUID userId);
}
