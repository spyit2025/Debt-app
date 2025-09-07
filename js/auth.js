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
            console.log(`Sign in attempt ${retryCount + 1}/${maxRetries + 1} for email: ${email}`);
            
            // Check network connection
            if (!navigator.onLine) {
                throw new Error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อและลองใหม่');
            }
            
            console.log('Network status:', navigator.onLine);
            console.log('Connection type:', navigator.connection ? navigator.connection.effectiveType : 'unknown');
            
            // Try Firebase authentication
            if (window.firebaseUtils && window.firebaseUtils.isFirebaseReady()) {
                const { auth, db } = getFirebaseInstances();
                console.log('Firebase instances obtained successfully');
                console.log('Auth instance:', auth);
                console.log('DB instance:', db);
                
                // Check Firebase configuration
                console.log('Firebase app name:', auth.app.name);
                console.log('Firebase project ID:', auth.app.options.projectId);
                console.log('Firebase auth domain:', auth.app.options.authDomain);
                
                // ลด timeout และเพิ่ม retry mechanism
                console.log('Starting authentication...');
                
                // เพิ่ม progress tracking
                let authProgress = 0;
                const progressInterval = setInterval(() => {
                    authProgress += 10;
                    console.log(`Authentication progress: ${authProgress}% (${authProgress * 0.3}s)`);
                }, 3000);
                
                // ลองใช้วิธีอื่น - ใช้ Firebase Auth กับ custom retry
                console.log('Attempting Firebase authentication...');
                
                // ลองใช้วิธีอื่น - ใช้ setTimeout แทน Promise.race
                let authCompleted = false;
                let authResult = null;
                let authError = null;
                
                const authPromise = auth.signInWithEmailAndPassword(email, password)
                    .then(result => {
                        authCompleted = true;
                        authResult = result;
                        console.log('Firebase auth completed successfully');
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
                
                console.log('Waiting for authentication result...');
                
                // รอให้ auth เสร็จ
                await authPromise;
                clearTimeout(timeoutId);
                
                if (authError) {
                    throw authError;
                }
                
                const userCredential = authResult;
                clearInterval(progressInterval);
                const user = userCredential.user;
                console.log('Authentication successful for user:', user.uid);
            
                try {
                    // Get user data from Firestore with timeout
                    console.log('Fetching user data from Firestore...');
                    const userDocPromise = db.collection('users').doc(user.uid).get();
                    const userDocTimeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('การโหลดข้อมูลผู้ใช้ใช้เวลานานเกินไป กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่')), 20000)
                    );
                    
                    const userDoc = await Promise.race([userDocPromise, userDocTimeoutPromise]);
                    console.log('User data fetched successfully');
                    
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
                        console.log(`Retrying Firestore query (attempt ${retryCount + 1}/${maxRetries})`);
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
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
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
                        if (userType === 'creditor' && !currentPage.includes('creditor-dashboard')) {
                            sessionStorage.setItem('isRedirecting', 'true');
                            setTimeout(() => {
                                const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                                window.location.replace(baseUrl + 'pages/dashboard/creditor-dashboard.html');
                            }, 100);
                        } else if (userType === 'debtor' && !currentPage.includes('debtor-dashboard')) {
                            sessionStorage.setItem('isRedirecting', 'true');
                            setTimeout(() => {
                                const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                                window.location.replace(baseUrl + 'pages/dashboard/debtor-dashboard.html');
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
                    
                    if (!isRedirecting && !currentPage.includes('index.html') && !currentPage.includes('register.html')) {
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                            window.location.replace(baseUrl + 'index.html');
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
                }, 100);
            }
            return false;
        }
        
        const currentPage = window.location.pathname;
        
        if (!isRedirecting) {
            if (userType === 'creditor' && !currentPage.includes('creditor')) {
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                    window.location.replace(baseUrl + 'creditor-dashboard.html');
                }, 100);
                return false;
            }
            
            if (userType === 'debtor' && !currentPage.includes('debtor')) {
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                    window.location.replace(baseUrl + 'debtor-dashboard.html');
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
