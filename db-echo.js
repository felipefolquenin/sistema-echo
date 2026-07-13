// db-echo.js — operações de banco de dados do sistema Echo Jardinagem
// Requer: firebase.js na raiz do repositório
import {
  db, collection, doc, addDoc, getDocs, getDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp
} from "./firebase.js";

// ============================================================
// CONDOMÍNIOS
// ============================================================

export async function adicionarCondominio(dados) {
  // dados: { nome, endereco, area_m2, visitas_semana, valor_mensal, ... }
  const ref = await addDoc(collection(db, "condominios"), {
    ...dados,
    criadoEm: serverTimestamp()
  });
  return ref.id;
}

export async function listarCondominios() {
  const snap = await getDocs(
    query(collection(db, "condominios"), orderBy("nome"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarCondominio(id) {
  const snap = await getDoc(doc(db, "condominios", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function atualizarCondominio(id, dados) {
  await updateDoc(doc(db, "condominios", id), dados);
}

export async function excluirCondominio(id) {
  await deleteDoc(doc(db, "condominios", id));
}

// Escuta em tempo real — a tela atualiza sozinha quando algo muda
// Uso: ouvirCondominios(lista => renderizarTabela(lista));
export function ouvirCondominios(callback) {
  return onSnapshot(
    query(collection(db, "condominios"), orderBy("nome")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ============================================================
// SERVIÇOS FEITOS
// ============================================================

export async function registrarFeito(dados) {
  // dados: { condominioId, descricao, data, fotos, ... }
  const ref = await addDoc(collection(db, "feitos"), {
    ...dados,
    criadoEm: serverTimestamp()
  });
  return ref.id;
}

export async function listarFeitosDoCondominio(condominioId) {
  const snap = await getDocs(
    query(collection(db, "feitos"), where("condominioId", "==", condominioId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function excluirFeito(id) {
  await deleteDoc(doc(db, "feitos", id));
}

// ============================================================
// AGENDAMENTOS (formulário público do site)
// ============================================================

export async function criarAgendamento(dados) {
  // dados: { nome, telefone, email, dataDesejada, servico, mensagem }
  const ref = await addDoc(collection(db, "agendamentos"), {
    ...dados,
    status: "pendente",
    criadoEm: serverTimestamp()
  });
  return ref.id;
}

export async function listarAgendamentos() {
  const snap = await getDocs(
    query(collection(db, "agendamentos"), orderBy("criadoEm", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarStatusAgendamento(id, status) {
  // status: "pendente" | "confirmado" | "concluido" | "cancelado"
  await updateDoc(doc(db, "agendamentos", id), { status });
}

export async function excluirAgendamento(id) {
  await deleteDoc(doc(db, "agendamentos", id));
}

// Escuta em tempo real dos agendamentos (para o painel admin)
export function ouvirAgendamentos(callback) {
  return onSnapshot(
    query(collection(db, "agendamentos"), orderBy("criadoEm", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
