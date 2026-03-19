import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAI, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyBmenk4nVFHuYjhr9M4oi_ypomH-Bx3OJc",
  authDomain: "tts-pdf-4746d.firebaseapp.com",
  projectId: "tts-pdf-4746d",
  storageBucket: "tts-pdf-4746d.firebasestorage.app",
  messagingSenderId: "433509765913",
  appId: "1:433509765913:web:8954430c5a2882585cab88",
  measurementId: "G-L7S006QDYQ"
};

const RECAPTCHA_SITE_KEY = "6Lfnco4sAAAAALxGT7Y8t7x7WlLZCWwnK-JWt12A";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

// Initialize Firebase services and export them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const ai = getAI(app, { backend: new GoogleAIBackend() });

export default app;
