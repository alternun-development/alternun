-- Honor awards, part 3: the dates of the event, as the card back prints them.
--
-- A tournament medal shows "Fecha: Noviembre 21 y 22 - 2026" on its back; medals without an
-- event date (for example the Swing Golf community medal) keep showing when they were obtained.
-- Free text, because an event can span several days.

begin;

alter table public.honor_award_recipes
  add column event_dates text,
  add constraint honor_award_recipes_event_dates_chk check (
    event_dates is null or char_length(btrim(event_dates)) between 1 and 80
  );

commit;
