package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Rating.PK> {

    Optional<Rating> findByQuizIdAndUserId(UUID quizId, UUID userId);
}
