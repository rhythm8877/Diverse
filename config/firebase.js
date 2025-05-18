import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration object - matches exactly with Firebase console
const firebaseConfig = {
    apiKey: "AIzaSyBdRFLaLSX3xUr98idLmvqKf8FCykVrjWE",
    authDomain: "diverse-b521b.firebaseapp.com",
    projectId: "diverse-b521b",
    storageBucket: "diverse-b521b.firebasestorage.app", // Matches Firebase console
    messagingSenderId: "40073710284",
    appId: "1:40073710284:web:8ff127cd9a6f9c7fe25069"
};

// Initialize Firebase with error handling
let app, auth, firestore, storage;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    // Silent error handling for production
}

// Add fallback initialization if the first attempt fails
if (!app || !auth) {
    try {
        // Try with a slight delay
        setTimeout(() => {
            if (!app) app = initializeApp(firebaseConfig);
            if (!auth) auth = getAuth(app);
            if (!firestore) firestore = getFirestore(app);
            if (!storage) storage = getStorage(app);
        }, 1000);
    } catch (error) {
        // Silent catch
    }
}

export { app, auth, firestore, storage };
