-- How an attempt went, not just how it ended: a pass after failing runs is practice, not an unaided solve.
alter table public.attempts
  add column client_id text,
  add column first_run text check (first_run in ('pass', 'fail', 'error')),
  add column failed_runs integer not null default 0 check (failed_runs >= 0),
  add column error_runs integer not null default 0 check (error_runs >= 0),
  add column hinted boolean not null default false,
  add column revealed boolean not null default false;
