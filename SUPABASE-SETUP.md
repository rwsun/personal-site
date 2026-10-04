# Turning on shared likes and comments (portfolio page)

Until this is done, likes and comments on `portfolio.html` are only saved in
each visitor's own browser. These steps connect a free Supabase database so
everyone sees each other's likes and comments. It takes about 10 minutes.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Pick any name and database password, choose a region near you, and create it.

## 2. Create the comments table

In your project, open **SQL Editor**, paste all of this, and click **Run**:

```sql
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
```

## 3. Create the likes table

Still in **SQL Editor**, open a new query, paste this, and click **Run**:

```sql
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
```

## 4. Connect the site

1. In Supabase, open **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Paste them into the top of `portfolio.js`:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

The anon key is designed to be public, so it's safe to commit. Never put the
**service_role** key in the site: that one bypasses all the rules above.

## Looking after likes and comments

- **Change a like count:** Table Editor → `post_likes`, edit the `likes` cell.

- **See commenters' emails:** Table Editor → `comments`. Only you, logged in to
  Supabase, can see the email column.
- **Delete a comment:** select its row in the Table Editor and delete it.
  Visitors can't edit or delete comments themselves.
- **Spam:** there's no captcha. If spam shows up, delete it in the Table Editor,
  and ask Claude to add rate limiting or a captcha.
- **Privacy:** you're storing commenters' email addresses, so only use them to
  reply to people, and delete them if someone asks.
