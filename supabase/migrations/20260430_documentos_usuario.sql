-- ═══════════════════════════════════════════════════════════════
-- Documentos por usuario (panel admin)
-- Bucket privado + tabla de metadatos. Solo admins acceden.
-- ═══════════════════════════════════════════════════════════════

-- ── Bucket privado para documentos personales ─────────────────
insert into storage.buckets (id, name, public)
values ('user-documents', 'user-documents', false)
on conflict (id) do nothing;

-- Solo admins pueden listar/leer archivos directamente
-- (la app usa service role + signed URLs para servirlos)
drop policy if exists "admin_select_user_documents_storage" on storage.objects;
create policy "admin_select_user_documents_storage"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admin_insert_user_documents_storage" on storage.objects;
create policy "admin_insert_user_documents_storage"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admin_delete_user_documents_storage" on storage.objects;
create policy "admin_delete_user_documents_storage"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ── Tabla de metadatos ────────────────────────────────────────
create table if not exists public.documentos_usuario (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tipo          text not null,
  storage_path  text not null,
  file_name     text not null,
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid references auth.users(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create index if not exists documentos_usuario_user_id_idx
  on public.documentos_usuario (user_id);
create index if not exists documentos_usuario_user_tipo_idx
  on public.documentos_usuario (user_id, tipo);
create index if not exists documentos_usuario_uploaded_at_idx
  on public.documentos_usuario (uploaded_at desc);

-- ── RLS: solo admins ──────────────────────────────────────────
alter table public.documentos_usuario enable row level security;

drop policy if exists "admin_select_documentos_usuario" on public.documentos_usuario;
create policy "admin_select_documentos_usuario"
on public.documentos_usuario for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admin_insert_documentos_usuario" on public.documentos_usuario;
create policy "admin_insert_documentos_usuario"
on public.documentos_usuario for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admin_delete_documentos_usuario" on public.documentos_usuario;
create policy "admin_delete_documentos_usuario"
on public.documentos_usuario for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

comment on table public.documentos_usuario is
  'Documentos personales (cedula, RUT, escritura, extractos, etc.) asociados a cada perfil.
   Los archivos viven en el bucket privado "user-documents" bajo el path {user_id}/{tipo}/{archivo}.';
