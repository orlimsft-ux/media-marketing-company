create table agents (
  id text primary key,
  name text not null,
  role text not null,
  score integer default 0,
  created_at timestamptz default now()
);

create table videos (
  id text primary key,
  rank integer,
  title text not null,
  platform text not null,
  heat_score integer default 0,
  metrics jsonb default '{}'::jsonb,
  viral_reason text,
  marketing_value text,
  risk_notes text,
  is_top3 boolean default false,
  created_at timestamptz default now()
);

create table work_days (
  id text primary key,
  date date not null unique,
  status text not null default 'active',
  goal text,
  created_at timestamptz default now()
);

create table tasks (
  id text primary key,
  work_day_id text references work_days(id),
  title text not null,
  owner_id text references agents(id),
  stage text not null,
  status text not null,
  priority text default 'medium',
  source_video_id text references videos(id),
  summary text,
  deliverable text,
  due_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table feedback (
  id text primary key,
  task_id text references tasks(id),
  action text not null,
  rating integer,
  comment text not null,
  required_changes jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table editing_projects (
  id text primary key,
  work_day_id text references work_days(id),
  source_video_id text references videos(id),
  task_id text references tasks(id),
  title text not null,
  status text not null,
  goal text,
  version text,
  script text,
  storyboard jsonb default '[]'::jsonb,
  assets jsonb default '[]'::jsonb,
  output_url text,
  next_action text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
