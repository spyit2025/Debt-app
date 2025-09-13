// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyUy74NcG4Ju1SS3sYZL1dGPsUAEaFmkY",
  authDomain: "debt-app-9b26b.firebaseapp.com",
  projectId: "debt-app-9b26b",
  storageBucket: "debt-app-9b26b.firebasestorage.app",
  messagingSenderId: "491646343164",
  appId: "1:491646343164:web:9b17affd519d3be10c8479",
  measurementId: "G-TS5W91PT5Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ส่งออกบริการ Firebase
export { app, analytics, auth, db, storage };

// Export individual services for better compatibility
export { auth as firebaseAuth };
export { db as firestore };

// เพิ่มการจัดการ Firebase errors
try {
    // ตั้งค่า timeout สำหรับ Firestore operations
    const firestoreSettings = {
        cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
        experimentalForceLongPolling: true,
        useFetchStreams: false
    };
    
    // ใช้ settings ถ้า Firestore รองรับ
    if (typeof db.settings === 'function') {
        db.settings(firestoreSettings);
    }
    
} catch (error) {
    console.warn('เกิดข้อผิดพลาดในการตั้งค่า Firebase:', error);
    // ไม่ให้ error นี้ทำให้แอปพลิเคชันหยุดทำงาน
}
