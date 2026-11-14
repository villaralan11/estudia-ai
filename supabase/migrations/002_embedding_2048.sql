-- 002: embeddings de 2048 dims (nvidia/nemotron-3.5-embed-1b)
-- El modelo del plan (nv-embedqa-e5-v5, 1024 dims) llegó a fin de vida (2026-08-25);
-- su reemplazo disponible en la API es nemotron-3.5-embed-1b con 2048 dims.
-- pgvector limita HNSW sobre vector a 2000 dims, así que el índice se construye
-- sobre halfvec(2048) (mitad de precisión, misma búsqueda coseno).
drop index if exists chunks_embedding_idx;
alter table chunks alter column embedding type vector(2048);
create index chunks_embedding_idx on chunks using hnsw ((embedding::halfvec(2048)) halfvec_cosine_ops);

drop function if exists match_chunks(vector(1024), uuid, int);

create or replace function match_chunks(
  query_embedding vector(2048),
  doc_id uuid,
  match_count int default 5
) returns table (id uuid, contenido text, similitud float)
language sql stable as $$
  select c.id, c.contenido,
         1 - (c.embedding::halfvec(2048) <=> (query_embedding::halfvec(2048))) as similitud
  from chunks c
  where c.document_id = doc_id
  order by (c.embedding::halfvec(2048)) <=> (query_embedding::halfvec(2048))
  limit match_count;
$$;

grant execute on function match_chunks(vector(2048), uuid, int) to authenticated;
