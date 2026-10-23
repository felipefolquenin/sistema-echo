// =====================================================================
// Camada de dados — TODO acesso ao Supabase passa por aqui.
// As telas nunca falam com o banco direto; assim, se algo mudar no
// banco, só este arquivo precisa ser ajustado.
// =====================================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configurado =
  /^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

// Lido antes do Supabase limpar o endereço: a pessoa abriu o link "criar nova senha"?
export const veioDoLinkDeSenha = /type=recovery/.test(location.hash);

const sb = configurado
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const BUCKET = "fotos";

// Nome único para cada foto (crypto.randomUUID só existe em HTTPS, então tem plano B)
const idUnico = () =>
  crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => n.toString(16).padStart(2, "0")).join("");

// Desembrulha a resposta do Supabase: devolve os dados ou lança o erro
function ok({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------
export async function enviarFoto(blob, pasta) {
  const caminho = `${pasta}/${idUnico()}.jpg`;
  ok(await sb.storage.from(BUCKET).upload(caminho, blob, { contentType: "image/jpeg", upsert: false }));
  return sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

async function apagarFotos(urls) {
  const caminhos = urls
    .filter(Boolean)
    .map((u) => u.split(`/object/public/${BUCKET}/`)[1])
    .filter(Boolean);
  if (caminhos.length) await sb.storage.from(BUCKET).remove(caminhos); // falha aqui não é grave
}

// ---------------------------------------------------------------------
// Público (sem login)
// ---------------------------------------------------------------------
export async function condominiosPublicos() {
  return ok(await sb.rpc("condominios_publicos"));
}

export async function registrarReclamacao({ condominioId, nome, apartamento, descricao, foto }) {
  const fotoUrl = foto ? await enviarFoto(foto, "reclamacoes") : null;
  return ok(
    await sb.rpc("registrar_reclamacao", {
      p_condominio_id: condominioId,
      p_nome: nome,
      p_apartamento: apartamento,
      p_descricao: descricao,
      p_foto_url: fotoUrl,
    })
  );
}

export async function portalMorador(codigoAcesso) {
  return ok(await sb.rpc("portal_morador", { p_codigo_acesso: codigoAcesso }));
}

export async function consultarReclamacao(codigoAcesso, codigo) {
  return ok(await sb.rpc("consultar_reclamacao", { p_codigo_acesso: codigoAcesso, p_codigo: codigo }));
}

// ---------------------------------------------------------------------
// Login do administrador
// ---------------------------------------------------------------------
export async function entrar(email, senha) {
  ok(await sb.auth.signInWithPassword({ email: email.trim(), password: senha }));
  if (!(await souAdmin())) {
    await sb.auth.signOut();
    throw new Error("Este usuário não está cadastrado como administrador.");
  }
}

export async function sair() {
  await sb.auth.signOut();
}

export async function souAdmin() {
  return !!ok(await sb.rpc("sou_admin"));
}

export async function sessaoAtual() {
  return ok(await sb.auth.getSession()).session;
}

// cb(evento, sessao) — evento "PASSWORD_RECOVERY" quando abre o link de nova senha
export function aoMudarLogin(cb) {
  const { data } = sb.auth.onAuthStateChange((evento, sessao) => cb(evento, sessao));
  return () => data.subscription.unsubscribe();
}

export async function recuperarSenha(email) {
  const volta = location.origin + location.pathname;
  ok(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: volta }));
}

export async function trocarSenha(novaSenha) {
  ok(await sb.auth.updateUser({ password: novaSenha }));
}

// ---------------------------------------------------------------------
// Condomínios + serviços (admin)
// ---------------------------------------------------------------------
export async function listarCondominios() {
  const rows = ok(
    await sb.from("condominios").select("*, servicos(*)").order("nome")
  );
  rows.forEach((c) => c.servicos.sort((a, b) => a.ordem - b.ordem));
  return rows;
}

// Salva o condomínio e sincroniza a lista de serviços (mantém o
// histórico do checklist dos serviços que continuam).
export async function salvarCondominio(cond, servicos) {
  const { id, nome, endereco, contato, telefone, plano, codigo_acesso, ativo } = cond;
  const dados = { nome: nome.trim(), endereco, contato, telefone, plano, ativo,
                  codigo_acesso: codigo_acesso.trim().toLowerCase() };

  const salvo = id
    ? ok(await sb.from("condominios").update(dados).eq("id", id).select().single())
    : ok(await sb.from("condominios").insert(dados).select().single());

  const antigos = id ? ok(await sb.from("servicos").select("id").eq("condominio_id", salvo.id)) : [];
  const manter = new Set(servicos.filter((s) => s.id).map((s) => s.id));
  const remover = antigos.map((s) => s.id).filter((x) => !manter.has(x));
  if (remover.length) ok(await sb.from("servicos").delete().in("id", remover));

  const linhas = servicos.map((s, i) => ({
    ...(s.id ? { id: s.id } : {}),
    condominio_id: salvo.id,
    nome: s.nome,
    frequencia: s.frequencia,
    dias_semana: s.dias_semana || [],
    semana: s.semana || "impar",
    dia_mes: s.frequencia === "Mensal" ? s.dia_mes || 1 : null,
    ordem: i,
  }));
  const existentes = linhas.filter((l) => l.id);
  const novos = linhas.filter((l) => !l.id);
  if (existentes.length) ok(await sb.from("servicos").upsert(existentes));
  if (novos.length) ok(await sb.from("servicos").insert(novos));
  return salvo;
}

export async function excluirCondominio(id) {
  ok(await sb.from("condominios").delete().eq("id", id));
}

// ---------------------------------------------------------------------
// Checklist mensal
// ---------------------------------------------------------------------
export async function feitosDoMes(mes) {
  const rows = ok(await sb.from("servicos_feitos").select("servico_id").eq("mes", mes));
  return new Set(rows.map((r) => r.servico_id));
}

export async function marcarFeito(servicoId, mes, feito) {
  if (feito) ok(await sb.from("servicos_feitos").upsert({ servico_id: servicoId, mes }));
  else ok(await sb.from("servicos_feitos").delete().eq("servico_id", servicoId).eq("mes", mes));
}

// ---------------------------------------------------------------------
// Reclamações (admin)
// ---------------------------------------------------------------------
export async function listarReclamacoes() {
  return ok(await sb.from("reclamacoes").select("*").order("criado_em", { ascending: false }));
}

export async function atualizarReclamacao(id, { status, resposta }) {
  ok(await sb.from("reclamacoes").update({ status, resposta }).eq("id", id));
}

export async function excluirReclamacao(r) {
  ok(await sb.from("reclamacoes").delete().eq("id", r.id));
  await apagarFotos([r.foto_url]);
}

// ---------------------------------------------------------------------
// Publicações antes/depois (admin)
// ---------------------------------------------------------------------
export async function listarPublicacoes() {
  return ok(await sb.from("publicacoes").select("*").order("criado_em", { ascending: false }));
}

export async function criarPublicacao({ condominioId, titulo, descricao, fotoAntes, fotoDepois }) {
  const [antes, depois] = await Promise.all([
    fotoAntes ? enviarFoto(fotoAntes, "publicacoes") : null,
    fotoDepois ? enviarFoto(fotoDepois, "publicacoes") : null,
  ]);
  ok(await sb.from("publicacoes").insert({
    condominio_id: condominioId, titulo: titulo.trim(), descricao: descricao.trim() || null,
    foto_antes_url: antes, foto_depois_url: depois,
  }));
}

export async function excluirPublicacao(p) {
  ok(await sb.from("publicacoes").delete().eq("id", p.id));
  await apagarFotos([p.foto_antes_url, p.foto_depois_url]);
}

// ---------------------------------------------------------------------
// Lembretes de visita
// ---------------------------------------------------------------------
export async function lembretesEnviados(chaves) {
  if (!chaves.length) return {};
  const rows = ok(await sb.from("lembretes").select("*").in("chave", chaves));
  return Object.fromEntries(rows.map((r) => [r.chave, r]));
}

export async function registrarLembrete(chave, sucesso) {
  ok(await sb.from("lembretes").upsert({ chave, ok: sucesso, enviado_em: new Date().toISOString() }));
}

// ---------------------------------------------------------------------
// Importar dados do sistema antigo (que ficavam salvos só no navegador)
// ---------------------------------------------------------------------
function lerAntigo(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || "null"); } catch { return null; }
}

export function temDadosAntigos() {
  return ["u-conds", "u-complaints", "u-posts"].some((k) => (lerAntigo(k) || []).length > 0);
}

async function dataUrlParaBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

async function migrarFoto(valor, pasta) {
  if (!valor) return null;
  if (!valor.startsWith("data:")) return valor; // já era um link
  return enviarFoto(await dataUrlParaBlob(valor), pasta);
}

const STATUS_ANTIGO = { pending: "pendente", in_progress: "andamento", resolved: "resolvida" };

export async function importarDadosAntigos(progresso = () => {}) {
  const conds = lerAntigo("u-conds") || [];
  const recls = lerAntigo("u-complaints") || [];
  const posts = lerAntigo("u-posts") || [];
  const mapa = {}; // id antigo → id novo
  const total = { condominios: 0, reclamacoes: 0, publicacoes: 0 };

  // Se a importação parou no meio e for rodada de novo, não duplica condomínios
  const jaExistem = Object.fromEntries((await listarCondominios()).map((c) => [c.codigo_acesso, c.id]));

  for (const c of conds) {
    progresso(`Condomínio: ${c.nome}`);
    const cod = (c.code || "").trim().toLowerCase();
    if (cod && jaExistem[cod]) { mapa[c.id] = jaExistem[cod]; continue; }
    const salvo = await salvarCondominio(
      { nome: c.nome, endereco: c.endereco || null, contato: c.contato || null,
        telefone: c.telefone || null, plano: c.plano || "Essencial",
        codigo_acesso: c.code || Math.random().toString(36).slice(2, 8), ativo: c.ativo !== false },
      (c.servicos || []).map((s) => ({
        nome: s.nome, frequencia: s.freq || "Semanal",
        dias_semana: s.agendamento?.diasSemana || [], semana: s.agendamento?.semPar || "impar",
        dia_mes: s.agendamento?.diaMes || null,
      }))
    );
    mapa[c.id] = salvo.id;
    total.condominios++;
  }

  for (const r of recls) {
    if (!mapa[r.condoId]) continue;
    progresso(`Reclamação de ${r.name}`);
    ok(await sb.from("reclamacoes").upsert({
      codigo: String(r.id).toUpperCase(), condominio_id: mapa[r.condoId],
      nome: r.name, apartamento: r.apt, descricao: r.desc,
      foto_url: await migrarFoto(r.photoUrl, "reclamacoes"),
      status: STATUS_ANTIGO[r.status] || "pendente", resposta: r.adminNote || null,
      criado_em: r.date,
    }, { onConflict: "codigo", ignoreDuplicates: true }));
    total.reclamacoes++;
  }

  for (const p of posts) {
    if (!mapa[p.condoId]) continue;
    progresso(`Publicação: ${p.title}`);
    ok(await sb.from("publicacoes").insert({
      condominio_id: mapa[p.condoId], titulo: p.title, descricao: p.desc || null,
      foto_antes_url: await migrarFoto(p.beforeUrl, "publicacoes"),
      foto_depois_url: await migrarFoto(p.afterUrl, "publicacoes"),
      criado_em: p.date,
    }));
    total.publicacoes++;
  }

  // Limpa para não importar duas vezes e tenta guardar uma cópia de segurança
  ["u-conds", "u-complaints", "u-posts", "u-settings", "u-notifs"].forEach((k) => localStorage.removeItem(k));
  try {
    localStorage.setItem("echo-backup-antigo", JSON.stringify({ conds, recls, posts, em: new Date() }));
  } catch { /* sem espaço: tudo já está no banco, então tudo bem */ }
  return total;
}
