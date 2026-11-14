-- estudia-ai · migración inicial
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  archivo_path text not null,
  creado_en timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  contenido text not null,
  embedding vector(1024)
);

create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index chunks_document_idx on chunks (document_id);
create index documents_user_idx on documents (user_id);

create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  creado_en timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  rol text not null check (rol in ('user','ai')),
  contenido text not null,
  creado_en timestamptz default now()
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  creado_en timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  pregunta text not null,
  opciones jsonb not null,
  correcta int not null,
  explicacion text
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  puntaje int not null,
  total int not null,
  creado_en timestamptz default now()
);

create index chats_user_idx on chats (user_id);
create index chats_document_idx on chats (document_id);
create index messages_chat_idx on messages (chat_id);
create index quizzes_user_idx on quizzes (user_id);
create index quizzes_document_idx on quizzes (document_id);
create index questions_quiz_idx on questions (quiz_id);
create index attempts_user_idx on attempts (user_id);

-- RLS: cada usuario solo ve y modifica lo suyo
alter table documents enable row level security;
alter table chunks    enable row level security;
alter table chats     enable row level security;
alter table messages  enable row level security;
alter table quizzes   enable row level security;
alter table questions enable row level security;
alter table attempts  enable row level security;

create policy "docs propios" on documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chats propios" on chats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quizzes propios" on quizzes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attempts propios" on attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chunks propios" on chunks for all
  using (exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid()))
  with check (exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid()));

create policy "messages propios" on messages for all
  using (exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()));

create policy "questions propias" on questions for all
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()))
  with check (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()));

-- Búsqueda semántica (corre con los permisos del usuario, así que RLS aplica)
create or replace function match_chunks(
  query_embedding vector(1024),
  doc_id uuid,
  match_count int default 5
) returns table (id uuid, contenido text, similitud float)
language sql stable as $$
  select c.id, c.contenido, 1 - (c.embedding <=> query_embedding) as similitud
  from chunks c
  where c.document_id = doc_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Bucket privado; los archivos van en {user_id}/{archivo}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos', 'archivos', false, 10485760, array['application/pdf','text/plain','text/markdown'])
on conflict (id) do nothing;

create policy "archivos propios" on storage.objects for all
  using (bucket_id = 'archivos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'archivos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Permisos explícitos: anon no escribe nada; authenticated opera con RLS.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function match_chunks(vector(1024), uuid, int) to authenticated;
