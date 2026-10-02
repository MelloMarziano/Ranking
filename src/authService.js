import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

// Firebase Auth trabaja con correos. Para que el admin entre solo con un usuario
// (ej. "arturo"), se completa con este dominio: arturo -> arturo@arturo2hookah.app.
// El usuario debe existir en Firebase Console > Authentication con ese correo.
const ADMIN_EMAIL_DOMAIN = import.meta.env.VITE_ADMIN_EMAIL_DOMAIN || "arturo2hookah.app";

export function getEmailFromUsername(username) {
  const value = username.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${ADMIN_EMAIL_DOMAIN}`;
}

export function getUsernameFromEmail(email = "") {
  return email.endsWith(`@${ADMIN_EMAIL_DOMAIN}`) ? email.split("@")[0] : email;
}

export function signInAdmin(username, password) {
  return signInWithEmailAndPassword(auth, getEmailFromUsername(username), password);
}

export function signOutAdmin() {
  return signOut(auth);
}

export function watchAdminSession(callback) {
  return onAuthStateChanged(auth, callback);
}
