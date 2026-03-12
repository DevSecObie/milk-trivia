import { auth } from './firebase'
import { signInAnonymously, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'

const googleProvider = new GoogleAuthProvider()

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function signInAsGuest() {
  const result = await signInAnonymously(auth)
  return result.user
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function setDisplayName(name) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name })
  }
}

export async function logOut() {
  await signOut(auth)
}

export function getCurrentUser() {
  return auth.currentUser
}
