-- Site schema (docs/ARCHITECTURE.md §9). Language-neutral data in base tables, translatable text in
-- *_translation tables keyed (parent_id, locale). A 'pl' row is required for every translatable record;
-- the services enforce that, since a row-level constraint cannot see sibling rows.
-- Editable aggregates carry `version` for optimistic locking (@Version, 409 on conflict).

-- Media ---------------------------------------------------------------------------------------------

create table media (
    id          uuid primary key default gen_random_uuid(),
    storage_key text        not null unique,
    mime_type   text        not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml')),
    width       int         check (width > 0),
    height      int         check (height > 0),
    size_bytes  bigint      not null check (size_bytes > 0),
    created_at  timestamptz not null default now(),
    version     bigint      not null default 0
);

create table media_translation (
    media_id uuid not null references media (id) on delete cascade,
    locale   text not null check (locale in ('pl', 'en')),
    alt_text text not null,
    caption  text,
    primary key (media_id, locale)
);

-- Projects ------------------------------------------------------------------------------------------

create table project (
    id             uuid primary key default gen_random_uuid(),
    status         text        not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    kind           text        not null check (kind in ('CLIENT', 'PERSONAL', 'OPEN_SOURCE')),
    featured       boolean     not null default false,
    sort_order     int         not null default 0,
    started_on     date        not null,
    finished_on    date,
    cover_media_id uuid        references media (id) on delete set null,
    repo_url       text,
    live_url       text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    version        bigint      not null default 0,
    check (finished_on is null or finished_on >= started_on)
);

create index project_published_order_idx on project (sort_order) where status = 'PUBLISHED';
create index project_cover_media_idx on project (cover_media_id);

create table project_translation (
    project_id      uuid not null references project (id) on delete cascade,
    locale          text not null check (locale in ('pl', 'en')),
    slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title           text not null,
    summary         text not null,
    role            text,
    problem_md      text not null,
    solution_md     text not null,
    outcome_md      text not null,
    lessons_md      text,
    seo_description text,
    primary key (project_id, locale),
    unique (locale, slug)
);

create table project_media (
    project_id uuid not null references project (id) on delete cascade,
    media_id   uuid not null references media (id) on delete restrict,
    sort_order int  not null default 0,
    primary key (project_id, media_id)
);

create index project_media_media_idx on project_media (media_id);
create index project_media_order_idx on project_media (project_id, sort_order);

-- Skills --------------------------------------------------------------------------------------------

create table technology (
    id                  uuid primary key default gen_random_uuid(),
    slug                text     not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name                text     not null unique,
    category            text     not null check (category in ('LANGUAGE', 'BACKEND', 'FRONTEND', 'DATA', 'INFRASTRUCTURE', 'TOOLING')),
    show_on_skills_page boolean  not null default true,
    since_year          smallint check (since_year between 1990 and 2100),
    sort_order          int      not null default 0,
    version             bigint   not null default 0
);

create index technology_category_order_idx on technology (category, sort_order);

create table technology_translation (
    technology_id uuid not null references technology (id) on delete cascade,
    locale        text not null check (locale in ('pl', 'en')),
    description   text not null,
    primary key (technology_id, locale)
);

create table project_technology (
    project_id    uuid not null references project (id) on delete cascade,
    technology_id uuid not null references technology (id) on delete cascade,
    primary key (project_id, technology_id)
);

create index project_technology_technology_idx on project_technology (technology_id);

create table expertise_area (
    id         uuid primary key default gen_random_uuid(),
    icon       text,
    sort_order int    not null default 0,
    version    bigint not null default 0
);

create index expertise_area_order_idx on expertise_area (sort_order);

create table expertise_area_translation (
    area_id        uuid not null references expertise_area (id) on delete cascade,
    locale         text not null check (locale in ('pl', 'en')),
    title          text not null,
    summary        text not null,
    description_md text,
    primary key (area_id, locale)
);

create table expertise_area_technology (
    area_id       uuid not null references expertise_area (id) on delete cascade,
    technology_id uuid not null references technology (id) on delete cascade,
    sort_order    int  not null default 0,
    primary key (area_id, technology_id)
);

create index expertise_area_technology_technology_idx on expertise_area_technology (technology_id);

create table expertise_area_project (
    area_id    uuid not null references expertise_area (id) on delete cascade,
    project_id uuid not null references project (id) on delete cascade,
    primary key (area_id, project_id)
);

create index expertise_area_project_project_idx on expertise_area_project (project_id);

-- Services and FAQ ----------------------------------------------------------------------------------

create table service_offering (
    id         uuid primary key default gen_random_uuid(),
    active     boolean not null default true,
    sort_order int     not null default 0,
    version    bigint  not null default 0
);

create index service_offering_order_idx on service_offering (sort_order);

create table service_translation (
    service_id      uuid not null references service_offering (id) on delete cascade,
    locale          text not null check (locale in ('pl', 'en')),
    title           text not null,
    summary         text not null,
    description_md  text,
    deliverables_md text,
    price_note      text,
    primary key (service_id, locale)
);

create table faq (
    id         uuid primary key default gen_random_uuid(),
    sort_order int    not null default 0,
    version    bigint not null default 0
);

create index faq_order_idx on faq (sort_order);

create table faq_translation (
    faq_id    uuid not null references faq (id) on delete cascade,
    locale    text not null check (locale in ('pl', 'en')),
    question  text not null,
    answer_md text not null,
    primary key (faq_id, locale)
);

-- Site settings (a single row, id = 1) --------------------------------------------------------------

create table site_settings (
    id                smallint primary key default 1 check (id = 1),
    full_name         text    not null default '',
    availability      text    not null default 'OPEN' check (availability in ('OPEN', 'LIMITED', 'CLOSED')),
    available_from    date,
    show_availability boolean not null default false,
    social_links      jsonb   not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
    portrait_media_id uuid    references media (id) on delete set null,
    site_project_id   uuid    references project (id) on delete set null,
    version           bigint  not null default 0
);

create table site_settings_translation (
    settings_id       smallint not null references site_settings (id) on delete cascade,
    locale            text     not null check (locale in ('pl', 'en')),
    headline          text     not null,
    intro_md          text,
    about_md          text,
    approach_md       text,
    location_label    text,
    autoreply_subject text,
    autoreply_body_md text,
    primary key (settings_id, locale)
);

insert into site_settings (id) values (1);

-- Contact messages ----------------------------------------------------------------------------------

create table contact_message (
    id           uuid primary key default gen_random_uuid(),
    locale       text        not null check (locale in ('pl', 'en')),
    name         text        not null check (char_length(name) between 2 and 120),
    email        text        not null check (char_length(email) <= 254),
    company      text        check (char_length(company) <= 160),
    topic        text        not null check (topic in ('PROJECT', 'CONSULTATION', 'OTHER')),
    service_id   uuid        references service_offering (id) on delete set null,
    budget_range text,
    timeline     text,
    message      text        not null check (char_length(message) between 20 and 5000),
    status       text        not null default 'NEW' check (status in ('NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM')),
    ip_hash      text,
    created_at   timestamptz not null default now()
);

create index contact_message_inbox_idx on contact_message (status, created_at desc);
create index contact_message_created_idx on contact_message (created_at);
create index contact_message_service_idx on contact_message (service_id);
