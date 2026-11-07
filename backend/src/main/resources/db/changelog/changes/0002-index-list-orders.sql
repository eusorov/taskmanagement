--liquibase formatted sql

--changeset includeAll:raw
-- One index per list order the UI offers, each in the exact order of TaskRepository.orderFor: open before done, the
-- chosen column, then id. Without them every list read the whole table and sorted it. A backward scan would flip done
-- and id too, so each direction needs its own index. The old all-ascending index served none of these orders.
drop index tasks_done_priority_created_at_idx;
create index tasks_list_order_idx on tasks (done, priority desc, created_at desc, id); -- Priority, the default
create index tasks_created_at_desc_idx on tasks (done, created_at desc, id); -- Newest first
create index tasks_created_at_asc_idx on tasks (done, created_at, id); -- Oldest first
create index tasks_updated_at_desc_idx on tasks (done, updated_at desc, id); -- Recently changed
create index tasks_name_asc_idx on tasks (done, name, id); -- Name A–Z
create index tasks_name_desc_idx on tasks (done, name desc, id); -- Name Z–A
