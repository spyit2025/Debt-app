// Firebase Configuration
if (typeof firebaseConfig === 'undefined') {
// Environment-based configuration
const isProduction = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1' &&
                    !window.location.hostname.includes('dev');

const firebaseConfig = {
  apiKey: "AIzaSyAyUy74NcG4Ju1SS3sYZL1dGPsUAEaFmkY",
  authDomain: "debt-app-9b26b.firebaseapp.com",
  projectId: "debt-app-9b26b",
  storageBucket: "debt-app-9b26b.firebasestorage.app",
  messagingSenderId: "491646343164",
  appId: "1:491646343164:web:9b17affd519d3be10c8479",
  measurementId: "G-TS5W91PT5Q"
};

// Export configuration to global scope for use by other modules
window.firebaseConfig = firebaseConfig;

// Note: Firebase initialization is now handled by firebase-utils.js
// to prevent duplicate initialization warnings
} // End of firebaseConfig check
