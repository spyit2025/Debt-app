import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    updateDoc,
    serverTimestamp,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ฟังก์ชันเข้าสู่ระบบโดยไม่ระบุ userType (ตรวจสอบจาก Firebase)
export async function loginUserWithoutUserType(email, password, rememberMe = false) {
    try {
        // การยืนยันตัวตน Firebase จริง
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userType = userData.userType;
            
            // อัปเดตเวลาล็อกอินล่าสุด
            await updateDoc(doc(db, 'users', user.uid), {
                lastLoginAt: serverTimestamp(),
                loginCount: (userData.loginCount || 0) + 1
            });
            
            const userInfo = {
                uid: user.uid,
                email: user.email,
                userType: userType,
                name: userData.name,
                profile: userData.profile || {},
                lastLoginAt: userData.lastLoginAt,
                loginCount: userData.loginCount || 0
            };
            
            // บันทึกข้อมูลผู้ใช้ใน localStorage
            if (rememberMe) {
                localStorage.setItem('userId', user.uid);
                localStorage.setItem('userEmail', user.email);
                localStorage.setItem('userType', userType);
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('rememberMe', 'true');
            } else {
                sessionStorage.setItem('userId', user.uid);
                sessionStorage.setItem('userEmail', user.email);
                sessionStorage.setItem('userType', userType);
                sessionStorage.setItem('userName', userData.name);
                localStorage.removeItem('rememberMe');
            }
            
            return {
                success: true,
                user: userInfo,
                userType: userType
            };
        } else {
            throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // แปลง Firebase error เป็นข้อความภาษาไทย
        let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'ไม่พบผู้ใช้ในระบบ';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'รหัสผ่านไม่ถูกต้อง';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'บัญชีผู้ใช้ถูกปิดใช้งาน';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// ฟังก์ชันเข้าสู่ระบบ
export async function loginUser(email, password, userType, rememberMe = false) {
    try {
        // การยืนยันตัวตน Firebase จริง
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // ตรวจสอบว่าประเภทผู้ใช้ตรงกันหรือไม่
            if (userData.userType !== userType) {
                throw new Error('ประเภทผู้ใช้งานไม่ถูกต้อง');
            }
            
            // อัปเดตเวลาล็อกอินล่าสุด
            await updateDoc(doc(db, 'users', user.uid), {
                lastLoginAt: serverTimestamp(),
                loginCount: (userData.loginCount || 0) + 1
            });
            
            const userInfo = {
                uid: user.uid,
                email: user.email,
                userType: userData.userType,
                name: userData.name,
                profile: userData.profile || {},
                isDemo: false,
                loginTime: new Date().toISOString()
            };
            
            // เก็บข้อมูลตามการเลือก "จดจำฉัน"
            if (rememberMe) {
                localStorage.setItem('user', JSON.stringify(userInfo));
                localStorage.setItem('rememberMe', 'true');
            } else {
                sessionStorage.setItem('user', JSON.stringify(userInfo));
                localStorage.removeItem('rememberMe');
            }
            
            return { success: true, user: userInfo };
        } else {
            throw new Error('ไม่พบข้อมูลผู้ใช้งาน');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // แปลข้อความ error เป็นภาษาไทย
        let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'ไม่พบผู้ใช้งานนี้';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'รหัสผ่านไม่ถูกต้อง';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return { success: false, error: errorMessage };
    }
}

// ฟังก์ชันสมัครสมาชิก
export async function registerUser(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // บันทึกข้อมูลผู้ใช้ใน Firestore
        await setDoc(doc(db, 'users', user.uid), {
            ...userData,
            email: email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            loginCount: 0,
            isActive: true
        });
        
        return { success: true, user: user };
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // แปลข้อความ error เป็นภาษาไทย
        let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return { success: false, error: errorMessage };
    }
}

// ฟังก์ชันออกจากระบบ
export async function logoutUser() {
    try {
        await signOut(auth);
        
        // ลบข้อมูลจากทั้ง sessionStorage และ localStorage
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// ดึงผู้ใช้ปัจจุบัน
export function getCurrentUser() {
    // ตรวจสอบจาก sessionStorage ก่อน (สำหรับการเข้าสู่ระบบแบบไม่จดจำ)
    let user = sessionStorage.getItem('user');
    
    // ถ้าไม่มีใน sessionStorage ให้ตรวจสอบ localStorage (สำหรับการจดจำ)
    if (!user) {
        user = localStorage.getItem('user');
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            return userData;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    
    return null;
}

// ตรวจสอบสถานะการยืนยันตัวตน
export function onAuthStateChange(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ผู้ใช้เข้าสู่ระบบแล้ว
            callback(user);
        } else {
            // ผู้ใช้ออกจากระบบแล้ว
            callback(null);
        }
    });
}

// เปลี่ยนเส้นทางตามประเภทผู้ใช้
export function redirectBasedOnUserType(userType) {
    // ป้องกันการ redirect ซ้ำๆ
    const currentPath = window.location.pathname;
    
    // ตรวจสอบว่าอยู่ที่หน้า dashboard ที่ถูกต้องแล้วหรือไม่
    if (currentPath.includes('/dashboard/') && 
        currentPath.includes(`${userType}-dashboard.html`)) {
        return;
    }
    
    // ตรวจสอบว่ากำลัง redirect อยู่หรือไม่
    if (window.isRedirecting) {
        return;
    }
    
    // ตั้งค่าสถานะ redirect
    window.isRedirecting = true;
    
    // ใช้ setTimeout เพื่อป้องกัน throttling
    setTimeout(() => {
        try {
            let targetUrl = '';
            switch (userType) {
                case 'creditor':
                    if (!currentPath.includes('creditor-dashboard.html')) {
                        targetUrl = './pages/dashboard/creditor-dashboard.html';
                    }
                    break;
                case 'debtor':
                    if (!currentPath.includes('debtor-dashboard.html')) {
                        targetUrl = './pages/dashboard/debtor-dashboard.html';
                    }
                    break;
                default:
                    if (!currentPath.includes('index.html')) {
                        targetUrl = './index.html';
                    }
            }
            
            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                window.isRedirecting = false;
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการ redirect:', error);
            window.isRedirecting = false;
        }
    }, 500);
}

// ตรวจสอบสิทธิ์การเข้าถึงตามประเภทผู้ใช้
export function checkUserPermission(requiredUserType) {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        return false;
    }
    
    // ตรวจสอบประเภทผู้ใช้ที่ต้องการ
    if (Array.isArray(requiredUserType)) {
        return requiredUserType.includes(currentUser.userType);
    }
    
    return currentUser.userType === requiredUserType;
}

// ฟังก์ชันป้องกันการเข้าถึงหน้าโดยไม่ได้รับอนุญาต
export function protectPage(requiredUserType) {
    // ป้องกันการเรียกซ้ำๆ
    if (window.isProtectingPage) {
        return;
    }
    
    window.isProtectingPage = true;
    
    try {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            // ถ้าไม่มีผู้ใช้ ให้ไปหน้า login
            if (!window.isRedirecting) {
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 1000);
            }
            return;
        }
        
        // ตรวจสอบสิทธิ์การเข้าถึง
        const hasPermission = checkUserPermission(requiredUserType);
        
        if (!hasPermission) {
            // ถ้าไม่มีสิทธิ์ ให้แสดงข้อความและเปลี่ยนเส้นทาง
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            if (!window.isRedirecting) {
                setTimeout(() => {
                    redirectBasedOnUserType(currentUser.userType);
                }, 1000);
            }
            return;
        }
        
        // ถ้ามีสิทธิ์แล้ว ให้แสดงข้อมูลผู้ใช้
        displayUserInfo();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);
    } finally {
        window.isProtectingPage = false;
    }
}

// ฟังก์ชันแสดงข้อมูลผู้ใช้ในหน้า dashboard
export function displayUserInfo() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    const userTypeText = {
        'creditor': 'เจ้าหนี้',
        'debtor': 'ลูกหนี้'
    };
    
    // อัปเดต userName element (สำหรับ navbar)
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        const userType = userTypeText[currentUser.userType] || currentUser.userType;
        userNameElement.textContent = userType;
    }
    
    // อัปเดต userInfo element (สำหรับ dashboard)
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="avatar me-3">
                    <i class="fas fa-user-circle fs-1 text-primary"></i>
                </div>
                <div>
                    <h6 class="mb-0">${currentUser.name || currentUser.email}</h6>
                    <small class="text-muted">${userTypeText[currentUser.userType] || currentUser.userType}</small>
                </div>
            </div>
        `;
    }
}

// ฟังก์ชันแสดงการแจ้งเตือน
function showAlert(message, type) {
    // ลบการแจ้งเตือนที่มีอยู่
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // สร้างการแจ้งเตือนใหม่
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // แทรกการแจ้งเตือนก่อนฟอร์ม
    const form = document.getElementById('loginForm');
    if (form) {
        form.parentNode.insertBefore(alertDiv, form);
    }
    
    // ปิดอัตโนมัติหลังจาก 5 วินาที
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ฟังก์ชันแสดงข้อความสำเร็จ (export สำหรับใช้ในไฟล์อื่น)
export function showSuccessMessage(message) {
    showAlert(message, 'success');
}

// ฟังก์ชันแสดงข้อความผิดพลาด (export สำหรับใช้ในไฟล์อื่น)
export function showErrorMessage(message) {
    showAlert(message, 'danger');
}

// Reset สถานะเมื่อโหลดหน้าใหม่
if (typeof window.isRedirecting === 'undefined') {
    window.isRedirecting = false;
}
if (typeof window.hasCheckedAuth === 'undefined') {
    window.hasCheckedAuth = false;
}
if (typeof window.isProtectingPage === 'undefined') {
    window.isProtectingPage = false;
}

// เริ่มต้นฟอร์มเข้าสู่ระบบ
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // ตรวจสอบสถานะ "จดจำฉัน" จาก localStorage
        const savedEmail = localStorage.getItem('userEmail');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const rememberMeCheckbox = document.getElementById('rememberMe');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = rememberMe;
        }
        
        // Load saved email if available
        const emailInput = document.getElementById('email');
        if (emailInput && savedEmail) {
            emailInput.value = savedEmail;
        }
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailElement = document.getElementById('email');
            const passwordElement = document.getElementById('password');
            const rememberMeElement = document.getElementById('rememberMe');
            
            // ตรวจสอบว่า element มีอยู่จริงหรือไม่
            if (!emailElement || !passwordElement) {
                showAlert('ไม่พบฟอร์มเข้าสู่ระบบ', 'danger');
                return;
            }
            
            const email = emailElement.value;
            const password = passwordElement.value;
            const rememberMe = rememberMeElement ? rememberMeElement.checked : false;
            
            // ตรวจสอบว่าข้อมูลครบถ้วนหรือไม่
            if (!email || !password) {
                showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
                return;
            }
            
            // แสดงสถานะกำลังโหลด
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (!submitBtn) {
                showAlert('ไม่พบปุ่มส่งข้อมูล', 'danger');
                return;
            }
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังเข้าสู่ระบบ...';
            submitBtn.disabled = true;
            
            try {
                // ลองเข้าสู่ระบบโดยไม่ระบุ userType ก่อน
                // ระบบจะตรวจสอบ userType จากข้อมูลใน Firebase
                const result = await loginUserWithoutUserType(email, password, rememberMe);
                
                if (result.success) {
                    // แสดงข้อความสำเร็จ
                    showAlert('เข้าสู่ระบบสำเร็จ!', 'success');
                    
                    // ป้องกันการ submit ซ้ำ
                    submitBtn.disabled = true;
                    
                    // เปลี่ยนเส้นทางหลังจากหน่วงเวลา
                    setTimeout(() => {
                        if (!window.isRedirecting) {
                            redirectBasedOnUserType(result.userType);
                        }
                    }, 2500);
                    
                } else {
                    showAlert(result.error, 'danger');
                }
                
            } catch (error) {
                showAlert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'danger');
            } finally {
                // รีเซ็ตสถานะปุ่ม
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
});

// ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่ (เฉพาะในหน้า login และหน้าแรก)
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบว่าอยู่ในหน้า login หรือไม่
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html');
    const isRegisterPage = currentPath.includes('register.html');
    const isHomePage = currentPath === '/' || currentPath.endsWith('/') || currentPath.endsWith('index.html');
    
    // ตรวจสอบเฉพาะในหน้า login, register และหน้าแรก
    if (isLoginPage || isRegisterPage || isHomePage) {
        // ป้องกันการตรวจสอบซ้ำๆ
        if (window.hasCheckedAuth) {
            return;
        }
        
        window.hasCheckedAuth = true;
        
        // หน่วงเวลาสักครู่ก่อนตรวจสอบสถานะผู้ใช้
        setTimeout(() => {
            const currentUser = getCurrentUser();
            if (currentUser && !window.isRedirecting) {
                redirectBasedOnUserType(currentUser.userType);
            }
        }, 1500);
    }
});