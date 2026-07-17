-- Lost & Found Hub — PostgreSQL Reference Schema
-- ⚠️  DEPRECATED NOTICE:
--     Production ใช้ MySQL (XAMPP). ไฟล์นี้เก็บไว้เป็น reference เท่านั้น
--     หากต้องการ import เพื่อใช้งานจริง ให้ใช้: database/schema_mysql.sql
--     (รองรับ XAMPP / MySQL 8.0+)
--
-- Target: PostgreSQL 14+ / Supabase-compatible PostgreSQL
-- Status: REFERENCE ONLY — ไม่ควร import เข้า production database โดยตรง

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type member_role as enum ('student', 'teacher');
create type identity_status as enum ('pending', 'verified', 'rejected');
create type location_type as enum ('found', 'lost', 'both', 'handover');
create type lost_post_status as enum ('draft', 'pending_approval', 'published', 'matched', 'closed', 'rejected', 'deleted');
create type found_post_status as enum (
  'draft',
  'awaiting_handover',
  'pending_approval',
  'approved',
  'matched',
  'returned',
  'rejected',
  'archived'
);
create type image_owner_type as enum ('lost_post', 'found_post');
create type card_upload_status as enum ('pending', 'approved', 'rejected');
create type claim_status as enum ('submitted', 'under_review', 'approved', 'rejected', 'returned');

create table departments (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null unique,
  name_th varchar(160) not null,
  name_en varchar(160),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table item_categories (
  id uuid primary key default gen_random_uuid(),
  name_th varchar(120) not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name_th varchar(180) not null,
  building varchar(120),
  floor varchar(40),
  detail text,
  location_type location_type not null default 'both',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_unique_place unique (name_th, building, floor)
);

create table members (
  id uuid primary key default gen_random_uuid(),
  role member_role not null,
  username varchar(80) not null unique,
  password_hash varchar(255) not null,
  student_code varchar(30) unique,
  employee_code varchar(30) unique,
  first_name varchar(120) not null,
  last_name varchar(120) not null,
  email varchar(180) not null unique,
  phone varchar(40),
  department_id uuid references departments(id) on update cascade on delete set null,
  identity_status identity_status not null default 'verified',
  card_image_url text,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_student_code_required check (
    role <> 'student' or student_code is not null
  ),
  constraint members_teacher_code_required check (
    role <> 'teacher' or employee_code is not null
  )
);

create table student_card_uploads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on update cascade on delete cascade,
  image_url text not null,
  status card_upload_status not null default 'approved',
  reviewed_by uuid references members(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lost_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references members(id) on update cascade on delete restrict,
  category_id uuid not null references item_categories(id) on update cascade on delete restrict,
  lost_location_id uuid references locations(id) on update cascade on delete set null,
  title varchar(180) not null,
  description text not null,
  color varchar(80),
  brand varchar(120),
  unique_mark text,
  lost_at timestamptz,
  contact_name varchar(160),
  contact_channel varchar(180),
  status lost_post_status not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table found_posts (
  id uuid primary key default gen_random_uuid(),
  finder_id uuid not null references members(id) on update cascade on delete restrict,
  category_id uuid not null references item_categories(id) on update cascade on delete restrict,
  found_location_id uuid references locations(id) on update cascade on delete set null,
  title varchar(180) not null,
  description text not null,
  color varchar(80),
  brand varchar(120),
  unique_mark text,
  found_at timestamptz,
  status found_post_status not null default 'pending_approval',
  approved_by uuid references members(id) on update cascade on delete set null,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint found_posts_approval_consistency check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  )
);

create table item_images (
  id uuid primary key default gen_random_uuid(),
  owner_type image_owner_type not null,
  lost_post_id uuid references lost_posts(id) on update cascade on delete cascade,
  found_post_id uuid references found_posts(id) on update cascade on delete cascade,
  image_url text not null,
  alt_text varchar(180),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint item_images_single_owner check (
    (owner_type = 'lost_post' and lost_post_id is not null and found_post_id is null)
    or (owner_type = 'found_post' and found_post_id is not null and lost_post_id is null)
  )
);

create table handover_records (
  id uuid primary key default gen_random_uuid(),
  found_post_id uuid not null references found_posts(id) on update cascade on delete cascade,
  received_by uuid not null references members(id) on update cascade on delete restrict,
  handover_location_id uuid references locations(id) on update cascade on delete set null,
  handed_over_at timestamptz not null default now(),
  proof_image_url text,
  note text,
  created_at timestamptz not null default now()
);

create table claim_requests (
  id uuid primary key default gen_random_uuid(),
  found_post_id uuid not null references found_posts(id) on update cascade on delete cascade,
  claimant_id uuid not null references members(id) on update cascade on delete restrict,
  lost_post_id uuid references lost_posts(id) on update cascade on delete set null,
  claim_message text not null,
  status claim_status not null default 'submitted',
  verified_by uuid references members(id) on update cascade on delete set null,
  verified_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  lost_post_id uuid not null references lost_posts(id) on update cascade on delete cascade,
  found_post_id uuid not null references found_posts(id) on update cascade on delete cascade,
  match_score numeric(5,2) not null,
  created_at timestamptz not null default now(),
  constraint matches_unique_pair unique (lost_post_id, found_post_id)
);

alter table student_card_uploads
  add column claim_request_id uuid references claim_requests(id) on update cascade on delete set null;

create table return_records (
  id uuid primary key default gen_random_uuid(),
  claim_request_id uuid not null references claim_requests(id) on update cascade on delete cascade,
  found_post_id uuid not null references found_posts(id) on update cascade on delete cascade,
  returned_by uuid not null references members(id) on update cascade on delete restrict,
  received_by uuid not null references members(id) on update cascade on delete restrict,
  return_location_id uuid references locations(id) on update cascade on delete set null,
  proof_image_url text,
  note text,
  returned_at timestamptz not null default now()
);

create index idx_members_role on members(role);
create index idx_members_department_id on members(department_id);
create index idx_members_identity_status on members(identity_status);
create index idx_student_card_uploads_member_id on student_card_uploads(member_id);
create index idx_student_card_uploads_claim_request_id on student_card_uploads(claim_request_id);
create index idx_lost_posts_owner_id on lost_posts(owner_id);
create index idx_lost_posts_category_id on lost_posts(category_id);
create index idx_lost_posts_status on lost_posts(status);
create index idx_lost_posts_lost_at on lost_posts(lost_at);
create index idx_found_posts_finder_id on found_posts(finder_id);
create index idx_found_posts_category_id on found_posts(category_id);
create index idx_found_posts_status on found_posts(status);
create index idx_found_posts_found_at on found_posts(found_at);
create index idx_claim_requests_found_post_id on claim_requests(found_post_id);
create index idx_claim_requests_claimant_id on claim_requests(claimant_id);
create index idx_claim_requests_lost_post_id on claim_requests(lost_post_id);
create index idx_claim_requests_status on claim_requests(status);
create index idx_matches_lost_post_id on matches(lost_post_id);
create index idx_matches_found_post_id on matches(found_post_id);
create index idx_return_records_claim_request_id on return_records(claim_request_id);
create index idx_return_records_found_post_id on return_records(found_post_id);
create index idx_return_records_returned_at on return_records(returned_at);

create index idx_lost_posts_title_trgm on lost_posts using gin (title gin_trgm_ops);
create index idx_lost_posts_description_trgm on lost_posts using gin (description gin_trgm_ops);
create index idx_lost_posts_color_trgm on lost_posts using gin (color gin_trgm_ops);
create index idx_lost_posts_brand_trgm on lost_posts using gin (brand gin_trgm_ops);
create index idx_found_posts_title_trgm on found_posts using gin (title gin_trgm_ops);
create index idx_found_posts_description_trgm on found_posts using gin (description gin_trgm_ops);
create index idx_found_posts_color_trgm on found_posts using gin (color gin_trgm_ops);
create index idx_found_posts_brand_trgm on found_posts using gin (brand gin_trgm_ops);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger departments_set_updated_at
before update on departments
for each row execute function set_updated_at();

create trigger item_categories_set_updated_at
before update on item_categories
for each row execute function set_updated_at();

create trigger locations_set_updated_at
before update on locations
for each row execute function set_updated_at();

create trigger members_set_updated_at
before update on members
for each row execute function set_updated_at();

create trigger student_card_uploads_set_updated_at
before update on student_card_uploads
for each row execute function set_updated_at();

create trigger lost_posts_set_updated_at
before update on lost_posts
for each row execute function set_updated_at();

create trigger found_posts_set_updated_at
before update on found_posts
for each row execute function set_updated_at();

create trigger claim_requests_set_updated_at
before update on claim_requests
for each row execute function set_updated_at();

-- Seed data for master tables
insert into item_categories (name_th, description) values
  ('ອິເລັກໂທຣນິກ', 'ໂທລະສັບ ຫູຟັງ ສາຍສາກ ແລະ ອຸປະກອນໄອທີ'),
  ('ກະເປົາ/ເອກະສານ', 'ກະເປົາ ປຶ້ມ ເອກະສານ ແລະ ແຟ້ມ'),
  ('ກະແຈ/ບັດ', 'ກະແຈ ບັດນັກສຶກສາ ແລະ ບັດຜ່ານ'),
  ('ຕຸກນ້ຳ', 'ແກ້ວນ້ຳ ຕຸກນ້ຳ ແລະ ກະຕິກນ້ຳ'),
  ('ອື່ນໆ', 'ລາຍການທີ່ບໍ່ຢູ່ໃນໝວດໝູ່ທີ່ກຳນົດ')
on conflict (name_th) do nothing;

insert into departments (code, name_th, name_en) values
  ('SCI', 'ພາກວິຊາວິທະຍາສາດ', 'Science'),
  ('MATH', 'ພາກວິຊາຄະນິດສາດ', 'Mathematics'),
  ('PHY-CHEM', 'ພາກວິຊາຟີຊິກ ແລະ ເຄມີ', 'Physics and Chemistry')
on conflict (code) do nothing;

insert into locations (name_th, building, floor, detail, location_type) values
  ('ຫ້ອງຄຸ້ມຄອງ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', '1', 'ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ', 'handover'),
  ('ຕຶກພາກວິຊາວິທະຍາສາດ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', null, 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງປະຕິບັດການ ແລະ ທາງເດີນ', 'both'),
  ('ຕຶກພາກວິຊາຄະນິດສາດ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', null, 'ພື້ນທີ່ຫ້ອງຮຽນ ແລະ ທາງເດີນຂອງພາກວິຊາ', 'both'),
  ('ຕຶກພາກວິຊາຟີຊິກ ແລະ ເຄມີ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', null, 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງທົດລອງ ແລະ ທາງເດີນ', 'both'),
  ('ລານກາງຄະນະ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', null, 'ພື້ນທີ່ກາງແຈ້ງ ແລະ ຈຸດນັ່ງພັກ', 'both')
on conflict (name_th, building, floor) do nothing;

-- Report views
create or replace view v_report_lost_count_by_month as
select
  date_trunc('month', coalesce(lost_at, created_at))::date as report_month,
  count(*) as lost_count
from lost_posts
where status <> 'deleted'
group by 1
order by 1 desc;

create or replace view v_report_found_count_by_month as
select
  date_trunc('month', coalesce(found_at, created_at))::date as report_month,
  count(*) as found_count
from found_posts
where status <> 'archived'
group by 1
order by 1 desc;

create or replace view v_report_found_status_summary as
select
  status,
  count(*) as item_count
from found_posts
where deleted_at is null
group by status
order by status;

create or replace view v_report_pending_found_items as
select
  status,
  count(*) as item_count
from found_posts
where status in ('awaiting_handover', 'pending_approval', 'approved', 'matched')
  and deleted_at is null
group by status
order by status;

create or replace view v_report_return_records_by_month as
select
  date_trunc('month', returned_at)::date as report_month,
  count(*) as returned_count
from return_records
group by 1
order by 1 desc;

create or replace view v_report_lost_by_category as
select
  c.name_th as category_name,
  count(lp.id) as lost_count
from item_categories c
left join lost_posts lp on lp.category_id = c.id and lp.status <> 'deleted'
group by c.id, c.name_th
order by lost_count desc, c.name_th;

create or replace view v_report_member_summary as
select
  m.role,
  d.name_th as department_name,
  m.identity_status,
  count(*) as member_count
from members m
left join departments d on d.id = m.department_id
group by m.role, d.name_th, m.identity_status
order by m.role, d.name_th, m.identity_status;
