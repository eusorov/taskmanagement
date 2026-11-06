create type task_priority as enum ('LOW', 'NORMAL', 'URGENT');

create table tasks (
    id         uuid primary key,
    name       text          not null check (char_length(name) between 1 and 500),
    priority   task_priority not null default 'NORMAL',
    done       boolean       not null default false,
    created_at timestamptz   not null default now(),
    updated_at timestamptz   not null default now(),
    version    int           not null default 0
);
create index tasks_done_priority_created_at_idx on tasks (done, priority, created_at);
