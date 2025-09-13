// 🚀 Main JavaScript สำหรับ E-Learning Platform
// ใช้สำหรับโหลดการตั้งค่าระบบและใช้ในหน้าต่างๆ

import { auth, db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ตัวแปรเก็บการตั้งค่าระบบ
let systemSettings = null;

/**
 * โหลดการตั้งค่าระบบจาก Firestore
 */
export async function loadSystemSettings() {
    try {
        // ตรวจสอบว่า Firebase พร้อมใช้งานหรือไม่
        if (!db) {
            console.warn('Firebase ยังไม่พร้อมใช้งาน ใช้การตั้งค่าเริ่มต้น');
            return getDefaultSettings();
        }

        const settingsDoc = await getDoc(doc(db, 'systemSettings', 'general'));
        
        if (settingsDoc.exists()) {
            systemSettings = settingsDoc.data();
            console.log('✅ โหลดการตั้งค่าระบบสำเร็จ');
        } else {
            // ใช้การตั้งค่าเริ่มต้น
            systemSettings = getDefaultSettings();
            console.log('ℹ️ ไม่พบการตั้งค่าระบบ ใช้การตั้งค่าเริ่มต้น');
        }
        
        // อัปเดตหน้าเว็บด้วยการตั้งค่าใหม่
        updatePageWithSettings();
        
        return systemSettings;
        
    } catch (error) {
        console.warn('เกิดข้อผิดพลาดในการโหลดการตั้งค่าระบบ:', error.message);
        
        // ใช้การตั้งค่าเริ่มต้นเมื่อเกิดข้อผิดพลาด
        systemSettings = getDefaultSettings();
        updatePageWithSettings();
        showLoadStatus('error');
        
        return systemSettings;
    }
}

/**
 * รับการตั้งค่าเริ่มต้น
 */
function getDefaultSettings() {
    return {
        general: {
            siteName: 'E-Learning Platform',
            siteDescription: 'แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทันสมัย',
            defaultLanguage: 'th',
            timezone: 'Asia/Bangkok',
            primaryColor: '#0d6efd',
            maintenanceMode: false,
            allowRegistration: true
        }
    };
}

/**
 * อัปเดตหน้าเว็บด้วยการตั้งค่าระบบ
 */
function updatePageWithSettings() {
    if (!systemSettings || !systemSettings.general) return;
    
    const settings = systemSettings.general;
    
    // อัปเดต title ของหน้า
    updatePageTitle(settings.siteName);
    
    // อัปเดต navbar brand
    updateNavbarBrand(settings.siteName);
    
    // อัปเดต meta description
    updateMetaDescription(settings.siteDescription);
    
    // อัปเดตสีหลัก
    updatePrimaryColor(settings.primaryColor);
    
    // ตรวจสอบ maintenance mode
    if (settings.maintenanceMode) {
        showMaintenanceMode();
    }
    
    // แสดงสถานะการโหลดสำเร็จ
    showLoadStatus('success');
}

/**
 * อัปเดต title ของหน้า
 */
function updatePageTitle(siteName) {
    const currentTitle = document.title;
    const pageName = currentTitle.split(' - ')[1] || currentTitle;
    document.title = `${siteName} - ${pageName}`;
}

/**
 * อัปเดต navbar brand
 */
function updateNavbarBrand(siteName) {
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        // เก็บไอคอนเดิมไว้
        const icon = navbarBrand.querySelector('i');
        navbarBrand.innerHTML = '';
        if (icon) {
            navbarBrand.appendChild(icon);
        }
        navbarBrand.appendChild(document.createTextNode(` ${siteName}`));
    }
}

/**
 * อัปเดต meta description
 */
function updateMetaDescription(description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    
    metaDescription.content = description;
}

/**
 * อัปเดตสีหลักของเว็บไซต์
 */
function updatePrimaryColor(color) {
    // สร้าง CSS variable สำหรับสีหลัก
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --bs-primary: ${color} !important;
            --bs-primary-rgb: ${hexToRgb(color)} !important;
        }
        
        .btn-primary {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        
        .btn-primary:hover {
            background-color: ${darkenColor(color, 10)} !important;
            border-color: ${darkenColor(color, 10)} !important;
        }
        
        /* ป้องกันการเปลี่ยนแปลงสีใน dashboard cards */
        .text-primary:not(.card.text-primary *):not(.card.text-primary h3):not(.card.text-primary .bi):not(.card.text-primary p):not(.card.text-primary span) {
            color: ${color} !important;
        }
        
        .bg-primary {
            background-color: ${color} !important;
        }
    `;
    
    // ลบ style เดิมถ้ามี
    const existingStyle = document.getElementById('dynamic-primary-color');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    style.id = 'dynamic-primary-color';
    document.head.appendChild(style);
}

/**
 * แปลง hex color เป็น RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r}, ${g}, ${b}`;
    }
    return '13, 110, 253'; // default Bootstrap primary
}

/**
 * ทำให้สีเข้มขึ้น
 */
function darkenColor(hex, percent) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = Math.max(0, parseInt(result[1], 16) - Math.round(255 * percent / 100));
        const g = Math.max(0, parseInt(result[2], 16) - Math.round(255 * percent / 100));
        const b = Math.max(0, parseInt(result[3], 16) - Math.round(255 * percent / 100));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return hex;
}

/**
 * แสดงหน้า maintenance mode
 */
function showMaintenanceMode() {
    // สร้างหน้า maintenance mode
    const maintenanceHtml = `
        <div class="maintenance-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        ">
            <div class="maintenance-content">
                <i class="bi bi-tools" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                <h1>เว็บไซต์อยู่ระหว่างการบำรุงรักษา</h1>
                <p>ขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้งในภายหลัง</p>
                <button onclick="location.reload()" class="btn btn-primary mt-3">
                    <i class="bi bi-arrow-clockwise me-2"></i>รีเฟรชหน้า
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', maintenanceHtml);
}

/**
 * รับการตั้งค่าระบบปัจจุบัน
 */
export function getSystemSettings() {
    return systemSettings;
}

/**
 * รับชื่อเว็บไซต์
 */
export function getSiteName() {
    return systemSettings?.general?.siteName || 'E-Learning Platform';
}

/**
 * รับคำอธิบายเว็บไซต์
 */
export function getSiteDescription() {
    return systemSettings?.general?.siteDescription || 'แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทันสมัย';
}

/**
 * ตรวจสอบว่าเว็บไซต์อยู่ใน maintenance mode หรือไม่
 */
export function isMaintenanceMode() {
    return systemSettings?.general?.maintenanceMode || false;
}

/**
 * ตรวจสอบว่าอนุญาตให้ลงทะเบียนหรือไม่
 */
export function isRegistrationAllowed() {
    return systemSettings?.general?.allowRegistration !== false;
}

/**
 * แสดงสถานะการโหลด
 */
function showLoadStatus(status) {
    // ลบสถานะเก่าถ้ามี
    const existingStatus = document.getElementById('system-load-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    if (status === 'success') {
        // สร้างสถานะสำเร็จ (ไม่แสดงอะไร เพื่อไม่ให้รบกวน UI)
        console.log('🎉 ระบบพร้อมใช้งาน');
    } else if (status === 'error') {
        // สร้างสถานะข้อผิดพลาด
        const statusDiv = document.createElement('div');
        statusDiv.id = 'system-load-status';
        statusDiv.className = 'alert alert-warning alert-dismissible position-fixed';
        statusDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        statusDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>การตั้งค่าระบบ:</strong> ใช้การตั้งค่าเริ่มต้น
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(statusDiv);
        
        // ลบการแจ้งเตือนหลังจาก 5 วินาที
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    }
}

// เริ่มต้นเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    // รอให้ Firebase พร้อมก่อนโหลดการตั้งค่า
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        // Firebase พร้อมแล้ว
        loadSystemSettings();
    } else {
        // รอ Firebase พร้อม
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                clearInterval(checkFirebase);
                loadSystemSettings();
            }
        }, 50); // ลดเวลาเป็น 50ms เพื่อให้เร็วขึ้น
        
        // หยุดรอหลังจาก 3 วินาที (ลดจาก 5 วินาที)
        setTimeout(() => {
            clearInterval(checkFirebase);
            console.log('Firebase ยังไม่พร้อม ใช้การตั้งค่าเริ่มต้น');
            loadSystemSettings();
        }, 3000);
    }
});

// Export สำหรับใช้ในไฟล์อื่น
export default {
    loadSystemSettings,
    getSystemSettings,
    getSiteName,
    getSiteDescription,
    isMaintenanceMode,
    isRegistrationAllowed
};
