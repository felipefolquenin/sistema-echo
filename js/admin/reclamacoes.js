// Aba "Reclamações": filtrar, responder e mudar status.
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { STATUS } from "../config.js";
import { fmtData, msgErro } from "../util.js";
import { Vazio, SeloStatus, Botao, Campo } from "../components.js";

export function AbaReclamacoes({ condominios, reclamacoes, recarregar, avisar }) {
  const [filtro, setFiltro] = useState("todas");
  const [aberta, setAberta] = useState(null);
  const nomeCondo = Object.fromEntries(condominios.map((c) => [c.id, c.nome]));
  const lista = reclamacoes.filter((r) => filtro === "todas" || r.status === filtro);

  const filtros = [
    { v: "todas", l: `Todas (${reclamacoes.length})` },
    ...Object.entries(STATUS).map(([v, s]) => ({ v, l: `${s.i} ${s.l}` })),
  ];

  async function salvar(r, dados) {
    try { await api.atualizarReclamacao(r.id, dados); setAberta(null); avisar("✅ Reclamação atualizada"); recarregar(); }
    catch (e) { avisar("❌ " + msgErro(e)); }
  }

  async function excluir(r) {
    if (!confirm(`Excluir a reclamação de ${r.nome}? Isso não pode ser desfeito.`)) return;
    try { await api.excluirReclamacao(r); avisar("🗑️ Reclamação excluída"); recarregar(); }
    catch (e) { avisar("❌ " + msgErro(e)); }
  }

  return html`
    <div>
      <div class="filtros mb">
        ${filtros.map((f) => html`
          <button key=${f.v} class=${"chip " + (filtro === f.v ? "ativo" : "")} onClick=${() => setFiltro(f.v)}>${f.l}</button>`)}
      </div>
      ${!lista.length ? html`<${Vazio} titulo="Nenhuma reclamação" />` : html`
        <div class="pilha">
          ${lista.map((r) => html`
            <article key=${r.id} class="cartao-lista">
              <header class="cabeca-clara">
                <div>
                  <strong>${r.nome} · Apto ${r.apartamento}</strong>
                  <small>${nomeCondo[r.condominio_id] || "—"} · ${fmtData(r.criado_em)} · Código ${r.codigo}</small>
                </div>
                <div class="linha">
                  <${SeloStatus} status=${r.status} />
                  <button class="btn-mini" onClick=${() => setAberta(aberta === r.id ? null : r.id)}>${aberta === r.id ? "Fechar" : "Responder"}</button>
                </div>
              </header>
              <div class="corpo">
                <p>${r.descricao}</p>
                ${r.foto_url && html`<a href=${r.foto_url} target="_blank" rel="noopener"><img class="foto-miniatura" src=${r.foto_url} alt="Foto da reclamação" loading="lazy" /></a>`}
                ${r.resposta && html`<div class="resposta"><small>Resposta</small><p>${r.resposta}</p></div>`}
              </div>
              ${aberta === r.id && html`<${Responder} r=${r} salvar=${(d) => salvar(r, d)} excluir=${() => excluir(r)} />`}
            </article>`)}
        </div>`}
    </div>`;
}

function Responder({ r, salvar, excluir }) {
  const [status, setStatus] = useState(r.status);
  const [resposta, setResposta] = useState(r.resposta || "");
  const [salvando, setSalvando] = useState(false);

  async function enviar() {
    setSalvando(true);
    await salvar({ status, resposta: resposta.trim() || null });
    setSalvando(false);
  }

  return html`
    <div class="rodape-cartao pilha">
      <div>
        <span class="rotulo">Status</span>
        <div class="filtros">
          ${Object.entries(STATUS).map(([v, s]) => html`
            <button key=${v} class=${"chip " + (status === v ? "ativo " + s.cls : "")} onClick=${() => setStatus(v)}>${s.i} ${s.l}</button>`)}
        </div>
      </div>
      <${Campo} rotulo="Resposta para o morador">
        <textarea value=${resposta} onInput=${(e) => setResposta(e.target.value)} placeholder="Ex: Serviço realizado em 15/06…"></textarea>
      <//>
      <div class="linha entre">
        <button class="link-perigo" onClick=${excluir}>🗑️ Excluir</button>
        <${Botao} onClick=${enviar} carregando=${salvando}>💾 Salvar<//>
      </div>
    </div>`;
}
