-- Whether the plan asked for before the editor opened was correct. Null when the lesson had no plan step.
alter table public.attempts add column planned boolean;
