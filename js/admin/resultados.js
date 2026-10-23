// Aba "Resultados": publicações com fotos de antes e depois.
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { fmtData, msgErro } from "../util.js";
import { Botao, Campo, SeletorFoto, Erro } from "../components.js";

const VAZIO = { condominioId: "", titulo: "", descricao: "" };

export function AbaResultados({ condominios, publicacoes, recarregar, avisar }) {
  const [form, setForm] = useState(VAZIO);
  const [antes, setAntes] = useState(null);
  const [depois, setDepois] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState("");
  const nomeCondo = Object.fromEntries(condominios.map((c) => [c.id, c.nome]));
  const mudar = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErro(""); };

  async function publicar(e) {
    e.preventDefault();
    if (!form.condominioId) return setErro("Selecione o condomínio.");
    if (!form.titulo.trim()) return setErro("Dê um título à publicação.");
    setPublicando(true);
    try {
      await api.criarPublicacao({ ...form, fotoAntes: antes, fotoDepois: depois });
      setForm(VAZIO); setAntes(null); setDepois(null);
      avisar("✅ Publicado no portal dos moradores");
      recarregar();
    } catch (err) { setErro(msgErro(err)); }
    finally { setPublicando(false); }
  }

  async function excluir(p) {
    if (!confirm(`Excluir "${p.titulo}"?`)) return;
    try { await api.excluirPublicacao(p); avisar("🗑️ Publicação excluída"); recarregar(); }
    catch (err) { avisar("❌ " + msgErro(err)); }
  }

  return html`
    <div class="pilha">
      <form class="cartao pilha" onSubmit=${publicar}>
        <h3>📸 Nova publicação — Antes & Depois</h3>
        <div class="grade-2">
          <${Campo} rotulo="Condomínio *">
            <select value=${form.condominioId} onChange=${mudar("condominioId")}>
              <option value="">Selecione</option>
              ${condominios.map((c) => html`<option key=${c.id} value=${c.id}>${c.nome}</option>`)}
            </select>
          <//>
          <${Campo} rotulo="Título *"><input value=${form.titulo} onInput=${mudar("titulo")} placeholder="Ex: Corte de grama realizado" /><//>
        </div>
        <${Campo} rotulo="Descrição">
          <textarea value=${form.descricao} onInput=${mudar("descricao")} placeholder="Descreva o serviço realizado…"></textarea>
        <//>
        <div class="grade-2">
          <div><span class="rotulo">🟡 Foto de antes</span><${SeletorFoto} valor=${antes} onChange=${setAntes} rotulo="Foto de antes" etiqueta="ANTES" /></div>
          <div><span class="rotulo">🟢 Foto de depois</span><${SeletorFoto} valor=${depois} onChange=${setDepois} rotulo="Foto de depois" etiqueta="DEPOIS" /></div>
        </div>
        <${Erro}>${erro}<//>
        <${Botao} tipo="submit" carregando=${publicando} largo>📤 Publicar<//>
      </form>

      ${publicacoes.length > 0 && html`
        <div>
          <div class="suave mb">Publicações (${publicacoes.length})</div>
          <ul class="pilha lista-cartoes">
            ${publicacoes.map((p) => html`
              <li key=${p.id} class="item-linha">
                ${(p.foto_depois_url || p.foto_antes_url) && html`<img class="mini" src=${p.foto_depois_url || p.foto_antes_url} alt="" loading="lazy" />`}
                <div class="cresce">
                  <strong class="corta">${p.titulo}</strong>
                  <small>${nomeCondo[p.condominio_id] || "—"} · ${fmtData(p.criado_em)}</small>
                </div>
                <button class="btn-mini perigo" onClick=${() => excluir(p)} title="Excluir">🗑️</button>
              </li>`)}
          </ul>
        </div>`}
    </div>`;
}
