alter table public.profiles
  add column reminders_enabled boolean not null default false,
  add column reminder_hour smallint check (reminder_hour between 0 and 23),
  add column timezone text,
  add column last_reminder_on date;
comment on column public.profiles.timezone is 'IANA zone name, e.g. America/New_York. reminder_hour is the hour of day in this zone.';
