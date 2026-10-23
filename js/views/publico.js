// Telas públicas: início, registrar reclamação e portal dos moradores.
import { html, useState, useEffect } from "../lib.js";
import * as api from "../api.js";
import { STATUS } from "../config.js";
import { fmtData, msgErro } from "../util.js";
import { Botao, Voltar, Vazio, Erro, Campo, SeletorFoto, SeloStatus, Carregando, FotosAntesDepois } from "../components.js";

export function Inicio() {
  return html`
    <div>
      <header class="hero">
        <div class="pilula">🌿 Echo Jardinagem</div>
        <h1>Portal dos<br /><span>Condomínios</span></h1>
        <p>Registre solicitações e acompanhe os resultados dos serviços de jardinagem.</p>
      </header>
      <main class="estreito pilha">
        <a class="cartao-acao" href="#/reclamacao">
          <div class="cartao-ico">📝</div>
          <strong>Registrar Reclamação</strong>
          <p>Informe um problema ou solicite um serviço. Sem cadastro necessário.</p>
          <span class="cartao-link">Acessar →</span>
        </a>
        <a class="cartao-acao escuro" href="#/moradores">
          <div class="cartao-ico">📸</div>
          <strong>Portal dos Moradores</strong>
          <p>Veja resultados dos serviços com fotos de antes e depois.</p>
          <span class="cartao-link">Acessar com código →</span>
        </a>
      </main>
      <footer class="rodape"><a href="#/admin">Área Administrativa</a></footer>
    </div>`;
}

export function NovaReclamacao() {
  const [conds, setConds] = useState(null);
  const [form, setForm] = useState({ condominioId: "", nome: "", apartamento: "", descricao: "" });
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    api.condominiosPublicos().then(setConds).catch((e) => { setConds([]); setErro(msgErro(e)); });
  }, []);

  const mudar = (campo) => (e) => { setForm({ ...form, [campo]: e.target.value }); setErro(""); };

  async function enviar(e) {
    e.preventDefault();
    if (!form.condominioId) return setErro("Selecione o condomínio.");
    if (!form.nome.trim()) return setErro("Digite seu nome.");
    if (!form.apartamento.trim()) return setErro("Digite seu apartamento.");
    if (!form.descricao.trim()) return setErro("Descreva a reclamação.");
    setEnviando(true);
    try { setCodigo(await api.registrarReclamacao({ ...form, foto })); }
    catch (err) { setErro(msgErro(err)); }
    finally { setEnviando(false); }
  }

  if (codigo) return html`
    <main class="estreito centro">
      <div class="cartao">
        <div class="ico-grande">✅</div>
        <h2>Reclamação enviada!</h2>
        <p class="suave">Guarde este código para consultar o andamento no Portal dos Moradores.</p>
        <div class="codigo-caixa">
          <small>Código de acompanhamento</small>
          <strong>${codigo}</strong>
        </div>
        <a class="btn btn-primario largo" href="#/">Voltar ao início</a>
      </div>
    </main>`;

  return html`
    <main class="estreito">
      <${Voltar} />
      <h2>📝 Registrar Reclamação</h2>
      <p class="suave mb">Sem necessidade de cadastro.</p>
      <form class="pilha" onSubmit=${enviar}>
        <${Campo} rotulo="Condomínio *">
          <select value=${form.condominioId} onChange=${mudar("condominioId")} disabled=${!conds}>
            <option value="">${conds ? "Selecione" : "Carregando…"}</option>
            ${(conds || []).map((c) => html`<option key=${c.id} value=${c.id}>${c.nome}</option>`)}
          </select>
        <//>
        <div class="grade-2">
          <${Campo} rotulo="Nome *"><input value=${form.nome} onInput=${mudar("nome")} placeholder="Seu nome" maxlength="120" /><//>
          <${Campo} rotulo="Apartamento *"><input value=${form.apartamento} onInput=${mudar("apartamento")} placeholder="Ex: 201" maxlength="30" /><//>
        </div>
        <${Campo} rotulo="Descrição *">
          <textarea value=${form.descricao} onInput=${mudar("descricao")} placeholder="Descreva o problema…" maxlength="3000"></textarea>
        <//>
        <div>
          <span class="rotulo">Foto (opcional)</span>
          <${SeletorFoto} valor=${foto} onChange=${setFoto} rotulo="Adicionar foto do problema" />
        </div>
        <${Erro}>${erro}<//>
        <${Botao} tipo="submit" carregando=${enviando} largo>📤 Enviar reclamação<//>
      </form>
    </main>`;
}

export function PortalMoradores() {
  const [codigo, setCodigo] = useState(() => sessionStorage.getItem("echo-codigo-condo") || "");
  const [condo, setCondo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e, cod = codigo) {
    e && e.preventDefault();
    if (!cod.trim()) return;
    setCarregando(true); setErro("");
    try {
      const c = await api.portalMorador(cod);
      if (!c) { setErro("Código incorreto."); sessionStorage.removeItem("echo-codigo-condo"); }
      else { setCondo(c); sessionStorage.setItem("echo-codigo-condo", cod.trim()); }
    } catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  // Volta direto se já entrou nesta aba do navegador
  useEffect(() => { if (codigo) entrar(null, codigo); }, []);

  if (condo) return html`<${PainelMorador} condo=${condo} codigoAcesso=${codigo}
    sairCondo=${() => { setCondo(null); setCodigo(""); sessionStorage.removeItem("echo-codigo-condo"); }} />`;

  if (carregando && !erro && codigo && !condo) return html`<${Carregando} />`;

  return html`
    <main class="estreito centro">
      <${Voltar} />
      <form class="cartao" onSubmit=${entrar}>
        <div class="ico-grande">🔐</div>
        <h2>Portal dos Moradores</h2>
        <p class="suave mb">Digite o código de acesso do seu condomínio.</p>
        <input class="entrada-codigo" value=${codigo} placeholder="Código" autocomplete="off"
               onInput=${(e) => { setCodigo(e.target.value); setErro(""); }} />
        <${Erro}>${erro}<//>
        <${Botao} tipo="submit" carregando=${carregando} largo>Entrar →<//>
      </form>
    </main>`;
}

function PainelMorador({ condo, codigoAcesso, sairCondo }) {
  const [aba, setAba] = useState("resultados");
  const pubs = condo.publicacoes || [];
  return html`
    <div class="largo-max">
      <header class="topo">
        <button class="topo-voltar" onClick=${sairCondo}>← Sair</button>
        <div class="topo-sup">🌿 Portal dos Moradores</div>
        <h1>${condo.nome}</h1>
      </header>
      <nav class="abas">
        <button class=${aba === "resultados" ? "ativa" : ""} onClick=${() => setAba("resultados")}>📸 Resultados (${pubs.length})</button>
        <button class=${aba === "status" ? "ativa" : ""} onClick=${() => setAba("status")}>🔍 Minha reclamação</button>
      </nav>
      <div class="conteudo">
        ${aba === "resultados" && (pubs.length
          ? html`<div class="pilha">${pubs.map((p) => html`
              <article key=${p.id} class="cartao-post">
                <header><strong>${p.titulo}</strong><small>${fmtData(p.criado_em)}</small></header>
                <${FotosAntesDepois} antes=${p.foto_antes_url} depois=${p.foto_depois_url} />
                ${p.descricao && html`<p>${p.descricao}</p>`}
              </article>`)}</div>`
          : html`<${Vazio} icone="📷" titulo="Nenhum resultado publicado ainda" sub="Os resultados aparecerão aqui em breve" />`)}
        ${aba === "status" && html`<${ConsultaReclamacao} codigoAcesso=${codigoAcesso} />`}
      </div>
    </div>`;
}

function ConsultaReclamacao({ codigoAcesso }) {
  const [codigo, setCodigo] = useState("");
  const [res, setRes] = useState(undefined); // undefined = não buscou; null = não achou
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function buscar(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setCarregando(true); setErro("");
    try { setRes(await api.consultarReclamacao(codigoAcesso, codigo)); }
    catch (err) { setErro(msgErro(err)); }
    finally { setCarregando(false); }
  }

  const st = res && (STATUS[res.status] || STATUS.pendente);
  return html`
    <div>
      <p class="suave mb">Digite o código recebido ao enviar a reclamação.</p>
      <form class="linha mb" onSubmit=${buscar}>
        <input value=${codigo} placeholder="Código" autocomplete="off"
               onInput=${(e) => { setCodigo(e.target.value); setRes(undefined); }} />
        <${Botao} tipo="submit" carregando=${carregando}>Buscar<//>
      </form>
      <${Erro}>${erro}<//>
      ${res === null && html`<${Erro}>Código não encontrado.<//>`}
      ${res && html`
        <div class="cartao-lista">
          <div class=${"faixa-status " + st.cls}><${SeloStatus} status=${res.status} /><small>${fmtData(res.criado_em)}</small></div>
          <div class="corpo">
            <p>${res.descricao}</p>
            ${res.foto_url && html`<img class="foto-larga" src=${res.foto_url} alt="Foto enviada" />`}
            ${res.resposta && html`
              <div class="resposta">
                <small>💬 Resposta Echo Jardinagem</small>
                <p>${res.resposta}</p>
              </div>`}
          </div>
        </div>`}
    </div>`;
}
