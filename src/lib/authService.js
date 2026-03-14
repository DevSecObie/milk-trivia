import { auth } from './firebase'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'

const googleProvider = new GoogleAuthProvider()

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// Check for redirect result on page load
getRedirectResult(auth).catch(() => {})

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    const msg = err.code === 'auth/unauthorized-domain'
      ? 'This domain is not authorized for Google sign-in.'
      : err.code === 'auth/network-request-failed'
      ? 'Network error. Check your connection.'
      : `Google sign-in failed: ${err.message}`
    throw new Error(msg)
  }
}

export async function signUpWithEmail(email, password, displayName) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(result.user, { displayName })
    }
    return result.user
  } catch (err) {
    const msg = err.code === 'auth/email-already-in-use'
      ? 'An account with this email already exists.'
      : err.code === 'auth/weak-password'
      ? 'Password must be at least 6 characters.'
      : err.code === 'auth/invalid-email'
      ? 'Invalid email address.'
      : `Sign up failed: ${err.message}`
    throw new Error(msg)
  }
}

export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (err) {
    const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
      ? 'Invalid email or password.'
      : err.code === 'auth/too-many-requests'
      ? 'Too many attempts. Try again later.'
      : `Sign in failed: ${err.message}`
    throw new Error(msg)
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (err) {
    const msg = err.code === 'auth/user-not-found'
      ? 'No account found with this email.'
      : `Reset failed: ${err.message}`
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
