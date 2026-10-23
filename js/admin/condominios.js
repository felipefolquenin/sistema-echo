// Aba "Condomínios": cadastro, código de acesso e serviços contratados.
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { SERVICOS } from "../config.js";
import { DIAS, descreverAgenda } from "../agenda.js";
import { msgErro, plural } from "../util.js";
import { Vazio, Botao, Campo, Erro } from "../components.js";

const novoCodigo = () => {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => letras[n % letras.length]).join("");
};

const NOVO = () => ({ id: null, nome: "", endereco: "", contato: "", telefone: "", codigo_acesso: novoCodigo(), ativo: true });

export function AbaCondominios({ condominios, recarregar, avisar }) {
  const [editando, setEditando] = useState(null); // { cond, servicos }

  async function excluir(c) {
    if (!confirm(`Remover "${c.nome}"? Reclamações, publicações e histórico deste condomínio também serão apagados.`)) return;
    try { await api.excluirCondominio(c.id); avisar("🗑️ Condomínio removido"); recarregar(); }
    catch (e) { avisar("❌ " + msgErro(e)); }
  }

  return html`
    <div>
      <div class="linha entre mb">
        <span class="suave">${plural(condominios.length, "condomínio", "condomínios")}</span>
        <${Botao} onClick=${() => setEditando({ cond: NOVO(), servicos: [] })}>+ Novo<//>
      </div>
      ${!condominios.length ? html`<${Vazio} icone="🏢" titulo="Nenhum condomínio ainda" sub='Clique em "+ Novo" para começar' />` : html`
        <ul class="pilha lista-cartoes">
          ${condominios.map((c) => html`
            <li key=${c.id} class=${"item-linha " + (c.ativo ? "" : "inativo")}>
              <div class="cresce">
                <strong>${c.nome}${c.ativo ? "" : " (inativo)"}</strong>
                ${c.endereco && html`<small>📍 ${c.endereco}</small>`}
                <div class="linha mt-p">
                  <small class="verde">${plural(c.servicos.length, "serviço", "serviços")}</small>
                  <small>Código: <strong>${c.codigo_acesso}</strong></small>
                </div>
              </div>
              <button class="btn-mini" title="Editar" onClick=${() => setEditando({ cond: { ...c }, servicos: c.servicos.map((s) => ({ ...s })) })}>✏️</button>
              <button class="btn-mini perigo" title="Remover" onClick=${() => excluir(c)}>🗑️</button>
            </li>`)}
        </ul>`}
      ${editando && html`<${FormCondominio} inicial=${editando} fechar=${() => setEditando(null)}
          salvo=${() => { setEditando(null); avisar("✅ Condomínio salvo"); recarregar(); }} />`}
    </div>`;
}

function FormCondominio({ inicial, fechar, salvo }) {
  const [cond, setCond] = useState(inicial.cond);
  const [servicos, setServicos] = useState(inicial.servicos);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const mudar = (k) => (e) => setCond({ ...cond, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function salvar(e) {
    e.preventDefault();
    if (!cond.nome.trim()) return setErro("Digite o nome do condomínio.");
    if (!cond.codigo_acesso.trim()) return setErro("Defina um código de acesso.");
    setSalvando(true); setErro("");
    try { await api.salvarCondominio(cond, servicos); salvo(); }
    catch (err) {
      setErro(/duplicate|unique/i.test(err.message || "") ? "Esse código de acesso já é usado por outro condomínio." : msgErro(err));
    } finally { setSalvando(false); }
  }

  return html`
    <div class="modal-fundo" onClick=${(e) => e.target === e.currentTarget && fechar()}>
      <form class="modal pilha" onSubmit=${salvar}>
        <div class="linha entre">
          <h2>${cond.id ? "✏️ Editar" : "🏢 Novo"} condomínio</h2>
          <button type="button" class="fechar" onClick=${fechar} aria-label="Fechar">✕</button>
        </div>
        <${Campo} rotulo="Nome *"><input value=${cond.nome} onInput=${mudar("nome")} placeholder="Condomínio das Flores" /><//>
        <${Campo} rotulo="Endereço"><input value=${cond.endereco || ""} onInput=${mudar("endereco")} placeholder="Rua, número, bairro" /><//>
        <div class="grade-2">
          <${Campo} rotulo="Contato"><input value=${cond.contato || ""} onInput=${mudar("contato")} placeholder="Síndico" /><//>
          <${Campo} rotulo="Telefone"><input value=${cond.telefone || ""} onInput=${mudar("telefone")} placeholder="(42) 9…" /><//>
        </div>
        <${Campo} rotulo="Código de acesso do portal">
          <div class="linha">
            <input class="cresce codigo" value=${cond.codigo_acesso} onInput=${mudar("codigo_acesso")} />
            <button type="button" class="btn-mini" onClick=${() => setCond({ ...cond, codigo_acesso: novoCodigo() })}>🔄 Gerar</button>
          </div>
          <small class="suave">Compartilhe com os moradores para acesso ao portal.</small>
        <//>
        <${EditorServicos} servicos=${servicos} setServicos=${setServicos} />
        <label class="linha"><input type="checkbox" checked=${cond.ativo} onChange=${mudar("ativo")} /> Condomínio ativo</label>
        <${Erro}>${erro}<//>
        <div class="linha">
          <button type="button" class="btn btn-contorno cresce" onClick=${fechar}>Cancelar</button>
          <${Botao} tipo="submit" carregando=${salvando}>💾 Salvar<//>
        </div>
      </form>
    </div>`;
}

function EditorServicos({ servicos, setServicos }) {
  const [nome, setNome] = useState(SERVICOS[0]);
  const [frequencia, setFrequencia] = useState("Semanal");
  const [dias, setDias] = useState([]);
  const [semana, setSemana] = useState("impar");
  const [diaMes, setDiaMes] = useState(1);
  const [erro, setErro] = useState("");

  const alternarDia = (d) => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort());

  function adicionar() {
    if (frequencia !== "Mensal" && !dias.length) return setErro("Escolha pelo menos um dia da semana.");
    setServicos([...servicos, {
      nome, frequencia,
      dias_semana: frequencia === "Mensal" ? [] : dias,
      semana, dia_mes: frequencia === "Mensal" ? Number(diaMes) : null,
    }]);
    setDias([]); setErro("");
  }

  return html`
    <div class="secao">
      <span class="rotulo">Serviços contratados</span>
      ${!servicos.length && html`<p class="suave">Nenhum serviço adicionado</p>`}
      <ul class="pilha-p">
        ${servicos.map((s, i) => html`
          <li key=${s.id || i} class="servico-item">
            <div class="cresce"><strong>${s.nome}</strong><small>${s.frequencia}${descreverAgenda(s) ? " · " + descreverAgenda(s) : ""}</small></div>
            <button type="button" class="link-perigo" onClick=${() => setServicos(servicos.filter((_, j) => j !== i))}>✕</button>
          </li>`)}
      </ul>
      <div class="caixa-clara pilha-p">
        <span class="rotulo">Adicionar serviço</span>
        <div class="linha">
          <select class="cresce" value=${nome} onChange=${(e) => setNome(e.target.value)}>
            ${SERVICOS.map((s) => html`<option key=${s}>${s}</option>`)}
          </select>
          <select value=${frequencia} onChange=${(e) => setFrequencia(e.target.value)}>
            <option>Semanal</option><option>Quinzenal</option><option>Mensal</option>
          </select>
        </div>
        ${frequencia === "Mensal"
          ? html`<label class="linha suave">Todo dia
              <input type="number" min="1" max="31" class="num" value=${diaMes} onInput=${(e) => setDiaMes(e.target.value)} /> do mês</label>`
          : html`
            <div class="dias">
              ${DIAS.map((d, i) => html`
                <button type="button" key=${i} class=${"chip " + (dias.includes(i) ? "ativo" : "")} onClick=${() => alternarDia(i)}>${d}</button>`)}
            </div>
            ${frequencia === "Quinzenal" && html`
              <div class="linha">
                <button type="button" class=${"chip cresce " + (semana === "impar" ? "ativo" : "")} onClick=${() => setSemana("impar")}>Semanas ímpares</button>
                <button type="button" class=${"chip cresce " + (semana === "par" ? "ativo" : "")} onClick=${() => setSemana("par")}>Semanas pares</button>
              </div>`}`}
        <${Erro}>${erro}<//>
        <button type="button" class="btn btn-primario largo" onClick=${adicionar}>+ Adicionar serviço</button>
      </div>
    </div>`;
}
