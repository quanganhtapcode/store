import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- CONFIG ---
// Note: __firebase_config and __app_id are expected to be available globally (injected)
const firebaseConfig = JSON.parse(window.__firebase_config || '{}');
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'pos-pro-split-v3';
export const apiKey = ""; // Fill in your Gemini API Key if needed
