// Painel administrativo: carrega os dados e mostra a aba escolhida.
import { html, useState, useEffect, useCallback } from "../lib.js";
import * as api from "../api.js";
import { proximasVisitas, descreverAgenda, chaveLembrete } from "../agenda.js";
import { mesAtual, mesAtualLabel, fmtDiaSemana, enviarEmail, msgErro, plural, diasDesdeBackup } from "../util.js";
import { Carregando, Erro, useAviso } from "../components.js";
import { AbaAgenda, AbaProximas } from "./agenda.js";
import { AbaReclamacoes } from "./reclamacoes.js";
import { AbaResultados } from "./resultados.js";
import { AbaCondominios } from "./condominios.js";
import { AbaAjustes } from "./ajustes.js";

const ABAS = [
  { id: "agenda", l: "📋 Agenda", C: AbaAgenda },
  { id: "proximas", l: "🗓️ Próximas", C: AbaProximas },
  { id: "reclamacoes", l: "📝 Reclamações", C: AbaReclamacoes },
  { id: "resultados", l: "📸 Resultados", C: AbaResultados },
  { id: "condominios", l: "🏢 Condomínios", C: AbaCondominios },
  { id: "ajustes", l: "⚙️ Ajustes", C: AbaAjustes },
];

export function Painel({ aba = "agenda" }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [avisar, Aviso] = useAviso();

  const recarregar = useCallback(async () => {
    try {
      const [condominios, feitos, reclamacoes, publicacoes] = await Promise.all([
        api.listarCondominios(), api.feitosDoMes(mesAtual()),
        api.listarReclamacoes(), api.listarPublicacoes(),
      ]);
      const visitas = proximasVisitas(condominios, 7);
      const lembretes = await api.lembretesEnviados(visitas.map(chaveLembrete));
      setDados({ condominios, feitos, reclamacoes, publicacoes, visitas, lembretes });
      setErro("");
    } catch (e) { setErro(msgErro(e)); }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  if (!dados) return erro
    ? html`<main class="estreito"><${Erro}>${erro}<//><button class="btn btn-primario" onClick=${recarregar}>Tentar de novo</button></main>`
    : html`<${Carregando} />`;

  const { condominios, feitos, reclamacoes, visitas, lembretes } = dados;
  const ativos = condominios.filter((c) => c.ativo);
  const totalServicos = ativos.reduce((n, c) => n + c.servicos.length, 0);
  const feitosN = ativos.reduce((n, c) => n + c.servicos.filter((s) => feitos.has(s.id)).length, 0);
  const pct = totalServicos ? Math.round((feitosN / totalServicos) * 100) : 0;
  const pendentesLembrete = visitas.filter((v) => v.emDias <= 3 && !lembretes[chaveLembrete(v)]);
  const reclamacoesAbertas = reclamacoes.filter((r) => r.status === "pendente").length;

  async function enviarLembretes() {
    if (!pendentesLembrete.length) return avisar("✅ Nenhum lembrete pendente");
    setEnviando(true);
    let enviados = 0, falhas = 0;
    for (const v of pendentesLembrete) {
      let sucesso = true;
      try {
        await enviarEmail({
          servico: `⚠️ Visita em ${plural(v.emDias, "dia", "dias")}`,
          data: fmtDiaSemana(v.data),
          horario: `${v.cond.nome} — ${v.servico.nome}`,
          nome: "Echo Jardinagem",
          telefone: v.cond.telefone || "—",
          endereco: v.cond.endereco || "—",
          observacoes: `${v.servico.frequencia} | ${descreverAgenda(v.servico)}`,
        });
        enviados++;
      } catch { sucesso = false; falhas++; }
      try { await api.registrarLembrete(chaveLembrete(v), sucesso); } catch { /* segue */ }
    }
    setEnviando(false);
    avisar(`✅ ${plural(enviados, "lembrete enviado", "lembretes enviados")}${falhas ? ` · ${falhas} falhou` : ""}`);
    recarregar();
  }

  const atual = ABAS.find((a) => a.id === aba) || ABAS[0];
  const contador = { proximas: visitas.length, reclamacoes: reclamacoesAbertas };

  return html`
    <div class="largo-max">
      <${Aviso} />
      <header class="topo">
        <div class="topo-linha">
          <div>
            <div class="topo-sup">🌿 Echo Jardinagem</div>
            <h1>Painel Administrativo</h1>
          </div>
          <div class="topo-botoes">
            <button class=${"pilula-btn " + (pendentesLembrete.length ? "alerta" : "")} onClick=${enviarLembretes} disabled=${enviando}>
              ${enviando ? "Enviando…" : pendentesLembrete.length ? `🔔 ${pendentesLembrete.length} pendente${pendentesLembrete.length > 1 ? "s" : ""}` : "🔔 Lembretes"}
            </button>
            <button class="pilula-btn" onClick=${() => api.sair()}>Sair</button>
          </div>
        </div>
        ${totalServicos > 0 && html`
          <div class="progresso">
            <div class="progresso-txt"><span>${mesAtualLabel()}</span><strong>${feitosN}/${totalServicos} · ${pct}%</strong></div>
            <div class="barra"><div style=${{ width: pct + "%" }}></div></div>
          </div>`}
      </header>
      <nav class="abas rolavel">
        ${ABAS.map((a) => html`
          <a key=${a.id} href=${"#/admin/" + a.id} class=${a.id === atual.id ? "ativa" : ""}>
            ${a.l}${contador[a.id] ? ` (${contador[a.id]})` : ""}
          </a>`)}
      </nav>
      <div class="conteudo">
        <${Erro}>${erro}<//>
        ${atual.id !== "ajustes" && (diasDesdeBackup() ?? 999) > 30 && html`
          <a class="alerta alerta-aviso mb" href="#/admin/ajustes">💾 Faz mais de 30 dias sem backup. Toque aqui para baixar.</a>`}
        <${atual.C} ...${dados} recarregar=${recarregar} avisar=${avisar} />
      </div>
    </div>`;
}
