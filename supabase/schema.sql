-- =====================================================================
-- Echo Jardinagem — Portal dos Condomínios
-- Banco de dados (Supabase / Postgres)
--
-- COMO USAR: no painel do Supabase, abra "SQL Editor" → "New query",
-- cole este arquivo inteiro e clique em "Run". Pode rodar de novo sem
-- problema: ele não apaga dados existentes.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Administradores: só quem estiver nesta lista acessa o painel.
-- (Criar conta no Supabase não basta — o e-mail tem que estar aqui.)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Gera códigos curtos sem letras confusas (sem 0/O, 1/I/L)
create or replace function public.gerar_codigo(tamanho int default 6)
returns text
language sql volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), ''
  )
  from generate_series(1, tamanho);
$$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.condominios (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (length(trim(nome)) > 0),
  endereco       text,
  contato        text,
  telefone       text,
  plano          text not null default 'Essencial'
                 check (plano in ('Essencial', 'Profissional', 'Premium')),
  codigo_acesso  text not null unique default lower(public.gerar_codigo(6)),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);

create table if not exists public.servicos (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominios(id) on delete cascade,
  nome           text not null,
  frequencia     text not null default 'Semanal'
                 check (frequencia in ('Semanal', 'Quinzenal', 'Mensal')),
  dias_semana    smallint[] not null default '{}',   -- 0=Dom ... 6=Sáb
  semana         text not null default 'impar' check (semana in ('par', 'impar')),
  dia_mes        smallint check (dia_mes between 1 and 31),
  ordem          int not null default 0
);
create index if not exists servicos_condominio_idx on public.servicos(condominio_id);

-- Checklist do mês: uma linha = serviço marcado como feito naquele mês
create table if not exists public.servicos_feitos (
  servico_id  uuid not null references public.servicos(id) on delete cascade,
  mes         text not null check (mes ~ '^\d{4}-\d{2}$'),     -- ex: 2026-10
  feito_em    timestamptz not null default now(),
  primary key (servico_id, mes)
);

create table if not exists public.reclamacoes (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique default public.gerar_codigo(6),
  condominio_id  uuid not null references public.condominios(id) on delete cascade,
  nome           text not null,
  apartamento    text not null,
  descricao      text not null,
  foto_url       text,
  status         text not null default 'pendente'
                 check (status in ('pendente', 'andamento', 'resolvida')),
  resposta       text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists reclamacoes_condominio_idx on public.reclamacoes(condominio_id);

create table if not exists public.publicacoes (
  id               uuid primary key default gen_random_uuid(),
  condominio_id    uuid not null references public.condominios(id) on delete cascade,
  titulo           text not null,
  descricao        text,
  foto_antes_url   text,
  foto_depois_url  text,
  criado_em        timestamptz not null default now()
);
create index if not exists publicacoes_condominio_idx on public.publicacoes(condominio_id);

-- Lembretes de visita já enviados por e-mail (evita mandar duas vezes)
create table if not exists public.lembretes (
  chave       text primary key,          -- servico_id|AAAA-MM-DD
  ok          boolean not null,
  enviado_em  timestamptz not null default now()
);

-- Atualiza "atualizado_em" sozinho quando a reclamação muda
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists reclamacoes_atualizado on public.reclamacoes;
create trigger reclamacoes_atualizado
  before update on public.reclamacoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Segurança (RLS): o público NÃO lê nem altera tabelas diretamente.
-- Tudo que é público passa pelas funções lá embaixo.
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.condominios     enable row level security;
alter table public.servicos        enable row level security;
alter table public.servicos_feitos enable row level security;
alter table public.reclamacoes     enable row level security;
alter table public.publicacoes     enable row level security;
alter table public.lembretes       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['condominios','servicos','servicos_feitos',
                           'reclamacoes','publicacoes','lembretes']
  loop
    execute format('drop policy if exists "admin_total" on public.%I', t);
    execute format(
      'create policy "admin_total" on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Funções públicas (usadas pelo site sem login)
-- ---------------------------------------------------------------------

-- Lista de condomínios para o formulário de reclamação (só id e nome)
create or replace function public.condominios_publicos()
returns table (id uuid, nome text)
language sql stable security definer
set search_path = public
as $$
  select c.id, c.nome from public.condominios c
  where c.ativo order by c.nome;
$$;

-- Registra uma reclamação e devolve o código de acompanhamento
create or replace function public.registrar_reclamacao(
  p_condominio_id uuid,
  p_nome          text,
  p_apartamento   text,
  p_descricao     text,
  p_foto_url      text default null
)
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare v_codigo text;
begin
  if not exists (select 1 from public.condominios where id = p_condominio_id and ativo) then
    raise exception 'Condomínio inválido';
  end if;
  if length(trim(coalesce(p_nome, ''))) = 0
     or length(trim(coalesce(p_apartamento, ''))) = 0
     or length(trim(coalesce(p_descricao, ''))) = 0 then
    raise exception 'Preencha todos os campos obrigatórios';
  end if;
  if length(p_nome) > 120 or length(p_apartamento) > 30 or length(p_descricao) > 3000 then
    raise exception 'Texto muito longo';
  end if;

  insert into public.reclamacoes (condominio_id, nome, apartamento, descricao, foto_url)
  values (p_condominio_id, trim(p_nome), trim(p_apartamento), trim(p_descricao),
          nullif(trim(coalesce(p_foto_url, '')), ''))
  returning codigo into v_codigo;

  return v_codigo;
end $$;

-- Portal dos moradores: entra com o código do condomínio
create or replace function public.portal_morador(p_codigo_acesso text)
returns json
language sql stable security definer
set search_path = public
as $$
  select json_build_object(
    'id', c.id,
    'nome', c.nome,
    'publicacoes', coalesce((
      select json_agg(json_build_object(
               'id', p.id, 'titulo', p.titulo, 'descricao', p.descricao,
               'foto_antes_url', p.foto_antes_url, 'foto_depois_url', p.foto_depois_url,
               'criado_em', p.criado_em)
             order by p.criado_em desc)
      from public.publicacoes p where p.condominio_id = c.id
    ), '[]'::json)
  )
  from public.condominios c
  where c.ativo and lower(c.codigo_acesso) = lower(trim(p_codigo_acesso));
$$;

-- Morador consulta o status da reclamação (precisa dos dois códigos)
create or replace function public.consultar_reclamacao(p_codigo_acesso text, p_codigo text)
returns json
language sql stable security definer
set search_path = public
as $$
  select json_build_object(
    'codigo', r.codigo, 'descricao', r.descricao, 'foto_url', r.foto_url,
    'status', r.status, 'resposta', r.resposta, 'criado_em', r.criado_em)
  from public.reclamacoes r
  join public.condominios c on c.id = r.condominio_id
  where lower(c.codigo_acesso) = lower(trim(p_codigo_acesso))
    and upper(r.codigo) = upper(trim(p_codigo));
$$;

-- Diz ao painel se quem logou é administrador
create or replace function public.sou_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select public.is_admin(); $$;

revoke all on function public.registrar_reclamacao(uuid, text, text, text, text) from public;
revoke all on function public.portal_morador(text) from public;
revoke all on function public.consultar_reclamacao(text, text) from public;
revoke all on function public.condominios_publicos() from public;
grant execute on function public.registrar_reclamacao(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.portal_morador(text) to anon, authenticated;
grant execute on function public.consultar_reclamacao(text, text) to anon, authenticated;
grant execute on function public.condominios_publicos() to anon, authenticated;
grant execute on function public.sou_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Fotos (Storage): pasta pública "fotos", até 5 MB por imagem.
-- Visitantes só podem ENVIAR para fotos/reclamacoes/. O resto é do admin.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos_publico_envia_reclamacao" on storage.objects;
create policy "fotos_publico_envia_reclamacao" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'reclamacoes');

drop policy if exists "fotos_admin_total" on storage.objects;
create policy "fotos_admin_total" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos' and public.is_admin())
  with check (bucket_id = 'fotos' and public.is_admin());

-- ---------------------------------------------------------------------
-- Seu e-mail de administrador (troque se for usar outro)
-- ---------------------------------------------------------------------
insert into public.admins (email) values ('felipefolqueninrio@gmail.com')
on conflict do nothing;
