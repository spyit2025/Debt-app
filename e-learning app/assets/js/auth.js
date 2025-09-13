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
            
            // ตรวจสอบสถานะการอนุมัติ (เฉพาะผู้สอนและแอดมิน)
            if (userData.userType === 'instructor' || userData.userType === 'admin') {
                if (userData.approvalStatus === 'pending') {
                    throw new Error('บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณารอการอนุมัติจากแอดมิน');
                } else if (userData.approvalStatus === 'rejected') {
                    throw new Error('บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อแอดมินเพื่อสอบถามรายละเอียด');
                }
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
                approvalStatus: userData.approvalStatus || 'approved',
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
        
        // บันทึกกิจกรรมระบบ
        try {
            await addDoc(collection(db, 'system_activities'), {
                title: 'ผู้ใช้ใหม่สมัครสมาชิก',
                description: `${userData.name || userData.firstName + ' ' + userData.lastName} (${email}) สมัครสมาชิกใหม่`,
                type: 'user_registration',
                timestamp: serverTimestamp(),
                userId: user.uid
            });
        } catch (error) {
            console.log('ไม่สามารถบันทึกกิจกรรมระบบได้:', error);
        }
        
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

// ฟังก์ชันดึงข้อมูลผู้ใช้จาก Firestore
export async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return { success: true, data: userDoc.data() };
        } else {
            return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        return { success: false, error: error.message };
    }
}

// ฟังก์ชันอัปเดตข้อมูลผู้ใช้
export async function updateUserData(uid, updateData) {
    try {
        await updateDoc(doc(db, 'users', uid), {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user data:', error);
        return { success: false, error: error.message };
    }
}

// ฟังก์ชันดึงข้อมูลคอร์สของผู้เรียน
export async function getUserCourses(uid) {
    try {
        const coursesQuery = query(
            collection(db, 'enrollments'),
            where('userId', '==', uid),
            where('status', '==', 'active')
        );
        
        const querySnapshot = await getDocs(coursesQuery);
        const enrollments = [];
        
        querySnapshot.forEach((doc) => {
            enrollments.push({ id: doc.id, ...doc.data() });
        });
        
        // ดึงข้อมูลคอร์ส
        const courses = [];
        for (const enrollment of enrollments) {
            const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
            if (courseDoc.exists()) {
                courses.push({
                    ...courseDoc.data(),
                    enrollmentId: enrollment.id,
                    progress: enrollment.progress || 0,
                    status: enrollment.status
                });
            }
        }
        
        return { success: true, data: courses };
    } catch (error) {
        console.error('Error fetching user courses:', error);
        return { success: false, error: error.message };
    }
}

// ฟังก์ชันดึงข้อมูลข้อสอบของผู้เรียน
export async function getUserQuizzes(uid) {
    try {
        const quizzesQuery = query(
            collection(db, 'quiz_results'),
            where('userId', '==', uid)
        );
        
        const querySnapshot = await getDocs(quizzesQuery);
        const results = [];
        
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        
        return { success: true, data: results };
    } catch (error) {
        console.error('Error fetching user quizzes:', error);
        return { success: false, error: error.message };
    }
}

// ฟังก์ชันดึงข้อมูลสถิติของผู้เรียน
export async function getUserStatistics(uid) {
    try {
        // ดึงข้อมูลคอร์ส
        const coursesResult = await getUserCourses(uid);
        const courses = coursesResult.success ? coursesResult.data : [];
        
        // ดึงข้อมูลข้อสอบ
        const quizzesResult = await getUserQuizzes(uid);
        const quizzes = quizzesResult.success ? quizzesResult.data : [];
        
        // คำนวณสถิติ
        const totalCourses = courses.length;
        const completedCourses = courses.filter(course => course.progress >= 100).length;
        const totalQuizzes = quizzes.length;
        
        // คำนวณคะแนนเฉลี่ย
        const completedQuizzes = quizzes.filter(quiz => quiz.score !== undefined);
        const averageScore = completedQuizzes.length > 0 
            ? Math.round(completedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / completedQuizzes.length)
            : 0;
        
        return {
            success: true,
            data: {
                totalCourses,
                completedCourses,
                totalQuizzes,
                averageScore: `${averageScore}%`
            }
        };
    } catch (error) {
        console.error('Error calculating user statistics:', error);
        return { success: false, error: error.message };
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
    // บันทึก log
    if (window.saveLog) {
        window.saveLog('AUTH.JS: getCurrentUser เริ่มตรวจสอบผู้ใช้');
    }
    console.log('🔍 getCurrentUser: เริ่มตรวจสอบผู้ใช้');
    
    // ตรวจสอบจาก sessionStorage ก่อน (สำหรับการเข้าสู่ระบบแบบไม่จดจำ)
    let user = sessionStorage.getItem('user');
    if (window.saveLog) {
        window.saveLog('AUTH.JS: sessionStorage', user ? 'มีข้อมูล' : 'ไม่มีข้อมูล');
    }
    console.log('🔍 getCurrentUser: sessionStorage =', user ? 'มีข้อมูล' : 'ไม่มีข้อมูล');
    
    // ถ้าไม่มีใน sessionStorage ให้ตรวจสอบ localStorage (สำหรับการจดจำ)
    if (!user) {
        user = localStorage.getItem('user');
        if (window.saveLog) {
            window.saveLog('AUTH.JS: localStorage', user ? 'มีข้อมูล' : 'ไม่มีข้อมูล');
        }
        console.log('🔍 getCurrentUser: localStorage =', user ? 'มีข้อมูล' : 'ไม่มีข้อมูล');
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            if (window.saveLog) {
                window.saveLog('AUTH.JS: พบผู้ใช้', userData.userType);
            }
            console.log('🔍 getCurrentUser: พบผู้ใช้:', userData.userType);
            return userData;
        } catch (error) {
            if (window.saveLog) {
                window.saveLog('AUTH.JS: Error parsing user data', error.message);
            }
            console.error('❌ getCurrentUser: Error parsing user data:', error);
            return null;
        }
    }
    
    if (window.saveLog) {
        window.saveLog('AUTH.JS: ไม่พบผู้ใช้');
    }
    console.log('🔍 getCurrentUser: ไม่พบผู้ใช้');
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
    
    // บันทึก log
    if (window.saveLog) {
        window.saveLog('AUTH.JS: redirectBasedOnUserType ถูกเรียก');
        window.saveLog('AUTH.JS: userType', userType);
        window.saveLog('AUTH.JS: currentPath', currentPath);
        window.saveLog('AUTH.JS: isRedirecting', window.isRedirecting);
    }
    
    console.log('🔄 redirectBasedOnUserType: ถูกเรียก');
    console.log('🔄 redirectBasedOnUserType: userType =', userType);
    console.log('🔄 redirectBasedOnUserType: currentPath =', currentPath);
    console.log('🔄 redirectBasedOnUserType: isRedirecting =', window.isRedirecting);
    
    // ตรวจสอบว่าอยู่ที่หน้า dashboard ที่ถูกต้องแล้วหรือไม่
    if (currentPath.includes('/dashboard/') && 
        currentPath.includes(`${userType}-dashboard.html`)) {
        console.log('อยู่ที่หน้า dashboard ที่ถูกต้องแล้ว ไม่ต้อง redirect');
        return;
    }
    
    // ตรวจสอบว่ากำลัง redirect อยู่หรือไม่
    if (window.isRedirecting) {
        console.log('กำลัง redirect อยู่แล้ว ไม่ต้อง redirect ซ้ำ');
        return;
    }
    
    // ตรวจสอบว่ากำลังอยู่ในหน้า dashboard อยู่แล้วหรือไม่
    if (currentPath.includes('/dashboard/')) {
        console.log('อยู่ที่หน้า dashboard อยู่แล้ว ไม่ต้อง redirect');
        return;
    }
    
    // ตั้งค่าสถานะ redirect
    window.isRedirecting = true;
    console.log('เริ่ม redirect ไปยัง:', userType);
    
    // ใช้ setTimeout เพื่อป้องกัน throttling
    setTimeout(() => {
        try {
            let targetUrl = '';
            switch (userType) {
                case 'student':
                    if (!currentPath.includes('student-dashboard.html')) {
                        targetUrl = '../dashboard/student-dashboard.html';
                    }
                    break;
                case 'instructor':
                    if (!currentPath.includes('instructor-dashboard.html')) {
                        targetUrl = '../dashboard/instructor-dashboard.html';
                    }
                    break;
                case 'admin':
                    if (!currentPath.includes('admin-dashboard.html')) {
                        targetUrl = '../dashboard/admin-dashboard.html';
                    }
                    break;
                default:
                    if (!currentPath.includes('login.html')) {
                        targetUrl = '../auth/login.html';
                    }
            }
            
            if (targetUrl) {
                console.log('redirect ไปยัง:', targetUrl);
                window.location.href = targetUrl;
            } else {
                console.log('ไม่ต้อง redirect');
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
    console.log('🔐 checkUserPermission: เริ่มตรวจสอบ');
    console.log('🔐 checkUserPermission: requiredUserType =', requiredUserType);
    
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        console.log('🔐 checkUserPermission: ไม่พบผู้ใช้');
        return false;
    }
    
    console.log('🔐 checkUserPermission: currentUser.userType =', currentUser.userType);
    
    // ตรวจสอบประเภทผู้ใช้ที่ต้องการ
    if (Array.isArray(requiredUserType)) {
        const hasPermission = requiredUserType.includes(currentUser.userType);
        console.log('🔐 checkUserPermission: requiredUserType เป็น array, hasPermission =', hasPermission);
        return hasPermission;
    }
    
    const hasPermission = currentUser.userType === requiredUserType;
    console.log('🔐 checkUserPermission: requiredUserType เป็น string, hasPermission =', hasPermission);
    return hasPermission;
}

// ฟังก์ชันป้องกันการเข้าถึงหน้าโดยไม่ได้รับอนุญาต
export function protectPage(requiredUserType) {
    // บันทึก log
    if (window.saveLog) {
        window.saveLog('AUTH.JS: protectPage ถูกเรียก');
        window.saveLog('AUTH.JS: requiredUserType', requiredUserType);
        window.saveLog('AUTH.JS: currentPath', window.location.pathname);
        window.saveLog('AUTH.JS: isProtectingPage', window.isProtectingPage);
    }
    
    console.log('🛡️ protectPage: ถูกเรียก');
    console.log('🛡️ protectPage: requiredUserType =', requiredUserType);
    console.log('🛡️ protectPage: currentPath =', window.location.pathname);
    console.log('🛡️ protectPage: isProtectingPage =', window.isProtectingPage);
    
    // ป้องกันการเรียกซ้ำๆ
    if (window.isProtectingPage) {
        if (window.saveLog) {
            window.saveLog('AUTH.JS: กำลังตรวจสอบสิทธิ์อยู่แล้ว ไม่ต้องตรวจสอบซ้ำ');
        }
        console.log('🛡️ protectPage: กำลังตรวจสอบสิทธิ์อยู่แล้ว ไม่ต้องตรวจสอบซ้ำ');
        return;
    }
    
    window.isProtectingPage = true;
    if (window.saveLog) {
        window.saveLog('AUTH.JS: เริ่มตรวจสอบสิทธิ์');
    }
    console.log('🛡️ protectPage: เริ่มตรวจสอบสิทธิ์');
    
    try {
        console.log('🛡️ protectPage: เริ่มตรวจสอบผู้ใช้');
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.log('🛡️ protectPage: ไม่พบผู้ใช้ กำลัง redirect ไปหน้า login');
            // ถ้าไม่มีผู้ใช้ ให้ไปหน้า login
            if (!window.isRedirecting) {
                console.log('🛡️ protectPage: เริ่ม redirect ไปหน้า login');
                setTimeout(() => {
                    window.location.href = '../auth/login.html';
                }, 1000);
            } else {
                console.log('🛡️ protectPage: กำลัง redirect อยู่แล้ว ไม่ต้อง redirect ซ้ำ');
            }
            return;
        }
        
        console.log('🛡️ protectPage: พบผู้ใช้:', currentUser.userType);
        
        // ตรวจสอบสิทธิ์การเข้าถึง
        console.log('🛡️ protectPage: ตรวจสอบสิทธิ์การเข้าถึง');
        const hasPermission = checkUserPermission(requiredUserType);
        console.log('🛡️ protectPage: hasPermission =', hasPermission);
        
        if (!hasPermission) {
            console.log('🛡️ protectPage: ไม่มีสิทธิ์เข้าถึง กำลัง redirect');
            // ถ้าไม่มีสิทธิ์ ให้แสดงข้อความและเปลี่ยนเส้นทาง
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            if (!window.isRedirecting) {
                console.log('🛡️ protectPage: เริ่ม redirect ตามประเภทผู้ใช้');
                setTimeout(() => {
                    redirectBasedOnUserType(currentUser.userType);
                }, 1000);
            } else {
                console.log('🛡️ protectPage: กำลัง redirect อยู่แล้ว ไม่ต้อง redirect ซ้ำ');
            }
            return;
        }
        
        console.log('🛡️ protectPage: มีสิทธิ์เข้าถึง แสดงข้อมูลผู้ใช้');
        // ถ้ามีสิทธิ์แล้ว ให้แสดงข้อมูลผู้ใช้
        displayUserInfo();
        
    } catch (error) {
        console.error('❌ protectPage: เกิดข้อผิดพลาด:', error);
    } finally {
        window.isProtectingPage = false;
        console.log('🛡️ protectPage: เสร็จสิ้นการตรวจสอบ');
    }
}

// ฟังก์ชันแสดงข้อมูลผู้ใช้ในหน้า dashboard
export function displayUserInfo() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    const userTypeText = {
        'student': 'ผู้เรียน',
        'instructor': 'ผู้สอน',
        'admin': 'แอดมิน'
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
                    <i class="bi bi-person-circle fs-1 text-primary"></i>
                </div>
                <div>
                    <h6 class="mb-0">${currentUser.name || currentUser.email}</h6>
                    <small class="text-muted">${userTypeText[currentUser.userType] || currentUser.userType}</small>
                </div>
            </div>
        `;
    }
}

// ฟังก์ชันสร้างเมนูหลักตามประเภทผู้ใช้
export function createMainMenu() {
    const currentUser = getCurrentUser();
    const menuContainer = document.getElementById('mainMenu');
    
    if (!menuContainer || !currentUser) return;
    
    const mainMenuItems = {
        'student': [
            { text: 'หน้าหลัก', icon: 'bi-house', href: '../dashboard/student-dashboard.html' },
            { text: 'คอร์สของฉัน', icon: 'bi-book', href: '../courses/course-list.html' },
            { text: 'ข้อสอบ', icon: 'bi-question-circle', href: '../quiz/quiz-list.html' },
            { text: 'ผลการเรียน', icon: 'bi-graph-up', href: '../courses/student-results.html' },
            { text: 'โปรไฟล์', icon: 'bi-person', href: '../courses/profile.html' }
        ],
        'instructor': [
            { text: 'หน้าหลัก', icon: 'bi-house', href: '../dashboard/instructor-dashboard.html' },
            { text: 'จัดการคอร์ส', icon: 'bi-book', href: '../courses/manage-courses.html' },
            { text: 'สร้างข้อสอบ', icon: 'bi-plus-circle', href: '../quiz/quiz-create.html' },
            { text: 'ดูผลการเรียน', icon: 'bi-graph-up', href: '../courses/student-results.html' },
            { text: 'โปรไฟล์', icon: 'bi-person', href: '../courses/profile.html' }
        ],
        'admin': [
            { text: 'หน้าหลัก', icon: 'bi-house', href: '../dashboard/admin-dashboard.html' },
            { text: 'จัดการผู้ใช้', icon: 'bi-people', href: '../users/manage-users.html' },
            { text: 'จัดการคอร์ส', icon: 'bi-book', href: '../courses/manage-courses.html' },
            { text: 'จัดการข้อสอบ', icon: 'bi-question-circle', href: '../quiz/manage-quizzes.html' },
            { text: 'รายงานระบบ', icon: 'bi-graph-up', href: '../reports/system-reports.html' },
            { text: 'การตั้งค่า', icon: 'bi-gear', href: '../settings/system-settings.html' }
        ]
    };
    
    const items = mainMenuItems[currentUser.userType] || [];
    
    menuContainer.innerHTML = items.map(item => {
        const currentPath = window.location.pathname;
        let isActive = false;
        
        // ตรวจสอบหน้า active ตามประเภท
        if (item.text === 'หน้าหลัก') {
            isActive = currentPath.includes('dashboard');
        } else if (item.text === 'จัดการผู้ใช้') {
            isActive = currentPath.includes('manage-users.html') || currentPath.includes('user-detail.html') || currentPath.includes('user-edit.html');
        } else if (item.text === 'จัดการคอร์ส') {
            isActive = currentPath.includes('manage-courses.html') || currentPath.includes('course-list.html');
        } else if (item.text === 'จัดการข้อสอบ') {
            isActive = currentPath.includes('manage-quizzes.html') || currentPath.includes('quiz-create.html') || currentPath.includes('quiz-list.html');
        } else if (item.text === 'รายงานระบบ') {
            isActive = currentPath.includes('system-reports.html');
        } else if (item.text === 'การตั้งค่า') {
            isActive = currentPath.includes('system-settings.html');
        } else if (item.text === 'คอร์สของฉัน') {
            isActive = currentPath.includes('course-list.html');
        } else if (item.text === 'ข้อสอบ') {
            isActive = currentPath.includes('quiz-list.html') || currentPath.includes('quiz-take.html');
        } else if (item.text === 'ผลการเรียน') {
            isActive = currentPath.includes('student-results.html');
        } else if (item.text === 'โปรไฟล์') {
            isActive = currentPath.includes('profile.html');
        } else if (item.text === 'สร้างข้อสอบ') {
            isActive = currentPath.includes('quiz-create.html');
        } else if (item.text === 'ดูผลการเรียน') {
            isActive = currentPath.includes('student-results.html');
        }
        
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive ? 'active' : ''}" href="${item.href}">
                    <i class="${item.icon} me-1"></i>
                    ${item.text}
                </a>
            </li>
        `;
    }).join('');
}

// ฟังก์ชันสร้างเมนูตามประเภทผู้ใช้
export function createUserMenu() {
    const currentUser = getCurrentUser();
    const menuContainer = document.getElementById('userMenu');
    
    if (!menuContainer || !currentUser) return;
    
    const menuItems = {
        'student': [
            { text: 'ออกจากระบบ', icon: 'bi-box-arrow-right', href: '#', action: 'logout' }
        ],
        'instructor': [
            { text: 'ออกจากระบบ', icon: 'bi-box-arrow-right', href: '#', action: 'logout' }
        ],
        'admin': [
            { text: 'ออกจากระบบ', icon: 'bi-box-arrow-right', href: '#', action: 'logout' }
        ]
    };
    
    const items = menuItems[currentUser.userType] || [];
    
    menuContainer.innerHTML = items.map(item => `
        <li>
            <a class="dropdown-item" href="${item.href}" ${item.action ? `data-action="${item.action}"` : ''}>
                <i class="${item.icon} me-2"></i>
                ${item.text}
            </a>
        </li>
    `).join('');
}

// ฟังก์ชันตรวจสอบเวลาหมดอายุของ session
export function checkSessionExpiry() {
    const currentUser = getCurrentUser();
    
    if (!currentUser || !currentUser.loginTime) {
        return false;
    }
    
    const loginTime = new Date(currentUser.loginTime);
    const currentTime = new Date();
    const timeDiff = currentTime - loginTime;
    
    // ตรวจสอบว่าเกิน 24 ชั่วโมงหรือไม่ (สำหรับ session ปกติ)
    const maxSessionTime = 24 * 60 * 60 * 1000; // 24 ชั่วโมงในมิลลิวินาที
    
    if (timeDiff > maxSessionTime) {
        // ถ้าเกินเวลา ให้ออกจากระบบ
        logoutUser();
        
        // ตรวจสอบว่าอยู่ในหน้า login หรือไม่ก่อน redirect
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '../auth/login.html';
        }
        return false;
    }
    
    return true;
}

// เริ่มต้นฟอร์มเข้าสู่ระบบ
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // ตรวจสอบสถานะ "จดจำฉัน" จาก localStorage
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const rememberMeCheckbox = document.getElementById('rememberMe');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = rememberMe;
        }
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const userType = document.getElementById('userType').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // แสดงสถานะกำลังโหลด
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>กำลังเข้าสู่ระบบ...';
            submitBtn.disabled = true;
            
            try {
                const result = await loginUser(email, password, userType, rememberMe);
                
                if (result.success) {
                    // แสดงข้อความสำเร็จ
                    showAlert('เข้าสู่ระบบสำเร็จ!', 'success');
                    
                    // ป้องกันการ submit ซ้ำ
                    submitBtn.disabled = true;
                    
                    console.log('Login สำเร็จ กำลัง redirect...');
                    
                    // เปลี่ยนเส้นทางหลังจากหน่วงเวลา
                    setTimeout(() => {
                        if (!window.isRedirecting) {
                            console.log('เริ่ม redirect หลังจาก login สำเร็จ');
                            redirectBasedOnUserType(userType);
                        } else {
                            console.log('กำลัง redirect อยู่แล้ว ไม่ต้อง redirect ซ้ำ');
                        }
                    }, 2500);
                    
                } else {
                    showAlert(result.error, 'danger');
                }
                
            } catch (error) {
                showAlert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'danger');
            } finally {
                // รีเซ็ตสถานะปุ่ม
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

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

// Debug: แสดงสถานะเริ่มต้น
console.log('🔧 AUTH.JS: สถานะเริ่มต้น');
console.log('🔧 AUTH.JS: isRedirecting =', window.isRedirecting);
console.log('🔧 AUTH.JS: hasCheckedAuth =', window.hasCheckedAuth);
console.log('🔧 AUTH.JS: isProtectingPage =', window.isProtectingPage);
console.log('🔧 AUTH.JS: current path =', window.location.pathname);

// ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่ (เฉพาะในหน้า login และหน้าแรก)
document.addEventListener('DOMContentLoaded', function() {
    // บันทึก log
    if (window.saveLog) {
        window.saveLog('AUTH.JS: DOMContentLoaded เริ่มต้น');
    }
    console.log('📄 DOMContentLoaded: เริ่มต้น');
    
    // ตรวจสอบว่าอยู่ในหน้า login หรือไม่
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const isRegisterPage = currentPath.includes('register.html');
    const isHomePage = currentPath === '/' || currentPath.endsWith('/') || currentPath.endsWith('index.html');
    
    if (window.saveLog) {
        window.saveLog('AUTH.JS: currentPath', currentPath);
        window.saveLog('AUTH.JS: isLoginPage', isLoginPage);
        window.saveLog('AUTH.JS: isRegisterPage', isRegisterPage);
        window.saveLog('AUTH.JS: isHomePage', isHomePage);
    }
    
    console.log('📄 DOMContentLoaded: currentPath =', currentPath);
    console.log('📄 DOMContentLoaded: isLoginPage =', isLoginPage);
    console.log('📄 DOMContentLoaded: isRegisterPage =', isRegisterPage);
    console.log('📄 DOMContentLoaded: isHomePage =', isHomePage);
    
    // ตรวจสอบเฉพาะในหน้า login, register และหน้าแรก
    if (isLoginPage || isRegisterPage || isHomePage) {
        console.log('📄 DOMContentLoaded: อยู่ในหน้า login/register/home');
        
        // ป้องกันการตรวจสอบซ้ำๆ
        if (window.hasCheckedAuth) {
            console.log('📄 DOMContentLoaded: ตรวจสอบสถานะผู้ใช้แล้ว ไม่ต้องตรวจสอบซ้ำ');
            return;
        }
        
        window.hasCheckedAuth = true;
        console.log('📄 DOMContentLoaded: เริ่มตรวจสอบสถานะผู้ใช้ในหน้า:', currentPath);
        
        // หน่วงเวลาสักครู่ก่อนตรวจสอบสถานะผู้ใช้
        setTimeout(() => {
            console.log('📄 DOMContentLoaded: เริ่มตรวจสอบผู้ใช้หลังจากหน่วงเวลา');
            const currentUser = getCurrentUser();
            if (currentUser && !window.isRedirecting) {
                console.log('📄 DOMContentLoaded: พบผู้ใช้ที่เข้าสู่ระบบแล้ว กำลัง redirect...');
                redirectBasedOnUserType(currentUser.userType);
            } else {
                console.log('📄 DOMContentLoaded: ไม่พบผู้ใช้หรือกำลัง redirect อยู่');
            }
        }, 1500);
    } else {
        console.log('📄 DOMContentLoaded: ไม่ใช่หน้า login/register/home ไม่ต้องตรวจสอบสถานะผู้ใช้');
    }
});
