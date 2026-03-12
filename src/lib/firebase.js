import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAAjHl2zi4gMaa70RgMaE8GTUQF3mO--8M',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'milk-17053.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'milk-17053',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'milk-17053.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '792873745635',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:792873745635:web:becc1c7e2be9503c4cd9d6',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XKM6L68E0D',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
