import {
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from './config'; // config.js から auth インスタンスをインポート

export const signIn = async () => {
  return await signInAnonymously(auth);
};

export const onAuth = (callback) => {
  // onAuthStateChanged は auth インスタンスを直接使う
  return onAuthStateChanged(auth, callback);
};

export const registerWithEmail = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithEmail = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

export function watchAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}
