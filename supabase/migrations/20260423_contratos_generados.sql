-- ═══════════════════════════════════════════════════════════════
-- Fase 6: Persistencia de contratos y formularios PDF generados
-- ═══════════════════════════════════════════════════════════════

-- ── Bucket privado para contratos y PDFs ───────────────────────
insert into storage.buckets (id, name, public)
values ('contratos-generados', 'contratos-generados', false)
on conflict (id) do nothing;

-- Solo admins pueden listar/leer archivos directamente
-- (la app normalmente usa service role + signed URLs)
drop policy if exists "admin_select_contratos_storage" on storage.objects;
create policy "admin_select_contratos_storage"
on storage.objects for select
to authenticated
using (
  bucket_id = 'contratos-generados'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ── Tabla de metadatos ─────────────────────────────────────────
create table if not exists public.contratos_generados (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,

  tipo_contrato     text,
  deudor_nombre     text,
  deudor_cc         text,
  num_deudores      integer,
  num_acreedores    integer,

  monto_total       bigint,
  plazo_meses       integer,
  tasa_mensual      text,
  cuota_mensual     bigint,
  comision_aluri    bigint,

  docx_path         text,   -- path dentro del bucket
  docx_filename     text,
  docx_size_bytes   bigint,

  pdf_path          text,
  pdf_filename      text,
  pdf_size_bytes    bigint,

  payload           jsonb   -- snapshot completo del formulario
);

create index if not exists contratos_generados_created_at_idx
  on public.contratos_generados (created_at desc);
create index if not exists contratos_generados_created_by_idx
  on public.contratos_generados (created_by);
create index if not exists contratos_generados_deudor_cc_idx
  on public.contratos_generados (deudor_cc);

-- RLS: solo admins pueden ver la tabla
-- Inserciones se hacen desde service role (bypasses RLS)
alter table public.contratos_generados enable row level security;

drop policy if exists "admin_select_contratos_generados" on public.contratos_generados;
create policy "admin_select_contratos_generados"
on public.contratos_generados for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admin_delete_contratos_generados" on public.contratos_generados;
create policy "admin_delete_contratos_generados"
on public.contratos_generados for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

comment on table public.contratos_generados is
  'Historial de contratos .docx y formularios .pdf generados desde el panel de documentos.
   Los archivos binarios viven en storage bucket "contratos-generados".';
