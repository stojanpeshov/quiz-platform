package com.quizplatform.infrastructure.persistence;

import com.quizplatform.domain.User;
import com.quizplatform.domain.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByAzureOid(String oid);

    long countByRole(UserRole role);

    // Used by IF EXISTS-style admin search.
    @Query("""
        select u from User u
        where (:q is null or :q = '' or
               lower(u.email) like lower(concat('%', :q, '%')) or
               lower(u.name)  like lower(concat('%', :q, '%')))
        order by u.totalPoints desc
        """)
    List<User> search(@Param("q") String q);

    @Modifying
    @Query(value = "update users set total_points = total_points + :delta where id = :id",
           nativeQuery = true)
    void incrementTotalPoints(@Param("id") UUID id, @Param("delta") int delta);

    // Atomic upsert — avoids the race condition when multiple concurrent requests
    // arrive for a first-time user. On conflict the role and total_points are left
    // untouched; only mutable profile fields and last_login_at are updated.
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query(value = """
        insert into users (id, azure_oid, email, name, role, total_points, last_login_at)
        values (:id, :oid, :email, :name, 'user', 0, :now)
        on conflict (azure_oid) do update set
          email         = excluded.email,
          name          = excluded.name,
          last_login_at = excluded.last_login_at
        """, nativeQuery = true)
    void upsertByAzureOid(
        @Param("id")    UUID id,
        @Param("oid")   String oid,
        @Param("email") String email,
        @Param("name")  String name,
        @Param("now")   OffsetDateTime now
    );
}
