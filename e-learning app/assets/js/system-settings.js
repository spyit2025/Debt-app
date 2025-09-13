import { 
    protectPage, 
    displayUserInfo, 
    createMainMenu,
    createUserMenu, 
    logoutUser, 
    checkSessionExpiry 
} from './auth.js';
import { auth, db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    setDoc, 
    updateDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบสิทธิ์การเข้าถึงหน้า (เฉพาะแอดมิน)
    protectPage('admin');
    
    // ตรวจสอบ session expiry
    checkSessionExpiry();
    
    // แสดงข้อมูลผู้ใช้
    displayUserInfo();
    
    // สร้างเมนูหลัก
    createMainMenu();
    
    // สร้างเมนูผู้ใช้
    createUserMenu();
    
    // จัดการการออกจากระบบ
    document.addEventListener('click', function(e) {
        if (e.target.closest('#logoutBtn') || e.target.closest('[data-action="logout"]')) {
            e.preventDefault();
            logoutUser().then(() => {
                window.location.href = '../auth/login.html';
            });
        }
    });
    
    // ตรวจสอบ session ทุก 5 นาที
    setInterval(() => {
        checkSessionExpiry();
    }, 5 * 60 * 1000);
    
    // โหลดการตั้งค่า
    loadSettings();
    
    // ตั้งค่า Event Listeners
    setupEventListeners();
    
    // อัปเดตเวลาปัจจุบัน
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// ตั้งค่า Event Listeners
function setupEventListeners() {
    // Color picker
    const primaryColor = document.getElementById('primaryColor');
    if (primaryColor) {
        primaryColor.addEventListener('change', function() {
            document.getElementById('primaryColorText').textContent = this.value;
        });
    }
}

// โหลดการตั้งค่า
async function loadSettings() {
    try {
        showLoading('กำลังโหลดการตั้งค่า...');
        
        // ดึงการตั้งค่าจาก Firestore
        const settingsDoc = await getDoc(doc(db, 'systemSettings', 'general'));
        
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            populateSettings(settings);
        } else {
            // ใช้การตั้งค่าเริ่มต้น
            const defaultSettings = getDefaultSettings();
            populateSettings(defaultSettings);
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('เกิดข้อผิดพลาดในการโหลดการตั้งค่า: ' + error.message);
        hideLoading();
    }
}

// รับการตั้งค่าเริ่มต้น
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
        },
        security: {
            sessionTimeout: 1440,
            maxLoginAttempts: 5,
            lockoutDuration: 30,
            requireStrongPassword: true,
            enableTwoFactor: false,
            logUserActivity: true
        },
        notifications: {
            emailNewUser: true,
            emailNewCourse: true,
            emailQuizResults: true,
            systemNotifications: true,
            courseNotifications: true,
            quizNotifications: true
        },
        backup: {
            autoBackup: true,
            backupFrequency: 'daily',
            backupRetention: 30,
            backupUsers: true,
            backupCourses: true,
            backupQuizzes: true
        }
    };
}

// เติมข้อมูลการตั้งค่าในฟอร์ม
function populateSettings(settings) {
    // General Settings
    if (settings.general) {
        const siteNameElement = document.getElementById('siteName');
        const siteDescriptionElement = document.getElementById('siteDescription');
        const defaultLanguageElement = document.getElementById('defaultLanguage');
        const timezoneElement = document.getElementById('timezone');
        const maintenanceModeElement = document.getElementById('maintenanceMode');
        const allowRegistrationElement = document.getElementById('allowRegistration');
        
        if (siteNameElement) siteNameElement.value = settings.general.siteName || '';
        if (siteDescriptionElement) siteDescriptionElement.value = settings.general.siteDescription || '';
        if (defaultLanguageElement) defaultLanguageElement.value = settings.general.defaultLanguage || 'th';
        if (timezoneElement) timezoneElement.value = settings.general.timezone || 'Asia/Bangkok';
        if (maintenanceModeElement) maintenanceModeElement.checked = settings.general.maintenanceMode || false;
        if (allowRegistrationElement) allowRegistrationElement.checked = settings.general.allowRegistration !== false;
        
        // จัดการสีธีมหลัก
        const primaryColorElement = document.getElementById('primaryColor');
        const primaryColorTextElement = document.getElementById('primaryColorText');
        if (primaryColorElement) primaryColorElement.value = settings.general.primaryColor || '#0d6efd';
        if (primaryColorTextElement) primaryColorTextElement.textContent = settings.general.primaryColor || '#0d6efd';
    }
    
    // Security Settings
    if (settings.security) {
        document.getElementById('sessionTimeout').value = settings.security.sessionTimeout || 1440;
        document.getElementById('maxLoginAttempts').value = settings.security.maxLoginAttempts || 5;
        document.getElementById('lockoutDuration').value = settings.security.lockoutDuration || 30;
        document.getElementById('requireStrongPassword').checked = settings.security.requireStrongPassword !== false;
        document.getElementById('enableTwoFactor').checked = settings.security.enableTwoFactor || false;
        document.getElementById('logUserActivity').checked = settings.security.logUserActivity !== false;
    }
    
    // Notification Settings
    if (settings.notifications) {
        document.getElementById('emailNewUser').checked = settings.notifications.emailNewUser !== false;
        document.getElementById('emailNewCourse').checked = settings.notifications.emailNewCourse !== false;
        document.getElementById('emailQuizResults').checked = settings.notifications.emailQuizResults !== false;
        document.getElementById('systemNotifications').checked = settings.notifications.systemNotifications !== false;
        document.getElementById('courseNotifications').checked = settings.notifications.courseNotifications !== false;
        document.getElementById('quizNotifications').checked = settings.notifications.quizNotifications !== false;
    }
    
    // Backup Settings
    if (settings.backup) {
        document.getElementById('autoBackup').checked = settings.backup.autoBackup !== false;
        document.getElementById('backupFrequency').value = settings.backup.backupFrequency || 'daily';
        document.getElementById('backupRetention').value = settings.backup.backupRetention || 30;
        document.getElementById('backupUsers').checked = settings.backup.backupUsers !== false;
        document.getElementById('backupCourses').checked = settings.backup.backupCourses !== false;
        document.getElementById('backupQuizzes').checked = settings.backup.backupQuizzes !== false;
    }
}

// บันทึกการตั้งค่าทั้งหมด
window.saveAllSettings = async function() {
    try {
        showLoading('กำลังบันทึกการตั้งค่า...');
        
        // รวบรวมข้อมูลการตั้งค่าจากฟอร์ม
        const settings = {
            general: {
                siteName: document.getElementById('siteName')?.value || '',
                siteDescription: document.getElementById('siteDescription')?.value || '',
                defaultLanguage: document.getElementById('defaultLanguage')?.value || 'th',
                timezone: document.getElementById('timezone')?.value || 'Asia/Bangkok',
                primaryColor: document.getElementById('primaryColor')?.value || '#0d6efd',
                maintenanceMode: document.getElementById('maintenanceMode')?.checked || false,
                allowRegistration: document.getElementById('allowRegistration')?.checked !== false
            },
            security: {
                sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
                maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
                lockoutDuration: parseInt(document.getElementById('lockoutDuration').value),
                requireStrongPassword: document.getElementById('requireStrongPassword').checked,
                enableTwoFactor: document.getElementById('enableTwoFactor').checked,
                logUserActivity: document.getElementById('logUserActivity').checked
            },
            notifications: {
                emailNewUser: document.getElementById('emailNewUser').checked,
                emailNewCourse: document.getElementById('emailNewCourse').checked,
                emailQuizResults: document.getElementById('emailQuizResults').checked,
                systemNotifications: document.getElementById('systemNotifications').checked,
                courseNotifications: document.getElementById('courseNotifications').checked,
                quizNotifications: document.getElementById('quizNotifications').checked
            },
            backup: {
                autoBackup: document.getElementById('autoBackup').checked,
                backupFrequency: document.getElementById('backupFrequency').value,
                backupRetention: parseInt(document.getElementById('backupRetention').value),
                backupUsers: document.getElementById('backupUsers').checked,
                backupCourses: document.getElementById('backupCourses').checked,
                backupQuizzes: document.getElementById('backupQuizzes').checked
            },
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || 'system'
        };
        
        // บันทึกการตั้งค่าใน Firestore
        await setDoc(doc(db, 'systemSettings', 'general'), settings);
        
        showSuccess('บันทึกการตั้งค่าสำเร็จ!');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า: ' + error.message);
    }
};

// รีเซ็ตการตั้งค่า
window.resetSettings = function() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้นหรือไม่?')) {
        const defaultSettings = getDefaultSettings();
        populateSettings(defaultSettings);
        showSuccess('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว');
    }
};

// ฟังก์ชันเปลี่ยนสีธีมแบบเรียลไทม์
function updateThemeColor(color) {
    // อัปเดต CSS variables
    document.documentElement.style.setProperty('--primary-color', color);
    
    // อัปเดต Bootstrap primary color
    const style = document.createElement('style');
    style.id = 'dynamic-theme';
    style.textContent = `
        .btn-primary, .bg-primary, .text-primary {
            background-color: ${color} !important;
            border-color: ${color} !important;
            color: white !important;
        }
        .btn-outline-primary {
            color: ${color} !important;
            border-color: ${color} !important;
        }
        .btn-outline-primary:hover {
            background-color: ${color} !important;
            color: white !important;
        }
        .navbar {
            background: linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)}) !important;
        }
    `;
    
    // ลบ style เก่าและเพิ่มใหม่
    const oldStyle = document.getElementById('dynamic-theme');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
}

// ฟังก์ชันปรับความสว่างของสี
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// เพิ่ม event listener สำหรับการเปลี่ยนสี
document.addEventListener('DOMContentLoaded', function() {
    const primaryColorInput = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    
    if (primaryColorInput && primaryColorText) {
        primaryColorInput.addEventListener('input', function() {
            const color = this.value;
            primaryColorText.textContent = color;
            updateThemeColor(color);
        });
        
        primaryColorInput.addEventListener('change', function() {
            const color = this.value;
            primaryColorText.textContent = color;
            updateThemeColor(color);
        });
    }
});
window.resetSettings = function() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?')) {
        const defaultSettings = getDefaultSettings();
        populateSettings(defaultSettings);
        showSuccess('รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นแล้ว');
    }
};

// สร้างการสำรองข้อมูล
window.createBackup = async function() {
    try {
        showLoading('กำลังสร้างการสำรองข้อมูล...');
        
        // ดึงข้อมูลทั้งหมดจาก Firestore
        const backupData = {
            timestamp: new Date().toISOString(),
            createdBy: auth.currentUser?.uid || 'system',
            collections: {}
        };
        
        // ดึงข้อมูลผู้ใช้
        const usersSnapshot = await getDocs(collection(db, 'users'));
        backupData.collections.users = [];
        usersSnapshot.forEach(doc => {
            backupData.collections.users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // ดึงข้อมูลคอร์ส
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        backupData.collections.courses = [];
        coursesSnapshot.forEach(doc => {
            backupData.collections.courses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // ดึงข้อมูลข้อสอบ
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        backupData.collections.quizzes = [];
        quizzesSnapshot.forEach(doc => {
            backupData.collections.quizzes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // สร้างไฟล์ JSON
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        // ดาวน์โหลดไฟล์
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        hideLoading();
        showSuccess('สร้างการสำรองข้อมูลสำเร็จ!');
        
    } catch (error) {
        console.error('Error creating backup:', error);
        showError('เกิดข้อผิดพลาดในการสร้างการสำรองข้อมูล: ' + error.message);
        hideLoading();
    }
};

// กู้คืนข้อมูลจากไฟล์สำรอง
window.restoreBackup = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showLoading('กำลังกู้คืนข้อมูล...');
            
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (confirm(`คุณต้องการกู้คืนข้อมูลจากวันที่ ${new Date(backupData.timestamp).toLocaleString('th-TH')} หรือไม่?`)) {
                // ตรวจสอบโครงสร้างข้อมูล
                if (!backupData.collections) {
                    throw new Error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
                }
                
                // กู้คืนข้อมูล (ในที่นี้จะแสดงข้อมูลเท่านั้น)
                console.log('Backup data:', backupData);
                
                hideLoading();
                showSuccess('อ่านไฟล์สำรองข้อมูลสำเร็จ! ข้อมูลถูกแสดงใน Console');
            }
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            showError('เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + error.message);
            hideLoading();
        }
    };
    
    input.click();
};

// อัปเดตเวลาปัจจุบัน
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.textContent = new Date().toLocaleString('th-TH');
    }
}

// ฟังก์ชันแสดงสถานะ
function showLoading(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    ${message}
                </div>
            </div>
        `;
    }
}

function hideLoading() {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

function showSuccess(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

function showError(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}


