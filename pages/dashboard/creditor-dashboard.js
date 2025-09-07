// Creditor Dashboard JavaScript
let isInitialized = false;
let dashboardCurrentUser = null;
let isDataLoaded = false;
let isRedirecting = false;

// ฟังก์ชันแปลงรหัสลูกหนี้ให้อ่านง่าย
function formatDebtorId(debtorId) {
    if (!debtorId || debtorId === 'ไม่ระบุรหัสลูกหนี้') {
        return '<small class="text-muted">ไม่ระบุรหัสลูกหนี้</small>';
    }
    
    // ถ้าเป็น Firebase UID (ยาว 28 ตัวอักษร) ให้แปลงเป็นรูปแบบที่อ่านง่าย
    if (debtorId.length === 28) {
        // ใช้ 6 ตัวอักษรแรก + 4 ตัวอักษรท้าย + หมายเลขที่คำนวณจาก UID
        const prefix = debtorId.substring(0, 6);
        const suffix = debtorId.substring(24, 28);
        
        // สร้างหมายเลขที่สม่ำเสมอจาก UID โดยใช้ charCodeAt
        let hash = 0;
        for (let i = 0; i < debtorId.length; i++) {
            const char = debtorId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        const consistentNum = Math.abs(hash % 9999).toString().padStart(4, '0');
        
        return `<small class="text-muted">D${prefix}-${consistentNum}</small>`;
    }
    
    // ถ้าไม่ใช่ Firebase UID ให้แสดงตามเดิม
    return `<small class="text-muted">${debtorId}</small>`;
}

// Chart instances
let debtStatusChart = null;
let monthlyDebtChart = null;

// Global error handler to prevent black screen issues
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    console.error('Error details:', {
        message: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    
    // If there's a modal-related error, try to force cleanup
    if (event.error?.message && event.error.message.includes('modal')) {
        // Modal-related error detected, attempting cleanup...
        closeAddDebtModal();
    }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise rejection details:', {
        message: event.reason?.message,
        stack: event.reason?.stack
    });
    
    // If there's a modal-related rejection, try to force cleanup
    if (event.reason?.message && event.reason.message.includes('modal')) {
        // Modal-related promise rejection detected, attempting cleanup...
        closeAddDebtModal();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (isInitialized) {
        return;
    }
    
    isInitialized = true;
    
    // ล้าง redirect flag เมื่อโหลดหน้าใหม่
    sessionStorage.removeItem('isRedirecting');
    
    // Check if content sections exist
    const dashboardContent = document.getElementById('dashboard-content');
    const debtsContent = document.getElementById('debts-content');
    const reportsContent = document.getElementById('reports-content');
    const paymentHistoryContent = document.getElementById('payment-history-content');
    const settingsContent = document.getElementById('settings-content');
    
    // Check authentication
    checkAuth();
    
    // Add event listener for installment months to auto-calculate due date
    setupInstallmentMonthsListener();
    
    // Add event listener for payment date to show example
    setupPaymentDateListener();
    
    // Set up event listeners
    setupEventListeners();
    
    // Handle initial navigation based on URL hash
    const initialHash = window.location.hash || '#dashboard';
    
    // Make all functions globally available
    window.showSettings = showSettings;
    window.showProfile = showProfile;
    window.logout = logout;
    window.showDashboard = showDashboard;
    window.showDebtsList = showDebtsList;
    window.showAddDebtForm = showAddDebtForm;
    window.showReports = showReports;
    window.markAsPaid = markAsPaid;
    window.deleteDebt = deleteDebt;
    window.viewDebtDetails = viewDebtDetails;
    window.downloadSummaryReport = downloadSummaryReport;
    window.downloadDetailedReport = downloadDetailedReport;
    window.saveProfileSettings = saveProfileSettings;
    window.markDebtAsPaid = markDebtAsPaid;
    window.editDebt = editDebt;
    window.deleteDebtFromModal = deleteDebtFromModal;
    window.deleteDebt = deleteDebt;
    window.deletePaymentRecord = deletePaymentRecord;
    window.markDebtFullyPaid = markDebtFullyPaid;
    window.addNewDebt = addNewDebt;
    window.submitNewDebt = submitNewDebt;
    window.showInstallmentPaymentModal = showInstallmentPaymentModal;
    window.recordInstallmentPayment = recordInstallmentPayment;
    window.showPaymentHistory = showPaymentHistory;
    window.loadPaymentHistory = loadPaymentHistory;
    window.applyPaymentHistoryFilter = applyPaymentHistoryFilter;
    window.clearPaymentHistoryFilter = clearPaymentHistoryFilter;
    window.refreshPaymentHistory = refreshPaymentHistory;
    window.downloadPaymentHistoryReport = downloadPaymentHistoryReport;
    window.changePaymentHistoryPage = changePaymentHistoryPage;
    window.closeAddDebtModal = closeAddDebtModal;
    
    // Initialize modal accessibility
    initializeModalAccessibility();
    
    // Initialize navigation after a short delay to ensure everything is loaded
    setTimeout(function() {
        handleNavigation(initialHash);
        updateActiveNavLink(initialHash);
        
        // Load dashboard data if we're on dashboard page
        if (initialHash === '#dashboard' || initialHash === '') {
            const currentUser = window.firebaseAuth?.currentUser;
            if (currentUser) {
                loadDashboardData();
            } else {
                // Initialize empty data for filters when user is not logged in
                allDebtsData = [];
                filteredDebtsData = [];
                loadDebtorFilterOptions();
            }
        }
    }, 100);
});

// Setup event listener for installment months to auto-calculate due date
function setupInstallmentMonthsListener() {
    const installmentMonthsInput = document.getElementById('installmentMonths');
    const dueDateInput = document.getElementById('dueDate');
    
    if (installmentMonthsInput && dueDateInput) {
        installmentMonthsInput.addEventListener('input', function() {
            const months = parseInt(this.value);
            if (months && months > 0) {
                // Calculate due date from today + number of months
                const today = new Date();
                const dueDate = new Date(today);
                dueDate.setMonth(dueDate.getMonth() + months);
                
                // Format date as YYYY-MM-DD for input type="date"
                const formattedDate = dueDate.toISOString().split('T')[0];
                dueDateInput.value = formattedDate;
            }
        });
    }
}

// Helper function to get the last day of a month
function getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Helper function to get the actual payment date for a given month
function getActualPaymentDate(paymentDay, year, month) {
    const lastDay = getLastDayOfMonth(year, month);
    return Math.min(paymentDay, lastDay);
}

// Helper function to format payment date display
function formatPaymentDateDisplay(paymentDay) {
    if (!paymentDay) return '';
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const actualDate = getActualPaymentDate(paymentDay, currentYear, currentMonth);
    const lastDay = getLastDayOfMonth(currentYear, currentMonth);
    
    if (actualDate === lastDay && paymentDay > lastDay) {
        return `วันที่ ${actualDate} (วันสุดท้ายของเดือน)`;
    } else {
        return `วันที่ ${actualDate}`;
    }
}

// Setup event listener for payment date to show example
function setupPaymentDateListener() {
    const paymentDateInput = document.getElementById('paymentDate');
    const paymentDateExample = document.getElementById('paymentDateExample');
    
    if (paymentDateInput && paymentDateExample) {
        paymentDateInput.addEventListener('input', function() {
            const paymentDay = parseInt(this.value);
            if (paymentDay && paymentDay >= 1 && paymentDay <= 31) {
                // Show examples for different months
                const examples = [];
                
                // February (28/29 days)
                const febDate = getActualPaymentDate(paymentDay, 2025, 1); // February is month 1 (0-indexed)
                if (febDate < paymentDay) {
                    examples.push(`กุมภาพันธ์: วันที่ ${febDate} (วันสุดท้าย)`);
                }
                
                // April (30 days)
                const aprDate = getActualPaymentDate(paymentDay, 2025, 3); // April is month 3 (0-indexed)
                if (aprDate < paymentDay) {
                    examples.push(`เมษายน: วันที่ ${aprDate} (วันสุดท้าย)`);
                }
                
                // Regular month (31 days)
                if (paymentDay <= 31) {
                    examples.push(`มกราคม: วันที่ ${paymentDay}`);
                }
                
                if (examples.length > 0) {
                    paymentDateExample.textContent = `ตัวอย่าง: ${examples.join(', ')}`;
                } else {
                    paymentDateExample.textContent = `ตัวอย่าง: ทุกเดือนจะชำระวันที่ ${paymentDay}`;
                }
            } else {
                paymentDateExample.textContent = '';
            }
        });
    }
}

// Check if user is authenticated and is a creditor
function checkAuth() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase not initialized');
        // Wait a bit and try again
        setTimeout(() => {
            checkAuth();
        }, 1000);
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase database not initialized');
        // Wait a bit and try again
        setTimeout(() => {
            checkAuth();
        }, 1000);
        return;
    }
    
    // Wait for Firebase to be ready before checking auth state
    let authCheckAttempts = 0;
    const maxAuthCheckAttempts = 10;
    
    function waitForAuthReady() {
        authCheckAttempts++;
        
        // Check if Firebase Auth is ready
        if (window.firebaseAuth.currentUser !== undefined || authCheckAttempts >= maxAuthCheckAttempts) {
            // Firebase Auth is ready or we've tried enough times
            window.firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    // User is logged in
                    if (user.uid !== dashboardCurrentUser?.uid) {
                        dashboardCurrentUser = user;
                        isDataLoaded = false; // Reset data loaded flag for new user
                        // Check if user is a creditor
                        checkUserType(user.uid);
                        
                        // Load dashboard data immediately for new user
                        loadDashboardData();
                    }
                } else {
                    // No user logged in
                    dashboardCurrentUser = null;
                    isDataLoaded = false;
                    // Only redirect if not already redirecting and not on login page
                    const isRedirecting = sessionStorage.getItem('isRedirecting');
                    if (!isRedirecting && !window.location.pathname.includes('index.html')) {
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            window.location.href = '../../index.html';
                        }, 100);
                    }
                }
            });
        } else {
            // Firebase Auth not ready yet, wait a bit more
            setTimeout(waitForAuthReady, 200);
        }
    }
    
    waitForAuthReady();
}

// Check user type from Firestore
function checkUserType(userId) {
    if (isDataLoaded || isRedirecting) {
        return; // Prevent multiple loads and redirects
    }
    
    // Check if Firebase is initialized
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized');
        return;
    }
    
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                
                if (userData.userType === 'creditor') {
                    // Update user name in header
                    const userNameElement = document.getElementById('userName');
                    if (userNameElement) {
                        userNameElement.textContent = userData.displayName || 'ผู้ใช้';
                    }
                    
                    // Load dashboard data
                    loadDashboardData();
                    // Load user's debts
                    if (userId) {
                        loadUserDebts(userId);
                    }
                    isDataLoaded = true; // Mark as loaded
                } else {
                    // Redirect to appropriate dashboard
                    const isRedirecting = sessionStorage.getItem('isRedirecting');
                    if (userData.userType === 'debtor' && !isRedirecting) {
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            window.location.href = 'debtor-dashboard.html';
                        }, 100);
                    } else if (!isRedirecting) {
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            window.location.href = '../../index.html';
                        }, 100);
                    }
                }
            } else {
                console.error('User document not found');
                const isRedirecting = sessionStorage.getItem('isRedirecting');
                if (!isRedirecting) {
                    sessionStorage.setItem('isRedirecting', 'true');
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 100);
                }
            }
        })
        .catch(function(error) {
            console.error('Error checking user type:', error);
            const isRedirecting = sessionStorage.getItem('isRedirecting');
            if (!isRedirecting) {
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 100);
            }
        });
}

// Debounce mechanism to prevent excessive calls
let loadDashboardDataTimeout = null;

// Load dashboard statistics
function loadDashboardData() {
    // Debounce: clear any pending timeout
    if (loadDashboardDataTimeout) {
        clearTimeout(loadDashboardDataTimeout);
    }
    
    // Set a new timeout to execute the function
    loadDashboardDataTimeout = setTimeout(() => {
        loadDashboardDataInternal();
    }, 100);
}

function loadDashboardDataInternal() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in loadDashboardData');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        console.error('User ID is undefined in loadDashboardData - waiting for authentication');
        // Wait for authentication to be ready
        if (window.firebaseAuth.currentUser === null) {
            // User is not logged in, redirect to login
            sessionStorage.setItem('isRedirecting', 'true');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 100);
            return;
        } else {
            // Firebase is still initializing, wait a bit and try again
            setTimeout(() => {
                loadDashboardData();
            }, 1000);
            return;
        }
    }

    // Get debts collection for this creditor
    const debtsRef = window.firebaseDb.collection('debts').where('creditorId', '==', userId);
    
    // Debug: Log all debts for this creditor (commented out to reduce console spam)
    // Debug: Checking all debts for creditor
    
    debtsRef.get().then(function(querySnapshot) {
        let totalDebt = 0;
        let paidDebts = 0;
        let pendingDebts = 0;
        let overdueDebts = 0;
        let debtsData = [];
        
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            // Use totalAmount if available (includes interest), otherwise use amount
            const debtAmount = debt.totalAmount || debt.amount || 0;
            totalDebt += debtAmount;
            
            // Store debt data for charts
            debtsData.push({
                ...debt,
                id: doc.id
            });
            
            // Count based on status
            if (debt.status === 'paid') {
                paidDebts++;
            } else if (debt.status === 'pending' || debt.status === 'partial') {
                pendingDebts++;
                // Check if overdue
                if (debt.dueDate && new Date(debt.dueDate.toDate()) < new Date()) {
                    overdueDebts++;
                }
            } else {
                // Default to pending if status is not specified
                pendingDebts++;
                if (debt.dueDate && new Date(debt.dueDate.toDate()) < new Date()) {
                    overdueDebts++;
                }
            }
        });
        
        // Update stats
        const totalDebtElement = document.getElementById('totalDebt');
        const paidDebtsElement = document.getElementById('paidDebts');
        const pendingDebtsElement = document.getElementById('pendingDebts');
        const overdueDebtsElement = document.getElementById('overdueDebts');
        
        if (totalDebtElement) totalDebtElement.textContent = totalDebt.toLocaleString();
        if (paidDebtsElement) paidDebtsElement.textContent = paidDebts;
        if (pendingDebtsElement) pendingDebtsElement.textContent = pendingDebts;
        if (overdueDebtsElement) overdueDebtsElement.textContent = overdueDebts;
        
        // Store data for filtering
        allDebtsData = [...debtsData];
        filteredDebtsData = [...debtsData];
        
        // Initialize filters if not already done
        if (document.getElementById('filterDateFrom') && !document.getElementById('filterDateFrom').value) {
            initializeChartFilters();
        }
        
        // Load debtor filter options after data is available
        loadDebtorFilterOptions();
        
        // If no debts data, show message in debtor filter
        if (debtsData.length === 0) {
            // No debts found for this creditor
            // Ensure debtor filter shows appropriate message
            loadDebtorFilterOptions();
        }
        
        // Update charts with the data
        updateCharts(filteredDebtsData);
    }).catch(function(error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        const totalDebtElement = document.getElementById('totalDebt');
        const paidDebtsElement = document.getElementById('paidDebts');
        const pendingDebtsElement = document.getElementById('pendingDebts');
        const overdueDebtsElement = document.getElementById('overdueDebts');
        
        if (totalDebtElement) totalDebtElement.textContent = '0';
        if (paidDebtsElement) paidDebtsElement.textContent = '0';
        if (pendingDebtsElement) pendingDebtsElement.textContent = '0';
        if (overdueDebtsElement) overdueDebtsElement.textContent = '0';
        
        // Initialize empty data for filters
        allDebtsData = [];
        filteredDebtsData = [];
        
        // Load debtor filter options to show "ไม่มีข้อมูลหนี้" message
        loadDebtorFilterOptions();
    });
}

// Load user's debts
function loadUserDebts(userId) {
    // Check if Firebase is initialized
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in loadUserDebts');
        return;
    }
    
    if (!userId) {
        console.error('User ID is undefined in loadUserDebts');
        return;
    }
    
    const debtsRef = window.firebaseDb.collection('debts').where('creditorId', '==', userId);
    
    debtsRef.get().then(function(querySnapshot) {
        const debtsList = document.getElementById('recentDebtsList');
        
        if (querySnapshot.empty) {
            // Show empty state
            debtsList.innerHTML = `
                <div class="debt-item">
                    <div class="row align-items-center">
                        <div class="col-md-1">
                            <small class="text-muted">-</small>
                        </div>
                        <div class="col-md-2">
                            <h6 class="mb-1">ยังไม่มีข้อมูล</h6>
                            <small class="text-muted">เริ่มต้นเพิ่มหนี้ใหม่</small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge bg-secondary">ไม่มีข้อมูล</span>
                        </div>
                        <div class="col-md-2 text-end">
                            <strong>฿0</strong>
                        </div>
                        <div class="col-md-2 text-end">
                            <small class="text-muted">-</small>
                        </div>
                        <div class="col-md-2 text-end">
                            <small class="text-muted">-</small>
                        </div>
                        <div class="col-md-1 text-end">
                            <button class="btn btn-sm btn-outline-primary" disabled>
                                <i class="fas fa-eye me-1"></i>ดูรายละเอียด
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Convert to array and sort by creation date
        const debts = [];
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            debts.push({
                id: doc.id,
                ...debt
            });
        });
        
        // Sort by createdAt (newest first) and limit to 5 items
        debts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt.toDate()) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt.toDate()) : new Date(0);
            return dateB - dateA;
        });
        
        // Clear existing content
        debtsList.innerHTML = '';
        
        // Show only the first 5 items
        debts.slice(0, 5).forEach(function(debt) {
            const debtItem = createDebtItem(debt.id, debt);
            debtsList.appendChild(debtItem);
        });
    }).catch(function(error) {
        console.error('Error loading debts:', error);
    });
}

// Generate readable debt code
function generateDebtCode(debtId, debt) {
    // Get creation date - handle both Firestore Timestamp and regular Date
    let createdDate;
    if (debt.createdAt) {
        if (debt.createdAt.toDate && typeof debt.createdAt.toDate === 'function') {
            // Firestore Timestamp
            createdDate = new Date(debt.createdAt.toDate());
        } else if (debt.createdAt instanceof Date) {
            // Regular Date object
            createdDate = debt.createdAt;
        } else {
            // String or other format
            createdDate = new Date(debt.createdAt);
        }
    } else {
        createdDate = new Date();
    }
    
    const year = createdDate.getFullYear() + 543; // Convert to Buddhist year
    const month = String(createdDate.getMonth() + 1).padStart(2, '0');
    
    // Get first 2 characters of debtId for uniqueness
    const uniqueId = debtId.substring(0, 2).toUpperCase();
    
    // Generate sequential number (using last 4 characters of debtId as number)
    const sequentialNum = parseInt(debtId.substring(debtId.length - 4), 36) % 9999 + 1;
    
    return `D${year}${month}-${String(sequentialNum).padStart(4, '0')}`;
}

// Generate readable payment code
function generatePaymentCode(paymentId, paymentData) {
    // Get payment date - handle both Firestore Timestamp and regular Date
    let paymentDate;
    if (paymentData.paymentDate) {
        if (paymentData.paymentDate.toDate && typeof paymentData.paymentDate.toDate === 'function') {
            // Firestore Timestamp
            paymentDate = new Date(paymentData.paymentDate.toDate());
        } else if (paymentData.paymentDate instanceof Date) {
            // Regular Date object
            paymentDate = paymentData.paymentDate;
        } else {
            // String or other format
            paymentDate = new Date(paymentData.paymentDate);
        }
    } else {
        paymentDate = new Date();
    }
    
    const year = paymentDate.getFullYear() + 543; // Convert to Buddhist year
    const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const day = String(paymentDate.getDate()).padStart(2, '0');
    
    // Generate sequential number (using last 4 characters of paymentId as number)
    const sequentialNum = parseInt(paymentId.substring(paymentId.length - 4), 36) % 9999 + 1;
    
    return `P${year}${month}${day}-${String(sequentialNum).padStart(4, '0')}`;
}

// Create debt item element
function createDebtItem(debtId, debt) {
    const debtItem = document.createElement('div');
    debtItem.className = 'debt-item';
    
    const dueDate = debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : '-';
    const status = getStatusBadge(debt.status);
    
    // Show interest info if available
    let interestInfo = '';
    if (debt.interestType && debt.interestType !== 'none' && debt.interestRate > 0) {
        const interestTypeText = debt.interestType === 'simple' ? 'ดอกเบี้ยคงที่' : 'ดอกเบี้ยลดต้นลดดอก';
        interestInfo = `<br><small class="text-info">${interestTypeText} ${debt.interestRate}%</small>`;
    }
    
    // Format creation date
    const createdDate = debt.createdAt ? new Date(debt.createdAt.toDate()).toLocaleDateString('th-TH') : '-';
    
    // Format last updated date
    const updatedDate = debt.updatedAt ? new Date(debt.updatedAt.toDate()).toLocaleDateString('th-TH') : '-';
    
    // Generate readable debt code
    const debtCode = generateDebtCode(debtId, debt);
    
    debtItem.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-1">
                <small class="text-muted">${debtCode}</small>
            </div>
            <div class="col-md-2">
                <h6 class="mb-1">${formatDebtorId(debt.debtorId || 'ไม่ระบุรหัสลูกหนี้')}</h6>
                <small class="text-muted">${debt.description || 'ไม่มีคำอธิบาย'}</small>
                ${interestInfo}
            </div>
            <div class="col-md-2">
                ${status}
            </div>
            <div class="col-md-2 text-end">
                <strong>฿${debt.totalAmount?.toLocaleString() || debt.amount?.toLocaleString() || '0'}</strong>
                ${debt.principal && debt.principal !== debt.totalAmount ? `<br><small class="text-muted">ต้น: ฿${debt.principal.toLocaleString()}</small>` : ''}
            </div>
            <div class="col-md-2 text-end">
                <small class="text-muted">${dueDate}</small>
            </div>
            <div class="col-md-2 text-end">
                <small class="text-muted">${createdDate}</small>
            </div>
            <div class="col-md-1 text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editDebt('${debtId}')">
                    <i class="fas fa-edit me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDebt('${debtId}')">
                    <i class="fas fa-trash me-1"></i>ลบ
                </button>
            </div>
        </div>
    `;
    
    return debtItem;
}

// Get status badge
function getStatusBadge(status) {
    switch (status) {
        case 'paid':
            return '<span class="badge bg-success">ชำระแล้ว</span>';
        case 'pending':
            return '<span class="badge bg-warning">รอชำระ</span>';
        case 'partial':
            return '<span class="badge bg-info">ชำระบางส่วน</span>';
        case 'overdue':
            return '<span class="badge bg-danger">เกินกำหนด</span>';
        default:
            return '<span class="badge bg-secondary">ไม่ระบุ</span>';
    }
}

// View debt details
function viewDebtDetails(debtId) {
    
    if (!debtId) {
        console.error('Debt ID is required');
        showError('เกิดข้อผิดพลาด: ไม่พบรหัสหนี้');
        return;
    }
    
    // Check if Firebase is available
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in viewDebtDetails');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase database not available');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล');
        return;
    }
    
    // Remove focus from any elements in other modals before showing debt details
    const otherModals = ['addDebtModal', 'installmentPaymentModal'];
    otherModals.forEach(modalId => {
        const otherModal = document.getElementById(modalId);
        if (otherModal) {
            removeFocusFromModal(otherModal);
        }
    });
    
    // Show loading state
    showDebtDetailsModal(debtId);
    
    // Fetch debt details from Firestore
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                const debtData = doc.data();
                populateDebtDetailsModal(debtData, debtId);
            } else {
                console.error('Debt document not found');
                showWarning('ไม่พบข้อมูลหนี้');
                hideDebtDetailsModal();
            }
        })
        .catch(function(error) {
            console.error('Error fetching debt details:', error);
            showError('เกิดข้อผิดพลาดในการดึงข้อมูลหนี้');
            hideDebtDetailsModal();
        });
}

// Show debt details modal
function showDebtDetailsModal(debtId) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('debtDetailsModal');
    if (!modal) {
        modal = createDebtDetailsModal();
        document.body.appendChild(modal);
        // Initialize accessibility for the new modal
        initializeModalAccessibility();
    }
    
    // Hide any other open modals first
    const otherModals = ['addDebtModal', 'installmentPaymentModal'];
    otherModals.forEach(modalId => {
        const otherModal = document.getElementById(modalId);
        if (otherModal) {
            const otherBootstrapModal = bootstrap.Modal.getInstance(otherModal);
            if (otherBootstrapModal) {
                otherBootstrapModal.hide();
            }
            // Ensure proper accessibility state
            otherModal.setAttribute('aria-hidden', 'true');
            otherModal.removeAttribute('aria-modal');
            otherModal.setAttribute('inert', '');
            removeFocusFromModal(otherModal);
        }
    });
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Show loading state
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">กำลังโหลด...</span>
            </div>
            <p class="mt-2">กำลังโหลดข้อมูลหนี้...</p>
        </div>
    `;
}

// Hide debt details modal
function hideDebtDetailsModal() {
    const modal = document.getElementById('debtDetailsModal');
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
        
        // Ensure proper accessibility state
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        modal.setAttribute('inert', '');
        
        // Remove focus from any elements inside the modal
        removeFocusFromModal(modal);
    }
}

// Create debt details modal
function createDebtDetailsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'debtDetailsModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'debtDetailsModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="debtDetailsModalLabel">
                        <i class="fas fa-file-invoice me-2"></i>รายละเอียดหนี้
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
                <div class="modal-footer d-flex justify-content-end align-items-center">
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary btn-sm" id="editDebtBtn" style="display: none;">
                            <i class="fas fa-edit me-1"></i>แก้ไข
                        </button>
                        <button type="button" class="btn btn-success btn-sm" id="markAsPaidBtn" style="display: none;">
                            <i class="fas fa-check me-1"></i>ชำระ
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" id="deleteDebtBtn" style="display: none;">
                            <i class="fas fa-trash me-1"></i>ลบ
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Populate debt details modal
function populateDebtDetailsModal(debtData, debtId) {
    const modal = document.getElementById('debtDetailsModal');
    if (!modal) return;
    
    const modalBody = modal.querySelector('.modal-body');
    const editBtn = modal.querySelector('#editDebtBtn');
    const markAsPaidBtn = modal.querySelector('#markAsPaidBtn');
    const deleteBtn = modal.querySelector('#deleteDebtBtn');
    
    // Format dates
    const dueDate = debtData.dueDate ? new Date(debtData.dueDate.toDate()).toLocaleDateString('th-TH') : '-';
    const createdAt = debtData.createdAt ? new Date(debtData.createdAt.toDate()).toLocaleDateString('th-TH') : '-';
    const paidAt = debtData.paidAt ? new Date(debtData.paidAt.toDate()).toLocaleDateString('th-TH') : '-';
    
    // Get status badge
    const statusBadge = getStatusBadge(debtData.status);
    
    // Calculate interest info
    let interestInfo = '';
    if (debtData.interestType && debtData.interestType !== 'none' && debtData.interestRate > 0) {
        const interestTypeText = debtData.interestType === 'simple' ? 'ดอกเบี้ยคงที่' : 'ดอกเบี้ยลดต้นลดดอก';
        interestInfo = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>ประเภทดอกเบี้ย:</strong> ${interestTypeText}
                </div>
                <div class="col-md-6">
                    <strong>อัตราดอกเบี้ย:</strong> ${debtData.interestRate}% ต่อปี
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>ดอกเบี้ยรวม:</strong> ฿${debtData.totalInterest?.toLocaleString() || '0'}
                </div>
                <div class="col-md-6">
                    <strong>ผ่อนเดือนละ:</strong> ฿${debtData.monthlyPayment?.toLocaleString() || '0'}
                </div>
            </div>
        `;
    }
    
    // Calculate installment info
    const installmentMonths = debtData.installmentMonths || 1;
    const paidInstallments = debtData.paidInstallments || 0;
    const remainingInstallments = installmentMonths - paidInstallments;
    const remainingAmount = debtData.remainingAmount || debtData.totalAmount || debtData.amount || 0;
    const paymentHistory = debtData.paymentHistory || [];
    
    let installmentInfo = '';
    if (installmentMonths > 1) {
        installmentInfo = `
            <div class="mb-2">
                <strong>จำนวนงวด:</strong> ${installmentMonths} งวด
            </div>
            <div class="mb-2">
                <strong>ชำระแล้ว:</strong> ${paidInstallments} งวด
            </div>
            <div class="mb-2">
                <strong>เหลือ:</strong> ${remainingInstallments} งวด
            </div>
            <div class="mb-2">
                <strong>ยอดคงเหลือ:</strong> ฿${remainingAmount.toFixed(2)}
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h6 class="text-primary mb-3">ข้อมูลลูกหนี้</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>ชื่อลูกหนี้:</strong> ${debtData.debtorName || 'ไม่ระบุชื่อ'}
                    </div>
                    <div class="col-md-6">
                        <strong>เบอร์โทรศัพท์:</strong> ${debtData.debtorPhone || 'ไม่ระบุ'}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>สถานะ:</strong> ${statusBadge}
                    </div>
                    <div class="col-md-6">
                        <strong>วันครบกำหนด:</strong> ${dueDate}
                    </div>
                </div>
                <div class="mb-3">
                    <strong>รายละเอียด:</strong><br>
                    <span class="text-muted">${debtData.description || 'ไม่มีรายละเอียด'}</span>
                </div>
            </div>
            <div class="col-md-4">
                <h6 class="text-primary mb-3">ข้อมูลการเงิน</h6>
                <div class="card bg-light">
                    <div class="card-body">
                        <div class="mb-2">
                            <strong>เงินต้น:</strong> ฿${debtData.principal?.toLocaleString() || debtData.amount?.toLocaleString() || '0'}
                        </div>
                        <div class="mb-2">
                            <strong>ยอดรวม:</strong> ฿${debtData.totalAmount?.toLocaleString() || debtData.amount?.toLocaleString() || '0'}
                        </div>
                        <div class="mb-2">
                            <strong>จำนวนเดือน:</strong> ${debtData.installmentMonths || 1} เดือน
                        </div>
                        ${installmentInfo}
                        ${interestInfo}
                    </div>
                </div>
            </div>
        </div>
        ${paymentHistory.length > 0 ? `
        <hr>
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary mb-3">ประวัติการชำระ</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>งวดที่</th>
                                <th>วันที่</th>
                                <th>เวลา</th>
                                <th>จำนวนเงิน</th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paymentHistory.map(payment => `
                                <tr>
                                    <td>งวดที่ ${payment.installmentNumber || '-'}</td>
                                    <td>${new Date(payment.date.toDate()).toLocaleDateString('th-TH')}</td>
                                    <td>${new Date(payment.date.toDate()).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</td>
                                    <td>฿${payment.amount.toFixed(2)}</td>
                                    <td>${payment.note || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}
        <hr>
        <div class="row">
            <div class="col-md-6">
                <strong>วันที่สร้าง:</strong> ${createdAt}
            </div>
            ${debtData.paidAt ? `<div class="col-md-6"><strong>วันที่ชำระ:</strong> ${paidAt}</div>` : ''}
        </div>
    `;
    
    // Show/hide action buttons based on status
    if (debtData.status === 'pending' || debtData.status === 'partial') {
        markAsPaidBtn.style.display = 'inline-block';
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        
        // Add event listeners with proper focus management
        markAsPaidBtn.onclick = () => {
            // Remove focus before calling the function
            markAsPaidBtn.blur();
            markDebtAsPaid(debtId);
        };
        editBtn.onclick = () => {
            // Remove focus before calling the function
            editBtn.blur();
            editDebt(debtId);
        };
        deleteBtn.onclick = () => {
            // Remove focus before calling the function
            deleteBtn.blur();
            deleteDebtFromModal(debtId);
        };
    } else if (debtData.status === 'paid') {
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        
        editBtn.onclick = () => {
            // Remove focus before calling the function
            editBtn.blur();
            editDebt(debtId);
        };
        deleteBtn.onclick = () => {
            // Remove focus before calling the function
            deleteBtn.blur();
            deleteDebtFromModal(debtId);
        };
    } else {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => {
            // Remove focus before calling the function
            deleteBtn.blur();
            deleteDebtFromModal(debtId);
        };
    }
}

// Mark debt as paid from modal
function markDebtAsPaid(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in markDebtAsPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in markDebtAsPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    // Remove focus from the current button to prevent accessibility issues
    const markAsPaidBtn = document.getElementById('markAsPaidBtn');
    if (markAsPaidBtn && markAsPaidBtn === document.activeElement) {
        markAsPaidBtn.blur();
    }
    
    // Get debt data first to check if it's installment-based
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                const debtData = doc.data();
                const installmentMonths = debtData.installmentMonths || 1;
                
                if (installmentMonths > 1) {
                    // Show installment payment modal
                    showInstallmentPaymentModal(debtId, debtData);
                } else {
                    // Single payment - mark as fully paid
                    markDebtFullyPaid(debtId);
                }
            } else {
                showWarning('ไม่พบข้อมูลหนี้');
            }
        })
        .catch(function(error) {
            console.error('Error fetching debt data:', error);
            showError('เกิดข้อผิดพลาดในการดึงข้อมูลหนี้');
        });
}

// Mark debt as fully paid
function markDebtFullyPaid(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in markDebtFullyPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in markDebtFullyPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (confirm('ยืนยันการชำระหนี้เต็มจำนวน?')) {
        // Remove focus from any elements in the modals before updating
        const debtDetailsModal = document.getElementById('debtDetailsModal');
        if (debtDetailsModal) {
            removeFocusFromModal(debtDetailsModal);
        }
        
        const installmentPaymentModal = document.getElementById('installmentPaymentModal');
        if (installmentPaymentModal) {
            removeFocusFromModal(installmentPaymentModal);
        }
        
        window.firebaseDb.collection('debts').doc(debtId).update({
            status: 'paid',
            paidAt: new Date(),
            remainingAmount: 0,
            paidInstallments: 1,
            totalPaidAmount: 0 // Will be calculated from payments
        }).then(function() {
            showSuccess('อัปเดตสถานะหนี้เรียบร้อยแล้ว');
            
            // Hide both modals
            hideDebtDetailsModal();
            
            const modal = document.getElementById('installmentPaymentModal');
            if (modal) {
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
            
            // Refresh data
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) {
                loadUserDebts(userId);
            }
            loadAllDebts();
        }).catch(function(error) {
            console.error('Error updating debt:', error);
            showError('เกิดข้อผิดพลาดในการอัปเดต');
        });
    }
}

// Show installment payment modal
function showInstallmentPaymentModal(debtId, debtData) {
    // If debtData is not provided, fetch it from Firestore
    if (!debtData) {
        if (!window.firebaseDb) {
            showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล');
            return;
        }
        
        // Show loading state
        showInfo('กำลังโหลดข้อมูลหนี้...');
        
        window.firebaseDb.collection('debts').doc(debtId).get()
            .then(function(doc) {
                if (doc.exists) {
                    const debtData = doc.data();
                    showInstallmentPaymentModal(debtId, debtData);
                } else {
                    showError('ไม่พบข้อมูลหนี้');
                }
            })
            .catch(function(error) {
                console.error('Error fetching debt data:', error);
                showError('เกิดข้อผิดพลาดในการโหลดข้อมูลหนี้');
            });
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('installmentPaymentModal');
    if (!modal) {
        modal = createInstallmentPaymentModal();
        document.body.appendChild(modal);
        // Initialize accessibility for the new modal
        initializeModalAccessibility();
    }
    
    // Hide the debt details modal first to prevent accessibility issues
    const debtDetailsModal = document.getElementById('debtDetailsModal');
    if (debtDetailsModal) {
        const debtDetailsBootstrapModal = bootstrap.Modal.getInstance(debtDetailsModal);
        if (debtDetailsBootstrapModal) {
            debtDetailsBootstrapModal.hide();
        }
        // Ensure proper accessibility state
        debtDetailsModal.setAttribute('aria-hidden', 'true');
        debtDetailsModal.removeAttribute('aria-modal');
        debtDetailsModal.setAttribute('inert', '');
        
        // Remove focus from any elements inside the debt details modal
        removeFocusFromModal(debtDetailsModal);
        
        // Wait a bit for the modal to fully close before showing the new one
        setTimeout(() => {
            // Populate modal with debt data
            populateInstallmentPaymentModal(debtId, debtData);
            
            // Show modal
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
        }, 150);
        return; // Exit early to prevent showing modal immediately
    }
    
    // If no debt details modal was open, show the installment payment modal immediately
    // Populate modal with debt data
    populateInstallmentPaymentModal(debtId, debtData);
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Create installment payment modal
function createInstallmentPaymentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'installmentPaymentModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'installmentPaymentModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="installmentPaymentModalLabel">
                        <i class="fas fa-credit-card me-2"></i>ชำระหนี้งวด
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
                <div class="modal-footer d-flex justify-content-end align-items-center">
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary btn-sm" onclick="recordInstallmentPayment()">
                            <i class="fas fa-credit-card me-1"></i>ชำระ
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Populate installment payment modal
function populateInstallmentPaymentModal(debtId, debtData) {
    const modal = document.getElementById('installmentPaymentModal');
    if (!modal) return;
    
    // Store debtId in modal for later use
    modal.setAttribute('data-debt-id', debtId);
    window.currentDebtId = debtId;
    
    // Check if debtData is valid
    if (!debtData) {
        console.error('debtData is undefined for debtId:', debtId);
        showError('ไม่พบข้อมูลหนี้ กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    const modalBody = modal.querySelector('.modal-body');
    
    // Calculate payment info
    const totalAmount = debtData.totalAmount || debtData.amount || 0;
    const monthlyPayment = debtData.monthlyPayment || (totalAmount / (debtData.installmentMonths || 1));
    const installmentMonths = debtData.installmentMonths || 1;
    const paidInstallments = debtData.paidInstallments || 0;
    const remainingInstallments = installmentMonths - paidInstallments;
    const remainingAmount = debtData.remainingAmount || totalAmount;
    
    // Get payment history
    const paymentHistory = debtData.paymentHistory || [];
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">ข้อมูลการชำระ</h6>
                <div class="card bg-light">
                    <div class="card-body">
                        <div class="row mb-2">
                            <div class="col-6"><strong>ยอดรวม:</strong></div>
                            <div class="col-6">฿${totalAmount.toLocaleString()}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6"><strong>ผ่อนเดือนละ:</strong></div>
                            <div class="col-6">฿${monthlyPayment.toFixed(2)}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6"><strong>จำนวนงวด:</strong></div>
                            <div class="col-6">${installmentMonths} งวด</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6"><strong>ชำระแล้ว:</strong></div>
                            <div class="col-6">${paidInstallments} งวด</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6"><strong>เหลือ:</strong></div>
                            <div class="col-6">${remainingInstallments} งวด</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6"><strong>ยอดคงเหลือ:</strong></div>
                            <div class="col-6">฿${remainingAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3">ชำระงวดนี้</h6>
                <div class="mb-3">
                    <label for="paymentAmount" class="form-label">จำนวนเงินที่ชำระ:</label>
                    <input type="number" class="form-control" id="paymentAmount" 
                           value="${monthlyPayment.toFixed(2)}" min="0" step="0.01">
                </div>
                <div class="mb-3">
                    <label for="paymentDate" class="form-label">วันที่ชำระ:</label>
                    <input type="date" class="form-control" id="paymentDate" 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="mb-3">
                    <label for="paymentTime" class="form-label">เวลา:</label>
                    <input type="time" class="form-control" id="paymentTime" 
                           value="${new Date().toTimeString().slice(0, 5)}">
                </div>
                <div class="mb-3">
                    <label for="paymentNote" class="form-label">หมายเหตุ:</label>
                    <textarea class="form-control" id="paymentNote" rows="2" 
                              placeholder="หมายเหตุการชำระ (ถ้ามี)"></textarea>
                </div>
            </div>
        </div>
        ${paymentHistory.length > 0 ? `
        <hr>
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary mb-3">ประวัติการชำระ</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>เวลา</th>
                                <th>จำนวนเงิน</th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paymentHistory.map(payment => `
                                <tr>
                                    <td>${new Date(payment.date.toDate()).toLocaleDateString('th-TH')}</td>
                                    <td>${new Date(payment.date.toDate()).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</td>
                                    <td>฿${payment.amount.toFixed(2)}</td>
                                    <td>${payment.note || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}
    `;
    

}

// Record installment payment
function recordInstallmentPayment(debtId, debtData) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in recordInstallmentPayment');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in recordInstallmentPayment');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    // If debtId and debtData are not provided, get them from the modal
    if (!debtId || !debtData) {
        const modal = document.getElementById('installmentPaymentModal');
        if (!modal) {
            showError('ไม่พบข้อมูลหนี้ กรุณาเปิด modal ใหม่');
            return;
        }
        
        // Get debtId from modal data attribute or global variable
        debtId = modal.getAttribute('data-debt-id') || window.currentDebtId;
        if (!debtId) {
            showError('ไม่พบข้อมูลหนี้ กรุณาเปิด modal ใหม่');
            return;
        }
        
        // Get debtData from Firebase
        window.firebaseDb.collection('debts').doc(debtId).get()
            .then(function(doc) {
                if (doc.exists) {
                    const debtData = doc.data();
                    recordInstallmentPayment(debtId, debtData);
                } else {
                    showError('ไม่พบข้อมูลหนี้');
                }
            })
            .catch(function(error) {
                console.error('Error getting debt data:', error);
                showError('เกิดข้อผิดพลาดในการดึงข้อมูลหนี้');
            });
        return;
    }
    
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentTime = document.getElementById('paymentTime').value;
    const paymentNote = document.getElementById('paymentNote').value.trim();
    
    if (paymentAmount <= 0) {
        showWarning('กรุณากรอกจำนวนเงินที่ชำระ');
        return;
    }
    
    if (!paymentDate) {
        showWarning('กรุณาเลือกวันที่ชำระ');
        return;
    }
    
    if (!paymentTime) {
        showWarning('กรุณาเลือกเวลาชำระ');
        return;
    }
    
    // Calculate new values
    const currentRemainingAmount = debtData.remainingAmount || debtData.totalAmount || debtData.amount || 0;
    const newRemainingAmount = Math.max(0, currentRemainingAmount - paymentAmount);
    const currentPaidInstallments = debtData.paidInstallments || 0;
    const newPaidInstallments = currentPaidInstallments + 1;
    
    // Determine new status
    let newStatus = debtData.status;
    if (newRemainingAmount <= 0) {
        newStatus = 'paid';
    } else if (debtData.status === 'pending') {
        newStatus = 'partial';
    }
    
    // Create payment record with date and time
    const paymentDateTime = paymentTime ? 
        new Date(paymentDate + 'T' + paymentTime) : 
        new Date(paymentDate);
    
    // Generate payment ID and code
    const paymentId = `${debtId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentCode = generatePaymentCode(paymentId, { paymentDate: paymentDateTime });
    
    const paymentRecord = {
        id: paymentId,
        paymentCode: paymentCode,
        amount: paymentAmount,
        date: paymentDateTime,
        note: paymentNote,
        installmentNumber: newPaidInstallments
    };
    
    // Update debt document
    const updateData = {
        remainingAmount: newRemainingAmount,
        paidInstallments: newPaidInstallments,
        status: newStatus,
        lastPaymentDate: paymentDateTime,
        paymentHistory: firebase.firestore.FieldValue.arrayUnion(paymentRecord)
    };
    
    // If fully paid, add paidAt timestamp
    if (newStatus === 'paid') {
        updateData.paidAt = new Date();
    }
    
    window.firebaseDb.collection('debts').doc(debtId).update(updateData)
        .then(function() {
            const message = newStatus === 'paid' ? 
                'ชำระหนี้ครบถ้วนแล้ว' : 
                `บันทึกการชำระงวดที่ ${newPaidInstallments} เรียบร้อยแล้ว`;
            showInfo(message);
            
            // Remove focus from any elements in the modals before hiding
            const installmentPaymentModal = document.getElementById('installmentPaymentModal');
            if (installmentPaymentModal) {
                removeFocusFromModal(installmentPaymentModal);
            }
            
            const debtDetailsModal = document.getElementById('debtDetailsModal');
            if (debtDetailsModal) {
                removeFocusFromModal(debtDetailsModal);
            }
            
            // Hide installment payment modal
            const modal = document.getElementById('installmentPaymentModal');
            if (modal) {
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
            
            // Hide debt details modal
            hideDebtDetailsModal();
            
            // Refresh data
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) {
                loadUserDebts(userId);
            }
            loadAllDebts();
        })
        .catch(function(error) {
            console.error('Error recording payment:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกการชำระ');
        });
}

// Edit debt from modal
function editDebt(debtId) {
    
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in editDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in editDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    
    // Get current debt data
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                const debtData = doc.data();
                showEditDebtForm(debtId, debtData);
            } else {
                console.warn('Debt document not found');
                showWarning('ไม่พบข้อมูลหนี้');
            }
        })
        .catch(function(error) {
            console.error('Error getting debt data:', error);
            showError('เกิดข้อผิดพลาดในการดึงข้อมูลหนี้');
        });
}

// Show edit debt form
function showEditDebtForm(debtId, debtData) {
    // Remove focus from any elements in the debt details modal before hiding
    const debtDetailsModal = document.getElementById('debtDetailsModal');
    if (debtDetailsModal) {
        removeFocusFromModal(debtDetailsModal);
    }
    
    // Hide debt details modal
    hideDebtDetailsModal();
    
    // Show add debt modal and populate with existing data
    const modal = new bootstrap.Modal(document.getElementById('addDebtModal'));
    
    // Update modal title
    const modalTitle = document.getElementById('addDebtModalLabel');
    modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>แก้ไขหนี้';
    
    // Populate form fields
    document.getElementById('debtorName').value = debtData.debtorName || '';
    document.getElementById('debtorPhone').value = debtData.debtorPhone || '';
    document.getElementById('debtAmount').value = debtData.principal || debtData.amount || '';
    document.getElementById('interestRate').value = debtData.interestRate || 0;
    document.getElementById('interestType').value = debtData.interestType || 'none';
    document.getElementById('installmentMonths').value = debtData.installmentMonths || 1;
    document.getElementById('dueDate').value = debtData.dueDate ? debtData.dueDate.toDate().toISOString().split('T')[0] : '';
    document.getElementById('paymentDate').value = debtData.paymentDate || '';
    document.getElementById('debtDescription').value = debtData.description || '';
    
    // Update calculation summary
    calculateInterest();
    
    // ซ่อนปุ่ม "เพิ่มข้อมูล" และแสดงปุ่ม "อัพเดทข้อมูล"
    const addBtn = document.getElementById('addNewDebtBtn');
    const updateBtn = document.getElementById('updateDebtBtn');
    
    
    if (addBtn) {
        addBtn.classList.add('d-none');
    }
    if (updateBtn) {
        updateBtn.classList.remove('d-none');
        updateBtn.onclick = () => updateExistingDebt(debtId);
    }
    
    // Wait a bit for the debt details modal to fully close before showing the edit modal
    setTimeout(() => {
        // Show modal
        modal.show();
    }, 150);
}

// Update existing debt
function updateExistingDebt(debtId) {
    // Get form data
    const formData = {
        debtorName: document.getElementById('debtorName').value.trim(),
        debtorPhone: document.getElementById('debtorPhone').value.trim(),
        principal: parseFloat(document.getElementById('debtAmount').value) || 0,
        interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
        interestType: document.getElementById('interestType').value,
        installmentMonths: parseInt(document.getElementById('installmentMonths').value) || 1,
        dueDate: new Date(document.getElementById('dueDate').value),
        paymentDate: parseInt(document.getElementById('paymentDate').value) || null,
        description: document.getElementById('debtDescription').value.trim()
    };
    
    // Validate form data
    if (!formData.debtorName) {
        showWarning('กรุณากรอกชื่อลูกหนี้');
        return;
    }
    
    if (formData.principal <= 0) {
        showWarning('กรุณากรอกจำนวนเงินที่ถูกต้อง');
        return;
    }
    
    if (!formData.dueDate || isNaN(formData.dueDate.getTime())) {
        showWarning('กรุณาเลือกวันครบกำหนด');
        return;
    }
    
    // Calculate additional fields
    const calculatedData = calculateDebtDetails(formData);
    
    // Prepare update data
    const updateData = {
        ...formData,
        ...calculatedData,
        updatedAt: new Date()
    };
    
    // Update in Firestore
    window.firebaseDb.collection('debts').doc(debtId).update(updateData)
        .then(function() {
            showSuccess('อัปเดตหนี้เรียบร้อยแล้ว');
            
            // Close modal properly
            closeAddDebtModal();
            
            // Refresh data
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) {
                loadUserDebts(userId);
            }
            loadAllDebts();
        })
        .catch(function(error) {
            console.error('Error updating debt:', error);
            showError('เกิดข้อผิดพลาดในการอัปเดตหนี้');
        });
}

// Calculate debt details for editing
function calculateDebtDetails(formData) {
    const principal = formData.principal;
    const interestRate = formData.interestRate;
    const interestType = formData.interestType;
    const installmentMonths = formData.installmentMonths;
    
    let totalInterest = 0;
    let totalAmount = principal;
    let monthlyPayment = principal;
    
    if (interestType === 'simple' && interestRate > 0) {
        totalInterest = (principal * interestRate * installmentMonths) / 1200; // Monthly rate
        totalAmount = principal + totalInterest;
        monthlyPayment = totalAmount / installmentMonths;
    } else if (interestType === 'compound' && interestRate > 0) {
        const monthlyRate = interestRate / 1200;
        totalAmount = principal * Math.pow(1 + monthlyRate, installmentMonths);
        totalInterest = totalAmount - principal;
        monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, installmentMonths)) / 
                        (Math.pow(1 + monthlyRate, installmentMonths) - 1);
    }
    
    return {
        totalInterest: totalInterest,
        totalAmount: totalAmount,
        monthlyPayment: monthlyPayment,
        remainingAmount: totalAmount,
        paidInstallments: 0,
        paymentHistory: []
    };
}



// Delete debt from modal
function deleteDebtFromModal(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in deleteDebtFromModal');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in deleteDebtFromModal');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (confirm('ยืนยันการลบหนี้นี้?')) {
        // Remove focus from any elements in the modal before deleting
        const debtDetailsModal = document.getElementById('debtDetailsModal');
        if (debtDetailsModal) {
            removeFocusFromModal(debtDetailsModal);
        }
        
        window.firebaseDb.collection('debts').doc(debtId).delete().then(function() {
            showSuccess('ลบหนี้เรียบร้อยแล้ว');
            hideDebtDetailsModal();
            // Refresh data
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) {
                loadUserDebts(userId);
            }
            loadAllDebts();
        }).catch(function(error) {
            console.error('Error deleting debt:', error);
            showError('เกิดข้อผิดพลาดในการลบ');
        });
    }
}

// Delete debt directly from table button
function deleteDebt(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in deleteDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in deleteDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (confirm('ยืนยันการลบหนี้นี้?')) {
        window.firebaseDb.collection('debts').doc(debtId).delete().then(function() {
            showSuccess('ลบหนี้เรียบร้อยแล้ว');
            // Refresh data
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) {
                loadUserDebts(userId);
            }
            loadAllDebts();
        }).catch(function(error) {
            console.error('Error deleting debt:', error);
            showError('เกิดข้อผิดพลาดในการลบ');
        });
    }
}

// Delete specific payment record
function deletePaymentRecord(debtId, paymentId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in deletePaymentRecord');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in deletePaymentRecord');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    // Validate parameters
    if (!debtId || !paymentId || paymentId === 'undefined') {
        showError('ไม่พบข้อมูลการชำระเงินที่ต้องการลบ');
        return;
    }
    
    if (confirm('ยืนยันการลบรายการชำระเงินนี้?')) {
        // Show loading state
        showInfo('กำลังลบรายการชำระเงิน...');
        
        // Get current debt data
        window.firebaseDb.collection('debts').doc(debtId).get()
            .then(function(doc) {
                if (doc.exists) {
                    const debtData = doc.data();
                    const paymentHistory = debtData.paymentHistory || [];
                    
                    // Find the payment record to delete
                    const paymentToDelete = paymentHistory.find(payment => {
                        const currentPaymentId = payment.id || payment.paymentId || payment.timestamp;
                        return currentPaymentId === paymentId;
                    });
                    
                    if (!paymentToDelete) {
                        throw new Error('ไม่พบรายการชำระเงินที่ต้องการลบ');
                    }
                    
                    // Remove the specific payment record
                    const updatedPaymentHistory = paymentHistory.filter(payment => {
                        const currentPaymentId = payment.id || payment.paymentId || payment.timestamp;
                        return currentPaymentId !== paymentId;
                    });
                    
                    // Calculate new totals
                    const totalPaid = updatedPaymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                    const totalAmount = debtData.totalAmount || debtData.amount || 0;
                    const remainingAmount = Math.max(0, totalAmount - totalPaid);
                    const paidInstallments = updatedPaymentHistory.length;
                    
                    // Determine new status
                    let newStatus = debtData.status;
                    if (remainingAmount <= 0) {
                        newStatus = 'paid';
                    } else if (totalPaid > 0) {
                        newStatus = 'partial';
                    } else {
                        newStatus = 'pending';
                    }
                    
                    // Update debt document
                    return window.firebaseDb.collection('debts').doc(debtId).update({
                        paymentHistory: updatedPaymentHistory,
                        remainingAmount: remainingAmount,
                        paidInstallments: paidInstallments,
                        status: newStatus,
                        updatedAt: new Date()
                    });
                } else {
                    throw new Error('ไม่พบข้อมูลหนี้');
                }
            })
            .then(function() {
                showSuccess('ลบรายการชำระเงินเรียบร้อยแล้ว');
                
                // Refresh all data
                loadDashboardData();
                loadAllDebts();
                
                // Force refresh payment history with delay to ensure data is updated
                setTimeout(() => {
                    loadPaymentHistory();
                }, 1000);
            })
            .catch(function(error) {
                console.error('Error deleting payment record:', error);
                showError('เกิดข้อผิดพลาดในการลบรายการชำระเงิน: ' + error.message);
            });
    }
}

// Setup event listeners
function setupEventListeners() {
    
    // Header navigation - use event delegation for better reliability
    // Only add this if not already handled by HTML
    if (!document.querySelector('.nav-link').hasAttribute('data-event-bound')) {
        document.addEventListener('click', function(e) {
            // Check if clicked element is a nav link or inside a nav link
            const navLink = e.target.closest('.nav-link');
            
            if (navLink) {
                e.preventDefault();
                
                // Remove focus from any elements in modals before navigation
                const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        removeFocusFromModal(modal);
                    }
                });
                
                // Remove active class from all links
                const allNavLinks = document.querySelectorAll('.nav-link');
                allNavLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                navLink.classList.add('active');
                
                // Handle navigation
                const href = navLink.getAttribute('href');
                handleNavigation(href);
            }
        });
        
        // Mark nav links as having events bound
        document.querySelectorAll('.nav-link').forEach(link => {
            link.setAttribute('data-event-bound', 'true');
        });
    }
    
    // Also listen for hashchange events
    window.addEventListener('hashchange', function() {
        // Remove focus from any elements in modals before handling hash change
        const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                removeFocusFromModal(modal);
            }
        });
        
        const hash = window.location.hash || '#dashboard';
        handleNavigation(hash);
        updateActiveNavLink(hash);
    });
    
    // Add debt form submission
    const addDebtForm = document.getElementById('addDebtForm');
    if (addDebtForm) {
        addDebtForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Remove focus from any elements in the form before submitting
            const formElements = addDebtForm.querySelectorAll('input, select, textarea, button');
            formElements.forEach(element => {
                if (element === document.activeElement) {
                    element.blur();
                }
            });
            // Remove focus from any elements in other modals before submitting
            const modals = ['debtDetailsModal', 'installmentPaymentModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    removeFocusFromModal(modal);
                }
            });
            submitNewDebt();
        });
    }
    
    // Add modal close event listeners
    const addDebtModal = document.getElementById('addDebtModal');
    if (addDebtModal) {
        addDebtModal.addEventListener('hidden.bs.modal', function() {
            // Add debt modal hidden event triggered
            // Ensure proper cleanup when modal is hidden
            removeFocusFromModal(addDebtModal);
            addDebtModal.setAttribute('aria-hidden', 'true');
            addDebtModal.removeAttribute('aria-modal');
        });
        
        addDebtModal.addEventListener('hide.bs.modal', function() {
            // Add debt modal hide event triggered
            // Remove focus before hiding
            removeFocusFromModal(addDebtModal);
        });
        
        // Handle ESC key and backdrop clicks
        addDebtModal.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeAddDebtModal();
            }
        });
        
        // Handle backdrop clicks
        addDebtModal.addEventListener('click', function(e) {
            if (e.target === addDebtModal) {
                closeAddDebtModal();
            }
        });
    }
    
    // Quick action buttons - use event delegation
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn');
        if (btn) {
            const text = btn.textContent.trim();
            
            if (text.includes('เพิ่มหนี้ใหม่')) {
                e.preventDefault();
                // Remove focus from any elements in modals before adding new debt
                const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        removeFocusFromModal(modal);
                    }
                });
                addNewDebt();
            } else if (text.includes('ดาวน์โหลดรายงาน')) {
                e.preventDefault();
                // Remove focus from any elements in modals before downloading report
                const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        removeFocusFromModal(modal);
                    }
                });
                downloadReport();
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        removeFocusFromModal(modal);
                    }
                });
                // notificationSettings(); // Removed - notifications not used
            } else if (text.includes('จัดการลูกหนี้')) {
                e.preventDefault();
                // Remove focus from any elements in modals before managing debtors
                const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        removeFocusFromModal(modal);
                    }
                });
                manageDebtors();
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        const hash = window.location.hash || '#dashboard';
        handleNavigation(hash);
        updateActiveNavLink(hash);
    });
}

// Add new debt (wrapper for submitNewDebt)
function addNewDebt() {
    submitNewDebt();
}

// Submit new debt form
function submitNewDebt() {
    try {
        // submitNewDebt function called
    
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in submitNewDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in submitNewDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        console.error('No user ID found in submitNewDebt');
        showWarning('กรุณาเข้าสู่ระบบก่อน');
        return;
    }
    
    // Check if form exists
    const form = document.getElementById('addDebtForm');
    if (!form) {
        console.error('Add debt form not found');
        showError('เกิดข้อผิดพลาด: ไม่พบฟอร์มข้อมูล');
        return;
    }
    
    // Check if form elements exist
    const formElements = {
        debtorName: document.getElementById('debtorName'),
        debtorPhone: document.getElementById('debtorPhone'),
        dueDate: document.getElementById('dueDate'),
        debtDescription: document.getElementById('debtDescription'),
        debtAmount: document.getElementById('debtAmount'),
        interestRate: document.getElementById('interestRate'),
        interestType: document.getElementById('interestType'),
        installmentMonths: document.getElementById('installmentMonths')
    };

    // Check if all required elements exist
    const missingElements = Object.entries(formElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing form elements:', missingElements);
        showError('เกิดข้อผิดพลาด: ไม่พบฟอร์มข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }

    const debtorName = formElements.debtorName.value.trim();
    const debtorPhone = formElements.debtorPhone.value.trim();
    const dueDate = formElements.dueDate.value;
    const description = formElements.debtDescription.value.trim();

    if (!debtorName || !dueDate) {
        showWarning('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
    }

    // Get calculated values
    const calculated = getCalculatedValues();
    
    if (calculated.principal <= 0) {
        showWarning('จำนวนเงินต้นต้องมากกว่า 0');
        return;
    }
    
    // Validate calculated values
    if (!calculated || typeof calculated !== 'object') {
        console.error('Invalid calculated values:', calculated);
        showError('เกิดข้อผิดพลาดในการคำนวณ กรุณาลองใหม่อีกครั้ง');
        return;
    }
    
    // Check if all required calculated properties exist
    const requiredProperties = ['principal', 'interestRate', 'interestType', 'installmentMonths', 'totalInterest', 'totalAmount', 'monthlyPayment'];
    const missingProperties = requiredProperties.filter(prop => !(prop in calculated));
    
    if (missingProperties.length > 0) {
        console.error('Missing calculated properties:', missingProperties);
        showError('เกิดข้อผิดพลาดในการคำนวณ กรุณาลองใหม่อีกครั้ง');
        return;
    }


    
    // Check if Firebase is available
    if (!window.firebaseDb) {
        console.error('Firebase database not available');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }

    // Check if debtor exists in the system (either from search or by phone)
    let debtorId = null;
    let debtorExists = false;
    
    // Checking for selected debtor
    
    // If we have a selected debtor from search, use that ID
    if (window.selectedDebtorId) {
        debtorId = window.selectedDebtorId;
        debtorExists = true;
        // Using selected debtor ID
        
        // Add debt directly since we have the debtor ID
        const debtData = {
            creditorId: userId,
            debtorName: debtorName,
            debtorPhone: debtorPhone,
            debtorEmail: '', // จะอัปเดตจากข้อมูลผู้ใช้
            principal: calculated.principal,
            interestRate: calculated.interestRate,
            interestType: calculated.interestType,
            installmentMonths: calculated.installmentMonths,
            totalInterest: calculated.totalInterest,
            totalAmount: calculated.totalAmount,
            monthlyPayment: calculated.monthlyPayment,
            amount: calculated.totalAmount, // Keep for backward compatibility
            dueDate: new Date(dueDate),
            description: description,
            status: 'pending',
            createdAt: new Date(),
            // Initialize installment payment data
            remainingAmount: calculated.totalAmount,
            paidInstallments: 0,
            paymentHistory: [],
            // Add debtor linking information
            debtorId: debtorId,
            debtorExists: debtorExists
        };
        
        // ดึงข้อมูลอีเมลของผู้ใช้จาก debtorId
        window.firebaseDb.collection('users').doc(debtorId).get()
            .then(function(userDoc) {
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    debtData.debtorEmail = userData.email || '';
                    // Found debtor email
                } else {
                    // Debtor document not found for ID
                }
                
                // Debt data before adding to Firestore (selected debtor)
                return window.firebaseDb.collection('debts').add(debtData);
            })
            .then(function(docRef) {
                // Debt successfully added with ID
                // Final debt data that was saved
                return docRef;
            })
            .then(function(docRef) {
                // Create notification for debtor (don't wait for it to complete)
                // createDebtNotification(docRef.id, debtData); // Removed - notifications not used

                showSuccess('เพิ่มหนี้ใหม่เรียบร้อยแล้ว');

                // Reset form, close modal, refresh dashboard
                const form = document.getElementById('addDebtForm');
                if (form) { form.reset(); }
                
                // Close modal properly
                // Closing modal after successful debt creation...
                closeAddDebtModal();
                
                loadDashboardData();
                const userId = window.firebaseAuth.currentUser?.uid;
                if (userId) { loadUserDebts(userId); }
                
                // Clear selected debtor
                clearSelectedDebtor();
            }).catch(function(error) {
                console.error('Error adding debt:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                showError('เกิดข้อผิดพลาดในการเพิ่มหนี้ กรุณาลองใหม่อีกครั้ง\nข้อผิดพลาด: ' + error.message);
            });
            
    } else {
        // Check if debtor exists by phone number (check both phone and phoneNumber fields)
        const checkDebtorQuery = window.firebaseDb.collection('users')
            .where('userType', '==', 'debtor')
            .where('phoneNumber', '==', debtorPhone);
        
        checkDebtorQuery.get().then(function(debtorSnapshot) {
            if (!debtorSnapshot.empty) {
                const debtorDoc = debtorSnapshot.docs[0];
                debtorId = debtorDoc.id;
                debtorExists = true;
            }
            
            const debtData = {
                creditorId: userId,
                debtorName: debtorName,
                debtorPhone: debtorPhone,
                debtorEmail: '', // จะอัปเดตจากข้อมูลผู้ใช้
                principal: calculated.principal,
                interestRate: calculated.interestRate,
                interestType: calculated.interestType,
                installmentMonths: calculated.installmentMonths,
                totalInterest: calculated.totalInterest,
                totalAmount: calculated.totalAmount,
                monthlyPayment: calculated.monthlyPayment,
                amount: calculated.totalAmount, // Keep for backward compatibility
                dueDate: new Date(dueDate),
                description: description,
                status: 'pending',
                createdAt: new Date(),
                // Initialize installment payment data
                remainingAmount: calculated.totalAmount,
                paidInstallments: 0,
                paymentHistory: [],
                // Add debtor linking information
                debtorId: debtorId,
                debtorExists: debtorExists
            };
            
            // ดึงข้อมูลอีเมลของผู้ใช้จาก debtorId (ถ้ามี)
            let debtDataWithEmail = debtData;
            if (debtorId) {
                return window.firebaseDb.collection('users').doc(debtorId).get()
                    .then(function(userDoc) {
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            debtDataWithEmail.debtorEmail = userData.email || '';
                            // Found debtor email (by phone)
                        } else {
                            // Debtor document not found for ID (by phone)
                        }
                        // Debt data before adding to Firestore (by phone)
                        return window.firebaseDb.collection('debts').add(debtDataWithEmail);
                    })
                    .then(function(docRef) {
                        // Debt successfully added with ID (by phone)
                        // Final debt data that was saved (by phone)
                        return { docRef: docRef, debtData: debtDataWithEmail };
                    });
            } else {
                // Add debt to database and return both docRef and debtData
                // Debt data before adding to Firestore (no debtor found)
                return window.firebaseDb.collection('debts').add(debtData).then(function(docRef) {
                    // Debt successfully added with ID (no debtor found)
                    // Final debt data that was saved (no debtor found)
                    return { docRef: docRef, debtData: debtData };
                });
            }
        }).then(function(result) {
            // Create notification for debtor (don't wait for it to complete)
            // createDebtNotification(result.docRef.id, result.debtData); // Removed - notifications not used

            showSuccess('เพิ่มหนี้ใหม่เรียบร้อยแล้ว');

            // Reset form, close modal, refresh dashboard
            const form = document.getElementById('addDebtForm');
            if (form) { form.reset(); }
            
            // Close modal properly
            // Closing modal after successful debt creation...
            closeAddDebtModal();
            
            loadDashboardData();
            const userId = window.firebaseAuth.currentUser?.uid;
            if (userId) { 
                loadUserDebts(userId);
                loadAllDebts(); // อัปเดตตารางหนี้ทั้งหมด
            }
            
            // Clear selected debtor
            clearSelectedDebtor();
        }).catch(function(error) {
            console.error('Error adding debt:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            showError('เกิดข้อผิดพลาดในการเพิ่มหนี้ กรุณาลองใหม่อีกครั้ง\nข้อผิดพลาด: ' + error.message);
        });
    }
    } catch (error) {
        console.error('Error in submitNewDebt:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        
        // Close modal properly even on error
        closeAddDebtModal();
        
        showError('เกิดข้อผิดพลาดในการเพิ่มหนี้ กรุณาลองใหม่อีกครั้ง\nข้อผิดพลาด: ' + error.message);
    }
}

// Update existing debts when debtor registers
function updateDebtsForNewDebtor(debtorPhone, debtorId) {
    if (!window.firebaseDb) {
        console.error('Firebase database not available');
        return;
    }
    
    // Find all debts with this phone number that don't have debtorId
    const debtsRef = window.firebaseDb.collection('debts')
        .where('debtorPhone', '==', debtorPhone)
        .where('debtorId', '==', null);
    
    debtsRef.get().then(function(querySnapshot) {
        const updatePromises = [];
        
        querySnapshot.forEach(function(doc) {
            const updateData = {
                debtorId: debtorId,
                debtorExists: true,
                updatedAt: new Date()
            };
            
            updatePromises.push(
                window.firebaseDb.collection('debts').doc(doc.id).update(updateData)
            );
        });
        
        if (updatePromises.length > 0) {
            Promise.all(updatePromises).then(function() {
                // Successfully updated debts for new debtor
            }).catch(function(error) {
                console.error('Error updating debts for new debtor:', error);
            });
        }
    }).catch(function(error) {
        console.error('Error finding debts for new debtor:', error);
    });
}

// Create notification for debtor when new debt is created
// function createDebtNotification(debtId, debtData) {
//     // Removed - notifications not used
// }

// Handle navigation
function handleNavigation(href) {
    // Remove focus from any elements in modals before navigation
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    // Update URL hash without triggering popstate
    if (window.location.hash !== href) {
        window.history.pushState(null, null, href);
    }
    
    switch (href) {
        case '#dashboard':
            showDashboard();
            break;
        case '#debts':
            showDebtsList();
            break;
        case '#reports':
            showReports();
            break;
        case '#payment-history':
            showPaymentHistory();
            break;
        case '#settings':
            showSettings();
            break;
        default:
            // Default to dashboard
            showDashboard();
            break;
    }
}

// Make handleNavigation globally available
window.handleNavigation = handleNavigation;

// Show dashboard content
function showDashboard() {
    // Remove focus from any elements in modals before showing dashboard
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    hideAllContent();
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.classList.remove('hidden');
        
        // Force a reflow to ensure the element is visible
        dashboardContent.offsetHeight;
    } else {
        console.error('Dashboard content element not found');
        createFallbackContent('dashboard-content', 'แดชบอร์ด');
    }
    updateActiveNavLink('#dashboard');
    
    // Check if user is authenticated before loading data
    const currentUser = window.firebaseAuth?.currentUser;
    if (currentUser) {
        // Initialize charts first
        initializeCharts();
        loadDashboardData();
        loadUserDebts(currentUser.uid);
        // Add chart auto-refresh interval selector
        setTimeout(() => {
            removeDuplicateChartAutoRefreshSelectors();
            addChartAutoRefreshIntervalSelector();
        }, 1000);
    } else {
        // Wait for authentication to be ready
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    // Initialize charts first
                    initializeCharts();
                    loadDashboardData();
                    loadUserDebts(user.uid);
                    // Add chart auto-refresh interval selector
                    setTimeout(() => {
                        removeDuplicateChartAutoRefreshSelectors();
                        addChartAutoRefreshIntervalSelector();
                    }, 1000);
                } else {
                    sessionStorage.setItem('isRedirecting', 'true');
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 100);
                }
            });
        } else {
            console.error('Firebase Auth not available');
            showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ');
        }
    }
}

// Show debts list content
function showDebtsList() {
    // Remove focus from any elements in modals before showing debts list
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    hideAllContent();
    const debtsContent = document.getElementById('debts-content');
    if (debtsContent) {
        debtsContent.classList.remove('hidden');
        
        // Force a reflow to ensure the element is visible
        debtsContent.offsetHeight;
    } else {
        console.error('Debts content element not found');
        createFallbackContent('debts-content', 'รายการหนี้');
    }
    updateActiveNavLink('#debts');
    
    // Check if user is authenticated before loading data
    const currentUser = window.firebaseAuth?.currentUser;
    if (currentUser) {
        // Initialize charts first
        initializeCharts();
        loadAllDebts();
    } else {
        // Wait for authentication to be ready
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    // Initialize charts first
                    initializeCharts();
                    loadAllDebts();
                } else {
                    sessionStorage.setItem('isRedirecting', 'true');
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 100);
                }
            });
        } else {
            console.error('Firebase Auth not available');
            showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ');
        }
    }
}

// Show add debt form as modal
// Modal backdrop control functions
function setModalBackdrop(modalId, opacity = 0.3, color = 'rgba(0, 0, 0, 0.3)') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('shown.bs.modal', function() {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.backgroundColor = color;
                backdrop.style.opacity = opacity;
            }
        });
    }
}

function removeModalBackdrop(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('shown.bs.modal', function() {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.display = 'none';
            }
        });
    }
}

function showAddDebtForm() {
    // Check if modal exists
    const modalElement = document.getElementById('addDebtModal');
    if (!modalElement) {
        console.error('Add debt modal not found');
        showError('เกิดข้อผิดพลาด: ไม่พบฟอร์มเพิ่มหนี้');
        return;
    }
    
    // Check if Bootstrap is available
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not available');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเปิดฟอร์มได้');
        return;
    }
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) {
        dueDateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Reset form
    const form = document.getElementById('addDebtForm');
    if (form) {
        form.reset();
        // Set default due date again after reset
        if (dueDateInput) {
            dueDateInput.value = tomorrow.toISOString().split('T')[0];
        }
        // Reset payment date field
        const paymentDateInput = document.getElementById('paymentDate');
        if (paymentDateInput) {
            paymentDateInput.value = '';
        }
    }
    
    // Set up calculation event listeners
    setupCalculationListeners();
    
    // Hide any other open modals first
    const otherModals = ['debtDetailsModal', 'installmentPaymentModal'];
    otherModals.forEach(modalId => {
        const otherModal = document.getElementById(modalId);
        if (otherModal) {
            const otherBootstrapModal = bootstrap.Modal.getInstance(otherModal);
            if (otherBootstrapModal) {
                otherBootstrapModal.hide();
            }
            // Ensure proper accessibility state
            otherModal.setAttribute('aria-hidden', 'true');
            otherModal.removeAttribute('aria-modal');
            otherModal.setAttribute('inert', '');
            removeFocusFromModal(otherModal);
        }
    });
    
    // Clear any existing modal state
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.removeAttribute('aria-modal');
    
    // Remove any existing backdrops
    const existingBackdrops = document.querySelectorAll('.modal-backdrop');
    existingBackdrops.forEach(backdrop => backdrop.remove());
    
    // Clean up body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // รีเซ็ต modal header เป็น "เพิ่มข้อมูล"
    const modalTitle = document.getElementById('addDebtModalLabel');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>เพิ่มข้อมูล';
    }
    
    // แสดงปุ่ม "เพิ่มข้อมูล" และซ่อนปุ่ม "อัพเดทข้อมูล"
    const addBtn = document.getElementById('addNewDebtBtn');
    const updateBtn = document.getElementById('updateDebtBtn');
    
    if (addBtn) {
        addBtn.classList.remove('d-none');
    }
    if (updateBtn) {
        updateBtn.classList.add('d-none');
    }
    
    // รีเซ็ตตัวแปร global
    window.currentEditingDebtId = null;
    
    // Show modal with custom backdrop options
    try {
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: true, // เปิด backdrop
            keyboard: true, // อนุญาตให้กด ESC เพื่อปิด
            focus: true // ให้ focus ไปที่ modal
        });
        modal.show();
        
        // Customize backdrop after modal is shown
        modalElement.addEventListener('shown.bs.modal', function() {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'; // ลดความเข้มของ backdrop มากขึ้น
                backdrop.style.opacity = '0.2';
            }
        });
        
    } catch (error) {
        console.error('Error showing modal:', error);
        showError('เกิดข้อผิดพลาดในการเปิดฟอร์ม');
    }
}

// Show reports content
function showReports() {
    // Remove focus from any elements in modals before showing reports
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    hideAllContent();
    const reportsContent = document.getElementById('reports-content');
    if (reportsContent) {
        reportsContent.classList.remove('hidden');
        
        // Force a reflow to ensure the element is visible
        reportsContent.offsetHeight;
    } else {
        console.error('Reports content element not found');
        createFallbackContent('reports-content', 'รายงาน');
    }
    updateActiveNavLink('#reports');
}

// Show settings content
function showSettings() {
    // Remove focus from any elements in modals before showing settings
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    hideAllContent();
    const settingsContent = document.getElementById('settings-content');
    if (settingsContent) {
        settingsContent.classList.remove('hidden');
    } else {
        console.error('Settings content element not found');
        createFallbackContent('settings-content', 'ตั้งค่า');
    }
    updateActiveNavLink('#settings');
    
    // Check if user is authenticated before loading settings
    const currentUser = window.firebaseAuth.currentUser;
    if (currentUser) {
        loadUserSettings();
    } else {
        // Show message or redirect to login
        showWarning('กรุณาเข้าสู่ระบบก่อน');
        sessionStorage.setItem('isRedirecting', 'true');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 100);
    }
}

// Show profile content (same as settings for now)
function showProfile() {
    showSettings();
}

// Hide all content sections
function hideAllContent() {
    // Remove focus from any elements in modals before hiding content
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach((section) => {
        section.classList.add('hidden');
    });
}

// Create fallback content if section doesn't exist
function createFallbackContent(sectionId, title) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }
    
    // Remove existing fallback content
    const existingFallback = document.getElementById(sectionId);
    if (existingFallback) {
        existingFallback.remove();
    }
    
    // Create new fallback content
    const fallbackSection = document.createElement('div');
    fallbackSection.id = sectionId;
    fallbackSection.className = 'content-section';
    
    fallbackSection.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center">
                        <h4 class="mb-3">${title}</h4>
                        <p class="text-muted">ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้</p>
                        <button class="btn btn-primary" onclick="handleNavigation('#dashboard')">
                            <i class="fas fa-arrow-left me-2"></i>กลับไปแดชบอร์ด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    mainContent.appendChild(fallbackSection);
}

// Update active navigation link
function updateActiveNavLink(href) {
    // Remove active class from all links
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach((link) => {
        link.classList.remove('active');
    });
    
    // Add active class to the correct link (both desktop and mobile)
    const activeLinks = document.querySelectorAll(`.nav-link[href="${href}"]`);
    if (activeLinks.length > 0) {
        activeLinks.forEach((link) => {
            link.classList.add('active');
        });
    } else {
        console.warn('Active link not found for href:', href);
        // Fallback to dashboard if link not found
        const dashboardLinks = document.querySelectorAll('.nav-link[href="#dashboard"]');
        dashboardLinks.forEach((link) => {
            link.classList.add('active');
        });
    }
}

// Add new debt (duplicate function removed - using the one at line 1887)

// Setup calculation event listeners
function setupCalculationListeners() {
    const debtAmount = document.getElementById('debtAmount');
    const interestRate = document.getElementById('interestRate');
    const interestType = document.getElementById('interestType');
    const installmentMonths = document.getElementById('installmentMonths');
    
    // Check if all elements exist
    const elements = [debtAmount, interestRate, interestType, installmentMonths];
    const missingElements = elements.filter(element => !element);
    
    if (missingElements.length > 0) {
        console.error('Missing calculation elements:', missingElements.length);
        return;
    }
    
    // Add event listeners for real-time calculation
    elements.forEach(element => {
        if (element) {
            element.addEventListener('input', calculateInterest);
            element.addEventListener('change', calculateInterest);
        }
    });
    
    // Initial calculation
    calculateInterest();
}

// Calculate interest based on type
function calculateInterest() {
    try {
        const debtAmountElement = document.getElementById('debtAmount');
        const interestRateElement = document.getElementById('interestRate');
        const interestTypeElement = document.getElementById('interestType');
        const installmentMonthsElement = document.getElementById('installmentMonths');
        
        // Check if elements exist
        if (!debtAmountElement || !interestRateElement || !interestTypeElement || !installmentMonthsElement) {
            console.error('Calculation elements not found');
            return;
        }
        
        const principal = parseFloat(debtAmountElement.value) || 0;
        const rate = parseFloat(interestRateElement.value) || 0;
        const type = interestTypeElement.value || 'none';
        const months = parseInt(installmentMonthsElement.value) || 1;
        
        const summaryElement = document.getElementById('calculationSummary');
        if (!summaryElement) {
            console.error('Calculation summary element not found');
            return;
        }
    
    if (principal <= 0) {
        summaryElement.innerHTML = '<small class="text-muted">กรอกข้อมูลเพื่อดูการคำนวณ</small>';
        return;
    }
    
    let totalInterest = 0;
    let totalAmount = principal;
    let monthlyPayment = principal;
    let calculationDetails = '';
    
    if (type === 'simple' && rate > 0) {
        // Simple interest (ดอกเบี้ยคงที่)
        const annualInterest = principal * (rate / 100);
        const monthlyInterest = annualInterest / 12;
        totalInterest = monthlyInterest * months;
        totalAmount = principal + totalInterest;
        monthlyPayment = totalAmount / months;
        
        calculationDetails = `
            <div class="small">
                <strong>ดอกเบี้ยคงที่:</strong><br>
                • เงินต้น: ฿${principal.toLocaleString()}<br>
                • อัตราดอกเบี้ย: ${rate}% ต่อปี<br>
                • ดอกเบี้ยต่อเดือน: ฿${monthlyInterest.toFixed(2)}<br>
                • ดอกเบี้ยรวม: ฿${totalInterest.toFixed(2)}<br>
                • ยอดรวม: ฿${totalAmount.toFixed(2)}<br>
                • ผ่อนเดือนละ: ฿${monthlyPayment.toFixed(2)}
            </div>
        `;
    } else if (type === 'compound' && rate > 0) {
        // Compound interest (ดอกเบี้ยลดต้นลดดอก)
        const monthlyRate = rate / 100 / 12;
        totalAmount = principal * Math.pow(1 + monthlyRate, months);
        totalInterest = totalAmount - principal;
        monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        
        calculationDetails = `
            <div class="small">
                <strong>ดอกเบี้ยลดต้นลดดอก:</strong><br>
                • เงินต้น: ฿${principal.toLocaleString()}<br>
                • อัตราดอกเบี้ย: ${rate}% ต่อปี<br>
                • ดอกเบี้ยรวม: ฿${totalInterest.toFixed(2)}<br>
                • ยอดรวม: ฿${totalAmount.toFixed(2)}<br>
                • ผ่อนเดือนละ: ฿${monthlyPayment.toFixed(2)}
            </div>
        `;
    } else {
        // No interest
        calculationDetails = `
            <div class="small">
                <strong>ไม่คิดดอกเบี้ย:</strong><br>
                • เงินต้น: ฿${principal.toLocaleString()}<br>
                • ยอดรวม: ฿${principal.toLocaleString()}<br>
                • ผ่อนเดือนละ: ฿${(principal / months).toFixed(2)}
            </div>
        `;
    }
    
    summaryElement.innerHTML = calculationDetails;
    } catch (error) {
        console.error('Error in calculateInterest:', error);
        const summaryElement = document.getElementById('calculationSummary');
        if (summaryElement) {
            summaryElement.innerHTML = '<small class="text-danger">เกิดข้อผิดพลาดในการคำนวณ</small>';
        }
    }
}

// Get calculated values for form submission
function getCalculatedValues() {
    // Get form elements with proper error handling
    const debtAmountElement = document.getElementById('debtAmount');
    const interestRateElement = document.getElementById('interestRate');
    const interestTypeElement = document.getElementById('interestType');
    const installmentMonthsElement = document.getElementById('installmentMonths');
    
    // Check if elements exist
    if (!debtAmountElement || !interestRateElement || !interestTypeElement || !installmentMonthsElement) {
        console.error('Required form elements not found:', {
            debtAmount: !!debtAmountElement,
            interestRate: !!interestRateElement,
            interestType: !!interestTypeElement,
            installmentMonths: !!installmentMonthsElement
        });
        return {
            principal: 0,
            interestRate: 0,
            interestType: 'none',
            installmentMonths: 1,
            totalInterest: 0,
            totalAmount: 0,
            monthlyPayment: 0
        };
    }
    
    // Parse form values
    
    const principal = parseFloat(debtAmountElement.value) || 0;
    const rate = parseFloat(interestRateElement.value) || 0;
    const type = interestTypeElement.value || 'none';
    const months = parseInt(installmentMonthsElement.value) || 1;
    
    // Calculate interest based on type
    
    let totalInterest = 0;
    let totalAmount = principal;
    let monthlyPayment = principal / months;
    
    if (type === 'simple' && rate > 0) {
        const annualInterest = principal * (rate / 100);
        const monthlyInterest = annualInterest / 12;
        totalInterest = monthlyInterest * months;
        totalAmount = principal + totalInterest;
        monthlyPayment = totalAmount / months;
        // Simple interest calculation completed
    } else if (type === 'compound' && rate > 0) {
        const monthlyRate = rate / 100 / 12;
        totalAmount = principal * Math.pow(1 + monthlyRate, months);
        totalInterest = totalAmount - principal;
        monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        // Compound interest calculation completed
    } else {
        // No interest calculation
    }
    
    const result = {
        principal: principal,
        interestRate: rate,
        interestType: type,
        installmentMonths: months,
        totalInterest: totalInterest,
        totalAmount: totalAmount,
        monthlyPayment: monthlyPayment
    };
    
    return result;
}

// Load all debts for the debts list page
function loadAllDebts() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in loadAllDebts');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in loadAllDebts');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        console.error('User ID is undefined in loadAllDebts - waiting for authentication');
        // Wait for authentication to be ready
        if (window.firebaseAuth.currentUser === null) {
            // User is not logged in, redirect to login
            sessionStorage.setItem('isRedirecting', 'true');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 100);
            return;
        } else {
            // Firebase is still initializing, wait a bit and try again
            setTimeout(() => {
                loadAllDebts();
            }, 1000);
            return;
        }
    }

    const debtsRef = window.firebaseDb.collection('debts').where('creditorId', '==', userId);
    
    debtsRef.get().then(function(querySnapshot) {
        const debtsList = document.getElementById('allDebtsList');
        
        if (querySnapshot.empty) {
            debtsList.innerHTML = `
                <div class="debt-item text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">ยังไม่มีข้อมูลหนี้</h5>
                    <p class="text-muted">เริ่มต้นเพิ่มหนี้ใหม่เพื่อดูรายการ</p>
                    <button class="btn btn-primary" onclick="showAddDebtForm()">
                        <i class="fas fa-plus me-2"></i>เพิ่มข้อมูล
                    </button>
                </div>
            `;
            return;
        }
        
        // Convert to array and sort by creation date
        const debts = [];
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            debts.push({
                id: doc.id,
                ...debt
            });
        });
        
        // Sort by createdAt (newest first)
        debts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt.toDate()) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt.toDate()) : new Date(0);
            return dateB - dateA;
        });
        
        // Clear existing content
        debtsList.innerHTML = '';
        
        debts.forEach(function(debt) {
            const debtItem = createAllDebtsItem(debt.id, debt);
            debtsList.appendChild(debtItem);
        });
        
        // Update charts with the data
        updateCharts(debts);
    }).catch(function(error) {
        console.error('Error loading all debts:', error);
    });
}

// Create debt item for all debts list
function createAllDebtsItem(debtId, debt) {
    const debtItem = document.createElement('div');
    debtItem.className = 'debt-item';
    
    const dueDate = debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : '-';
    const status = getStatusBadge(debt.status);
    
    // Show interest info if available
    let interestInfo = '';
    if (debt.interestType && debt.interestType !== 'none' && debt.interestRate > 0) {
        const interestTypeText = debt.interestType === 'simple' ? 'ดอกเบี้ยคงที่' : 'ดอกเบี้ยลดต้นลดดอก';
        interestInfo = `<br><small class="text-info">${interestTypeText} ${debt.interestRate}%</small>`;
    }
    
    // Format creation date
    const createdDate = debt.createdAt ? new Date(debt.createdAt.toDate()).toLocaleDateString('th-TH') : '-';
    
    // Format last updated date
    const updatedDate = debt.updatedAt ? new Date(debt.updatedAt.toDate()).toLocaleDateString('th-TH') : '-';
    
    // Generate readable debt code
    const debtCode = generateDebtCode(debtId, debt);
    
    debtItem.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-1">
                <small class="text-muted">${debtCode}</small>
            </div>
            <div class="col-md-2">
                <h6 class="mb-1">${formatDebtorId(debt.debtorId || 'ไม่ระบุรหัสลูกหนี้')}</h6>
                <small class="text-muted">${debt.description || 'ไม่มีคำอธิบาย'}</small>
                ${interestInfo}
            </div>
            <div class="col-md-2">
                ${status}
            </div>
            <div class="col-md-2 text-end">
                <strong>฿${debt.totalAmount?.toLocaleString() || debt.amount?.toLocaleString() || '0'}</strong>
                ${debt.principal && debt.principal !== debt.totalAmount ? `<br><small class="text-muted">ต้น: ฿${debt.principal.toLocaleString()}</small>` : ''}
            </div>
            <div class="col-md-2 text-end">
                <small class="text-muted">${dueDate}</small>
            </div>
            <div class="col-md-2 text-end">
                <small class="text-muted">${createdDate}</small>
            </div>
            <div class="col-md-1 text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editDebt('${debtId}')">
                    <i class="fas fa-edit me-1"></i>แก้ไข
                </button>
                <button class="btn btn-sm btn-outline-danger me-1" onclick="deleteDebt('${debtId}')">
                    <i class="fas fa-trash me-1"></i>ลบ
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="showInstallmentPaymentModal('${debtId}')">
                    <i class="fas fa-money-bill-wave me-1"></i>ชำระ
                </button>
            </div>
        </div>
    `;
    
    return debtItem;
}

// Mark debt as paid
function markAsPaid(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in markAsPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in markAsPaid');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (confirm('ยืนยันการชำระหนี้?')) {
        window.firebaseDb.collection('debts').doc(debtId).update({
            status: 'paid',
            paidAt: new Date()
        }).then(function() {
            showSuccess('อัปเดตสถานะหนี้เรียบร้อยแล้ว');
            loadAllDebts();
            loadDashboardData();
        }).catch(function(error) {
            console.error('Error updating debt:', error);
            showError('เกิดข้อผิดพลาดในการอัปเดต');
        });
    }
}

// Delete debt
function deleteDebt(debtId) {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in deleteDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in deleteDebt');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (confirm('ยืนยันการลบหนี้นี้?')) {
        window.firebaseDb.collection('debts').doc(debtId).delete().then(function() {
            showSuccess('ลบหนี้เรียบร้อยแล้ว');
            loadAllDebts();
            loadDashboardData();
        }).catch(function(error) {
            console.error('Error deleting debt:', error);
            showError('เกิดข้อผิดพลาดในการลบ');
        });
    }
}

// Load user settings
function loadUserSettings() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in loadUserSettings');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in loadUserSettings');
        return;
    }
    
    const currentUser = window.firebaseAuth.currentUser;
    if (!currentUser) {
        console.error('No user authenticated in loadUserSettings');
        return;
    }
    
    const userId = currentUser.uid;

    // Check if Firebase Firestore is initialized
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized');
        return;
    }

    window.firebaseDb.collection('users').doc(userId).get().then(function(doc) {
        if (doc.exists) {
            const userData = doc.data();
            
            // Update form fields
            const displayNameField = document.getElementById('displayName');
            const phoneNumberField = document.getElementById('phoneNumber');
            
            if (displayNameField) {
                displayNameField.value = userData.displayName || '';
            }
            if (phoneNumberField) {
                phoneNumberField.value = userData.phoneNumber || '';
            }
        } else {
            // Set default values if user document doesn't exist
            const displayNameField = document.getElementById('displayName');
            const phoneNumberField = document.getElementById('phoneNumber');
            
            if (displayNameField) {
                displayNameField.value = currentUser.displayName || '';
            }
            if (phoneNumberField) {
                phoneNumberField.value = currentUser.phoneNumber || '';
            }
        }
    }).catch(function(error) {
        console.error('Error loading user settings:', error);
        // Set default values on error
        const displayNameField = document.getElementById('displayName');
        const phoneNumberField = document.getElementById('phoneNumber');
        
        if (displayNameField) {
            displayNameField.value = currentUser.displayName || '';
        }
        if (phoneNumberField) {
            phoneNumberField.value = currentUser.phoneNumber || '';
        }
    });
}

// Download report
function downloadReport() {
    // Remove focus from any elements in modals before showing reports
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    showReports();
}

// Download summary report
function downloadSummaryReport() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in downloadSummaryReport');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in downloadSummaryReport');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        showWarning('กรุณาเข้าสู่ระบบก่อน');
        return;
    }

    window.firebaseDb.collection('debts').where('creditorId', '==', userId).get()
        .then(function(querySnapshot) {
            let totalDebt = 0;
            let paidDebts = 0;
            let pendingDebts = 0;
            let overdueDebts = 0;
            
            querySnapshot.forEach(function(doc) {
                const debt = doc.data();
                totalDebt += debt.amount || 0;
                
                if (debt.status === 'paid') {
                    paidDebts++;
                } else if (debt.status === 'pending') {
                    pendingDebts++;
                    if (debt.dueDate && new Date(debt.dueDate.toDate()) < new Date()) {
                        overdueDebts++;
                    }
                }
            });

            const reportData = {
                totalDebt: totalDebt,
                paidDebts: paidDebts,
                pendingDebts: pendingDebts,
                overdueDebts: overdueDebts,
                generatedAt: new Date().toLocaleString('th-TH')
            };

            // Create and download CSV
            const csvContent = createSummaryCSV(reportData);
            downloadCSV(csvContent, 'รายงานสรุปหนี้_' + new Date().toISOString().split('T')[0] + '.csv');
        })
        .catch(function(error) {
            console.error('Error generating report:', error);
            showError('เกิดข้อผิดพลาดในการสร้างรายงาน');
        });
}

// Download detailed report
function downloadDetailedReport() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in downloadDetailedReport');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in downloadDetailedReport');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        showWarning('กรุณาเข้าสู่ระบบก่อน');
        return;
    }

    window.firebaseDb.collection('debts').where('creditorId', '==', userId).get()
        .then(function(querySnapshot) {
            const debts = [];
            querySnapshot.forEach(function(doc) {
                const debt = doc.data();
                debts.push({
                    id: doc.id,
                    debtorName: debt.debtorName || 'ไม่ระบุชื่อ',
                    amount: debt.amount || 0,
                    status: debt.status || 'ไม่ระบุ',
                    dueDate: debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : '-',
                    description: debt.description || 'ไม่มีคำอธิบาย',
                    createdAt: debt.createdAt ? new Date(debt.createdAt.toDate()).toLocaleDateString('th-TH') : '-'
                });
            });

            const csvContent = createDetailedCSV(debts);
            downloadCSV(csvContent, 'รายงานรายละเอียดหนี้_' + new Date().toISOString().split('T')[0] + '.csv');
        })
        .catch(function(error) {
            console.error('Error generating detailed report:', error);
            showError('เกิดข้อผิดพลาดในการสร้างรายงาน');
        });
}

// Create summary CSV with proper Thai encoding
function createSummaryCSV(data) {
    const headers = ['รายการ', 'จำนวน'];
    const rows = [
        ['ยอดหนี้รวม', data.totalDebt.toLocaleString() + ' บาท'],
        ['หนี้ที่ชำระแล้ว', data.paidDebts + ' รายการ'],
        ['หนี้ที่รอชำระ', data.pendingDebts + ' รายการ'],
        ['หนี้ที่เกินกำหนด', data.overdueDebts + ' รายการ'],
        ['วันที่สร้างรายงาน', data.generatedAt]
    ];

    // Create CSV content with proper escaping for Thai characters
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => {
            // Escape commas, quotes, and newlines in cell content
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(','))
        .join('\n');

    return csvContent;
}

// Create detailed CSV with proper Thai encoding
function createDetailedCSV(debts) {
    const headers = ['รหัส', 'ชื่อลูกหนี้', 'จำนวนเงิน', 'สถานะ', 'วันครบกำหนด', 'รายละเอียด', 'วันที่สร้าง'];
    const rows = debts.map(debt => [
        debt.id,
        debt.debtorName,
        debt.amount.toLocaleString() + ' บาท',
        debt.status,
        debt.dueDate,
        debt.description,
        debt.createdAt
    ]);

    // Create CSV content with proper escaping for Thai characters
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => {
            // Escape commas, quotes, and newlines in cell content
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(','))
        .join('\n');

    return csvContent;
}

// Download CSV file with proper Thai encoding
function downloadCSV(content, filename) {
    // Add UTF-8 BOM (Byte Order Mark) for proper Thai character display in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + content;
    
    // Create blob with proper MIME type and encoding
    const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}

// Notification settings
// function notificationSettings() {
//     // Removed - notifications not used
// }


// Save profile settings
function saveProfileSettings() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in saveProfileSettings');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    if (!window.firebaseDb) {
        console.error('Firebase Firestore not initialized in saveProfileSettings');
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณารีเฟรชหน้าเว็บ');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        showWarning('กรุณาเข้าสู่ระบบก่อน');
        return;
    }

    const displayName = document.getElementById('displayName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();

    window.firebaseDb.collection('users').doc(userId).update({
        displayName: displayName,
        phoneNumber: phoneNumber,
        updatedAt: new Date()
    }).then(function() {
        showSuccess('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
        // Update header name
        document.getElementById('userName').textContent = displayName || 'ผู้ใช้';
    }).catch(function(error) {
        console.error('Error saving profile:', error);
        showError('เกิดข้อผิดพลาดในการบันทึก');
    });
}

// Manage debtors
function manageDebtors() {
    // Remove focus from any elements in modals before showing alert
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    showInfo('ฟีเจอร์จัดการลูกหนี้จะเปิดใช้งานเร็วๆ นี้');
}

// Payment History Functions
let paymentHistoryData = [];
let filteredPaymentHistory = [];
let currentPaymentHistoryPage = 1;
const paymentHistoryPerPage = 10;

// Show payment history content
function showPaymentHistory() {
    // Remove focus from any elements in modals before showing payment history
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    hideAllContent();
    const paymentHistoryContent = document.getElementById('payment-history-content');
    if (paymentHistoryContent) {
        paymentHistoryContent.classList.remove('hidden');
        
        // Force a reflow to ensure the element is visible
        paymentHistoryContent.offsetHeight;
    } else {
        console.error('Payment history content element not found');
        createFallbackContent('payment-history-content', 'ประวัติการชำระ');
    }
    updateActiveNavLink('#payment-history');
    
    // Check if user is authenticated before loading payment history
    const currentUser = window.firebaseAuth?.currentUser;
    if (currentUser) {
        // Populate debtor filter first (in case we have debts data but no payment history)
        populateDebtorFilter();
        loadPaymentHistory();
    } else {
        // Wait for authentication to be ready
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(function(user) {
                if (user) {
                    // Populate debtor filter first
                    populateDebtorFilter();
                    loadPaymentHistory();
                } else {
                    sessionStorage.setItem('isRedirecting', 'true');
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 100);
                }
            });
        } else {
            console.error('Firebase Auth not available');
            showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ');
        }
    }
}

// Load payment history data
function loadPaymentHistory() {
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase Auth not initialized in loadPaymentHistory');
        return;
    }
    
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        console.error('User ID is undefined in loadPaymentHistory - waiting for authentication');
        // Wait for authentication to be ready
        if (window.firebaseAuth.currentUser === null) {
            // User is not logged in, redirect to login
            sessionStorage.setItem('isRedirecting', 'true');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 100);
            return;
        } else {
            // Firebase is still initializing, wait a bit and try again
            setTimeout(() => {
                loadPaymentHistory();
            }, 1000);
            return;
        }
    }

    // Show loading state
    const tableBody = document.getElementById('paymentHistoryTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">กำลังโหลด...</span>
                    </div>
                    <p class="mt-2">กำลังโหลดประวัติการชำระ...</p>
                </td>
            </tr>
        `;
    }

    // Get all debts for this creditor
    window.firebaseDb.collection('debts').where('creditorId', '==', userId).get()
        .then(function(querySnapshot) {
            paymentHistoryData = [];
            
            
            querySnapshot.forEach(function(doc) {
                const debtData = doc.data();
                const paymentHistory = debtData.paymentHistory || [];
                
                
                // Add each payment to the history data
                paymentHistory.forEach(function(payment, index) {
                    // Generate readable codes
                    const debtCode = generateDebtCode(doc.id, debtData);
                    const paymentCode = payment.paymentCode || generatePaymentCode(payment.id || `${doc.id}_${Date.now()}`, { paymentDate: payment.date });
                    
                    // Ensure we have a unique payment ID for deletion
                    const paymentId = payment.id || payment.paymentId || payment.timestamp || `${doc.id}_payment_${index}_${Date.now()}`;
                    
                    paymentHistoryData.push({
                        debtId: doc.id,
                        paymentId: paymentId,
                        debtorName: debtData.debtorName || 'ไม่ระบุชื่อ',
                        paymentDate: payment.date,
                        amount: payment.amount,
                        installmentNumber: payment.installmentNumber,
                        note: payment.note || '',
                        debtDescription: debtData.description || '',
                        debtCode: debtCode,
                        paymentCode: paymentCode
                    });
                });
            });
            
            
            // Sort by payment date (newest first)
            paymentHistoryData.sort((a, b) => {
                const dateA = a.paymentDate ? new Date(a.paymentDate.toDate()) : new Date(0);
                const dateB = b.paymentDate ? new Date(b.paymentDate.toDate()) : new Date(0);
                return dateB - dateA;
            });
            
            // Populate debtor filter
            populateDebtorFilter();
            
            // Apply current filter
            applyPaymentHistoryFilter();
            
            // Show message if no payment history found
            if (paymentHistoryData.length === 0) {
                // No payment history found for user
                const tableBody = document.getElementById('paymentHistoryTableBody');
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-5">
                                <i class="fas fa-receipt fa-3x text-muted mb-3"></i>
                                <h5 class="text-muted">ยังไม่มีประวัติการชำระ</h5>
                                <p class="text-muted">เมื่อมีการชำระเงินจะแสดงที่นี่</p>
                            </td>
                        </tr>
                    `;
                }
                
                // Update mobile cards for empty state
                createPaymentHistoryMobileCards();
            }
        })
        .catch(function(error) {
            console.error('Error loading payment history:', error);
            const tableBody = document.getElementById('paymentHistoryTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                            <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                        </td>
                    </tr>
                `;
            }
            
            // Update mobile cards for error state
            const mobileContainer = document.getElementById('paymentHistoryMobileCards');
            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                    </div>
                `;
            }
            
            // Still try to populate debtor filter even on error
            populateDebtorFilter();
        });
}

// Populate debtor filter dropdown
function populateDebtorFilter() {
    // Get both filterDebtor elements (dashboard and payment history)
    const debtorFilters = document.querySelectorAll('#filterDebtor, #filterDebtorPayment');
    if (debtorFilters.length === 0) return;
    
    // Get unique debtors from payment history data
    let debtors = [...new Set(paymentHistoryData.map(payment => payment.debtorName))];
    
    // If no payment history data, get debtors from all debts data
    if (debtors.length === 0 && allDebtsData && allDebtsData.length > 0) {
        debtors = [...new Set(allDebtsData.map(debt => debt.debtorName || debt.debtorEmail || 'ไม่ระบุชื่อ'))];
    }
    
    // Update all filterDebtor elements
    debtorFilters.forEach(debtorFilter => {
        // Clear existing options except "ทั้งหมด"
        debtorFilter.innerHTML = '<option value="">ทั้งหมด</option>';
        
        // Add debtor options
        debtors.forEach(debtor => {
            if (debtor && debtor.trim() !== '') {
                const option = document.createElement('option');
                option.value = debtor;
                option.textContent = debtor;
                debtorFilter.appendChild(option);
            }
        });
        
        // If still no debtors, show message
        if (debtors.length === 0) {
            debtorFilter.innerHTML = '<option value="">ไม่มีข้อมูลลูกหนี้</option>';
        }
    });
    
}

// Apply payment history filter
function applyPaymentHistoryFilter() {
    // Get the payment history filterDebtor element
    const debtorFilterElement = document.getElementById('filterDebtorPayment');
    const debtorFilter = debtorFilterElement ? debtorFilterElement.value : '';
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const amountFilter = document.getElementById('filterAmount').value;
    
    // Filter data
    filteredPaymentHistory = paymentHistoryData.filter(payment => {
        // Debtor filter
        if (debtorFilter && payment.debtorName !== debtorFilter) {
            return false;
        }
        
        // Date filter
        if (dateFrom || dateTo) {
            const paymentDate = payment.paymentDate ? new Date(payment.paymentDate.toDate()) : new Date(0);
            const paymentDateStr = paymentDate.toISOString().split('T')[0];
            
            if (dateFrom && paymentDateStr < dateFrom) {
                return false;
            }
            if (dateTo && paymentDateStr > dateTo) {
                return false;
            }
        }
        
        // Amount filter
        if (amountFilter) {
            const amount = payment.amount || 0;
            switch (amountFilter) {
                case '0-1000':
                    if (amount < 0 || amount > 1000) return false;
                    break;
                case '1000-5000':
                    if (amount < 1000 || amount > 5000) return false;
                    break;
                case '5000-10000':
                    if (amount < 5000 || amount > 10000) return false;
                    break;
                case '10000+':
                    if (amount < 10000) return false;
                    break;
            }
        }
        
        return true;
    });
    
    // Update statistics
    updatePaymentHistoryStats();
    
    // Reset to first page
    currentPaymentHistoryPage = 1;
    
    // Display filtered data
    displayPaymentHistoryTable();
    
    // Update mobile cards
    createPaymentHistoryMobileCards();
}

// Clear payment history filter
function clearPaymentHistoryFilter() {
    // Clear payment history filterDebtor element
    const debtorFilter = document.getElementById('filterDebtorPayment');
    if (debtorFilter) debtorFilter.value = '';
    
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterAmount').value = '';
    
    // Reset filtered data to all data
    filteredPaymentHistory = [...paymentHistoryData];
    
    // Update statistics
    updatePaymentHistoryStats();
    
    // Reset to first page
    currentPaymentHistoryPage = 1;
    
    // Display data
    displayPaymentHistoryTable();
    
    // Update mobile cards
    createPaymentHistoryMobileCards();
}

// Update payment history statistics
function updatePaymentHistoryStats() {
    const totalPayments = filteredPaymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalPaymentCount = filteredPaymentHistory.length;
    const activeDebtors = new Set(filteredPaymentHistory.map(payment => payment.debtorName)).size;
    const avgPaymentAmount = totalPaymentCount > 0 ? totalPayments / totalPaymentCount : 0;
    
    document.getElementById('totalPayments').textContent = totalPayments.toLocaleString();
    document.getElementById('totalPaymentCount').textContent = totalPaymentCount.toLocaleString();
    document.getElementById('activeDebtors').textContent = activeDebtors.toLocaleString();
    document.getElementById('avgPaymentAmount').textContent = avgPaymentAmount.toFixed(2);
}

// Display payment history table
// ตัวแปรสำหรับเก็บ DataTable instance
let mainPaymentHistoryDataTable = null;

function displayPaymentHistoryTable() {
    // ลบ DataTable เดิมถ้ามี
    if (mainPaymentHistoryDataTable) {
        mainPaymentHistoryDataTable.destroy();
        mainPaymentHistoryDataTable = null;
    }
    
    if (filteredPaymentHistory.length === 0) {
        // สร้าง DataTable แบบง่ายสำหรับกรณีไม่มีข้อมูล
        mainPaymentHistoryDataTable = $('#mainPaymentHistoryTable').DataTable({
            data: [],
            responsive: false, // ปิด responsive เพื่อไม่ให้เกิด scroll bar
            scrollX: false, // ปิดการ scroll แนวนอน
            scrollY: false, // ปิดการ scroll แนวตั้ง
            language: {
                "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
                "zeroRecords": "ไม่พบประวัติการชำระ",
                "info": "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
                "infoEmpty": "แสดง 0 ถึง 0 จาก 0 รายการ",
                "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
                "search": "ค้นหา:",
                "paginate": {
                    "first": "หน้าแรก",
                    "last": "หน้าสุดท้าย",
                    "next": "ถัดไป",
                    "previous": "ก่อนหน้า"
                }
            },
            pageLength: 10,
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "ทั้งหมด"]],
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>'
        });
        return;
    }
    
    // เตรียมข้อมูลสำหรับ DataTables
    const tableData = filteredPaymentHistory.map(payment => {
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate.toDate()).toLocaleDateString('th-TH') : '-';
        
        return [
            `<code>${payment.paymentCode || 'P25680906-0001'}</code>`,
            paymentDate,
            `<strong>${payment.debtorName}</strong><br><small class="text-muted">${payment.debtDescription}</small>`,
            `<span class="badge bg-info">งวดที่ ${payment.installmentNumber || '-'}</span>`,
            `<strong class="text-success">฿${payment.amount.toFixed(2)}</strong>`,
            payment.note || '-',
            `<button class="btn btn-sm btn-outline-danger" onclick="deletePaymentRecord('${payment.debtId}', '${payment.paymentId || payment.timestamp}')">
                <i class="fas fa-trash me-1"></i>ลบ
            </button>`
        ];
    });
    
    // สร้าง DataTable ใหม่
    mainPaymentHistoryDataTable = $('#mainPaymentHistoryTable').DataTable({
        data: tableData,
        responsive: false, // ปิด responsive เพื่อไม่ให้เกิด scroll bar
        scrollX: false, // ปิดการ scroll แนวนอน
        scrollY: false, // ปิดการ scroll แนวตั้ง
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบประวัติการชำระ",
            "info": "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
            "infoEmpty": "แสดง 0 ถึง 0 จาก 0 รายการ",
            "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
            "search": "ค้นหา:",
            "paginate": {
                "first": "หน้าแรก",
                "last": "หน้าสุดท้าย",
                "next": "ถัดไป",
                "previous": "ก่อนหน้า"
            }
        },
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "ทั้งหมด"]],
        order: [[0, 'desc']], // เรียงตามวันที่ใหม่สุดก่อน
        columnDefs: [
            {
                targets: 4, // คอลัมน์จำนวนเงิน
                className: 'text-end'
            },
            {
                targets: 6, // คอลัมน์การดำเนินการ
                orderable: false,
                searchable: false
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        initComplete: function() {
            // ซ่อน loading state ถ้ามี
            const loadingElement = document.querySelector('#mainPaymentHistoryTable_processing');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // สร้าง mobile cards ด้วย
            createPaymentHistoryMobileCards();
        }
    });
}

// Update payment history pagination (ไม่จำเป็นแล้วเพราะ DataTables จัดการให้เอง)
function updatePaymentHistoryPagination() {
    // ฟังก์ชันนี้ไม่จำเป็นแล้วเพราะ DataTables จัดการ pagination ให้เอง
    return;
}

// สร้าง mobile cards สำหรับ payment history
function createPaymentHistoryMobileCards() {
    const mobileContainer = document.getElementById('paymentHistoryMobileCards');
    if (!mobileContainer) {
        // Payment history mobile container not found
        return;
    }
    
    // ล้างเนื้อหาเดิม
    mobileContainer.innerHTML = '';
    
    
    if (filteredPaymentHistory.length === 0) {
        mobileContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-receipt fa-2x mb-2"></i>
                <p>ไม่พบประวัติการชำระ</p>
            </div>
        `;
        return;
    }
    
    // สร้าง cards สำหรับแต่ละ payment
    filteredPaymentHistory.forEach((payment, index) => {
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate.toDate()).toLocaleDateString('th-TH') : '-';
        const shortDebtId = payment.debtId.substring(0, 8) + '...';
        
        const card = document.createElement('div');
        card.className = 'payment-card';
        card.innerHTML = `
            <div class="payment-card-header">
                <div class="payment-date">
                    <i class="fas fa-calendar-alt me-1"></i>
                    ${paymentDate}
                </div>
                <div class="payment-amount">
                    ฿${payment.amount.toFixed(2)}
                </div>
            </div>
            
            <div class="payment-details">
                <div class="payment-detail-row">
                    <span class="payment-detail-label">ลูกหนี้:</span>
                    <span class="payment-detail-value"><strong>${payment.debtorName}</strong></span>
                </div>
                <div class="payment-detail-row">
                    <span class="payment-detail-label">รหัสหนี้:</span>
                    <span class="payment-detail-value"><code>${payment.debtCode || shortDebtId}</code></span>
                </div>
                <div class="payment-detail-row">
                    <span class="payment-detail-label">รหัสการชำระ:</span>
                    <span class="payment-detail-value"><code>${payment.paymentCode || 'P25680906-0001'}</code></span>
                </div>
                <div class="payment-detail-row">
                    <span class="payment-detail-label">งวดที่:</span>
                    <span class="payment-detail-value">
                        <span class="badge bg-info">งวดที่ ${payment.installmentNumber || '-'}</span>
                    </span>
                </div>
                <div class="payment-detail-row">
                    <span class="payment-detail-label">หมายเหตุ:</span>
                    <span class="payment-detail-value">${payment.note || '-'}</span>
                </div>
            </div>
            
            <div class="payment-actions">
                <button class="btn btn-sm btn-outline-danger" onclick="deletePaymentRecord('${payment.debtId}', '${payment.paymentId || payment.timestamp}')">
                    <i class="fas fa-trash me-1"></i>ลบ
                </button>
            </div>
        `;
        
        mobileContainer.appendChild(card);
    });
    
}

// ฟังก์ชันสำหรับ refresh mobile cards เมื่อมีการเปลี่ยนแปลง
function refreshPaymentHistoryMobileCards() {
    createPaymentHistoryMobileCards();
}

// เพิ่ม event listener สำหรับการ resize หน้าจอ
window.addEventListener('resize', function() {
    // เรียกใช้ mobile cards เมื่อเปลี่ยนขนาดหน้าจอ
    if (typeof createPaymentHistoryMobileCards === 'function') {
        createPaymentHistoryMobileCards();
    }
});

// Change payment history page (ไม่จำเป็นแล้วเพราะ DataTables จัดการให้เอง)
function changePaymentHistoryPage(page) {
    // ฟังก์ชันนี้ไม่จำเป็นแล้วเพราะ DataTables จัดการ pagination ให้เอง
    return;
}

// Refresh payment history
function refreshPaymentHistory() {
    loadPaymentHistory();
}

// Download payment history report
function downloadPaymentHistoryReport() {
    if (filteredPaymentHistory.length === 0) {
        showWarning('ไม่มีข้อมูลการชำระสำหรับดาวน์โหลด');
        return;
    }
    
    // Create CSV content with proper Thai encoding
    const headers = ['รหัสการชำระ', 'วันที่ชำระ', 'ชื่อลูกหนี้', 'งวดที่', 'จำนวนเงิน', 'หมายเหตุ'];
    const rows = filteredPaymentHistory.map(payment => {
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate.toDate()).toLocaleDateString('th-TH') : '-';
        return [
            payment.paymentCode || 'P25680906-0001',
            paymentDate,
            payment.debtorName,
            payment.installmentNumber || '-',
            payment.amount.toFixed(2),
            payment.note || '-'
        ];
    });
    
    // Create CSV content with proper escaping for Thai characters
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => {
            // Escape commas, quotes, and newlines in cell content
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(','))
        .join('\n');
    
    const filename = `ประวัติการชำระ_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Use the improved downloadCSV function
    downloadCSV(csvContent, filename);
    
    showSuccess('ดาวน์โหลดรายงานประวัติการชำระเรียบร้อยแล้ว');
}

// Logout function
function logout() {
    const isRedirecting = sessionStorage.getItem('isRedirecting');
    if (isRedirecting) {
        return; // Prevent multiple logout attempts
    }
    
    sessionStorage.setItem('isRedirecting', 'true');
    
    // Check if Firebase is initialized
    if (!window.firebaseAuth) {
        console.error('Firebase not initialized for logout');
        sessionStorage.removeItem('isRedirecting');
        // Redirect to login page anyway
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 100);
        return;
    }
    
    window.firebaseAuth.signOut().then(function() {
        // Clear localStorage and sessionStorage
        localStorage.removeItem('userType');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('isRedirecting');
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 100);
    }).catch(function(error) {
        console.error('Error signing out:', error);
        sessionStorage.removeItem('isRedirecting'); // Reset flag on error
        showError('เกิดข้อผิดพลาดในการออกจากระบบ');
    });
}

// Helper function to safely remove focus from modal elements
function removeFocusFromModal(modalElement) {
    if (!modalElement) return;
    
    const focusedElement = document.activeElement;
    if (focusedElement && modalElement.contains(focusedElement)) {
        focusedElement.blur();
    }
    
    // Also remove focus from any focusable elements inside the modal
    const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusableElements.forEach(element => {
        if (element === document.activeElement) {
            element.blur();
        }
    });
}

// Close add debt modal properly
function closeAddDebtModal() {
    // Debug log removed
    
    const addDebtModal = document.getElementById('addDebtModal');
    if (!addDebtModal) {
        // Debug log removed
        return;
    }
    
    try {
        // Remove focus from any elements in the modal
        removeFocusFromModal(addDebtModal);
        
        // Try Bootstrap modal first
        const bootstrapModal = bootstrap.Modal.getInstance(addDebtModal);
        if (bootstrapModal) {
            // Debug log removed
            bootstrapModal.hide();
        } else {
            // Debug log removed
            // Manual cleanup if Bootstrap instance not found
            addDebtModal.classList.remove('show');
            addDebtModal.style.display = 'none';
            addDebtModal.setAttribute('aria-hidden', 'true');
            addDebtModal.removeAttribute('aria-modal');
            addDebtModal.removeAttribute('role');
            
            // Remove modal backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // Clean up body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        
        // Reset form
        const form = document.getElementById('addDebtForm');
        if (form) {
            form.reset();
        }
        
        // Clear selected debtor
        clearSelectedDebtor();
        
        // Reset modal title and button
        const modalTitle = document.getElementById('addDebtModalLabel');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>เพิ่มหนี้ใหม่';
        }
        
        const submitBtn = document.querySelector('#addDebtModal .btn-warning');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-edit me-1"></i>อัปเดต';
            submitBtn.onclick = updateExistingDebt;
        }
        
        // รีเซ็ตตัวแปร global
        window.currentEditingDebtId = null;
        
        // Debug log removed
        
    } catch (error) {
        console.error('Error closing add debt modal:', error);
        // Fallback to force cleanup
        forceModalCleanup('addDebtModal');
    }
}

// Comprehensive modal cleanup function to prevent black screen issues
function forceModalCleanup(modalId) {
    // Debug log removed
    
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        // Debug log removed
        return;
    }
    
    try {
        // Remove all modal-related classes
        modalElement.classList.remove('show', 'fade');
        modalElement.style.display = 'none';
        
        // Remove modal attributes
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        modalElement.removeAttribute('role');
        modalElement.removeAttribute('tabindex');
        
        // Remove all modal backdrops (there might be multiple)
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach((backdrop, index) => {
            // Debug log removed
            backdrop.remove();
        });
        
        // Clean up body classes and styles
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Remove any remaining modal-related styles
        const styleSheets = document.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
            try {
                const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) {
                        const rule = rules[j];
                        if (rule.selectorText && rule.selectorText.includes('modal-open')) {
                            // Debug log removed
                        }
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets will throw an error
                continue;
            }
        }
        
        // Force remove focus from modal
        removeFocusFromModal(modalElement);
        
        // Try to destroy Bootstrap modal instance if it exists
        try {
            const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
            if (bootstrapModal) {
                // Debug log removed
                bootstrapModal.dispose();
            }
        } catch (e) {
            // Debug log removed
        }
        
        // Debug log removed
        
    } catch (error) {
        console.error('Error during modal cleanup:', error);
    }
}

// Initialize modal accessibility
function initializeModalAccessibility() {
    // Handle all modals including dynamically created ones
    const modalIds = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    
    modalIds.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            return;
        }
        
        // Set initial accessibility attributes
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        
        // Add event listeners for proper accessibility management
        modalElement.addEventListener('shown.bs.modal', function() {
            // Hide all other modals from accessibility tree when this modal is shown
            modalIds.forEach(otherModalId => {
                if (otherModalId !== modalId) {
                    const otherModal = document.getElementById(otherModalId);
                    if (otherModal) {
                        otherModal.setAttribute('aria-hidden', 'true');
                        otherModal.removeAttribute('aria-modal');
                        otherModal.setAttribute('inert', '');
                        
                        // Remove focus from any elements inside other modals
                        removeFocusFromModal(otherModal);
                    }
                }
            });
            
            // Ensure modal is accessible when shown
            modalElement.removeAttribute('aria-hidden');
            modalElement.setAttribute('aria-modal', 'true');
            modalElement.removeAttribute('inert');
            
            // Set proper backdrop behavior
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.setAttribute('aria-hidden', 'true');
                backdrop.setAttribute('inert', '');
            }
            
            // Focus the first focusable element in the modal
            const firstFocusable = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        });
        
        modalElement.addEventListener('hidden.bs.modal', function() {
            // Ensure modal is properly hidden from accessibility tree when closed
            modalElement.setAttribute('aria-hidden', 'true');
            modalElement.removeAttribute('aria-modal');
            modalElement.setAttribute('inert', '');
            
            // Remove focus from any elements inside the modal
            removeFocusFromModal(modalElement);
            
            // Restore focus to the element that opened the modal (if available)
            const triggerElement = document.querySelector('[data-bs-target="#' + modalId + '"], [href="#' + modalId + '"]');
            if (triggerElement) {
                setTimeout(() => {
                    triggerElement.focus();
                }, 100);
            }
            
            // Clean up backdrop accessibility
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.removeAttribute('aria-hidden');
                backdrop.removeAttribute('inert');
            }
        });
        
        // Handle close button focus management
        const closeButtons = modalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Ensure proper focus management when closing
                setTimeout(() => {
                    removeFocusFromModal(modalElement);
                }, 100);
            });
        });
        
        // Handle keyboard navigation to prevent focus from escaping modal
        modalElement.addEventListener('keydown', function(event) {
            if (event.key === 'Tab') {
                const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            } else if (event.key === 'Escape') {
                // Close modal with ESC key
                const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
        });
    });
}

// Debtor Search Functions
function searchRegisteredDebtors() {
    const searchInput = document.getElementById('debtorSearchInput');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showWarning('กรุณากรอกคำค้นหา');
        return;
    }
    
    if (!window.firebaseDb) {
        showError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
        return;
    }
    
    // Show loading state
    const resultsContainer = document.getElementById('debtorSearchResults');
    const searchList = document.getElementById('debtorSearchList');
    resultsContainer.style.display = 'block';
    searchList.innerHTML = '<div class="p-3 text-center"><i class="fas fa-spinner fa-spin me-2"></i>กำลังค้นหา...</div>';
    
    // Search in users collection for debtors
    const usersRef = window.firebaseDb.collection('users')
        .where('userType', '==', 'debtor');
    
    usersRef.get().then(function(querySnapshot) {
        const results = [];
        
        querySnapshot.forEach(function(doc) {
            const userData = doc.data();
            const userName = userData.name || userData.displayName || '';
            const userPhone = userData.phoneNumber || userData.phone || '';
            
            // Check if search term matches name or phone
            if (userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                userPhone.includes(searchTerm)) {
                results.push({
                    id: doc.id,
                    name: userName,
                    phone: userPhone,
                    email: userData.email || ''
                });
            }
        });
        
        // Display results
        displayDebtorSearchResults(results);
        
    }).catch(function(error) {
        console.error('Error searching for debtors:', error);
        searchList.innerHTML = '<div class="p-3 text-center text-danger">เกิดข้อผิดพลาดในการค้นหา</div>';
    });
}

function displayDebtorSearchResults(results) {
    const searchList = document.getElementById('debtorSearchList');
    const resultsContainer = document.getElementById('debtorSearchResults');
    
    if (results.length === 0) {
        searchList.innerHTML = '<div class="p-3 text-center text-muted">ไม่พบลูกหนี้ที่ตรงกับคำค้นหา</div>';
        return;
    }
    
    let html = '';
    results.forEach(function(debtor) {
        html += `
            <div class="list-group-item list-group-item-action" onclick="selectDebtorFromSearch('${debtor.id}', '${debtor.name}', '${debtor.phone}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${debtor.name}</strong>
                        <br>
                        <small class="text-muted">${debtor.phone}</small>
                    </div>
                    <i class="fas fa-chevron-right text-muted"></i>
                </div>
            </div>
        `;
    });
    
    searchList.innerHTML = html;
}

function selectDebtorFromSearch(debtorId, debtorName, debtorPhone) {
    // Update the form fields
    document.getElementById('debtorName').value = debtorName;
    document.getElementById('debtorPhone').value = debtorPhone;
    
    // Store selected debtor info
    window.selectedDebtorId = debtorId;
    
    // Show selected debtor info
    document.getElementById('selectedDebtorName').textContent = debtorName;
    document.getElementById('selectedDebtorPhone').textContent = debtorPhone;
    document.getElementById('selectedDebtorInfo').style.display = 'block';
    
    // Hide search results
    document.getElementById('debtorSearchResults').style.display = 'none';
    
    // Clear search input
    document.getElementById('debtorSearchInput').value = '';
    
    // Focus on the form
    document.getElementById('debtAmount').focus();
}

function clearDebtorSearch() {
    document.getElementById('debtorSearchInput').value = '';
    document.getElementById('debtorSearchResults').style.display = 'none';
    document.getElementById('selectedDebtorInfo').style.display = 'none';
    window.selectedDebtorId = null;
}

function clearSelectedDebtor() {
    document.getElementById('debtorName').value = '';
    document.getElementById('debtorPhone').value = '';
    document.getElementById('selectedDebtorInfo').style.display = 'none';
    window.selectedDebtorId = null;
}

// Add event listener for Enter key in search input
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('debtorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchRegisteredDebtors();
            }
        });
    }
});

// Make functions globally available
window.searchRegisteredDebtors = searchRegisteredDebtors;
window.selectDebtorFromSearch = selectDebtorFromSearch;
window.clearDebtorSearch = clearDebtorSearch;
window.clearSelectedDebtor = clearSelectedDebtor;

// ==================== CHART FUNCTIONS ====================

// Initialize charts
function initializeCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    try {
        createDebtStatusChart();
        createMonthlyDebtChart();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Create debt status pie chart
function createDebtStatusChart() {
    const ctx = document.getElementById('debtStatusChart');
    if (!ctx) {
        console.error('debtStatusChart canvas element not found');
        return;
    }

    // Destroy existing chart if it exists
    if (debtStatusChart) {
        try {
            debtStatusChart.destroy();
        } catch (error) {
            console.error('Error destroying existing debt status chart:', error);
        }
    }

    try {
        debtStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ชำระแล้ว', 'คงเหลือ'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        '#198754', // success green - paid
                        '#dc3545'  // danger red - remaining
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Noto Sans Thai, sans-serif',
                                size: 12
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ฿${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating debt status chart:', error);
    }
}

// Create monthly debt line chart
function createMonthlyDebtChart() {
    const ctx = document.getElementById('monthlyDebtChart');
    if (!ctx) {
        console.error('monthlyDebtChart canvas element not found');
        return;
    }

    // Destroy existing chart if it exists
    if (monthlyDebtChart) {
        try {
            monthlyDebtChart.destroy();
        } catch (error) {
            console.error('Error destroying existing monthly debt chart:', error);
        }
    }

    // Get last 6 months
    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push(date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));
    }

    try {
        monthlyDebtChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'จำนวนหนี้ใหม่',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#1e3a8a',
                    backgroundColor: 'rgba(30, 58, 138, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'จำนวนหนี้ที่ชำระแล้ว',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Noto Sans Thai, sans-serif',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} รายการ`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Noto Sans Thai, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Noto Sans Thai, sans-serif'
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    } catch (error) {
        console.error('Error creating monthly debt chart:', error);
    }
}

// Update charts with real data
function updateCharts(debtsData) {
    if (!debtsData || !Array.isArray(debtsData)) {
        console.error('Invalid debts data for charts update');
        return;
    }
    
    try {
        updateDebtStatusChart(debtsData);
        updateMonthlyDebtChart(debtsData);
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Update debt status chart
function updateDebtStatusChart(debtsData) {
    if (!debtStatusChart) {
        console.error('debtStatusChart is not initialized');
        return;
    }

    let totalDebtAmount = 0;
    let totalPaidAmount = 0;

    debtsData.forEach(debt => {
        try {
            const debtAmount = parseFloat(debt.amount) || parseFloat(debt.totalAmount) || 0;
            totalDebtAmount += debtAmount;
            
            // Calculate paid amount from payment history
            if (debt.paymentHistory && Array.isArray(debt.paymentHistory)) {
                const paidAmount = debt.paymentHistory.reduce((sum, payment) => {
                    return sum + (parseFloat(payment.amount) || 0);
                }, 0);
                totalPaidAmount += paidAmount;
            }
        } catch (error) {
            console.error('Error processing debt data:', error, debt);
        }
    });

    const remainingAmount = totalDebtAmount - totalPaidAmount;

    try {
        debtStatusChart.data.datasets[0].data = [
            totalPaidAmount,
            remainingAmount
        ];
        
        // Update labels with percentages
        const paidPercentage = totalDebtAmount > 0 ? ((totalPaidAmount / totalDebtAmount) * 100).toFixed(1) : 0;
        const remainingPercentage = totalDebtAmount > 0 ? ((remainingAmount / totalDebtAmount) * 100).toFixed(1) : 0;
        
        debtStatusChart.data.labels = [
            `ชำระแล้ว (${paidPercentage}%)`,
            `คงเหลือ (${remainingPercentage}%)`
        ];
    } catch (error) {
        console.error('Error updating debt status chart data:', error);
    }

    try {
        debtStatusChart.update('none'); // Use 'none' mode for better performance
    } catch (error) {
        console.error('Error updating debt status chart:', error);
    }
}

// Update monthly debt chart
function updateMonthlyDebtChart(debtsData) {
    if (!monthlyDebtChart) {
        console.error('monthlyDebtChart is not initialized');
        return;
    }

    const monthlyData = {
        newDebts: [0, 0, 0, 0, 0, 0],
        paidDebts: [0, 0, 0, 0, 0, 0]
    };

    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);

    debtsData.forEach(debt => {
        try {
            const debtDate = debt.createdAt ? new Date(debt.createdAt.toDate ? debt.createdAt.toDate() : debt.createdAt) : new Date();
            const paidDate = debt.paidAt ? new Date(debt.paidAt.toDate ? debt.paidAt.toDate() : debt.paidAt) : null;

            // Count new debts by month
            if (debtDate >= sixMonthsAgo) {
                const monthIndex = 5 - Math.floor((currentDate - debtDate) / (1000 * 60 * 60 * 24 * 30));
                if (monthIndex >= 0 && monthIndex < 6) {
                    monthlyData.newDebts[monthIndex]++;
                }
            }

            // Count paid debts by month
            if (paidDate && paidDate >= sixMonthsAgo) {
                const monthIndex = 5 - Math.floor((currentDate - paidDate) / (1000 * 60 * 60 * 24 * 30));
                if (monthIndex >= 0 && monthIndex < 6) {
                    monthlyData.paidDebts[monthIndex]++;
                }
            }
        } catch (error) {
            console.error('Error processing debt date:', error, debt);
        }
    });

    try {
        monthlyDebtChart.data.datasets[0].data = monthlyData.newDebts;
        monthlyDebtChart.data.datasets[1].data = monthlyData.paidDebts;
    } catch (error) {
        console.error('Error updating monthly debt chart data:', error);
    }

    try {
        monthlyDebtChart.update('none'); // Use 'none' mode for better performance
    } catch (error) {
        console.error('Error updating monthly debt chart:', error);
    }
}

// Make chart functions globally available
window.initializeCharts = initializeCharts;
window.updateCharts = updateCharts;
window.createDebtStatusChart = createDebtStatusChart;
window.createMonthlyDebtChart = createMonthlyDebtChart;
window.updateDebtStatusChart = updateDebtStatusChart;
window.updateMonthlyDebtChart = updateMonthlyDebtChart;

// Chart filter variables
let allDebtsData = [];
let filteredDebtsData = [];
let currentFilters = {
    dateFrom: '',
    dateTo: '',
    status: '',
    amountRange: '',
    debtor: ''
};

// Initialize chart filters
function initializeChartFilters() {
    // Set default date range (last 6 months)
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    
    document.getElementById('filterDateFrom').value = sixMonthsAgo.toISOString().split('T')[0];
    document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
}

// Load debtor options for filter
function loadDebtorFilterOptions() {
    // Get dashboard filterDebtor element
    const debtorSelect = document.getElementById('filterDebtor');
    if (!debtorSelect) {
        console.warn('Debtor filter select element not found');
        return;
    }
    
    // Check if we have data
    if (!allDebtsData || allDebtsData.length === 0) {
        console.warn('No debts data available for debtor filter - will retry when data is loaded');
        // Show loading message instead of error
        debtorSelect.innerHTML = '<option value="">กำลังโหลดข้อมูล...</option>';
        
        // Retry after a short delay if data might still be loading
        setTimeout(() => {
            if (allDebtsData && allDebtsData.length > 0) {
                loadDebtorFilterOptions();
            } else {
                debtorSelect.innerHTML = '<option value="">ไม่มีข้อมูลหนี้</option>';
            }
        }, 1000);
        return;
    }
    
    // Get unique debtors from all debts data
    const debtors = [...new Set(allDebtsData.map(debt => debt.debtorName || debt.debtorEmail || 'ไม่ระบุชื่อ'))];
    
    // Clear existing options except "ทั้งหมด"
    debtorSelect.innerHTML = '<option value="">ทั้งหมด</option>';
    
    // Add debtor options
    debtors.forEach(debtor => {
        if (debtor && debtor.trim() !== '') {
            const option = document.createElement('option');
            option.value = debtor;
            option.textContent = debtor;
            debtorSelect.appendChild(option);
        }
    });
    
}

// Apply chart filters
function applyChartFilters() {
    try {
        // Get filter values
        currentFilters.dateFrom = document.getElementById('filterDateFrom').value;
        currentFilters.dateTo = document.getElementById('filterDateTo').value;
        currentFilters.status = document.getElementById('filterStatus').value;
        currentFilters.amountRange = document.getElementById('filterAmountRange').value;
        
        // Get debtor filter value from the dashboard filterDebtor element
        const debtorFilterElement = document.getElementById('filterDebtor');
        currentFilters.debtor = debtorFilterElement ? debtorFilterElement.value : '';
        
        // Filter the data
        filteredDebtsData = allDebtsData.filter(debt => {
            // Date filter
            if (currentFilters.dateFrom || currentFilters.dateTo) {
                const debtDate = debt.createdAt ? new Date(debt.createdAt.toDate ? debt.createdAt.toDate() : debt.createdAt) : new Date();
                const fromDate = currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : null;
                const toDate = currentFilters.dateTo ? new Date(currentFilters.dateTo) : null;
                
                if (fromDate && debtDate < fromDate) return false;
                if (toDate && debtDate > toDate) return false;
            }
            
            // Status filter
            if (currentFilters.status && debt.status !== currentFilters.status) {
                return false;
            }
            
            // Amount range filter
            if (currentFilters.amountRange) {
                const amount = parseFloat(debt.amount) || parseFloat(debt.totalAmount) || 0;
                const [min, max] = currentFilters.amountRange.split('-');
                
                if (max === '+') {
                    if (amount <= parseFloat(min)) return false;
                } else {
                    if (amount < parseFloat(min) || amount > parseFloat(max)) return false;
                }
            }
            
            // Debtor filter
            if (currentFilters.debtor) {
                const debtorName = debt.debtorName || debt.debtorEmail || 'ไม่ระบุชื่อ';
                if (debtorName !== currentFilters.debtor) return false;
            }
            
            return true;
        });
        
        // Update charts with filtered data
        updateCharts(filteredDebtsData);
        
        // Show filter summary
        showFilterSummary();
        
    } catch (error) {
        console.error('Error applying chart filters:', error);
        showError('เกิดข้อผิดพลาดในการกรองข้อมูล');
    }
}

// Clear all filters
function clearChartFilters() {
    try {
        // Reset filter inputs
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterAmountRange').value = '';
        
        // Clear dashboard filterDebtor element
        const debtorFilter = document.getElementById('filterDebtor');
        if (debtorFilter) debtorFilter.value = '';
        
        // Clear filter variables
        currentFilters = {
            dateFrom: '',
            dateTo: '',
            status: '',
            amountRange: '',
            debtor: ''
        };
        
        // Reset to show all data
        filteredDebtsData = [...allDebtsData];
        updateCharts(filteredDebtsData);
        
        // Hide filter summary
        hideFilterSummary();
        
        showSuccess('ล้างฟิลเตอร์เรียบร้อยแล้ว');
        
    } catch (error) {
        console.error('Error clearing chart filters:', error);
        showError('เกิดข้อผิดพลาดในการล้างฟิลเตอร์');
    }
}

// Show filter summary
function showFilterSummary() {
    const activeFilters = Object.values(currentFilters).filter(value => value !== '').length;
    if (activeFilters > 0) {
        // You can add a filter summary display here
    }
}

// Hide filter summary
function hideFilterSummary() {
    // Hide filter summary display
}


// Make filter functions globally available
window.initializeChartFilters = initializeChartFilters;
window.applyChartFilters = applyChartFilters;
window.clearChartFilters = clearChartFilters;

// Add chart functions to the main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            try {
                initializeCharts();
            } catch (error) {
                console.error('Error initializing charts on DOM ready:', error);
            }
        } else {
            console.warn('Chart.js not loaded, charts will not be available');
        }
    }, 500);
});

// Add window resize handler for responsive charts
window.addEventListener('resize', function() {
    // Debounce resize events
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        if (debtStatusChart) {
            try {
                debtStatusChart.resize();
            } catch (error) {
                console.error('Error resizing debt status chart:', error);
            }
        }
        if (monthlyDebtChart) {
            try {
                monthlyDebtChart.resize();
            } catch (error) {
                console.error('Error resizing monthly debt chart:', error);
            }
        }
    }, 250);
});

// Add chart cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (debtStatusChart) {
        try {
            debtStatusChart.destroy();
        } catch (error) {
            console.error('Error destroying debt status chart on unload:', error);
        }
    }
    if (monthlyDebtChart) {
        try {
            monthlyDebtChart.destroy();
        } catch (error) {
            console.error('Error destroying monthly debt chart on unload:', error);
        }
    }
});

// Add chart refresh function for manual updates
window.refreshCharts = function() {
    try {
        if (typeof Chart !== 'undefined') {
            initializeCharts();
        }
    } catch (error) {
        console.error('Error refreshing charts:', error);
    }
};

// Add chart export function for saving chart images
window.exportChartAsImage = function(chartType) {
    try {
        let chart = null;
        let filename = '';
        
        if (chartType === 'status') {
            chart = debtStatusChart;
            filename = 'debt-status-chart.png';
        } else if (chartType === 'monthly') {
            chart = monthlyDebtChart;
            filename = 'monthly-debt-chart.png';
        }
        
        if (chart) {
            const canvas = chart.canvas;
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
        } else {
            showWarning('กราฟยังไม่พร้อมใช้งาน');
        }
    } catch (error) {
        console.error('Error exporting chart:', error);
        showError('เกิดข้อผิดพลาดในการส่งออกกราฟ');
    }
};

// Add chart data export function for CSV
window.exportChartData = function(chartType) {
    try {
        let chart = null;
        let filename = '';
        let data = [];
        
        if (chartType === 'status') {
            chart = debtStatusChart;
            filename = 'debt-status-data.csv';
            if (chart && chart.data) {
                data.push(['สถานะ', 'จำนวนรายการ']);
                chart.data.labels.forEach((label, index) => {
                    data.push([label, chart.data.datasets[0].data[index]]);
                });
            }
        } else if (chartType === 'monthly') {
            chart = monthlyDebtChart;
            filename = 'monthly-debt-data.csv';
            if (chart && chart.data) {
                data.push(['เดือน', 'จำนวนหนี้ใหม่', 'จำนวนหนี้ที่ชำระแล้ว']);
                chart.data.labels.forEach((label, index) => {
                    data.push([
                        label,
                        chart.data.datasets[0].data[index],
                        chart.data.datasets[1].data[index]
                    ]);
                });
            }
        }
        
        if (data.length > 0) {
            const csvContent = data.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        } else {
            showWarning('ไม่มีข้อมูลสำหรับส่งออก');
        }
    } catch (error) {
        console.error('Error exporting chart data:', error);
        showError('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
};

// Add chart print function
window.printChart = function(chartType) {
    try {
        let chart = null;
        let title = '';
        
        if (chartType === 'status') {
            chart = debtStatusChart;
            title = 'กราฟสถานะหนี้';
        } else if (chartType === 'monthly') {
            chart = monthlyDebtChart;
            title = 'กราฟหนี้รายเดือน';
        }
        
        if (chart) {
            const canvas = chart.canvas;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Noto Sans Thai', sans-serif; text-align: center; }
                        img { max-width: 100%; height: auto; }
                        h1 { color: #1e3a8a; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <img src="${canvas.toDataURL()}" alt="${title}">
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        } else {
            showWarning('กราฟยังไม่พร้อมใช้งาน');
        }
    } catch (error) {
        console.error('Error printing chart:', error);
        showError('เกิดข้อผิดพลาดในการพิมพ์กราฟ');
    }
};

// Add chart fullscreen function
window.toggleChartFullscreen = function(chartType) {
    try {
        let chart = null;
        let title = '';
        
        if (chartType === 'status') {
            chart = debtStatusChart;
            title = 'กราฟสถานะหนี้';
        } else if (chartType === 'monthly') {
            chart = monthlyDebtChart;
            title = 'กราฟหนี้รายเดือน';
        }
        
        if (chart) {
            const canvas = chart.canvas;
            const fullscreenWindow = window.open('', '_blank', 'width=800,height=600');
            fullscreenWindow.document.write(`
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { 
                            font-family: 'Noto Sans Thai', sans-serif; 
                            text-align: center; 
                            margin: 0; 
                            padding: 20px; 
                            background-color: #f8f9fa;
                        }
                        img { 
                            max-width: 100%; 
                            height: auto; 
                            border: 1px solid #dee2e6;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { 
                            color: #1e3a8a; 
                            margin-bottom: 20px; 
                        }
                        .close-btn {
                            position: fixed;
                            top: 10px;
                            right: 10px;
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            font-size: 18px;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <button class="close-btn" onclick="window.close()">×</button>
                    <h1>${title}</h1>
                    <img src="${canvas.toDataURL()}" alt="${title}">
                </body>
                </html>
            `);
            fullscreenWindow.document.close();
        } else {
            showWarning('กราฟยังไม่พร้อมใช้งาน');
        }
    } catch (error) {
        console.error('Error opening chart in fullscreen:', error);
        showError('เกิดข้อผิดพลาดในการเปิดกราฟแบบเต็มหน้าจอ');
    }
};

// Add chart refresh function for manual updates
window.refreshCharts = function() {
    try {
        if (typeof Chart !== 'undefined') {
            initializeCharts();
            // Reload dashboard data to update charts
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error refreshing charts:', error);
    }
};

// Add chart auto-refresh function
window.startChartAutoRefresh = function(interval = 30000) { // Default 30 seconds
    try {
        if (window.chartAutoRefreshInterval) {
            clearInterval(window.chartAutoRefreshInterval);
        }
        
        window.chartAutoRefreshInterval = setInterval(() => {
            try {
                loadDashboardData();
            } catch (error) {
                console.error('Error in chart auto-refresh:', error);
            }
        }, interval);
        
        // Debug log removed
    } catch (error) {
        console.error('Error starting chart auto-refresh:', error);
    }
};

// Add chart auto-refresh stop function
window.stopChartAutoRefresh = function() {
    try {
        if (window.chartAutoRefreshInterval) {
            clearInterval(window.chartAutoRefreshInterval);
            window.chartAutoRefreshInterval = null;
            // Debug log removed
        }
    } catch (error) {
        console.error('Error stopping chart auto-refresh:', error);
    }
};

// Add chart auto-refresh toggle function
window.toggleChartAutoRefresh = function() {
    try {
        if (window.chartAutoRefreshInterval) {
            stopChartAutoRefresh();
            return false; // Auto-refresh is now off
        } else {
            startChartAutoRefresh();
            return true; // Auto-refresh is now on
        }
    } catch (error) {
        console.error('Error toggling chart auto-refresh:', error);
        return false;
    }
};

// Add chart auto-refresh status check function
window.isChartAutoRefreshActive = function() {
    return !!window.chartAutoRefreshInterval;
};

// Add chart auto-refresh interval change function
window.setChartAutoRefreshInterval = function(interval) {
    try {
        if (window.chartAutoRefreshInterval) {
            stopChartAutoRefresh();
            startChartAutoRefresh(interval);
        }
    } catch (error) {
        console.error('Error setting chart auto-refresh interval:', error);
    }
};

// Add chart auto-refresh status indicator
window.updateChartAutoRefreshStatus = function() {
    try {
        const isActive = isChartAutoRefreshActive();
        const statusElement = document.getElementById('chartAutoRefreshStatus');
        if (statusElement) {
            statusElement.textContent = isActive ? 'เปิด' : 'ปิด';
            statusElement.className = isActive ? 'text-success' : 'text-muted';
        }
    } catch (error) {
        console.error('Error updating chart auto-refresh status:', error);
    }
};

// Add chart auto-refresh toggle button
window.toggleChartAutoRefreshButton = function() {
    try {
        const isActive = toggleChartAutoRefresh();
        const buttonElement = document.getElementById('chartAutoRefreshButton');
        if (buttonElement) {
            buttonElement.innerHTML = isActive ? 
                '<i class="fas fa-pause"></i> หยุดอัปเดตอัตโนมัติ' : 
                '<i class="fas fa-play"></i> เริ่มอัปเดตอัตโนมัติ';
            buttonElement.className = isActive ? 
                'btn btn-sm btn-outline-warning' : 
                'btn btn-sm btn-outline-success';
        }
        updateChartAutoRefreshStatus();
    } catch (error) {
        console.error('Error toggling chart auto-refresh button:', error);
    }
};

// Add chart auto-refresh interval selector
window.setChartAutoRefreshIntervalFromSelect = function() {
    try {
        const selectElement = document.getElementById('chartAutoRefreshInterval');
        if (selectElement) {
            const interval = parseInt(selectElement.value);
            setChartAutoRefreshInterval(interval);
        }
    } catch (error) {
        console.error('Error setting chart auto-refresh interval from select:', error);
    }
};

// Remove duplicate chart auto-refresh interval selectors
window.removeDuplicateChartAutoRefreshSelectors = function() {
    try {
        const statusContainer = document.querySelector('.d-flex.align-items-center.gap-2');
        if (statusContainer) {
            // หา select elements ทั้งหมดที่มี id chartAutoRefreshInterval
            const selectors = statusContainer.querySelectorAll('select[id="chartAutoRefreshInterval"]');
            
            // ถ้ามีมากกว่า 1 ตัว ให้ลบตัวที่เหลือออก (เก็บแค่ตัวแรก)
            if (selectors.length > 1) {
                for (let i = 1; i < selectors.length; i++) {
                    const parentDiv = selectors[i].closest('.d-flex.align-items-center.gap-1');
                    if (parentDiv) {
                        parentDiv.remove();
                    }
                }
                // Debug log removed
            }
        }
    } catch (error) {
        console.error('Error removing duplicate chart auto-refresh interval selectors:', error);
    }
};

// Add chart auto-refresh interval selector HTML
window.addChartAutoRefreshIntervalSelector = function() {
    try {
        // ลบตัวเลือกที่ซ้ำออกก่อน
        removeDuplicateChartAutoRefreshSelectors();
        
        const statusContainer = document.querySelector('.d-flex.align-items-center.gap-2');
        if (statusContainer) {
            // ตรวจสอบว่ามี interval selector อยู่แล้วหรือไม่
            const existingSelector = document.getElementById('chartAutoRefreshInterval');
            if (existingSelector) {
                return;
            }
            
            const intervalSelector = document.createElement('div');
            intervalSelector.className = 'd-flex align-items-center gap-1';
            intervalSelector.innerHTML = `
                <small class="text-muted">ช่วงเวลา:</small>
                <select id="chartAutoRefreshInterval" class="form-select form-select-sm" style="width: auto;" onchange="setChartAutoRefreshIntervalFromSelect()">
                    <option value="10000">10 วินาที</option>
                    <option value="30000" selected>30 วินาที</option>
                    <option value="60000">1 นาที</option>
                    <option value="300000">5 นาที</option>
                </select>
            `;
            statusContainer.appendChild(intervalSelector);
        }
    } catch (error) {
        console.error('Error adding chart auto-refresh interval selector:', error);
    }
};
