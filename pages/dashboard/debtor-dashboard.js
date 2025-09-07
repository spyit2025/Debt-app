// JavaScript แดชบอร์ดลูกหนี้
let isInitialized = false;
let isDataLoaded = false;
let isRedirecting = false;
let eventListenersSetup = false;

document.addEventListener('DOMContentLoaded', function() {
    
    if (isInitialized) return;
    isInitialized = true;
    
    // ล้าง redirect flag เมื่อโหลดหน้าใหม่
    sessionStorage.removeItem('isRedirecting');
    
    // ตรวจสอบการยืนยันตัวตน
    checkAuth();
    
    // ตั้งค่า event listeners ด้วยการหน่วงเวลาเพื่อให้แน่ใจว่า DOM พร้อม
    setTimeout(() => {
        setupEventListeners();
    }, 100);
    
    // ทำให้ฟังก์ชันทั้งหมดใช้งานได้ทั่วโลก
    window.logout = logout;
    window.makePayment = makePayment;
    window.downloadReport = downloadReport;
    window.notificationSettings = notificationSettings;
    window.requestHelp = requestHelp;
    window.viewDebtDetails = viewDebtDetails;
    window.viewPaymentDetails = viewPaymentDetails;
    window.saveSettings = saveSettings;
    window.submitPayment = submitPayment;
    window.showPaymentHistoryModal = showPaymentHistoryModal;
    
    // ตรวจสอบ URL hash และนำทางตามนั้น
    const hash = window.location.hash || '#dashboard';
    
    
    // ตรวจสอบว่าส่วนเนื้อหามีอยู่
    const sections = ['dashboard-content', 'my-debts-content', 'history-content', 'settings-content'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) {
            if (window.logger) {
                window.logger.error('✗ ไม่พบส่วน:', sectionId);
            }
        }
    });
    
    // บังคับแสดงเนื้อหาแดชบอร์ดในตอนแรก
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.style.setProperty('display', 'block', 'important');
        dashboardContent.style.setProperty('visibility', 'visible', 'important');
        dashboardContent.style.setProperty('opacity', '1', 'important');
        dashboardContent.classList.add('force-show');
    }
    
    // เพิ่ม CSS เพื่อควบคุมการแสดงผลส่วนเนื้อหา
    const style = document.createElement('style');
    style.textContent = `
        /* Content sections visibility control */
        .content-section {
            display: none;
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .content-section.active,
        .force-show {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Initially show dashboard content - only when no other section is active */
        #dashboard-content:not(.hidden) {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Hide dashboard content when other sections are active */
        #dashboard-content.hidden {
            display: none !important;
        }
        
        /* Hide other content sections initially */
        #my-debts-content,
        #payments-content,
        #history-content,
        #settings-content {
            display: none;
        }
        
        /* Ensure content sections are properly positioned */
        #dashboard-content,
        #my-debts-content,
        #payments-content,
        #history-content,
        #settings-content {
            position: relative;
            z-index: 1;
            min-height: 400px;
        }
    `;
    document.head.appendChild(style);
    
    handleNavigation(hash);
    
    // การสำรองสำหรับ event listeners เพิ่มเติม
    setTimeout(() => {
        if (document.querySelectorAll('header .nav-link').length === 0 && document.querySelectorAll('.nav-link').length > 0) {
            setupEventListeners();
        }
    }, 500);
    
    // ฟังการเปลี่ยนแปลง hash
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash || '#dashboard';
        handleNavigation(hash);
    });
});

// ตรวจสอบว่าผู้ใช้ยืนยันตัวตนและเป็นลูกหนี้หรือไม่
function checkAuth() {
    window.firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
            isDataLoaded = false; // รีเซ็ตแฟล็กข้อมูลที่โหลดแล้วสำหรับผู้ใช้ใหม่
            // ตรวจสอบว่าผู้ใช้เป็นลูกหนี้หรือไม่
            checkUserType(user.uid);
        } else {
            isDataLoaded = false;
            // เปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบหากไม่ยืนยันตัวตน
            if (!isRedirecting) {
                isRedirecting = true;
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 100);
            }
        }
    });
}

// ตรวจสอบประเภทผู้ใช้จาก Firestore
function checkUserType(userId) {
    if (isDataLoaded || isRedirecting) return; // ป้องกันการโหลดและเปลี่ยนเส้นทางหลายครั้ง
    
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.userType === 'debtor') {
                    // อัปเดตชื่อผู้ใช้ในส่วนหัว - ใช้ชื่อจริงจาก userData
                    const displayName = userData.displayName || userData.name || userData.email || 'ลูกหนี้';
                    document.getElementById('userName').textContent = displayName;
                    
                    // อัปเดตชื่อใน mobile menu ด้วย
                    const mobileUserName = document.getElementById('mobileUserName');
                    if (mobileUserName) {
                        mobileUserName.textContent = displayName;
                    }
                    
                    // โหลดข้อมูลแดชบอร์ด
                    loadDashboardData();
                    isDataLoaded = true; // ทำเครื่องหมายว่าโหลดแล้ว
                } else {
                    // เปลี่ยนเส้นทางไปแดชบอร์ดที่เหมาะสม
                    if (userData.userType === 'creditor' && !isRedirecting) {
                        isRedirecting = true;
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            window.location.href = 'creditor-dashboard.html';
                        }, 100);
                    } else if (!isRedirecting) {
                        isRedirecting = true;
                        sessionStorage.setItem('isRedirecting', 'true');
                        setTimeout(() => {
                            window.location.href = '../../index.html';
                        }, 100);
                    }
                }
            } else {
                if (window.logger) {
                    window.logger.error('ไม่พบเอกสารผู้ใช้');
                }
                if (!isRedirecting) {
                    isRedirecting = true;
                    sessionStorage.setItem('isRedirecting', 'true');
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 100);
                }
            }
        })
        .catch(function(error) {
            if (window.logger) {
                window.logger.error('ข้อผิดพลาดในการตรวจสอบประเภทผู้ใช้:', error);
            }
            if (!isRedirecting) {
                isRedirecting = true;
                sessionStorage.setItem('isRedirecting', 'true');
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 100);
            }
        });
}

// โหลดสถิติแดชบอร์ด
function loadDashboardData() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) return;

    // Get user data to find phone number
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            if (!userPhone && !userData.email) {
                return;
            }
            
            // Get debts collection for this debtor using phone number or email
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
            }
    
    debtsRef.get().then(function(querySnapshot) {
        
        
        let totalDebt = 0;
        let paidAmount = 0;
        let pendingDebts = 0;
        let overdueDebts = 0;
        
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            const debtAmount = debt.amount || 0;
            totalDebt += debtAmount;
            
            // คำนวณยอดที่ชำระแล้วจาก payment history
            const paymentHistory = debt.paymentHistory || [];
            const totalPaid = paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            paidAmount += totalPaid;
            
            // นับสถานะหนี้
            if (debt.status === 'paid') {
                // หนี้ที่ชำระครบแล้ว
            } else if (debt.status === 'pending' || debt.status === 'partial') {
                // ตรวจสอบว่าหมดกำหนดหรือไม่
                if (debt.dueDate && new Date(debt.dueDate.toDate()) < new Date()) {
                    overdueDebts++;
                } else {
                    pendingDebts++;
                }
            }
        });
        
        
        // อัปเดตสถิติ
        document.getElementById('debtorTotalDebt').textContent = totalDebt.toLocaleString();
        document.getElementById('paidAmount').textContent = paidAmount.toLocaleString();
        document.getElementById('debtorPendingDebts').textContent = pendingDebts;
        document.getElementById('debtorOverdueDebts').textContent = overdueDebts;
         
         // อัปเดตกราฟ
         updateAllCharts();
         }).catch(function(error) {
             if (window.logger) {
                 window.logger.error('Error loading dashboard data:', error);
             }
         });
     }).catch(function(error) {
         if (window.logger) {
             window.logger.error('Error loading user data:', error);
         }
     });
}



// ตัวแปรสำหรับเก็บ DataTable instance
let debtsDataTable = null;

// โหลดหนี้ทั้งหมดของผู้ใช้ (สำหรับหน้าหนี้ของฉัน)
function loadAllUserDebts() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) return;

    // Get user data to find phone number
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            if (!userPhone && !userData.email) {
                return;
            }
            
            // Get debts collection for this debtor using phone number or email
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
            }
    
    debtsRef.orderBy('createdAt', 'desc').get().then(function(querySnapshot) {
        
        // Handle desktop DataTable view
        const debtsTableBody = document.getElementById('debtsTableBody');
        const allDebtsList = document.getElementById('allDebtsList');
        
        if (querySnapshot.empty) {
            // Show empty state for both desktop and mobile
            if (debtsTableBody) {
                debtsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2"></i><br>ยังไม่มีหนี้ในระบบ</td></tr>';
            }
            if (allDebtsList) {
                allDebtsList.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">ยังไม่มีหนี้ในระบบ</h5>
                        <p class="text-muted">เมื่อมีหนี้ใหม่จะแสดงที่นี่</p>
                    </div>
                `;
            }
            return;
        }
        
        // Prepare data for DataTable
        const debtsData = [];
        const mobileDebts = [];
        
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            const debtId = doc.id;
            
            // Data for DataTable - ตรวจสอบให้แน่ใจว่ามี 5 คอลัมน์
            const dueDate = debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : '-';
            const status = getStatusBadge(debt.status);
            
            const rowData = [
                debt.creditorName || 'ไม่ระบุชื่อเจ้าหนี้',
                debt.description || 'ไม่มีคำอธิบาย',
                status,
                `฿${(debt.amount || 0).toLocaleString()}`,
                dueDate
            ];
            
            // ตรวจสอบว่าข้อมูลครบถ้วน
            if (rowData.length === 5) {
                debtsData.push(rowData);
            } else {
                console.error('Debts row data has incorrect number of columns:', rowData.length, 'Expected: 5');
                console.error('Row data:', rowData);
            }
            
            // Data for mobile view
            const debtItem = createDebtItem(debtId, debt);
            mobileDebts.push(debtItem);
        });
        
        
        // Update desktop DataTable
        if (debtsTableBody) {
            // รอให้ jQuery โหลดเสร็จก่อนเรียกใช้ DataTable
            if (typeof $ !== 'undefined') {
                updateDebtsDataTable(debtsData);
            } else {
                // รอ jQuery โหลดเสร็จ
                const checkjQuery = setInterval(() => {
                    if (typeof $ !== 'undefined') {
                        clearInterval(checkjQuery);
                        updateDebtsDataTable(debtsData);
                    }
                }, 100);
                
                // หยุดการรอหลังจาก 5 วินาที
                setTimeout(() => {
                    clearInterval(checkjQuery);
                    if (typeof $ === 'undefined') {
                        console.error('jQuery failed to load within 5 seconds');
                    }
                }, 5000);
            }
        }
        
        // Update mobile view
        if (allDebtsList) {
            allDebtsList.innerHTML = '';
            mobileDebts.forEach(item => {
                allDebtsList.appendChild(item);
            });
        }
        }).catch(function(error) {
            console.error('Error loading all debts:', error);
        });
    }).catch(function(error) {
        console.error('Error loading user data:', error);
    });
}

// อัปเดต DataTable สำหรับหนี้
function updateDebtsDataTable(data) {
    // ตรวจสอบว่า jQuery โหลดแล้วหรือไม่
    if (typeof $ === 'undefined') {
        console.error('jQuery is not loaded. DataTable cannot be initialized.');
        return;
    }
    
    // ลบ DataTable เดิมถ้ามี
    if (debtsDataTable) {
        debtsDataTable.destroy();
        debtsDataTable = null;
    }
    
    // สร้าง DataTable ใหม่
    if (window.dataTablesInit && window.dataTablesInit.isDataTableInitialized('debtsTable')) {
        window.dataTablesInit.destroyDataTable('debtsTable');
    }
    
    // ตรวจสอบว่าข้อมูลมีคอลัมน์ครบถ้วนหรือไม่
    if (data.length > 0 && data[0].length !== 5) {
        console.error('Debts data has incorrect number of columns:', data[0].length, 'Expected: 5');
        return;
    }
    
    debtsDataTable = $('#debtsTable').DataTable({
        data: data,
        responsive: true,
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
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
        order: [[3, 'desc']], // เรียงตามจำนวนเงินมากสุดก่อน
        columnDefs: [
            {
                targets: 3, // คอลัมน์จำนวนเงิน
                className: 'text-end'
            },
            {
                targets: 4, // คอลัมน์วันครบกำหนด
                className: 'text-end'
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        initComplete: function() {
            // ซ่อน loading state ถ้ามี
            const loadingElement = document.querySelector('#debtsTable_processing');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    });
}

// โหลดประวัติการชำระเงิน
function loadPaymentHistory() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) return;

    // Get user data to find phone number
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            if (!userPhone && !userData.email) {
                return;
            }
            
            // Get debts collection for this debtor using phone number or email
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
            }
    
    debtsRef.orderBy('createdAt', 'desc').get().then(function(querySnapshot) {
        
        // Handle desktop DataTable view
        const paymentHistoryTableBody = document.getElementById('paymentHistoryTableBody');
        const paymentHistoryList = document.getElementById('paymentHistoryList');
        
        if (querySnapshot.empty) {
            // Show empty state for both desktop and mobile
            if (paymentHistoryTableBody) {
                paymentHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-history fa-2x mb-2"></i><br>ยังไม่มีประวัติการชำระเงิน</td></tr>';
            }
            if (paymentHistoryList) {
                paymentHistoryList.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-history fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">ยังไม่มีประวัติการชำระเงิน</h5>
                        <p class="text-muted">เมื่อมีการชำระเงินจะแสดงที่นี่</p>
                    </div>
                `;
            }
            return;
        }
        
        // Collect all payment history from all debts
        let allPayments = [];
        
        querySnapshot.forEach(function(doc) {
            const debt = doc.data();
            const paymentHistory = debt.paymentHistory || [];
            
            paymentHistory.forEach(function(payment) {
                allPayments.push({
                    debtId: doc.id,
                    debtDescription: debt.description || 'ไม่ระบุรายละเอียด',
                    creditorName: debt.creditorName || 'ไม่ระบุชื่อเจ้าหนี้',
                    ...payment
                });
            });
        });
        
        // Sort payments by date (newest first)
        allPayments.sort((a, b) => {
            const dateA = a.date ? new Date(a.date.toDate ? a.date.toDate() : a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date.toDate ? b.date.toDate() : b.date) : new Date(0);
            return dateB - dateA;
        });
        
        if (allPayments.length === 0) {
            // Show empty state for both desktop and mobile
            if (paymentHistoryTableBody) {
                paymentHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fas fa-history fa-2x mb-2"></i><br>ยังไม่มีประวัติการชำระเงิน</td></tr>';
            }
            if (paymentHistoryList) {
                paymentHistoryList.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-history fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">ยังไม่มีประวัติการชำระเงิน</h5>
                        <p class="text-muted">เมื่อมีการชำระเงินจะแสดงที่นี่</p>
                    </div>
                `;
            }
            return;
        }
        
        // Prepare data for DataTable
        const paymentHistoryData = [];
        const mobilePayments = [];
        
        allPayments.forEach(function(payment) {
            const paymentDate = payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date).toLocaleDateString('th-TH') : '-';
            const paymentTime = payment.time || (payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'}) : '00:00');
            
            // Data for DataTable - ตรวจสอบให้แน่ใจว่ามี 5 คอลัมน์
            const rowData = [
                payment.debtDescription || 'ไม่ระบุรายละเอียด',
                payment.creditorName || 'ไม่ระบุชื่อเจ้าหนี้',
                '<span class="badge bg-success">ชำระแล้ว</span>',
                `฿${(payment.amount || 0).toLocaleString()}`,
                `${paymentDate} ${paymentTime}`
            ];
            
            // ตรวจสอบว่าข้อมูลครบถ้วน
            if (rowData.length === 5) {
                paymentHistoryData.push(rowData);
            } else {
                console.error('Payment history row data has incorrect number of columns:', rowData.length, 'Expected: 5');
                console.error('Row data:', rowData);
            }
            
            // Data for mobile view
            const paymentItem = createPaymentHistoryItem(payment.debtId, payment);
            mobilePayments.push(paymentItem);
        });
        
        
        // Update desktop DataTable
        if (paymentHistoryTableBody) {
            // รอให้ jQuery โหลดเสร็จก่อนเรียกใช้ DataTable
            if (typeof $ !== 'undefined') {
                updatePaymentHistoryDataTable(paymentHistoryData);
            } else {
                // รอ jQuery โหลดเสร็จ
                const checkjQuery = setInterval(() => {
                    if (typeof $ !== 'undefined') {
                        clearInterval(checkjQuery);
                        updatePaymentHistoryDataTable(paymentHistoryData);
                    }
                }, 100);
                
                // หยุดการรอหลังจาก 5 วินาที
                setTimeout(() => {
                    clearInterval(checkjQuery);
                    if (typeof $ === 'undefined') {
                        console.error('jQuery failed to load within 5 seconds');
                    }
                }, 5000);
            }
        }
        
        // Update mobile view
        if (paymentHistoryList) {
            paymentHistoryList.innerHTML = '';
            mobilePayments.forEach(item => {
                paymentHistoryList.appendChild(item);
            });
        }
        }).catch(function(error) {
            console.error('Error loading payment history:', error);
        });
    }).catch(function(error) {
        console.error('Error loading user data:', error);
    });
}

// อัปเดต DataTable สำหรับประวัติการชำระเงิน
function updatePaymentHistoryDataTable(data) {
    // ตรวจสอบว่า jQuery โหลดแล้วหรือไม่
    if (typeof $ === 'undefined') {
        console.error('jQuery is not loaded. DataTable cannot be initialized.');
        return;
    }
    
    // ลบ DataTable เดิมถ้ามี
    if (paymentHistoryDataTable) {
        paymentHistoryDataTable.destroy();
        paymentHistoryDataTable = null;
    }
    
    // สร้าง DataTable ใหม่
    if (window.dataTablesInit && window.dataTablesInit.isDataTableInitialized('paymentHistoryTable')) {
        window.dataTablesInit.destroyDataTable('paymentHistoryTable');
    }
    
    // ตรวจสอบว่าข้อมูลมีคอลัมน์ครบถ้วนหรือไม่
    if (data.length > 0 && data[0].length !== 5) {
        console.error('Payment history data has incorrect number of columns:', data[0].length, 'Expected: 5');
        return;
    }
    
    paymentHistoryDataTable = $('#paymentHistoryTable').DataTable({
        data: data,
        responsive: true,
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
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
        order: [[4, 'desc']], // เรียงตามวันที่ใหม่สุดก่อน
        columnDefs: [
            {
                targets: 3, // คอลัมน์จำนวนเงิน
                className: 'text-end'
            },
            {
                targets: 4, // คอลัมน์วันที่ชำระ
                className: 'text-end'
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        initComplete: function() {
            // ซ่อน loading state ถ้ามี
            const loadingElement = document.querySelector('#modalPaymentHistoryTable_processing');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    });
}

// สร้างรายการประวัติการชำระเงิน
function createPaymentHistoryItem(debtId, payment) {
    const paymentItem = document.createElement('div');
    paymentItem.className = 'debt-item';
    
    const paymentDate = payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date).toLocaleDateString('th-TH') : '-';
    const paymentTime = payment.time || (payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'}) : '00:00');
    
    paymentItem.innerHTML = `
        <div class="debt-item-content">
            <div class="debt-avatar">
                <div class="creditor-avatar">
                    <i class="fas fa-credit-card"></i>
                </div>
            </div>
            <div class="debt-info">
                <h6 class="mb-1">${payment.debtDescription || 'ไม่ระบุรายละเอียด'}</h6>
                <small class="text-muted">เจ้าหนี้: ${payment.creditorName || 'ไม่ระบุชื่อเจ้าหนี้'}</small>
            </div>
            <div class="debt-status">
                <span class="badge bg-success">ชำระแล้ว</span>
            </div>
            <div class="debt-amount">
                <strong>฿${payment.amount?.toLocaleString() || '0'}</strong>
            </div>
            <div class="debt-date">
                <small class="text-muted">${paymentDate} ${paymentTime}</small>
            </div>
            <div class="debt-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="showPaymentHistoryModal('${debtId}')">
                    <i class="fas fa-credit-card me-1"></i>ดูประวัติ
                </button>
            </div>
        </div>
    `;
    
    return paymentItem;
}

// สร้างองค์ประกอบรายการหนี้
function createDebtItem(debtId, debt) {
    const debtItem = document.createElement('div');
    debtItem.className = 'debt-item';
    
    const dueDate = debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : '-';
    const status = getStatusBadge(debt.status);
    
    // Get creditor initial for avatar
    const creditorName = debt.creditorName || 'ไม่ระบุชื่อเจ้าหนี้';
    const creditorInitial = creditorName.charAt(0).toUpperCase();
    
    debtItem.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-1">
                <div class="creditor-avatar">
                    <span class="creditor-initial">${creditorInitial}</span>
                </div>
            </div>
            <div class="col-md-3">
                <h6 class="mb-1">${creditorName}</h6>
                <small class="text-muted">${debt.description || 'ไม่มีคำอธิบาย'}</small>
            </div>
            <div class="col-md-2">
                ${status}
            </div>
            <div class="col-md-2 text-end">
                <strong>฿${debt.amount?.toLocaleString() || '0'}</strong>
            </div>
            <div class="col-md-2 text-end">
                <small class="text-muted">${dueDate}</small>
            </div>
        </div>
    `;
    
    return debtItem;
}

// รับสัญลักษณ์สถานะ
function getStatusBadge(status) {
    switch (status) {
        case 'paid':
            return '<span class="badge bg-success">ชำระแล้ว</span>';
        case 'pending':
            return '<span class="badge bg-warning">รอชำระ</span>';
        case 'overdue':
            return '<span class="badge bg-danger">เกินกำหนด</span>';
        case 'partial':
            return '<span class="badge bg-info">ชำระบางส่วน</span>';
        default:
            return '<span class="badge bg-secondary">ไม่ระบุ</span>';
    }
}

/// View debt details
function viewDebtDetails(debtId) {
    if (!debtId) {
        console.error('Debt ID is required');
        showError('เกิดข้อผิดพลาด: ไม่พบรหัสหนี้');
        return;
    }
    
    if (!window.firebaseAuth || !window.firebaseDb) {
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ');
        return;
    }
    
    showDebtDetailsModal(debtId);
    
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                populateDebtDetailsModal(doc.data(), debtId);
            } else {
                showWarning('ไม่พบข้อมูลหนี้');
                hideDebtDetailsModal();
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            showError('เกิดข้อผิดพลาด');
            hideDebtDetailsModal();
        });
}

/// View payment details
function viewPaymentDetails(paymentId) {
    if (!paymentId) {
        console.error('Payment ID is required');
        showError('เกิดข้อผิดพลาด: ไม่พบรหัสการชำระเงิน');
        return;
    }
    
    if (!window.firebaseAuth || !window.firebaseDb) {
        showError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อระบบ');
        return;
    }
    
    showPaymentDetailsModal(paymentId);
    
    window.firebaseDb.collection('payments').doc(paymentId).get()
        .then(function(doc) {
            if (doc.exists) {
                populatePaymentDetailsModal(doc.data(), paymentId);
            } else {
                showError('ไม่พบข้อมูลการชำระเงิน');
                hidePaymentDetailsModal();
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            showError('เกิดข้อผิดพลาด');
            hidePaymentDetailsModal();
        });
}

// แสดงโมดัลรายละเอียดการชำระเงิน
function showPaymentDetailsModal(paymentId) {
    // สร้างโมดัลถ้ายังไม่มี
    let modal = document.getElementById('paymentDetailsModal');
    if (!modal) {
        modal = createPaymentDetailsModal();
        document.body.appendChild(modal);
    }
    
    // แสดงโมดัล
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // แสดงสถานะกำลังโหลด
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">กำลังโหลด...</span>
                </div>
                <p class="mt-2">กำลังโหลดข้อมูลการชำระเงิน...</p>
            </div>
        `;
    }
}

// ซ่อนโมดัลรายละเอียดการชำระเงิน
function hidePaymentDetailsModal() {
    const modal = document.getElementById('paymentDetailsModal');
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }
}

// สร้างโมดัลรายละเอียดการชำระเงิน
function createPaymentDetailsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'paymentDetailsModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'paymentDetailsModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="paymentDetailsModalLabel">
                        <i class="fas fa-credit-card me-2"></i>รายละเอียดการชำระเงิน
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
                <div class="modal-footer d-flex justify-content-end align-items-center">
                    <div class="d-flex gap-2">
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

// เติมข้อมูลโมดัลรายละเอียดการชำระเงิน
function populatePaymentDetailsModal(paymentData, paymentId) {
    const modal = document.getElementById('paymentDetailsModal');
    if (!modal) return;
    
    const modalBody = modal.querySelector('.modal-body');
    
    if (!modalBody) return;
    
    // จัดรูปแบบวันที่
    const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    const createdAt = paymentData.createdAt ? new Date(paymentData.createdAt.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    const updatedAt = paymentData.updatedAt ? new Date(paymentData.updatedAt.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-info-circle me-2"></i>ข้อมูลการชำระเงิน
                </h6>
                <div class="mb-3">
                    <label class="form-label fw-bold">รหัสการชำระเงิน:</label>
                    <p class="text-muted">${paymentId}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">จำนวนเงิน:</label>
                    <p class="text-success fs-5">฿${paymentData.amount?.toLocaleString() || '0'}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">วันที่ชำระ:</label>
                    <p class="text-muted">${paymentDate}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">วิธีการชำระ:</label>
                    <p class="text-muted">${paymentData.paymentMethod || 'ไม่ระบุ'}</p>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-user me-2"></i>ข้อมูลผู้เกี่ยวข้อง
                </h6>
                <div class="mb-3">
                    <label class="form-label fw-bold">ชื่อลูกหนี้:</label>
                    <p class="text-muted">${paymentData.debtorName || 'ไม่ระบุ'}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">ชื่อเจ้าหนี้:</label>
                    <p class="text-muted">${paymentData.creditorName || 'ไม่ระบุ'}</p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">หมายเหตุ:</label>
                    <p class="text-muted">${paymentData.notes || 'ไม่มีหมายเหตุ'}</p>
                </div>
            </div>
        </div>
        <hr>
        <div class="row">
            <div class="col-12">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-clock me-2"></i>ข้อมูลระบบ
                </h6>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label fw-bold">วันที่สร้าง:</label>
                        <p class="text-muted">${createdAt}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold">วันที่อัปเดต:</label>
                        <p class="text-muted">${updatedAt}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// แสดงโมดัลรายละเอียดหนี้
function showDebtDetailsModal(debtId) {
    // สร้างโมดัลถ้ายังไม่มี
    let modal = document.getElementById('debtDetailsModal');
    if (!modal) {
        modal = createDebtDetailsModal();
        document.body.appendChild(modal);
    }
    
    // แสดงโมดัล
    // Remove focus from any elements before showing modal
    removeFocusFromModal(modal);
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // แสดงสถานะกำลังโหลด
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">กำลังโหลด...</span>
                </div>
                <p class="mt-2">กำลังโหลดข้อมูลหนี้...</p>
            </div>
        `;
    }
}

// ซ่อนโมดัลรายละเอียดหนี้
function hideDebtDetailsModal() {
    const modal = document.getElementById('debtDetailsModal');
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }
}

// สร้างโมดัลรายละเอียดหนี้
function createDebtDetailsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'debtDetailsModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'debtDetailsModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
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

// เติมข้อมูลโมดัลรายละเอียดหนี้
function populateDebtDetailsModal(debtData, debtId) {
    const modal = document.getElementById('debtDetailsModal');
    if (!modal) return;
    
         const modalBody = modal.querySelector('.modal-body');
     
     if (!modalBody) return;
    
    // จัดรูปแบบวันที่
    const createdAt = debtData.createdAt ? new Date(debtData.createdAt.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    const dueDate = debtData.dueDate ? new Date(debtData.dueDate.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    const updatedAt = debtData.updatedAt ? new Date(debtData.updatedAt.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    
    // รับสัญลักษณ์สถานะ
    const statusBadge = getStatusBadge(debtData.status);
    
    // คำนวณยอดคงเหลือ
    const totalAmount = debtData.totalAmount || debtData.amount || 0;
    const remainingAmount = debtData.remainingAmount || totalAmount;
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold mb-3">ข้อมูลหนี้</h6>
                <table class="table table-borderless">
                    <tr>
                        <td class="text-muted">เจ้าหนี้:</td>
                        <td>${debtData.creditorName || 'ไม่ระบุ'}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">คำอธิบาย:</td>
                        <td>${debtData.description || 'ไม่มีคำอธิบาย'}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">สถานะ:</td>
                        <td>${statusBadge}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">วันที่สร้าง:</td>
                        <td>${createdAt}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">วันครบกำหนด:</td>
                        <td>${dueDate}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">อัปเดตล่าสุด:</td>
                        <td>${updatedAt}</td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold mb-3">ข้อมูลการเงิน</h6>
                <table class="table table-borderless">
                    <tr>
                        <td class="text-muted">ยอดรวม:</td>
                        <td class="fw-bold">฿${totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">ยอดคงเหลือ:</td>
                        <td class="fw-bold text-primary">฿${remainingAmount.toLocaleString()}</td>
                    </tr>
                    ${debtData.principal ? `
                    <tr>
                        <td class="text-muted">ต้นเงิน:</td>
                        <td>฿${debtData.principal.toLocaleString()}</td>
                    </tr>
                    ` : ''}
                    ${debtData.interestRate ? `
                    <tr>
                        <td class="text-muted">อัตราดอกเบี้ย:</td>
                        <td>${debtData.interestRate}%</td>
                    </tr>
                    ` : ''}
                    ${debtData.installmentMonths ? `
                    <tr>
                        <td class="text-muted">จำนวนงวด:</td>
                        <td>${debtData.installmentMonths} งวด</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
        </div>
    `;
    
    
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

// ตั้งค่า event listeners
function setupEventListeners() {
    if (eventListenersSetup) {
        return;
    }
    
    // นำทางส่วนหัว - ใช้ตัวเลือกที่เฉพาะเจาะจงมากขึ้น
    const navLinks = document.querySelectorAll('header .nav-link');
    
    if (navLinks.length === 0) {
        // ลองใช้ตัวเลือกทางเลือก
        const altNavLinks = document.querySelectorAll('.nav-link');
        
                    altNavLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // จัดการการนำทาง (จะอัปเดต active class และ URL hash)
                    const href = this.getAttribute('href');
                    handleNavigation(href);
                });
            });
    } else {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // จัดการการนำทาง (จะอัปเดต active class และ URL hash)
                const href = this.getAttribute('href');
                handleNavigation(href);
            });
        });
    }
    
    // ปุ่มการดำเนินการด่วน
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const text = this.textContent.trim();
            
            if (text.includes('ชำระหนี้')) {
                e.preventDefault();
                makePayment();
            } else if (text.includes('ดาวน์โหลดรายงาน')) {
                e.preventDefault();
                downloadReport();
            } else if (text.includes('ขอความช่วยเหลือ')) {
                e.preventDefault();
                requestHelp();
            }
        });
    });
    
    // ตั้งค่า event listeners สำหรับ payment history modal
    setupPaymentHistoryModalListeners();
    
    eventListenersSetup = true;
}

// จัดการการนำทาง
function handleNavigation(href) {
    if (window.logger) {
        window.logger.debug('Navigating to:', href);
    }
    
    // อัปเดต URL hash
    window.location.hash = href;
    
    // อัปเดตลิงก์นำทางที่ใช้งานอยู่
    updateActiveNavLink(href);
    
    // ซ่อนส่วนเนื้อหาทั้งหมดก่อน
    hideAllContentSections();
    
    // เพิ่มการหน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่าการซ่อนเสร็จสิ้น
    setTimeout(() => {
        switch (href) {
            case '#dashboard':
                if (window.logger) {
                    window.logger.debug('Showing dashboard content');
                }
                showDashboardContent();
                break;
            case '#my-debts':
                if (window.logger) {
                    window.logger.debug('Showing my debts content');
                }
                showMyDebtsContent();
                break;
            case '#history':
                if (window.logger) {
                    window.logger.debug('Showing history content');
                }
                showHistoryContent();
                break;
            case '#settings':
                if (window.logger) {
                    window.logger.debug('Showing settings content');
                }
                showSettingsContent();
                break;
            default:
                if (window.logger) {
                    window.logger.debug('Default: showing dashboard content');
                }
                showDashboardContent(); // ค่าเริ่มต้นเป็นแดชบอร์ด
                break;
        }
    }, 50);
}

// อัปเดตลิงก์นำทางที่ใช้งานอยู่
function updateActiveNavLink(href) {
    // ลบ active class จากลิงก์นำทางทั้งหมด
    document.querySelectorAll('header .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // เพิ่ม active class ให้ลิงก์นำทางปัจจุบัน
    const activeLink = document.querySelector(`header .nav-link[href="${href}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    } else {
        console.warn('Active link not found for:', href);
    }
}

// ซ่อนส่วนเนื้อหาทั้งหมด
function hideAllContentSections() {
    const sections = [
        'dashboard-content',
        'my-debts-content', 
        'history-content',
        'settings-content'
    ];
    
    if (window.logger) {
        window.logger.debug('Hiding all content sections');
    }
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            if (window.logger) {
                window.logger.debug(`Hiding section: ${sectionId}`);
            }
            section.style.display = 'none';
            section.style.visibility = 'hidden';
            section.style.opacity = '0';
            section.classList.remove('force-show', 'active');
            
            // Add hidden class to dashboard content to override CSS
            if (sectionId === 'dashboard-content') {
                section.classList.add('hidden');
                if (window.logger) {
                window.logger.debug('Added hidden class to dashboard content');
            }
            }
        } else {
            if (window.logger) {
                window.logger.warn(`Section not found: ${sectionId}`);
            }
        }
    });
    
    // ทำความสะอาด DataTables เมื่อซ่อนส่วนเนื้อหา
    cleanupDataTables();
}

// ทำความสะอาด DataTables
function cleanupDataTables() {
    // ทำความสะอาด debts DataTable
    if (debtsDataTable) {
        debtsDataTable.destroy();
        debtsDataTable = null;
    }
    
    // ทำความสะอาด payment history DataTable
    if (paymentHistoryDataTable) {
        paymentHistoryDataTable.destroy();
        paymentHistoryDataTable = null;
    }
}

// แสดงเนื้อหาแดชบอร์ด
function showDashboardContent() {
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.style.display = 'block';
        dashboardContent.style.visibility = 'visible';
        dashboardContent.style.opacity = '1';
        dashboardContent.classList.add('force-show', 'active');
        dashboardContent.classList.remove('hidden'); // Remove hidden class
        loadDashboardData(); // โหลดข้อมูลแดชบอร์ด
    } else {
        console.error('Dashboard content not found!');
    }
}

// แสดงเนื้อหาหนี้ของฉัน
function showMyDebtsContent() {
    const myDebtsContent = document.getElementById('my-debts-content');
    if (myDebtsContent) {
        myDebtsContent.style.display = 'block';
        myDebtsContent.style.visibility = 'visible';
        myDebtsContent.style.opacity = '1';
        myDebtsContent.classList.add('force-show', 'active');
        loadAllUserDebts(); // โหลดหนี้ทั้งหมดสำหรับส่วนนี้
    } else {
        console.error('My debts content not found!');
        showInfo('ฟีเจอร์หนี้ของฉันจะเปิดใช้งานเร็วๆ นี้');
    }
}



// แสดงเนื้อหาประวัติ
function showHistoryContent() {
    const historyContent = document.getElementById('history-content');
    if (historyContent) {
        historyContent.style.display = 'block';
        historyContent.style.visibility = 'visible';
        historyContent.style.opacity = '1';
        historyContent.classList.add('force-show', 'active');
        loadPaymentHistory(); // โหลดประวัติการชำระเงิน
    } else {
        console.error('History content not found!');
        showInfo('ฟีเจอร์ประวัติการชำระเงินจะเปิดใช้งานเร็วๆ นี้');
    }
}

// แสดงเนื้อหาการตั้งค่า
function showSettingsContent() {
    const settingsContent = document.getElementById('settings-content');
    if (settingsContent) {
        settingsContent.style.display = 'block';
        settingsContent.style.visibility = 'visible';
        settingsContent.style.opacity = '1';
        settingsContent.classList.add('force-show', 'active');
    } else {
        console.error('Settings content not found!');
        showInfo('ฟีเจอร์ตั้งค่าจะเปิดใช้งานเร็วๆ นี้');
    }
}

// Notification settings
function notificationSettings() {
    // Remove focus from any elements in modals before showing settings
    const modals = ['addDebtModal', 'debtDetailsModal', 'installmentPaymentModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            removeFocusFromModal(modal);
        }
    });
    
    showSettingsContent();
}

// ชำระเงิน
function makePayment(debtId = null) {
    // ลบโมดัลเดิมถ้ามีอยู่
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) {
        const bootstrapModal = bootstrap.Modal.getInstance(existingModal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
        existingModal.remove();
    }
    
    // สร้างโมดัลการชำระเงินใหม่
    const modal = createPaymentModal();
    document.body.appendChild(modal);
    
    // แสดงโมดัลพร้อมการเริ่มต้นที่เหมาะสม
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // ตั้งค่าวันที่ชำระเริ่มต้นเป็นวันนี้
    setDefaultPaymentDate();
    
    // ถ้าให้ debtId มา ให้กรอกฟอร์มล่วงหน้า
    if (debtId) {
        prefillPaymentForm(debtId);
    } else {
        // โหลดหนี้ของผู้ใช้สำหรับการเลือก
        loadUserDebtsForPayment();
    }
}

// สร้างโมดัลการชำระเงิน
function createPaymentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'paymentModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'paymentModalLabel');
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="paymentModalLabel">
                        <i class="fas fa-credit-card me-2"></i>ชำระหนี้
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
                </div>
                <div class="modal-body">
                    <form id="paymentForm">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="debtSelect" class="form-label">เลือกหนี้ที่ต้องการชำระ</label>
                                    <select class="form-select" id="debtSelect" required>
                                        <option value="">เลือกหนี้...</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="paymentAmount" class="form-label">จำนวนเงินที่ชำระ</label>
                                    <div class="input-group">
                                        <span class="input-group-text">฿</span>
                                        <input type="number" class="form-control" id="debtorPaymentAmount" 
                                               placeholder="0.00" step="0.01" min="0" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="paymentMethod" class="form-label">วิธีการชำระ</label>
                                    <select class="form-select" id="paymentMethod" required>
                                        <option value="">เลือกวิธีการชำระ...</option>
                                        <option value="cash">เงินสด</option>
                                        <option value="bank_transfer">โอนเงิน</option>
                                        <option value="promptpay">พร้อมเพย์</option>
                                        <option value="credit_card">บัตรเครดิต</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="paymentDate" class="form-label">วันที่ชำระ</label>
                                    <input type="date" class="form-control" id="debtorPaymentDate" required>
                                </div>
                                <div class="mb-3">
                                    <label for="paymentNotes" class="form-label">หมายเหตุ</label>
                                    <textarea class="form-control" id="paymentNotes" rows="3" 
                                              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
                                </div>
                                <div class="alert alert-info">
                                    <h6><i class="fas fa-info-circle me-2"></i>ข้อมูลหนี้</h6>
                                    <div id="debtInfo">
                                        <p class="text-muted">เลือกหนี้เพื่อดูรายละเอียด</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer d-flex justify-content-end align-items-center">
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary" id="submitPaymentBtn">
                            <i class="fas fa-check me-1"></i>ยืนยันการชำระ
                        </button>
                        <button type="button" class="btn btn-secondary" id="cancelPaymentBtn" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // เพิ่ม event listener สำหรับปุ่มส่ง
    const submitBtn = modal.querySelector('#submitPaymentBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            submitPayment();
        });
    }
    
    // ปุ่มยกเลิกมี data-bs-dismiss="modal" attribute อยู่แล้ว ไม่ต้องใช้ custom event listener
    

    
    // เพิ่ม event listener สำหรับ modal hide event เพื่อป้องกันการคลิกซ้ำ
    modal.addEventListener('hide.bs.modal', function() {
        // ปิดการใช้งานปุ่มทั้งหมดในโมดัลเพื่อป้องกันการคลิกซ้ำ
        const buttons = modal.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
        });
    });
    
    // เพิ่ม event listener สำหรับ modal show event เพื่อเปิดการใช้งานปุ่มอีกครั้ง
    modal.addEventListener('show.bs.modal', function() {
        // เปิดการใช้งานปุ่มทั้งหมดในโมดัลอีกครั้ง
        const buttons = modal.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = false;
        });
    });
    
    // เพิ่ม event listener สำหรับ modal shown event เพื่อให้แน่ใจว่าการเริ่มต้นถูกต้อง
    modal.addEventListener('shown.bs.modal', function() {
        // โฟกัสที่ input แรกทันที
        const firstInput = modal.querySelector('input, select');
        if (firstInput) {
            firstInput.focus();
        }
    });
    
    // เพิ่ม event listener สำหรับ modal hidden event เพื่อทำความสะอาด
    modal.addEventListener('hidden.bs.modal', function() {
        // ลบโฟกัสจากองค์ประกอบที่โฟกัสอยู่
        const focusedElement = modal.querySelector(':focus');
        if (focusedElement) {
            focusedElement.blur();
        }
        
        // ล้างฟอร์มเมื่อโมดัลถูกซ่อน
        const form = modal.querySelector('#paymentForm');
        if (form) {
            form.reset();
        }
        clearDebtInfo();
        
        // ลบโมดัลจาก DOM ทันที
        if (modal.parentElement) {
            modal.remove();
        }
    });
    
    // เพิ่ม keyboard event listener สำหรับปุ่ม Escape
    modal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    });
    
    // อนุญาตให้ปิดโมดัลเมื่อคลิกนอกเนื้อหาโมดัล
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    });
    
    return modal;
}

// ปิดโมดัลการชำระเงินอย่างถูกต้อง
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
            // ลบโฟกัสจากองค์ประกอบที่โฟกัสอยู่ภายในโมดัล
    const focusedElement = modal.querySelector(':focus');
    if (focusedElement) {
        focusedElement.blur();
    }
    
    // ใช้ฟังก์ชัน dismiss ของ Bootstrap
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (bootstrapModal) {
        bootstrapModal.hide();
    } else {
        // ทางเลือก: ลบโมดัลด้วยตนเอง
        modal.remove();
    }
    
    // ล้างฟอร์มเมื่อโมดัลถูกปิด
    const form = modal.querySelector('#paymentForm');
    if (form) {
        form.reset();
    }
    clearDebtInfo();
    }
}

// โหลดหนี้ของผู้ใช้สำหรับการเลือกชำระเงิน
function loadUserDebtsForPayment() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) return;

    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            if (!userPhone && !userData.email) return;
            
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
            }
            
            debtsRef.where('status', 'in', ['pending', 'partial']).get()
                .then(function(querySnapshot) {
                    const debtSelect = document.getElementById('debtSelect');
                    if (!debtSelect) return;
                    
                    // Clear existing options
                    debtSelect.innerHTML = '<option value="">เลือกหนี้...</option>';
                    
                    if (querySnapshot.empty) {
                        debtSelect.innerHTML = '<option value="" disabled>ไม่มีหนี้ที่ต้องชำระ</option>';
                        return;
                    }
                    
                    querySnapshot.forEach(function(doc) {
                        const debt = doc.data();
                        const option = document.createElement('option');
                        option.value = doc.id;
                        option.textContent = `${debt.creditorName || 'ไม่ระบุชื่อเจ้าหนี้'} - ฿${(debt.amount || 0).toLocaleString()} (${debt.description || 'ไม่มีคำอธิบาย'})`;
                        option.setAttribute('data-debt', JSON.stringify(debt));
                        debtSelect.appendChild(option);
                    });
                    
                    // Add change event listener
                    debtSelect.addEventListener('change', function() {
                        const selectedOption = this.options[this.selectedIndex];
                        if (selectedOption.value) {
                            const debtData = JSON.parse(selectedOption.getAttribute('data-debt'));
                            updateDebtInfo(debtData);
                            updatePaymentAmount(debtData);
                        } else {
                            clearDebtInfo();
                        }
                    });
                })
                .catch(function(error) {
                    console.error('Error loading debts for payment:', error);
                });
        })
        .catch(function(error) {
            console.error('Error loading user data for payment:', error);
        });
}

// กรอกฟอร์มการชำระเงินล่วงหน้าสำหรับหนี้เฉพาะ
function prefillPaymentForm(debtId) {
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                const debt = doc.data();
                const debtSelect = document.getElementById('debtSelect');
                
                if (debtSelect) {
                    // สร้างตัวเลือกสำหรับหนี้นี้
                    debtSelect.innerHTML = '<option value="">เลือกหนี้...</option>';
                    const option = document.createElement('option');
                    option.value = debtId;
                    option.textContent = `${debt.creditorName || 'ไม่ระบุชื่อเจ้าหนี้'} - ฿${(debt.amount || 0).toLocaleString()} (${debt.description || 'ไม่มีคำอธิบาย'})`;
                    option.setAttribute('data-debt', JSON.stringify(debt));
                    debtSelect.appendChild(option);
                    debtSelect.value = debtId;
                    
                    updateDebtInfo(debt);
                    updatePaymentAmount(debt);
                }
            }
        })
        .catch(function(error) {
            console.error('Error loading debt for payment:', error);
        });
}

// อัปเดตการแสดงข้อมูลหนี้
function updateDebtInfo(debt) {
    const debtInfo = document.getElementById('debtInfo');
    if (!debtInfo) return;
    
    const totalAmount = debt.totalAmount || debt.amount || 0;
    const remainingAmount = debt.remainingAmount || totalAmount;
    const dueDate = debt.dueDate ? new Date(debt.dueDate.toDate()).toLocaleDateString('th-TH') : 'ไม่ระบุ';
    
    debtInfo.innerHTML = `
        <p><strong>เจ้าหนี้:</strong> ${debt.creditorName || 'ไม่ระบุ'}</p>
        <p><strong>คำอธิบาย:</strong> ${debt.description || 'ไม่มีคำอธิบาย'}</p>
        <p><strong>ยอดรวม:</strong> ฿${totalAmount.toLocaleString()}</p>
        <p><strong>ยอดคงเหลือ:</strong> ฿${remainingAmount.toLocaleString()}</p>
        <p><strong>วันครบกำหนด:</strong> ${dueDate}</p>
    `;
}

// ล้างข้อมูลหนี้
function clearDebtInfo() {
    const debtInfo = document.getElementById('debtInfo');
    if (debtInfo) {
        debtInfo.innerHTML = '<p class="text-muted">เลือกหนี้เพื่อดูรายละเอียด</p>';
    }
}

// อัปเดตจำนวนเงินชำระตามหนี้ที่เลือก
function updatePaymentAmount(debt) {
    const paymentAmount = document.getElementById('debtorPaymentAmount');
    if (paymentAmount) {
        const remainingAmount = debt.remainingAmount || debt.amount || 0;
        paymentAmount.value = remainingAmount;
        paymentAmount.max = remainingAmount;
    }
}

// ตั้งค่าวันที่ชำระเริ่มต้นเป็นวันนี้
function setDefaultPaymentDate() {
    const paymentDate = document.getElementById('debtorPaymentDate');
    if (paymentDate) {
        const today = new Date().toISOString().split('T')[0];
        paymentDate.value = today;
    }
}

// ส่งการชำระเงิน
function submitPayment() {
    const form = document.getElementById('paymentForm');
    if (!form) return;
    
    // รับข้อมูลฟอร์ม
    const debtId = document.getElementById('debtSelect').value;
    const amount = parseFloat(document.getElementById('debtorPaymentAmount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentDate = document.getElementById('debtorPaymentDate').value;
    const notes = document.getElementById('paymentNotes').value;
    
    // ตรวจสอบฟอร์ม
    if (!debtId || !amount || !paymentMethod || !paymentDate) {
        showWarning('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    if (amount <= 0) {
        showWarning('จำนวนเงินต้องมากกว่า 0');
        return;
    }
    
    // รับผู้ใช้ปัจจุบัน
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        showWarning('กรุณาเข้าสู่ระบบใหม่');
        return;
    }
    
    // แสดงสถานะกำลังโหลด
    const submitBtn = document.querySelector('#paymentModal .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังบันทึก...';
    submitBtn.disabled = true;
    
    // รับข้อมูลหนี้ก่อน
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(debtDoc) {
            if (!debtDoc.exists) {
                throw new Error('ไม่พบข้อมูลหนี้');
            }
            
            const debt = debtDoc.data();
            const remainingAmount = debt.remainingAmount || debt.amount || 0;
            
            if (amount > remainingAmount) {
                throw new Error('จำนวนเงินที่ชำระมากกว่ายอดคงเหลือ');
            }
            
            // สร้างข้อมูลการชำระเงิน
            const paymentData = {
                debtId: debtId,
                amount: amount,
                paymentMethod: paymentMethod,
                paymentDate: new Date(paymentDate),
                notes: notes,
                debtorId: user.uid,
                debtorName: debt.debtorName,
                debtorPhone: debt.debtorPhone,
                debtorEmail: debt.debtorEmail,
                creditorId: debt.creditorId,
                creditorName: debt.creditorName,
                debtDescription: debt.description,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // บันทึกการชำระเงินไปยัง Firestore
            return window.firebaseDb.collection('payments').add(paymentData);
        })
        .then(function(paymentRef) {
            // อัปเดตยอดคงเหลือของหนี้
            return updateDebtAfterPayment(debtId, amount);
        })
        .then(function() {
            // สำเร็จ - ปิดโมดัลก่อนแสดงการแจ้งเตือน
            closePaymentModal();
            
            // ล้างฟอร์มและข้อมูลหนี้
            if (form) {
                form.reset();
            }
            clearDebtInfo();
            
            // แสดงข้อความสำเร็จหลังจากปิดโมดัล
            setTimeout(() => {
                showSuccess('บันทึกการชำระเงินเรียบร้อยแล้ว');
                
                             // รีเฟรชข้อมูล
             loadDashboardData();
             updateAllCharts();
            }, 100);
        })
        .catch(function(error) {
            console.error('Error submitting payment:', error);
            
            // ปิดโมดัลก่อน
            closePaymentModal();
            
            // แสดงข้อความผิดพลาดหลังจากปิดโมดัล
            setTimeout(() => {
                showError('เกิดข้อผิดพลาด: ' + error.message);
            }, 100);
        })
        .finally(function() {
            // รีเซ็ตสถานะปุ่ม
            const submitBtn = document.querySelector('#paymentModal .btn-primary');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
}

// อัปเดตหนี้หลังการชำระเงิน
function updateDebtAfterPayment(debtId, paymentAmount) {
    return window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (!doc.exists) {
                throw new Error('ไม่พบข้อมูลหนี้');
            }
            
            const debt = doc.data();
            const currentRemaining = debt.remainingAmount || debt.amount || 0;
            const newRemaining = currentRemaining - paymentAmount;
            
            const updateData = {
                remainingAmount: newRemaining,
                updatedAt: new Date()
            };
            
            // อัปเดตสถานะถ้าชำระครบแล้ว
            if (newRemaining <= 0) {
                updateData.status = 'paid';
            } else if (debt.status === 'pending') {
                updateData.status = 'partial';
            }
            
            return window.firebaseDb.collection('debts').doc(debtId).update(updateData);
        });
}

// ดาวน์โหลดรายงาน
function downloadReport() {
    // TODO: ใช้การดาวน์โหลดรายงาน
    showInfo('ฟีเจอร์ดาวน์โหลดรายงานจะเปิดใช้งานเร็วๆ นี้');
}


// ขอความช่วยเหลือ
function requestHelp() {
    // TODO: ใช้การขอความช่วยเหลือ
    showInfo('ฟีเจอร์ขอความช่วยเหลือจะเปิดใช้งานเร็วๆ นี้');
}

// บันทึกการตั้งค่า
function saveSettings() {
    const darkMode = document.getElementById('darkMode').checked;
    const compactView = document.getElementById('compactView').checked;
    
    // บันทึกลง localStorage
    localStorage.setItem('darkMode', darkMode);
    localStorage.setItem('compactView', compactView);
    
    showSuccess('บันทึกการตั้งค่าเรียบร้อยแล้ว');
}


// ฟังก์ชันออกจากระบบ
function logout() {
    if (isRedirecting) {
        return; // ป้องกันการพยายามออกจากระบบหลายครั้ง
    }
    
    isRedirecting = true;
    
    // ทำความสะอาด DataTables ก่อนออกจากระบบ
    cleanupDataTables();
    
    // ใช้ Firebase Auth โดยตรงสำหรับการออกจากระบบ
    window.firebaseAuth.signOut().then(function() {
        // ล้าง localStorage
        localStorage.removeItem('userType');
        localStorage.removeItem('userId');
        
        // ตั้งค่า redirect flag
        sessionStorage.setItem('isRedirecting', 'true');
        
        // เปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบ
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 100);
    }).catch(function(error) {
        console.error('Error signing out:', error);
        isRedirecting = false; // รีเซ็ตแฟล็กเมื่อเกิดข้อผิดพลาด
        showError('เกิดข้อผิดพลาดในการออกจากระบบ');
    });
}

// ฟังก์ชันดีบักเพื่อตรวจสอบหนี้ทั้งหมดใน Firestore
function debugCheckAllDebts() {
    // Debug: Checking all debts in Firestore
    window.firebaseDb.collection('debts').get().then(function(allDebtsSnapshot) {
        // Total debts in collection
        allDebtsSnapshot.forEach(function(doc) {
            const debt = doc.data();
            // Debt ID and data
        });
    }).catch(function(error) {
        console.error('Error getting all debts:', error);
    });
}

// ฟังก์ชันดีบักเพื่อตรวจสอบข้อมูลผู้ใช้
function debugCheckUserData() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        // No user logged in
        return;
    }
    
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                console.log('User data:', userData);
                console.log('Phone number:', userData.phoneNumber);
                console.log('Email:', userData.email);
            } else {
                console.log('User document not found');
            }
        })
        .catch(function(error) {
            console.error('Error getting user data:', error);
        });
}

// ทำให้ฟังก์ชันดีบักใช้งานได้ทั่วโลก
window.debugCheckAllDebts = debugCheckAllDebts;
window.debugCheckUserData = debugCheckUserData;

// ===== Chart Functions =====

// ลงทะเบียน Chart.js datalabels plugin
Chart.register(ChartDataLabels);

// ตัวแปรสำหรับเก็บ charts
let debtStatusChart = null;
let paymentTrendChart = null;
let debtOverviewChart = null;

// สร้างกราฟสถานะหนี้ (Pie Chart)
function createDebtStatusChart(data) {
    const ctx = document.getElementById('debtStatusChart');
    const loading = document.getElementById('debtStatusLoading');
    if (!ctx) return;
    
    // ซ่อน loading state
    if (loading) {
        loading.style.display = 'none';
    }
    
    // ลบกราฟเดิมถ้ามี
    if (debtStatusChart) {
        debtStatusChart.destroy();
    }
    
    debtStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ชำระแล้ว', 'คงเหลือ'],
            datasets: [{
                data: [
                    data.paidAmount || 0,
                    data.remainingAmount || 0
                ],
                backgroundColor: [
                    '#28a745', // สีเขียว - ชำระแล้ว
                    '#dc3545'  // สีแดง - คงเหลือ
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
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} รายการ (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${value}\n(${percentage}%)`;
                    }
                }
            }
        }
    });
}

// สร้างกราฟแนวโน้มการชำระเงิน (Line Chart)
function createPaymentTrendChart(data) {
    const ctx = document.getElementById('paymentTrendChart');
    const loading = document.getElementById('paymentTrendLoading');
    if (!ctx) return;
    
    // ซ่อน loading state
    if (loading) {
        loading.style.display = 'none';
    }
    
    // ลบกราฟเดิมถ้ามี
    if (paymentTrendChart) {
        paymentTrendChart.destroy();
    }
    
    paymentTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'จำนวนเงินที่ชำระ (บาท)',
                data: data.values || [],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#007bff',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `฿${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '฿' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// สร้างกราฟภาพรวมหนี้รายเดือน (Bar Chart)
function createDebtOverviewChart(data) {
    const ctx = document.getElementById('debtOverviewChart');
    const loading = document.getElementById('debtOverviewLoading');
    if (!ctx) return;
    
    // ซ่อน loading state
    if (loading) {
        loading.style.display = 'none';
    }
    
    // ลบกราฟเดิมถ้ามี
    if (debtOverviewChart) {
        debtOverviewChart.destroy();
    }
    
    debtOverviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'ยอดหนี้รวม',
                data: data.totalDebts || [],
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: '#dc3545',
                borderWidth: 1
            }, {
                label: 'ยอดที่ชำระแล้ว',
                data: data.paidAmounts || [],
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: '#28a745',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ฿${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '฿' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// อัปเดตข้อมูลกราฟทั้งหมด
function updateAllCharts() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) return;

    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) return;
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            if (!userPhone && !userData.email) return;
            
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
            }
            
            debtsRef.get().then(function(querySnapshot) {
                const debts = [];
                querySnapshot.forEach(function(doc) {
                    debts.push({ id: doc.id, ...doc.data() });
                });
                
                // สร้างข้อมูลสำหรับกราฟสถานะหนี้
                const statusData = {
                    paidAmount: 0,
                    remainingAmount: 0
                };
                
                // สร้างข้อมูลสำหรับกราฟแนวโน้มการชำระเงิน
                const paymentData = {
                    labels: [],
                    values: []
                };
                
                // สร้างข้อมูลสำหรับกราฟภาพรวมหนี้รายเดือน
                const overviewData = {
                    labels: [],
                    totalDebts: [],
                    paidAmounts: []
                };
                
                // จัดกลุ่มข้อมูลตามเดือน (6 เดือนล่าสุด)
                const months = [];
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months.push({
                        year: month.getFullYear(),
                        month: month.getMonth(),
                        label: month.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })
                    });
                }
                
                // เตรียมข้อมูลสำหรับกราฟภาพรวม
                months.forEach(month => {
                    overviewData.labels.push(month.label);
                    overviewData.totalDebts.push(0);
                    overviewData.paidAmounts.push(0);
                });
                
                // ประมวลผลข้อมูลหนี้
                debts.forEach(debt => {
                    const debtAmount = parseFloat(debt.amount) || parseFloat(debt.totalAmount) || 0;
                    
                    // คำนวณยอดที่ชำระแล้ว
                    let paidAmount = 0;
                    if (debt.paymentHistory && Array.isArray(debt.paymentHistory)) {
                        paidAmount = debt.paymentHistory.reduce((sum, payment) => {
                            return sum + (parseFloat(payment.amount) || 0);
                        }, 0);
                    }
                    
                    const remainingAmount = debtAmount - paidAmount;
                    
                    statusData.paidAmount += paidAmount;
                    statusData.remainingAmount += remainingAmount;
                    
                    // ประมวลผลการชำระเงินรายเดือน
                    const paymentHistory = debt.paymentHistory || [];
                    paymentHistory.forEach(payment => {
                        const paymentDate = payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date) : new Date();
                        const monthIndex = months.findIndex(m => 
                            m.year === paymentDate.getFullYear() && m.month === paymentDate.getMonth()
                        );
                        
                        if (monthIndex !== -1) {
                            overviewData.paidAmounts[monthIndex] += payment.amount || 0;
                        }
                    });
                    
                    // ประมวลผลหนี้รายเดือน
                    const debtDate = debt.createdAt ? new Date(debt.createdAt.toDate()) : new Date();
                    const monthIndex = months.findIndex(m => 
                        m.year === debtDate.getFullYear() && m.month === debtDate.getMonth()
                    );
                    
                    if (monthIndex !== -1) {
                        overviewData.totalDebts[monthIndex] += debt.amount || 0;
                    }
                });
                
                // สร้างข้อมูลสำหรับกราฟแนวโน้มการชำระเงิน (ยอดรวม 6 เดือนล่าสุด)
                months.forEach((month, index) => {
                    paymentData.labels.push(month.label);
                    paymentData.values.push(overviewData.paidAmounts[index]);
                });
                
                // สร้างกราฟ
                createDebtStatusChart(statusData);
                createPaymentTrendChart(paymentData);
                createDebtOverviewChart(overviewData);
            }).catch(function(error) {
                console.error('Error loading debts for charts:', error);
            });
        }).catch(function(error) {
            console.error('Error loading user data for charts:', error);
        });
}

// ===== Debug Functions =====
// ฟังก์ชันทดสอบข้อมูลในฐานข้อมูล
function debugDashboardData() {
    const userId = window.firebaseAuth.currentUser?.uid;
    if (!userId) {
        console.log('No user ID found');
        return;
    }
    
    console.log('=== DEBUG DASHBOARD DATA ===');
    console.log('User ID:', userId);
    
    // ตรวจสอบข้อมูลผู้ใช้
    window.firebaseDb.collection('users').doc(userId).get()
        .then(function(userDoc) {
            if (!userDoc.exists) {
                console.log('User document not found');
                return;
            }
            
            const userData = userDoc.data();
            const userPhone = userData.phone || userData.phoneNumber;
            
            console.log('User data:', {
                phone: userPhone,
                email: userData.email,
                displayName: userData.displayName
            });
            
            // ตรวจสอบข้อมูลหนี้
            let debtsRef;
            if (userPhone) {
                debtsRef = window.firebaseDb.collection('debts').where('debtorPhone', '==', userPhone);
                console.log('Searching debts by phone:', userPhone);
            } else {
                debtsRef = window.firebaseDb.collection('debts').where('debtorEmail', '==', userData.email);
                console.log('Searching debts by email:', userData.email);
            }
            
            debtsRef.get().then(function(querySnapshot) {
                
                querySnapshot.forEach(function(doc) {
                    const debt = doc.data();
                    console.log('Debt:', {
                        id: doc.id,
                        amount: debt.amount,
                        status: debt.status,
                        debtorPhone: debt.debtorPhone,
                        debtorEmail: debt.debtorEmail,
                        paymentHistory: debt.paymentHistory?.length || 0
                    });
                });
            });
        });
}

// ทำให้ฟังก์ชัน debug ใช้งานได้จาก console
window.debugDashboardData = debugDashboardData;

// ===== Payment History Modal Functions =====

// ตัวแปรสำหรับเก็บข้อมูลหนี้ปัจจุบัน
let currentDebtData = null;

// ฟังก์ชันแสดง modal ประวัติการชำระ
function showPaymentHistoryModal(debtId) {
    // ตรวจสอบ Firebase
    if (!window.firebaseDb) {
        console.error('Firebase not initialized');
        return;
    }

    // ดึงข้อมูลหนี้จาก Firestore
    window.firebaseDb.collection('debts').doc(debtId).get()
        .then(function(doc) {
            if (doc.exists) {
                currentDebtData = { id: doc.id, ...doc.data() };
                populatePaymentHistoryModal(currentDebtData);
                
                // แสดง modal
                const modal = document.getElementById('installmentPaymentModal');
                if (modal) {
                    // Remove focus from any elements before showing modal
                    removeFocusFromModal(modal);
                    
                    const bootstrapModal = new bootstrap.Modal(modal);
                    bootstrapModal.show();
                }
            } else {
                console.error('Debt not found');
                showWarning('ไม่พบข้อมูลหนี้');
            }
        })
        .catch(function(error) {
            console.error('Error getting debt:', error);
            showError('เกิดข้อผิดพลาดในการดึงข้อมูลหนี้');
        });
}

// ฟังก์ชันเติมข้อมูลใน modal
function populatePaymentHistoryModal(debtData) {
    // คำนวณข้อมูลการชำระ
    const totalAmount = debtData.totalAmount || debtData.amount || 0;
    const monthlyPayment = debtData.monthlyPayment || 0;
    const totalInstallments = debtData.installmentMonths || 0;
    const paymentHistory = debtData.paymentHistory || [];
    const paidInstallments = paymentHistory.length;
    const remainingInstallments = totalInstallments - paidInstallments;
    const paidAmount = paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const remainingAmount = totalAmount - paidAmount;

    // อัปเดตข้อมูลใน modal
    document.getElementById('modalTotalAmount').textContent = `฿${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    document.getElementById('modalMonthlyPayment').textContent = `฿${monthlyPayment.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    document.getElementById('modalTotalInstallments').textContent = `${totalInstallments} งวด`;
    document.getElementById('modalPaidInstallments').textContent = `${paidInstallments} งวด`;
    document.getElementById('modalRemainingInstallments').textContent = `${remainingInstallments} งวด`;
    document.getElementById('modalRemainingAmount').textContent = `฿${remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

    // ตั้งค่าเริ่มต้นสำหรับฟอร์ม
    document.getElementById('debtorPaymentAmount').value = monthlyPayment.toFixed(2);
    
    // ตั้งค่าวันที่และเวลาปัจจุบัน
    const now = new Date();
    document.getElementById('debtorPaymentDate').value = now.toISOString().split('T')[0];
    document.getElementById('debtorPaymentTime').value = now.toTimeString().slice(0, 5);
    
    // ล้างหมายเหตุ
    document.getElementById('debtorPaymentNote').value = '';

    // แสดงประวัติการชำระ
    displayPaymentHistory(paymentHistory);
}

// ตัวแปรสำหรับเก็บ DataTable instance
let paymentHistoryDataTable = null;

// ฟังก์ชันแสดงประวัติการชำระในตาราง
function displayPaymentHistory(paymentHistory) {
    // ลบ DataTable เดิมถ้ามี
    if (paymentHistoryDataTable) {
        paymentHistoryDataTable.destroy();
        paymentHistoryDataTable = null;
    }
    
    if (paymentHistory.length === 0) {
        // แสดงข้อความเมื่อไม่มีข้อมูล
        const tbody = document.getElementById('modalPaymentHistoryTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีประวัติการชำระ</td></tr>';
        
        // สร้าง DataTable แบบง่ายสำหรับกรณีไม่มีข้อมูล
        if (window.dataTablesInit && window.dataTablesInit.isDataTableInitialized('modalPaymentHistoryTable')) {
            window.dataTablesInit.destroyDataTable('modalPaymentHistoryTable');
        }
        
        paymentHistoryDataTable = $('#modalPaymentHistoryTable').DataTable({
            data: [],
            responsive: true,
            autoWidth: false,
            scrollX: false,
            language: {
                "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
                "zeroRecords": "ยังไม่มีประวัติการชำระ",
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
    const tableData = paymentHistory.map(payment => {
        const paymentDate = payment.date ? new Date(payment.date.toDate ? payment.date.toDate() : payment.date) : new Date();
        const formattedDate = paymentDate.toLocaleDateString('th-TH');
        const formattedTime = payment.time || paymentDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'});
        const amount = payment.amount || 0;
        const note = payment.note || '-';

        return [
            formattedDate,
            formattedTime,
            `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
            note
        ];
    });

    // สร้าง DataTable ใหม่
    if (window.dataTablesInit && window.dataTablesInit.isDataTableInitialized('modalPaymentHistoryTable')) {
        window.dataTablesInit.destroyDataTable('modalPaymentHistoryTable');
    }
    
    paymentHistoryDataTable = $('#modalPaymentHistoryTable').DataTable({
        data: tableData,
        responsive: true,
        autoWidth: false,
        scrollX: false,
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
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
                targets: 2, // คอลัมน์จำนวนเงิน
                className: 'text-end'
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        initComplete: function() {
            // ซ่อน loading state ถ้ามี
            const loadingElement = document.querySelector('#modalPaymentHistoryTable_processing');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    });
}

// ฟังก์ชันบันทึกการชำระ
function recordPayment() {
    if (!currentDebtData) {
        showWarning('ไม่พบข้อมูลหนี้');
        return;
    }

    const amount = parseFloat(document.getElementById('debtorPaymentAmount').value);
    const date = document.getElementById('debtorPaymentDate').value;
    const time = document.getElementById('debtorPaymentTime').value;
    const note = document.getElementById('debtorPaymentNote').value;

    if (!amount || amount <= 0) {
        showWarning('กรุณากรอกจำนวนเงินที่ถูกต้อง');
        return;
    }

    if (!date) {
        showWarning('กรุณาเลือกวันที่ชำระ');
        return;
    }

    // สร้างข้อมูลการชำระ
    const paymentData = {
        amount: amount,
        date: new Date(date + 'T' + time),
        time: time,
        note: note,
        recordedBy: window.firebaseAuth.currentUser?.uid || 'debtor',
        recordedAt: new Date()
    };

    // อัปเดตข้อมูลใน Firestore
    const debtRef = window.firebaseDb.collection('debts').doc(currentDebtData.id);
    const currentPaymentHistory = currentDebtData.paymentHistory || [];
    
    debtRef.update({
        paymentHistory: [...currentPaymentHistory, paymentData]
    })
    .then(function() {
        showSuccess('บันทึกการชำระเรียบร้อยแล้ว');
        
        // รีเฟรชข้อมูลใน modal
        debtRef.get().then(function(doc) {
            if (doc.exists) {
                currentDebtData = { id: doc.id, ...doc.data() };
                populatePaymentHistoryModal(currentDebtData);
            }
        });
        
        // รีเฟรชข้อมูลในหน้า
        loadDashboardData();
    })
    .catch(function(error) {
        console.error('Error recording payment:', error);
        showError('เกิดข้อผิดพลาดในการบันทึกการชำระ');
    });
}

// ฟังก์ชันชำระเต็มจำนวน
function markFullyPaid() {
    if (!currentDebtData) {
        showWarning('ไม่พบข้อมูลหนี้');
        return;
    }

    const totalAmount = currentDebtData.totalAmount || currentDebtData.amount || 0;
    const paymentHistory = currentDebtData.paymentHistory || [];
    const paidAmount = paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const remainingAmount = totalAmount - paidAmount;

    if (remainingAmount <= 0) {
        showWarning('หนี้นี้ชำระครบแล้ว');
        return;
    }

    // ตั้งค่าจำนวนเงินที่เหลือ
    document.getElementById('debtorPaymentAmount').value = remainingAmount.toFixed(2);
    
    // ตั้งค่าวันที่และเวลาปัจจุบัน
    const now = new Date();
    document.getElementById('debtorPaymentDate').value = now.toISOString().split('T')[0];
    document.getElementById('debtorPaymentTime').value = now.toTimeString().slice(0, 5);
    
    // ตั้งหมายเหตุ
    document.getElementById('debtorPaymentNote').value = 'ชำระเต็มจำนวน';
}

// ตั้งค่า event listeners สำหรับ payment history modal
function setupPaymentHistoryModalListeners() {
    // สำหรับหน้า debtor dashboard ไม่ต้องตั้งค่า event listeners สำหรับปุ่มบันทึกการชำระ
    // เนื่องจากเป็น read-only mode
    console.log('Payment history modal set to read-only mode for debtors');
    
    // เพิ่ม event listener สำหรับการปิดโมดัล
    const modal = document.getElementById('installmentPaymentModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', function() {
            // ทำความสะอาด DataTable เมื่อปิดโมดัล
            if (paymentHistoryDataTable) {
                paymentHistoryDataTable.destroy();
                paymentHistoryDataTable = null;
            }
        });
    }
}

// ทำให้ฟังก์ชันใช้งานได้ทั่วโลก
window.showPaymentHistoryModal = showPaymentHistoryModal;
window.recordPayment = recordPayment;
window.markFullyPaid = markFullyPaid;

// Function to remove focus from modal elements to fix accessibility issues
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

// Enhanced modal focus management
document.addEventListener('DOMContentLoaded', function() {
    // Handle modal show events
    const modals = ['installmentPaymentModal', 'debtDetailsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                // Remove focus from any elements before showing modal
                removeFocusFromModal(modal);
            });
            
            modal.addEventListener('shown.bs.modal', function() {
                // Focus on the first focusable element in the modal
                const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            });
            
            modal.addEventListener('hide.bs.modal', function() {
                // Remove focus from modal elements before hiding
                removeFocusFromModal(modal);
            });
        }
    });
    
    // ทำความสะอาด DataTables เมื่อปิดหน้า
    window.addEventListener('beforeunload', function() {
        cleanupDataTables();
    });
    
    // ทำความสะอาด DataTables เมื่อเปลี่ยนหน้า
    window.addEventListener('pagehide', function() {
        cleanupDataTables();
    });
});

