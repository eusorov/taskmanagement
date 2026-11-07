-- The search finds a text anywhere in the name (ilike '%text%'), which no btree index can serve, so every search read
-- the whole table. A trigram index can. pg_trgm ships with Postgres and is trusted, so the database owner may create it.
-- Texts under three characters have no trigrams to look up; Postgres then scans the table as before.
create extension if not exists pg_trgm;
create index tasks_name_trgm_idx on tasks using gin (name gin_trgm_ops);
