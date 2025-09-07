// Authentication Module with Enhanced Error Handling
// User state
if (typeof currentUser === 'undefined') {
let currentUser = null;
let userType = null;

// Get Firebase instances safely
function getFirebaseInstances() {
    if (window.firebaseUtils && window.firebaseUtils.isFirebaseReady()) {
        return window.firebaseUtils.getFirebaseInstances();
    }
    
    // Fallback to global instances
    if (window.firebaseAuth && window.firebaseDb) {
        return {
            auth: window.firebaseAuth,
            db: window.firebaseDb
        };
    }
    
    throw new Error('Firebase is not initialized');
}

// Authentication functions
const authModule = {
    // Sign in with email and password
    async signIn(email, password, retryCount = 0) {
        const maxRetries = 2;
        
        try {
            // Check network connection
            if (!navigator.onLine) {
                throw new Error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อและลองใหม่');
            }
            
            // Try Firebase authentication
            if (window.firebaseUtils && window.firebaseUtils.isFirebaseReady()) {
                const { auth, db } = getFirebaseInstances();
                
                // เพิ่ม progress tracking
                let authProgress = 0;
                const progressInterval = setInterval(() => {
                    authProgress += 10;
                }, 3000);
                
                // ลองใช้วิธีอื่น - ใช้ setTimeout แทน Promise.race
                let authCompleted = false;
                let authResult = null;
                let authError = null;
                
                const authPromise = auth.signInWithEmailAndPassword(email, password)
                    .then(result => {
                        authCompleted = true;
                        authResult = result;
                    })
                    .catch(error => {
                        authCompleted = true;
                        authError = error;
                        console.error('Firebase auth failed:', error);
                    });
                
                // ใช้ setTimeout แทน Promise.race
                const timeoutId = setTimeout(() => {
                    if (!authCompleted) {
                        clearInterval(progressInterval);
                        throw new Error('การเข้าสู่ระบบใช้เวลานานเกินไป กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่');
                    }
                }, 30000);
                
                // รอให้ auth เสร็จ
                await authPromise;
                clearTimeout(timeoutId);
                
                if (authError) {
                    throw authError;
                }
                
                const userCredential = authResult;
                clearInterval(progressInterval);
                const user = userCredential.user;
            
                try {
                    // Get user data from Firestore with timeout
                    const userDocPromise = db.collection('users').doc(user.uid).get();
                    const userDocTimeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('การโหลดข้อมูลผู้ใช้ใช้เวลานานเกินไป กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่')), 20000)
                    );
                    
                    const userDoc = await Promise.race([userDocPromise, userDocTimeoutPromise]);
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // ตรวจสอบว่ามี userType ใน database หรือไม่
                        if (!userData.userType) {
                            await auth.signOut();
                            throw new Error('ไม่พบประเภทผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ');
                        }
                        
                        currentUser = user;
                        userType = userData.userType;
                        
                        // Store user info in localStorage
                        localStorage.setItem('userType', userType);
                        localStorage.setItem('userId', user.uid);
                        localStorage.setItem('userEmail', user.email);
                        localStorage.setItem('userDisplayName', user.displayName || '');
                        localStorage.setItem('lastLoginTime', new Date().toISOString());
                        
                        return {
                            success: true,
                            user: user,
                            userData: userData
                        };
                    } else {
                        // ถ้าไม่มีข้อมูลใน Firestore ให้ sign out และแสดงข้อความ
                        await auth.signOut();
                        throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ');
                    }
                } catch (firestoreError) {
                    console.error('Firestore error:', firestoreError);
                    
                    // ถ้า Firestore error และยังไม่เกิน retry limit ให้ลองใหม่
                    if (retryCount < maxRetries && (firestoreError.message.includes('ใช้เวลานานเกินไป') || firestoreError.code === 'unavailable')) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Wait before retry
                        return this.signIn(email, password, retryCount + 1);
                    }
                    
                    // ถ้า Firestore error ให้ sign out
                    await auth.signOut();
                    throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่');
                }
            } else {
                throw new Error('Firebase ไม่พร้อมใช้งาน');
            }
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    },

    // Sign out
    async signOut() {
        try {
            const { auth } = getFirebaseInstances();
            await auth.signOut();
            currentUser = null;
            userType = null;
            localStorage.removeItem('userType');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userDisplayName');
            localStorage.removeItem('lastLoginTime');
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    },

    // Get current user
    getCurrentUser() {
        return currentUser;
    },

    // Get user type
    getUserType() {
        return userType;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return currentUser !== null;
    },

    // Initialize auth state listener
    initAuthStateListener() {
        try {
            const { auth } = getFirebaseInstances();
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    userType = localStorage.getItem('userType');
                    
                    // Update localStorage with current user info
                    localStorage.setItem('userId', user.uid);
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userDisplayName', user.displayName || '');
                    
                    // Check if user should stay logged in (remember me functionality)
                    const rememberMe = localStorage.getItem('rememberMe');
                    const lastLoginTime = localStorage.getItem('lastLoginTime');
                    
                    // If remember me is not set or login is too old (30 days), sign out
                    if (!rememberMe || !lastLoginTime) {
                        const loginDate = new Date(lastLoginTime);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        
                        if (loginDate < thirtyDaysAgo) {
                            await auth.signOut();
                            return;
                        }
                    }
                    
                    // Only redirect if not already on the correct page and not in a redirect loop
                    const currentPage = window.location.pathname;
                    const isRedirecting = sessionStorage.getItem('isRedirecting');
                    
                    // ป้องกัน redirect loop โดยตรวจสอบให้แน่ใจ
                    if (!isRedirecting && userType) {
                        // ตรวจสอบว่าอยู่ในหน้า dashboard แล้วหรือไม่
                        const isOnDashboard = currentPage.includes('dashboard');
                        const isCorrectDashboard = (userType === 'creditor' && currentPage.includes('creditor-dashboard')) ||
                                                 (userType === 'debtor' && currentPage.includes('debtor-dashboard'));
                        
                        // ตรวจสอบว่าอยู่ในหน้า login หรือไม่
                        const isOnLoginPage = currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/');
                        
                        if (isOnLoginPage) {
                            // ถ้าอยู่ในหน้า login ให้ redirect ไป dashboard
                            sessionStorage.setItem('isRedirecting', 'true');
                            setTimeout(() => {
                                if (userType === 'creditor') {
                                    window.location.replace('/pages/dashboard/creditor-dashboard.html');
                                } else if (userType === 'debtor') {
                                    window.location.replace('/pages/dashboard/debtor-dashboard.html');
                                }
                                sessionStorage.removeItem('isRedirecting');
                            }, 100);
                        } else if (isOnDashboard && !isCorrectDashboard) {
                            // ถ้าอยู่ในหน้า dashboard แต่ไม่ใช่ dashboard ที่ถูกต้อง
                            sessionStorage.setItem('isRedirecting', 'true');
                            setTimeout(() => {
                                if (userType === 'creditor') {
                                    window.location.replace('/pages/dashboard/creditor-dashboard.html');
                                } else if (userType === 'debtor') {
                                    window.location.replace('/pages/dashboard/debtor-dashboard.html');
                                }
                                sessionStorage.removeItem('isRedirecting');
                            }, 100);
                        }
                    }
                } else {
                    currentUser = null;
                    userType = null;
                    localStorage.removeItem('userType');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userDisplayName');
                    localStorage.removeItem('lastLoginTime');
                    sessionStorage.removeItem('isRedirecting');
                    
                    // Only redirect to login if not already on login page and not in a redirect loop
                    const currentPage = window.location.pathname;
                    const isRedirecting = sessionStorage.getItem('isRedirecting');
                    
                    // ตรวจสอบว่าอยู่ในหน้า login หรือ register แล้วหรือไม่
                    const isOnLoginPage = currentPage.includes('index.html') || currentPage.includes('register.html');
                    
                    if (!isRedirecting && !isOnLoginPage) {
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            // ใช้ path ที่แน่นอนแทนการคำนวณ
                            window.location.replace('/index.html');
                        }, 100);
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing auth state listener:', error);
        }
    },

    // Check if user is on correct page
    checkAuthAndRedirect() {
        const userType = localStorage.getItem('userType');
        const userId = localStorage.getItem('userId');
        const isRedirecting = sessionStorage.getItem('isRedirecting');
        
        if (!userId || !userType) {
            if (!isRedirecting) {
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                    window.location.replace(baseUrl + 'index.html');
                    sessionStorage.removeItem('isRedirecting');
                }, 100);
            }
            return false;
        }
        
        const currentPage = window.location.pathname;
        
        if (!isRedirecting) {
            const isOnDashboard = currentPage.includes('dashboard');
            const isCorrectDashboard = (userType === 'creditor' && currentPage.includes('creditor-dashboard')) ||
                                     (userType === 'debtor' && currentPage.includes('debtor-dashboard'));
            
            // ตรวจสอบว่าอยู่ในหน้า login หรือไม่
            const isOnLoginPage = currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/');
            
            if (isOnLoginPage) {
                // ถ้าอยู่ในหน้า login ให้ redirect ไป dashboard
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    if (userType === 'creditor') {
                        window.location.replace('/pages/dashboard/creditor-dashboard.html');
                    } else if (userType === 'debtor') {
                        window.location.replace('/pages/dashboard/debtor-dashboard.html');
                    }
                    sessionStorage.removeItem('isRedirecting');
                }, 100);
                return false;
            } else if (isOnDashboard && !isCorrectDashboard) {
                // ถ้าอยู่ในหน้า dashboard แต่ไม่ใช่ dashboard ที่ถูกต้อง
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    if (userType === 'creditor') {
                        window.location.replace('/pages/dashboard/creditor-dashboard.html');
                    } else if (userType === 'debtor') {
                        window.location.replace('/pages/dashboard/debtor-dashboard.html');
                    }
                    sessionStorage.removeItem('isRedirecting');
                }, 100);
                return false;
            }
        }
        
        return true;
    }
};

// Error message mapping
const authErrorMessages = {
    'auth/user-not-found': 'ไม่พบผู้ใช้นี้ในระบบ',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/too-many-requests': 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง',
    'auth/network-request-failed': 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
    'auth/user-disabled': 'บัญชีผู้ใช้ถูกระงับการใช้งาน',
    'default': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
};

// Get error message
function getErrorMessage(errorCode) {
    return authErrorMessages[errorCode] || authErrorMessages['default'];
}

// Global logout function
window.logout = async function() {
    try {
        await authModule.signOut();
        localStorage.clear();
        sessionStorage.clear();
        // Clear redirect flag before redirecting
        sessionStorage.removeItem('isRedirecting');
        setTimeout(() => {
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
            window.location.replace(baseUrl + 'index.html');
        }, 100);
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.removeItem('isRedirecting');
        setTimeout(() => {
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
            window.location.replace(baseUrl + 'index.html');
        }, 100);
    }
};

// Export to global scope
window.authModule = authModule;
window.getErrorMessage = getErrorMessage;
} // End of auth module check
