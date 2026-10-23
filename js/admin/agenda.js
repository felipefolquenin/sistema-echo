// Abas "Agenda" (checklist do mês) e "Próximas" (visitas dos próximos 7 dias).
import { html, useState } from "../lib.js";
import * as api from "../api.js";
import { descreverAgenda, chaveLembrete } from "../agenda.js";
import { mesAtual, chaveDia, fmtDiaSemana, capitalizar, msgErro } from "../util.js";
import { Vazio } from "../components.js";

export function AbaAgenda({ condominios, feitos, recarregar, avisar }) {
  const [marcando, setMarcando] = useState(null);
  const ativos = condominios.filter((c) => c.ativo);
  if (!ativos.length) return html`<${Vazio} icone="🏢" titulo="Nenhum condomínio ativo" sub='Vá em "Condomínios" para adicionar' />`;

  async function alternar(servico) {
    setMarcando(servico.id);
    try {
      await api.marcarFeito(servico.id, mesAtual(), !feitos.has(servico.id));
      await recarregar();
    } catch (e) { avisar("❌ " + msgErro(e)); }
    finally { setMarcando(null); }
  }

  return html`
    <div class="pilha">
      ${ativos.map((c) => {
        const feitosN = c.servicos.filter((s) => feitos.has(s.id)).length;
        const completo = c.servicos.length > 0 && feitosN === c.servicos.length;
        return html`
          <section key=${c.id} class=${"cartao-lista " + (completo ? "completo" : "")}>
            <header class="cabeca-escura">
              <div>
                <strong>${c.nome}</strong>
                ${c.contato && html`<small>👤 ${c.contato}${c.telefone ? " · " + c.telefone : ""}</small>`}
              </div>
              <div class="cabeca-dir">
                <span class="contador">${feitosN}/${c.servicos.length}${completo ? " ✅" : ""}</span>
              </div>
            </header>
            ${!c.servicos.length
              ? html`<div class="corpo suave">Nenhum serviço cadastrado</div>`
              : html`<ul class="checklist">
                  ${c.servicos.map((s) => {
                    const ok = feitos.has(s.id);
                    return html`
                      <li key=${s.id}>
                        <button class=${"check " + (ok ? "ok" : "")} onClick=${() => alternar(s)} disabled=${marcando === s.id}>
                          <span class="caixa">${ok ? "✓" : ""}</span>
                          <span>
                            <span class="check-nome">${s.nome}</span>
                            <small>🔄 ${s.frequencia}${descreverAgenda(s) ? " · " + descreverAgenda(s) : ""}</small>
                          </span>
                        </button>
                      </li>`;
                  })}
                </ul>`}
          </section>`;
      })}
    </div>`;
}

export function AbaProximas({ visitas, lembretes }) {
  if (!visitas.length) return html`<${Vazio} icone="🗓️" titulo="Nenhuma visita nos próximos 7 dias" sub="Configure os dias nos serviços de cada condomínio" />`;

  const porDia = {};
  for (const v of visitas) (porDia[chaveDia(v.data)] ||= []).push(v);

  return html`
    <div class="pilha">
      ${Object.entries(porDia).map(([dia, lista]) => {
        const emDias = lista[0].emDias;
        const urgente = emDias <= 2;
        const titulo = emDias === 1 ? "Amanhã ⚡" : emDias === 2 ? "Em 2 dias ⚠️" : capitalizar(fmtDiaSemana(lista[0].data));
        return html`
          <section key=${dia} class=${"cartao-lista " + (urgente ? "urgente" : "")}>
            <header class="cabeca-escura">
              <div><strong>${titulo}</strong><small>${fmtDiaSemana(lista[0].data)}</small></div>
              <span class="contador">${emDias} dia${emDias > 1 ? "s" : ""}</span>
            </header>
            <ul class="lista-simples">
              ${lista.map((v) => {
                const l = lembretes[chaveLembrete(v)];
                return html`
                  <li key=${chaveLembrete(v)}>
                    <div><strong>${v.cond.nome}</strong><small>${v.servico.nome} · ${v.servico.frequencia}</small></div>
                    ${!l ? html`<span class="selo st-pendente">⏳ Pendente</span>`
                      : l.ok ? html`<span class="selo st-resolvida">✉️ Enviado</span>`
                      : html`<span class="selo st-erro">❌ Falhou</span>`}
                  </li>`;
              })}
            </ul>
          </section>`;
      })}
    </div>`;
}
