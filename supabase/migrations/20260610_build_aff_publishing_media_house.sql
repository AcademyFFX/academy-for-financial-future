create table if not exists public.aff_authors (
  id bigserial primary key,
  author_name text not null,
  author_email text,
  author_type text not null default 'Academy Author',
  primary_topic text,
  biography text,
  books_published integer not null default 0,
  author_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_authors_status_check check (author_status in ('Active', 'Review', 'Archived'))
);

create table if not exists public.aff_books (
  id bigserial primary key,
  book_title text not null,
  author_id bigint references public.aff_authors(id) on delete set null,
  author_name text not null,
  isbn text,
  category text not null default 'Financial Literacy',
  edition_type text not null default 'Digital',
  publishing_status text not null default 'Editorial Review',
  print_url text,
  digital_url text,
  download_count integer not null default 0,
  published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_books_edition_check check (edition_type in ('Print', 'Digital', 'Print and Digital')),
  constraint aff_books_status_check check (publishing_status in ('Submission', 'Editorial Review', 'Peer Review', 'Approved', 'Published', 'Archived'))
);

create table if not exists public.aff_publications (
  id bigserial primary key,
  title text not null,
  publication_type text not null default 'White Paper',
  category text not null default 'Economic Intelligence',
  author_name text not null default 'Academy for Financial Future',
  publication_status text not null default 'Published',
  publication_date date default current_date,
  doi text,
  citation_text text,
  pdf_url text,
  download_count integer not null default 0,
  keywords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_publications_type_check check (publication_type in ('White Paper', 'Economic Intelligence Report', 'Institutional Market Study', 'Academic Journal Article', 'Financial Literacy Publication')),
  constraint aff_publications_status_check check (publication_status in ('Draft', 'Submitted', 'Published', 'Archived'))
);

create table if not exists public.aff_research_papers (
  id bigserial primary key,
  title text not null,
  research_type text not null default 'Forex Research Paper',
  author_name text not null,
  abstract text,
  doi text,
  citation_text text,
  citation_count integer not null default 0,
  pdf_url text,
  download_count integer not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint aff_research_type_check check (research_type in ('Forex Research Paper', 'Economic Intelligence Report', 'White Paper', 'Institutional Market Study', 'Academic Journal')),
  constraint aff_research_status_check check (publication_status in ('Draft', 'Peer Review', 'Published', 'Archived'))
);

create table if not exists public.aff_journals (
  id bigserial primary key,
  journal_title text not null,
  volume text,
  issue text,
  doi_prefix text,
  editor_name text not null default 'AFF Editorial Board',
  issue_date date default current_date,
  journal_status text not null default 'Published',
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint aff_journals_status_check check (journal_status in ('Planning', 'Review', 'Published', 'Archived'))
);

create table if not exists public.aff_articles (
  id bigserial primary key,
  article_title text not null,
  author_name text not null default 'Dr. Jean R. Moricette',
  collection_name text not null default 'Dr. Jean R. Moricette Collection',
  article_type text not null default 'Article',
  category text not null default 'Financial Literacy',
  article_body text,
  pdf_url text,
  download_count integer not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint aff_articles_type_check check (article_type in ('Article', 'Essay', 'Civic Leadership Publication', 'Constitutional Study', 'Divine Alignment Series', 'Economic Commentary', 'Financial Literacy Publication')),
  constraint aff_articles_status_check check (publication_status in ('Draft', 'Published', 'Archived'))
);

create table if not exists public.aff_media_library (
  id bigserial primary key,
  media_title text not null,
  media_type text not null default 'Video Archive',
  series_name text,
  host_name text not null default 'Academy for Financial Future',
  media_url text,
  transcript_url text,
  view_count integer not null default 0,
  access_level text not null default 'Authenticated',
  recorded_at timestamptz default now(),
  created_at timestamptz not null default now(),
  constraint aff_media_type_check check (media_type in ('AFF TV Studio', 'Interview Archive', 'Webinar Recording', 'Conference Recording', 'Video Archive', 'Livestream Replay')),
  constraint aff_media_access_check check (access_level in ('Public', 'Authenticated', 'Members', 'Admin'))
);

create table if not exists public.aff_podcasts (
  id bigserial primary key,
  podcast_name text not null,
  episode_title text not null,
  host_name text not null default 'Academy for Financial Future',
  episode_url text,
  transcript_url text,
  listen_count integer not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint aff_podcasts_status_check check (publication_status in ('Draft', 'Published', 'Archived'))
);

create table if not exists public.aff_editorial_reviews (
  id bigserial primary key,
  contributor_id uuid references auth.users(id) on delete set null,
  contributor_name text not null,
  contributor_email text,
  submission_title text not null,
  submission_type text not null default 'Book Manuscript',
  abstract text,
  manuscript_url text,
  editor_name text,
  peer_reviewer text,
  review_status text not null default 'Submitted',
  workflow_status text not null default 'Editorial Review',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aff_editorial_submission_type_check check (submission_type in ('Book Manuscript', 'Research Paper', 'White Paper', 'Article', 'Podcast', 'Video', 'Journal Submission')),
  constraint aff_editorial_review_status_check check (review_status in ('Submitted', 'In Review', 'Revision Requested', 'Approved', 'Rejected', 'Published')),
  constraint aff_editorial_workflow_status_check check (workflow_status in ('Editorial Review', 'Peer Review', 'Publication Approval', 'Production', 'Published', 'Archived'))
);

create table if not exists public.aff_copyright_registry (
  id bigserial primary key,
  work_title text not null,
  work_type text not null default 'Publication',
  owner_name text not null default 'Academy for Financial Future',
  registration_number text,
  copyright_year integer default extract(year from now())::integer,
  licensing_terms text,
  media_rights text,
  rights_status text not null default 'Registered',
  registered_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint aff_copyright_work_type_check check (work_type in ('Book', 'Publication', 'Research Paper', 'Article', 'Video', 'Podcast', 'Course Material', 'Media Asset')),
  constraint aff_copyright_status_check check (rights_status in ('Registered', 'License Available', 'Licensed', 'Restricted', 'Archived'))
);

create table if not exists public.aff_substack_archive (
  id bigserial primary key,
  newsletter_name text not null default 'Academy for Financial Future',
  article_title text not null,
  author_name text not null default 'Dr. Jean R. Moricette',
  article_url text,
  subscriber_count integer not null default 0,
  open_rate numeric(5,2) not null default 0,
  publication_status text not null default 'Published',
  published_at date default current_date,
  created_at timestamptz not null default now(),
  constraint aff_substack_status_check check (publication_status in ('Draft', 'Scheduled', 'Published', 'Archived'))
);

create index if not exists aff_books_status_idx on public.aff_books (publishing_status, published_at desc);
create index if not exists aff_publications_status_idx on public.aff_publications (publication_status, publication_date desc);
create index if not exists aff_research_status_idx on public.aff_research_papers (publication_status, published_at desc);
create index if not exists aff_articles_collection_idx on public.aff_articles (collection_name, published_at desc);
create index if not exists aff_media_type_idx on public.aff_media_library (media_type, recorded_at desc);
create index if not exists aff_editorial_contributor_idx on public.aff_editorial_reviews (contributor_id, created_at desc);
create index if not exists aff_copyright_status_idx on public.aff_copyright_registry (rights_status, registered_at desc);

alter table public.aff_books enable row level security;
alter table public.aff_authors enable row level security;
alter table public.aff_publications enable row level security;
alter table public.aff_research_papers enable row level security;
alter table public.aff_journals enable row level security;
alter table public.aff_articles enable row level security;
alter table public.aff_media_library enable row level security;
alter table public.aff_podcasts enable row level security;
alter table public.aff_editorial_reviews enable row level security;
alter table public.aff_copyright_registry enable row level security;
alter table public.aff_substack_archive enable row level security;

drop policy if exists "Authenticated users can read publishing authors" on public.aff_authors;
drop policy if exists "AFF admin can manage publishing authors" on public.aff_authors;
create policy "Authenticated users can read publishing authors" on public.aff_authors for select to authenticated using (author_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage publishing authors" on public.aff_authors for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read published books" on public.aff_books;
drop policy if exists "AFF admin can manage books" on public.aff_books;
create policy "Authenticated users can read published books" on public.aff_books for select to authenticated using (publishing_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage books" on public.aff_books for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read published publications" on public.aff_publications;
drop policy if exists "AFF admin can manage publications" on public.aff_publications;
create policy "Authenticated users can read published publications" on public.aff_publications for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage publications" on public.aff_publications for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read published research papers" on public.aff_research_papers;
drop policy if exists "AFF admin can manage research papers" on public.aff_research_papers;
create policy "Authenticated users can read published research papers" on public.aff_research_papers for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage research papers" on public.aff_research_papers for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read journals" on public.aff_journals;
drop policy if exists "AFF admin can manage journals" on public.aff_journals;
create policy "Authenticated users can read journals" on public.aff_journals for select to authenticated using (journal_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage journals" on public.aff_journals for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read published articles" on public.aff_articles;
drop policy if exists "AFF admin can manage articles" on public.aff_articles;
create policy "Authenticated users can read published articles" on public.aff_articles for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage articles" on public.aff_articles for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read media library" on public.aff_media_library;
drop policy if exists "AFF admin can manage media library" on public.aff_media_library;
create policy "Authenticated users can read media library" on public.aff_media_library for select to authenticated using (access_level in ('Public', 'Authenticated', 'Members') or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage media library" on public.aff_media_library for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read podcasts" on public.aff_podcasts;
drop policy if exists "AFF admin can manage podcasts" on public.aff_podcasts;
create policy "Authenticated users can read podcasts" on public.aff_podcasts for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage podcasts" on public.aff_podcasts for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Students can read own editorial reviews" on public.aff_editorial_reviews;
drop policy if exists "Students can create editorial submissions" on public.aff_editorial_reviews;
drop policy if exists "AFF admin can manage editorial reviews" on public.aff_editorial_reviews;
create policy "Students can read own editorial reviews" on public.aff_editorial_reviews for select to authenticated using (auth.uid() = contributor_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "Students can create editorial submissions" on public.aff_editorial_reviews for insert to authenticated with check (auth.uid() = contributor_id);
create policy "AFF admin can manage editorial reviews" on public.aff_editorial_reviews for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read copyright registry" on public.aff_copyright_registry;
drop policy if exists "AFF admin can manage copyright registry" on public.aff_copyright_registry;
create policy "Authenticated users can read copyright registry" on public.aff_copyright_registry for select to authenticated using (rights_status <> 'Archived' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage copyright registry" on public.aff_copyright_registry for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

drop policy if exists "Authenticated users can read substack archive" on public.aff_substack_archive;
drop policy if exists "AFF admin can manage substack archive" on public.aff_substack_archive;
create policy "Authenticated users can read substack archive" on public.aff_substack_archive for select to authenticated using (publication_status = 'Published' or lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');
create policy "AFF admin can manage substack archive" on public.aff_substack_archive for all to authenticated using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com') with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'acafffx@gmail.com');

insert into public.aff_authors (author_name, author_email, author_type, primary_topic, books_published, author_status)
select 'Dr. Jean R. Moricette', 'acafffx@gmail.com', 'Founder Author', 'Forex education, civic leadership, economic intelligence, and financial literacy', 0, 'Active'
where not exists (select 1 from public.aff_authors where author_name = 'Dr. Jean R. Moricette');

insert into public.aff_articles (article_title, author_name, collection_name, article_type, category, publication_status)
select article_title, 'Dr. Jean R. Moricette', 'Dr. Jean R. Moricette Collection', article_type, category, 'Published'
from (
  values
    ('Foundations of Financial Literacy and Moral Responsibility', 'Financial Literacy Publication', 'Financial Literacy'),
    ('Economic Commentary for Civic Stewardship', 'Economic Commentary', 'Economic Intelligence'),
    ('Divine Alignment and Purposeful Leadership', 'Divine Alignment Series', 'Civic Leadership')
) as seed(article_title, article_type, category)
where not exists (select 1 from public.aff_articles where aff_articles.article_title = seed.article_title);

grant select, insert, update, delete on public.aff_books to authenticated;
grant select, insert, update, delete on public.aff_authors to authenticated;
grant select, insert, update, delete on public.aff_publications to authenticated;
grant select, insert, update, delete on public.aff_research_papers to authenticated;
grant select, insert, update, delete on public.aff_journals to authenticated;
grant select, insert, update, delete on public.aff_articles to authenticated;
grant select, insert, update, delete on public.aff_media_library to authenticated;
grant select, insert, update, delete on public.aff_podcasts to authenticated;
grant select, insert, update, delete on public.aff_editorial_reviews to authenticated;
grant select, insert, update, delete on public.aff_copyright_registry to authenticated;
grant select, insert, update, delete on public.aff_substack_archive to authenticated;

grant usage on sequence public.aff_books_id_seq to authenticated;
grant usage on sequence public.aff_authors_id_seq to authenticated;
grant usage on sequence public.aff_publications_id_seq to authenticated;
grant usage on sequence public.aff_research_papers_id_seq to authenticated;
grant usage on sequence public.aff_journals_id_seq to authenticated;
grant usage on sequence public.aff_articles_id_seq to authenticated;
grant usage on sequence public.aff_media_library_id_seq to authenticated;
grant usage on sequence public.aff_podcasts_id_seq to authenticated;
grant usage on sequence public.aff_editorial_reviews_id_seq to authenticated;
grant usage on sequence public.aff_copyright_registry_id_seq to authenticated;
grant usage on sequence public.aff_substack_archive_id_seq to authenticated;

notify pgrst, 'reload schema';
