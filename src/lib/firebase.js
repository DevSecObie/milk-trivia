import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAAjHl2zi4gMaa70RgMaE8GTUQF3mO--8M",
  authDomain: "milk-17053.firebaseapp.com",
  projectId: "milk-17053",
  storageBucket: "milk-17053.firebasestorage.app",
  messagingSenderId: "792873745635",
  appId: "1:792873745635:web:becc1c7e2be9503c4cd9d6",
  measurementId: "G-XKM6L68E0D"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
