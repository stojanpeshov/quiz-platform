-- ============================================================
-- ShedLock backing table — used by net.javacrumbs.shedlock to
-- coordinate distributed scheduled jobs (so only one replica
-- runs each @Scheduled job at a time).
-- Schema is fixed by the library.
-- ============================================================

create table shedlock (
  name       varchar(64) not null primary key,
  lock_until timestamp(3) not null,
  locked_at  timestamp(3) not null,
  locked_by  varchar(255) not null
);
