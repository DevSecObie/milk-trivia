import { auth } from './firebase'
import { signInAnonymously, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'

const googleProvider = new GoogleAuthProvider()

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// Check for redirect result on page load (for Google sign-in fallback)
getRedirectResult(auth).catch(() => {})

export async function signInAsGuest() {
  try {
    const result = await signInAnonymously(auth)
    return result.user
  } catch (err) {
    const msg = err.code === 'auth/admin-restricted-operation'
      ? 'Anonymous sign-in is not enabled. Please contact the app administrator.'
      : err.code === 'auth/network-request-failed'
      ? 'Network error. Please check your connection and try again.'
      : `Sign-in failed: ${err.message}`
    throw new Error(msg)
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (err) {
    // If popup blocked or unavailable, fall back to redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    const msg = err.code === 'auth/unauthorized-domain'
      ? 'This domain is not authorized for Google sign-in. Please contact the app administrator.'
      : err.code === 'auth/network-request-failed'
      ? 'Network error. Please check your connection and try again.'
      : `Google sign-in failed: ${err.message}`
    throw new Error(msg)
  }
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
