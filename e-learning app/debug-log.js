// Debug Log Script สำหรับตรวจสอบปัญหาการสลับหน้าไปมา

// ฟังก์ชันบันทึก log
function saveLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp: timestamp,
        message: message,
        data: data,
        url: window.location.href,
        path: window.location.pathname
    };
    
    // บันทึก log ลงใน localStorage
    let logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    logs.push(logEntry);
    
    // เก็บ log เฉพาะ 100 รายการล่าสุด
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    
    localStorage.setItem('debugLogs', JSON.stringify(logs));
    
    // แสดงใน console
    console.log(`🚀 DEBUG LOG SCRIPT: ${message}`, data || '');
}

// ฟังก์ชันแสดง log ทั้งหมด
window.showAllLogs = function() {
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    console.log('📋 ALL DEBUG LOGS:');
    logs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.message}`, log.data || '');
    });
};

// ฟังก์ชันล้าง log ทั้งหมด
window.clearAllLogs = function() {
    localStorage.removeItem('debugLogs');
    console.log('🧹 ALL DEBUG LOGS: ล้าง log ทั้งหมดแล้ว');
};

saveLog('เริ่มต้น');
saveLog('เวลาปัจจุบัน', new Date().toISOString());
saveLog('URL ปัจจุบัน', window.location.href);
saveLog('Path ปัจจุบัน', window.location.pathname);

// ตรวจสอบสถานะต่างๆ
saveLog('สถานะระบบ');
saveLog('isRedirecting', window.isRedirecting);
saveLog('hasCheckedAuth', window.hasCheckedAuth);
saveLog('isProtectingPage', window.isProtectingPage);

// ตรวจสอบข้อมูลผู้ใช้
saveLog('ตรวจสอบข้อมูลผู้ใช้');
const sessionUser = sessionStorage.getItem('user');
const localUser = localStorage.getItem('user');
saveLog('sessionStorage user', sessionUser ? 'มีข้อมูล' : 'ไม่มีข้อมูล');
saveLog('localStorage user', localUser ? 'มีข้อมูล' : 'ไม่มีข้อมูล');

if (sessionUser) {
    try {
        const user = JSON.parse(sessionUser);
        saveLog('sessionStorage user data', user);
    } catch (error) {
        saveLog('Error parsing sessionStorage user', error.message);
    }
}

if (localUser) {
    try {
        const user = JSON.parse(localUser);
        saveLog('localStorage user data', user);
    } catch (error) {
        saveLog('Error parsing localStorage user', error.message);
    }
}

// ตรวจสอบ Firebase
saveLog('ตรวจสอบ Firebase');
if (typeof firebase !== 'undefined') {
    saveLog('Firebase พร้อมใช้งาน');
    if (firebase.apps.length > 0) {
        saveLog('Firebase apps', firebase.apps.length);
    }
} else {
    saveLog('Firebase ยังไม่พร้อม');
}

// ตรวจสอบ DOM
saveLog('ตรวจสอบ DOM');
saveLog('document.readyState', document.readyState);
saveLog('document.title', document.title);

// ตรวจสอบ Scripts ที่โหลด
saveLog('ตรวจสอบ Scripts');
const scripts = document.querySelectorAll('script');
saveLog('จำนวน scripts', scripts.length);
scripts.forEach((script, index) => {
    if (script.src) {
        saveLog(`Script ${index + 1}`, script.src);
    }
});

// ฟังก์ชันสำหรับตรวจสอบสถานะแบบ real-time
window.debugStatus = function() {
    saveLog('DEBUG STATUS: ตรวจสอบสถานะปัจจุบัน');
    saveLog('DEBUG STATUS: URL', window.location.href);
    saveLog('DEBUG STATUS: isRedirecting', window.isRedirecting);
    saveLog('DEBUG STATUS: hasCheckedAuth', window.hasCheckedAuth);
    saveLog('DEBUG STATUS: isProtectingPage', window.isProtectingPage);
    
    const currentUser = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            saveLog('DEBUG STATUS: currentUser', user);
        } catch (error) {
            saveLog('DEBUG STATUS: Error parsing user', error.message);
        }
    } else {
        saveLog('DEBUG STATUS: ไม่มีผู้ใช้');
    }
};

// ฟังก์ชันสำหรับล้างสถานะ
window.clearDebugStatus = function() {
    saveLog('CLEAR DEBUG STATUS: ล้างสถานะ');
    window.isRedirecting = false;
    window.hasCheckedAuth = false;
    window.isProtectingPage = false;
    saveLog('CLEAR DEBUG STATUS: สถานะถูกล้างแล้ว');
};

// ฟังก์ชันสำหรับ export log เป็นไฟล์
window.exportLogs = function() {
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    const logText = logs.map(log => 
        `[${log.timestamp}] ${log.message}: ${JSON.stringify(log.data)}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    saveLog('EXPORT LOGS: ส่งออก log เป็นไฟล์แล้ว');
};

saveLog('เสร็จสิ้น');
saveLog('คำสั่งที่ใช้ได้:');
saveLog('- debugStatus() - ตรวจสอบสถานะปัจจุบัน');
saveLog('- clearDebugStatus() - ล้างสถานะ');
saveLog('- showAllLogs() - แสดง log ทั้งหมด');
saveLog('- clearAllLogs() - ล้าง log ทั้งหมด');
saveLog('- exportLogs() - ส่งออก log เป็นไฟล์');
