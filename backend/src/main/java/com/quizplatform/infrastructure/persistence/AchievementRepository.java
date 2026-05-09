package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.Achievement;
import com.quizplatform.domain.enums.AchievementConditionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, UUID> {

    List<Achievement> findByActiveTrueAndConditionTypeIn(List<AchievementConditionType> types);

    List<Achievement> findByActiveTrueAndConditionType(AchievementConditionType type);

    List<Achievement> findAllByOrderByCreatedAtDesc();
}
