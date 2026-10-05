-- Everything the site needs in Supabase, in one go.
-- In your Supabase project: SQL Editor -> New query -> paste ALL of this -> Run.
-- (Run it once. Running it a second time gives "already exists" errors, which
-- just means it's already set up.)

-- ===================== comments (portfolio page) =====================

create table public.comments (
  id bigint generated always as identity primary key,
  post_id text not null check (char_length(post_id) between 1 and 50),
  username text not null check (username ~ '^[A-Za-z0-9._]{1,30}$'),
  email text not null check (
    char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

-- anyone can read comments and add one, but not edit or delete them
create policy "anyone can read comments"
  on public.comments for select to anon using (true);
create policy "anyone can add a comment"
  on public.comments for insert to anon with check (true);

-- keep emails private: visitors can read every column except email
revoke all on public.comments from anon, authenticated;
grant select (id, post_id, username, body, created_at) on public.comments to anon;
grant insert (post_id, username, email, body) on public.comments to anon;

-- ===================== likes (portfolio page) =====================

create table public.post_likes (
  post_id text primary key check (char_length(post_id) between 1 and 50),
  likes bigint not null default 0 check (likes >= 0)
);

alter table public.post_likes enable row level security;

-- anyone can read the counts
create policy "anyone can read likes"
  on public.post_likes for select to anon using (true);
revoke all on public.post_likes from anon, authenticated;
grant select (post_id, likes) on public.post_likes to anon;

-- visitors can't write to the table directly; they can only add likes through
-- this function, at most 100 at a time, and never subtract
create function public.add_likes(p_post_id text, p_count int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into post_likes (post_id, likes)
  values (p_post_id, least(greatest(p_count, 1), 100))
  on conflict (post_id) do update set likes = post_likes.likes + excluded.likes;
$$;

revoke execute on function public.add_likes(text, int) from public;
grant execute on function public.add_likes(text, int) to anon;

-- ===================== blog posts + photo storage (blog-admin.html) =====================

create table public.blog_posts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 100),
  date date not null,
  photo_url text not null,
  journal text not null check (char_length(journal) between 1 and 300),
  created_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

-- everyone can read the blog; only you can add or delete entries
create policy "anyone can read the blog"
  on public.blog_posts for select to anon, authenticated using (true);
create policy "only ren can post"
  on public.blog_posts for insert to authenticated
  with check (auth.jwt() ->> 'email' = 'renran@hackclub.com');
create policy "only ren can delete"
  on public.blog_posts for delete to authenticated
  using (auth.jwt() ->> 'email' = 'renran@hackclub.com');

-- a public bucket for the photos (anyone can view, only you can upload/delete)
insert into storage.buckets (id, name, public) values ('blog-photos', 'blog-photos', true);
create policy "only ren can upload blog photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-photos' and auth.jwt() ->> 'email' = 'renran@hackclub.com');
create policy "only ren can delete blog photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-photos' and auth.jwt() ->> 'email' = 'renran@hackclub.com');
