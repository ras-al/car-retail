import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth'; // Removed signInAnonymously
import { getFirestore } from 'firebase/firestore';

// Firebase configuration variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : "1:713762810595:web:32c12033cc97864c51f3d6";
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyCesQlPI94Lyl7q4GZWE_lbrTadrcGkBnU",
        authDomain: "car-h-e6847.firebaseapp.com",
        projectId: "car-h-e6847",
        storageBucket: "car-h-e6847.firebasestorage.app",
        messagingSenderId: "713762810595",
        appId: "1:713762810595:web:32c12033cc97864c51f3d6"
      };
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to handle initial authentication (only custom token)
const initializeAuth = async () => {
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // If no custom token is provided, do not sign in anonymously.
            // The application will wait for explicit user login via the Admin page.
            console.warn("No initial custom auth token provided. User will need to log in manually.");
        }
    } catch (error) {
        console.error("Firebase authentication initialization error:", error);
    }
};

// Export auth and db instances
export { auth, db, appId, initializeAuth };
