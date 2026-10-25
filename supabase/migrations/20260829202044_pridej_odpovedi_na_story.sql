
-- Story dřív uměla jen zaznamenat zhlédnutí — appka teď umí i odpovědět
-- (a rychle zareagovat emoji, což appka nerozlišuje od odpovědi: obojí
-- je jen text poslaný do chatu s autorem). Stejně jako Instagram: story
-- odpověď/reakce je obyčejná DM zpráva, ne zvláštní úložiště u story
-- samotné. Žádná nová RLS politika — messages' INSERT politika už
-- pokrývá kdokoli smí poslat do kterého chatu, story_id je jen další
-- nepovinný odkaz stejného tvaru jako reply_to_id (taky beze zvláštní
-- validace, appka věří klientovi stejně jako u reply_to_id).
alter table public.messages add column story_id uuid references public.stories(id) on delete set null;
