// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAXkcORCpAF37cedFdgY1haZYgp9sx7rU",
  authDomain: "e-learning-app2-127d0.firebaseapp.com",
  projectId: "e-learning-app2-127d0",
  storageBucket: "e-learning-app2-127d0.firebasestorage.app",
  messagingSenderId: "590470466817",
  appId: "1:590470466817:web:09b7f6abf0e5aefbdb1f00",
  measurementId: "G-0V260HBBV6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ส่งออกบริการ Firebase
export { app, analytics, auth, db, storage };

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
    
    console.log('Firebase เริ่มต้นสำเร็จ');
} catch (error) {
    console.warn('เกิดข้อผิดพลาดในการตั้งค่า Firebase:', error);
    // ไม่ให้ error นี้ทำให้แอปพลิเคชันหยุดทำงาน
}
