console.log('[ENTRY] config/firebase.ts loaded');
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDICoPuUXQf_NSYVOsmR5h1Naphl1y25UU",
  authDomain: "southafricanlanguages.firebaseapp.com",
  projectId: "southafricanlanguages",
  storageBucket: "southafricanlanguages.firebasestorage.app",
  messagingSenderId: "528892435856",
  appId: "1:528892435856:web:49b522bdd069addab56715",
  measurementId: "G-8KE03QSN0B"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
console.log("Firebase App initialized:", app.name);

// Initialize Auth with React Native persistence
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);
export const storage = getStorage(app);

export { app, auth, db, firebaseConfig }; 