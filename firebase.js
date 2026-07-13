// firebase.js — conexão única para todo o sistema Echo
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc,
  addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// COLE AQUI o config copiado na Parte 3:
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "echo-jardinagem.firebaseapp.com",
  projectId: "echo-jardinagem",
  storageBucket: "echo-jardinagem.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};
