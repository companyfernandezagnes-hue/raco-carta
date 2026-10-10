-- Jueves de Bodega: bodega invitada de la semana + sus vinos en promo.
-- (Ya aplicado en Supabase; se deja aquí como referencia.)

create table if not exists public.bodegas_invitadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_jueves date,
  region text,
  logo_url text,
  web text,
  descripcion text,
  descripcion_ca text,
  descripcion_en text,
  descripcion_de text,
  activa boolean default false,          -- solo una activa a la vez
  cerrada_en timestamptz,                -- null + activa=false + fecha futura = PROGRAMADA
  precio_cata numeric default 18,        -- precio de la cata del jueves (opcional; si no existe la app usa 18)
  created_at timestamptz default now()
);

alter table public.bodegas_invitadas enable row level security;
drop policy if exists lectura_publica_bodegas on public.bodegas_invitadas;
create policy lectura_publica_bodegas on public.bodegas_invitadas for select using (true);

alter table public.carta_bebidas
  add column if not exists bodega_invitada_id uuid references public.bodegas_invitadas(id),
  add column if not exists precio_promo_copa numeric,
  add column if not exists precio_promo_botella numeric,
  add column if not exists stock_promo integer;
