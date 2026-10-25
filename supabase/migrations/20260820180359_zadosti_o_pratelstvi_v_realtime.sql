-- V publikaci byly dosud jen zprávy, takže příchozí žádost o přátelství
-- se u druhého zařízení objevila teprve po ručním znovuotevření Socialu.
-- Uživatel mezitím koukal na prázdný seznam a myslel si, že se žádost
-- neodeslala. Realtime posílá jen to, co dotyčný smí i normálně přečíst,
-- a pravidlo na friendships pouští výhradně vlastní dvojice.
alter publication supabase_realtime add table public.friendships;