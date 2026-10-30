import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, connectAuthEmulator, getAuth, onAuthStateChanged,
  sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import {
  addDoc, collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs,
  getFirestore, limit, orderBy, query, runTransaction, serverTimestamp, setDoc,
  updateDoc, where, writeBatch
} from 'firebase/firestore';
import { firebaseConfig, useFirebaseEmulators } from './firebase-config.js';

const configured = !Object.values(firebaseConfig).some((value) => String(value).startsWith('YOUR_'));

if (!configured) {
  document.documentElement.dataset.firebase = 'unconfigured';
  window.dispatchEvent(new CustomEvent('firebase-configuration-missing'));
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    // Some private browsing modes block local persistence. Firebase can still use
    // its available session storage and present a working sign-in form.
    console.warn('Persistent sign-in storage is unavailable:', error.code || error.message);
  }

  if (useFirebaseEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  window.FirebaseContext = {
    auth, db, addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy,
    query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
    onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
  };
  window.dispatchEvent(new CustomEvent('firebase-ready'));
}
