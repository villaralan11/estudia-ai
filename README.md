# estudia-ai

App tipo NotebookLM: subes archivos (PDF/TXT/MD), chateas con una IA que responde **solo** con el contenido de tus documentos (RAG) y generas cuestionarios para estudiar.

- **Frontend:** React + Vite + Router (Atomic Design)
- **Backend:** Node 20 + Express (ESM)
- **Datos:** Supabase — Postgres + pgvector, Auth, Storage, RLS en todas las tablas
- **IA:** NVIDIA NIM (API compatible con OpenAI)

> README completo al final del proyecto (diagrama, endpoints, deploy, Lighthouse).

## Desarrollo rápido

```bash
npm run install:all
cp server/.env.example server/.env   # llena las variables
cp client/.env.example client/.env   # llena las variables
npm run dev
```
