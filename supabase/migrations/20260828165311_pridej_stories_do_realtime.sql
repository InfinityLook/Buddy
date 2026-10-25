-- Nová story od přítele se má v liště objevit sama, stejný důvod jako
-- u friendships/messages výš — RLS na stories nad publikací platí
-- stejně jako u obyčejného čtení, takže se nezmění, komu co dorazí.
alter publication supabase_realtime add table public.stories;
