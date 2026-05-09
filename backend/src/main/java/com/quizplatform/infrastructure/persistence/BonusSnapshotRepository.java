package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.BonusSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BonusSnapshotRepository extends JpaRepository<BonusSnapshot, BonusSnapshot.PK> {

    List<BonusSnapshot> findByBonusType(String bonusType);
}
