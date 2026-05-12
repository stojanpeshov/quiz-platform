package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.Quiz;
import com.quizplatform.domain.enums.QuizStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    long countByAuthorIdAndStatus(UUID authorId, QuizStatus status);

    long countByStatus(QuizStatus status);

    @Query("select q from Quiz q where q.authorId = :uid order by q.createdAt desc")
    List<Quiz> findOwn(@Param("uid") UUID uid);

    @Query("""
        select q from Quiz q
        where q.status = com.quizplatform.domain.enums.QuizStatus.PUBLISHED
        order by coalesce(q.publishedAt, q.createdAt) desc
        """)
    List<Quiz> listPublishedRecent();

    @Query("""
        select q from Quiz q
        where q.status = com.quizplatform.domain.enums.QuizStatus.PUBLISHED
        order by q.avgRating desc, q.ratingCount desc
        """)
    List<Quiz> listPublishedTopRated();

    @Query("""
        select q from Quiz q
        where q.status = com.quizplatform.domain.enums.QuizStatus.PUBLISHED
        order by q.attemptCount desc
        """)
    List<Quiz> listPublishedMostTaken();

    // Mirrors refresh_quiz_aggregates() from the original Postgres function:
    // single UPDATE that recomputes avg_rating / rating_count / attempt_count /
    // unique_attempter_count from the source tables.
    // flushAutomatically ensures pending entity changes (e.g. new Rating rows) are
    // written to the DB before the subquery counts them; clearAutomatically evicts
    // the stale Quiz entity from the session cache so subsequent reads see the
    // updated values.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        update quizzes set
          avg_rating             = coalesce((select round(avg(stars)::numeric, 2) from ratings  where quiz_id = :id), 0),
          rating_count           = (select count(*)              from ratings  where quiz_id = :id),
          attempt_count          = (select count(*)              from attempts where quiz_id = :id),
          unique_attempter_count = (select count(distinct user_id) from attempts where quiz_id = :id)
        where id = :id
        """, nativeQuery = true)
    void refreshAggregates(@Param("id") UUID id);
}
