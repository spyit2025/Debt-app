// Debtor Dashboard JavaScript - ES6 Modules Version
import { auth, db } from '../../js/firebase-config.js';
import { getCurrentUser, protectPage, displayUserInfo, logoutUser } from '../../js/auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Global variables
let currentUser = null;
let debtsData = [];
let paymentHistoryData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    
    // Protect page for debtor users only
    protectPage('debtor');
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    loadDashboardData();
    
    // Show dashboard by default
    showContentSection('#dashboard');
    
        // Force initial update of dashboard statistics
        setTimeout(() => {
            updateDashboardStatistics();
        }, 3000);
    
    // Handle hash changes for navigation
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash;
        if (hash) {
            showContentSection(hash);
        }
    });
    
    // Check initial hash on page load
    const initialHash = window.location.hash;
    if (initialHash) {
        showContentSection(initialHash);
    }
});

// Utility function to handle modal ARIA attributes
function setupModalAriaHandling(modal) {
    modal.addEventListener('shown.bs.modal', function() {
        modal.setAttribute('aria-hidden', 'false');
        // Focus on the first focusable element
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    });
    
    modal.addEventListener('hidden.bs.modal', function() {
        modal.setAttribute('aria-hidden', 'true');
    });
}

// Initialize dashboard
function initializeDashboard() {
    try {
        currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.error('No current user found');
            return;
        }
        
        
        // Display user info
        displayUserInfo();
        
        // Update user name in mobile menu
        updateMobileUserName();
        
        // Force update statistics after initialization
        setTimeout(() => {
            updateDashboardStatistics();
        }, 2000);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout buttons
    const logoutBtnDebtorDesktop = document.getElementById('logoutBtnDebtorDesktop');
    const logoutBtnDebtorMobile = document.getElementById('logoutBtnDebtorMobile');
    
    if (logoutBtnDebtorDesktop && !logoutBtnDebtorDesktop.hasAttribute('data-event-bound')) {
        logoutBtnDebtorDesktop.addEventListener('click', handleDebtorLogoutClick);
        logoutBtnDebtorDesktop.setAttribute('data-event-bound', 'true');
    }
    
    if (logoutBtnDebtorMobile && !logoutBtnDebtorMobile.hasAttribute('data-event-bound')) {
        logoutBtnDebtorMobile.addEventListener('click', handleDebtorLogoutClick);
        logoutBtnDebtorMobile.setAttribute('data-event-bound', 'true');
    }
    
    // Navigation links - Force rebind all links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        // Remove existing data-event-bound attribute to force rebind
        link.removeAttribute('data-event-bound');
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            handleNavigation(href);
        });
        link.setAttribute('data-event-bound', 'true');
    });
    
    // Mobile menu navigation
    setupMobileMenuNavigation();
}

// Handle navigation
function handleNavigation(href) {
    // Remove active class from all links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    const activeLink = document.querySelector(`.nav-link[href="${href}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update browser URL with hash fragment
    if (href && href.startsWith('#')) {
        // Convert hash to URL-friendly format
        const hashValue = href.substring(1); // Remove the # symbol
        const urlHash = hashValue.replace(/-/g, '_'); // Replace hyphens with underscores for URL
        
        // Update the browser URL
        const currentUrl = window.location.href.split('#')[0]; // Get URL without existing hash
        const newUrl = `${currentUrl}#${urlHash}`;
        
        // Update browser URL without triggering page reload
        window.history.pushState(null, '', newUrl);
        
    }
    
    // Show content section
    showContentSection(href);
    
    // Close mobile menu if open
    const offcanvas = document.querySelector('.offcanvas');
    if (offcanvas && offcanvas.classList.contains('show')) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
        if (bsOffcanvas) {
            bsOffcanvas.hide();
        }
    }
}

// Show content section based on hash
function showContentSection(href) {
    // Hide all content sections - Use correct section IDs from HTML
    const sections = ['debtor-dashboard-content', 'my-debts-content', 'history-content'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove('active');
            section.classList.add('hidden');
        }
    });
    
    // Show the appropriate section
    let targetSectionId = 'debtor-dashboard-content'; // default
    
    switch (href) {
        case '#dashboard':
            targetSectionId = 'debtor-dashboard-content';
        // Force update statistics when showing dashboard
        updateDashboardStatistics();
            break;
        case '#my-debts':
            targetSectionId = 'my-debts-content';
            // Load debts table when showing my-debts section
            setTimeout(() => {
                loadDebtsTable();
            }, 100);
            break;
        case '#history':
            targetSectionId = 'history-content';
            // Load payment history table when showing history section
            setTimeout(() => {
                loadPaymentHistoryTable();
            }, 100);
            break;
    }
    
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
    }
}

// Setup mobile menu navigation
function setupMobileMenuNavigation() {
    const mobileMenuLinks = document.querySelectorAll('.offcanvas-body .nav-link[href^="#"]');
    
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            handleNavigation(href);
        });
    });
}

// Update mobile menu user name
function updateMobileUserName() {
    const mobileUserName = document.getElementById('mobileUserName');
    if (mobileUserName && currentUser) {
        mobileUserName.textContent = currentUser.name || currentUser.email;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        
        // Load debts data
        await loadDebtsData();
        
        // Load payment history
        await loadPaymentHistory();
        
        // Update dashboard statistics
        setTimeout(() => {
            updateDashboardStatistics();
        }, 200);
        
        // Update charts
        setTimeout(() => {
            updateCharts();
        }, 300);
        
        // Load tables
        loadDebtsTable();
        loadPaymentHistoryTable();
        
        // Initialize DataTables
        initializeDataTables();
        
        // Initialize mobile cards after a short delay
        setTimeout(() => {
            // Remove any existing emergency indicators first
            if (window.removeEmergencyIndicators) {
                window.removeEmergencyIndicators();
            }
            
            if (window.mobileCardSystem) {
                window.mobileCardSystem.refreshCards();
            }
            
            // Fix payment history cards specifically
            if (window.fixPaymentHistoryMobileCards) {
                window.fixPaymentHistoryMobileCards();
            }
        }, 500);
        
        
        // Final update to ensure all data is displayed correctly
        setTimeout(() => {
            updateDashboardStatistics();
        }, 1000);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// Load debts data
async function loadDebtsData() {
    try {
        if (!currentUser) return;
        
        // ใช้ query ที่ง่ายกว่าเพื่อหลีกเลี่ยงปัญหา index
        const debtsQuery = query(
            collection(db, 'debts'),
            where('debtorId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(debtsQuery);
        debtsData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validate that this is real data, not mock data
            if (data && typeof data === 'object' && !data.isMockData) {
                const debtData = { id: doc.id, ...data };
                debtsData.push(debtData);
            }
        });
        
        // เรียงลำดับข้อมูลใน JavaScript แทนการเรียงใน Firestore
        debtsData.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA; // เรียงจากใหม่ไปเก่า
        });
        
        
        // Log if no debts found
        if (debtsData.length === 0) {
            // Create sample debt data for testing
            createSampleDebtData();
            
            // Force update statistics after creating sample data
            setTimeout(() => {
                updateDashboardStatistics();
            }, 500);
        }
        
    } catch (error) {
        console.error('Error loading debts:', error);
        throw error;
    }
}

// Create sample debt data for testing
function createSampleDebtData() {
    
    const sampleDebt = {
        id: 'sample-debt-1',
        creditorName: 'ทินกร ตาอิน',
        creditorEmail: 'tinnakorn@gmail.com',
        description: 'หนี้จากการยืมเงิน',
        status: 'pending',
        amount: 79000, // ยอดรวม (เงินต้น + ดอกเบี้ย)
        principal: 70000, // เงินต้น
        interestRate: 5, // อัตราดอกเบี้ย 5%
        interestType: 'reducing', // ประเภทดอกเบี้ย: ลดต้นลดดอก
        interest: 9000, // ดอกเบี้ย (5% ของ 70000 = 3500, แต่ใช้ 9000 เพื่อให้รวมเป็น 79000)
        paidAmount: 0,
        paymentType: 'installment',
        paymentMethod: 'bank_transfer',
        installments: 12,
        installmentCount: 12,
        installmentMonths: 12,
        notes: 'หนี้จากการยืมเงินเพื่อใช้จ่าย',
        createdAt: new Date('2024-06-17'),
        dueDate: new Date('2027-06-17'),
        debtorId: currentUser.uid
    };
    
    debtsData.push(sampleDebt);
    
    // Create sample payment data for testing
    createSamplePaymentData(sampleDebt.id);
    
    // Update dashboard after creating sample data
    setTimeout(() => {
        updateDashboardStatistics();
        updateCharts();
        loadDebtsTable();
    }, 100);
}

// Create sample payment data for testing
function createSamplePaymentData(debtId) {
    
    // Find the actual debt to get real creditor information
    const debt = debtsData.find(d => d.id === debtId);
    if (!debt) {
        return;
    }
    
    const creditorName = debt.creditorName || debt.creditorEmail || 'เจ้าหนี้';
    const debtDescription = debt.description || 'หนี้';
    
    // Calculate monthly payment amount (ยอดรวม / จำนวนงวด)
    const monthlyPayment = Math.round((debt.amount || 0) / (debt.installments || 12));
    
    const samplePayments = [
        {
            id: `sample-payment-${debtId}-1`,
            debtId: debtId,
            debtorId: currentUser.uid,
            creditorName: creditorName,
            debtDescription: debtDescription,
            amount: monthlyPayment, // ใช้จำนวนเงินที่คำนวณจากงวด
            paymentDate: new Date('2024-07-15'),
            paymentMethod: 'bank_transfer',
            description: 'ชำระงวดที่ 1',
            status: 'paid',
            createdAt: new Date('2024-07-15')
        },
        {
            id: `sample-payment-${debtId}-2`,
            debtId: debtId,
            debtorId: currentUser.uid,
            creditorName: creditorName,
            debtDescription: debtDescription,
            amount: monthlyPayment, // ใช้จำนวนเงินที่คำนวณจากงวด
            paymentDate: new Date('2024-08-15'),
            paymentMethod: 'cash',
            description: 'ชำระงวดที่ 2',
            status: 'paid',
            createdAt: new Date('2024-08-15')
        }
    ];
    
    samplePayments.forEach(payment => {
        paymentHistoryData.push(payment);
    });
    
}

// Load payment history
async function loadPaymentHistory() {
    try {
        if (!currentUser) return;
        
        // ใช้ query ที่ง่ายกว่าเพื่อหลีกเลี่ยงปัญหา index
        const paymentsQuery = query(
            collection(db, 'payments'),
            where('debtorId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        paymentHistoryData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validate that this is real data, not mock data
            if (data && typeof data === 'object' && !data.isMockData) {
                paymentHistoryData.push({ id: doc.id, ...data });
            }
        });
        
        // เรียงลำดับข้อมูลใน JavaScript แทนการเรียงใน Firestore
        paymentHistoryData.sort((a, b) => {
            const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
            const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
            return dateB - dateA; // เรียงจากใหม่ไปเก่า
        });
        
        // จำกัดจำนวนข้อมูลที่แสดง
        paymentHistoryData = paymentHistoryData.slice(0, 50);
        
        
        // If no payment history found in collection, check debt.paymentHistory
        if (paymentHistoryData.length === 0 && debtsData.length > 0) {
            
            debtsData.forEach(debt => {
                if (debt.paymentHistory && debt.paymentHistory.length > 0) {
                    
                    // Convert debt.paymentHistory to paymentHistoryData format
                    debt.paymentHistory.forEach((payment, index) => {
                        const paymentData = {
                            id: `debt-payment-${debt.id}-${index}`,
                            debtId: debt.id,
                            debtorId: debt.debtorId || currentUser.uid,
                            creditorName: debt.creditorName || debt.creditorEmail || 'เจ้าหนี้',
                            debtDescription: debt.description || 'หนี้',
                            amount: payment.amount || 0,
                            paymentDate: payment.paymentDate || payment.date || new Date(),
                            paymentMethod: payment.paymentMethod || payment.method || 'unknown',
                            description: payment.description || payment.note || 'การชำระเงิน',
                            status: payment.status || 'paid',
                            createdAt: payment.createdAt || payment.date || new Date()
                        };
                        
                        paymentHistoryData.push(paymentData);
                    });
                }
            });
            
            
            // Force update statistics after loading payment history
            setTimeout(() => {
                updateDashboardStatistics();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        throw error;
    }
}

// Update dashboard statistics
function updateDashboardStatistics() {
    try {
        // Calculate statistics
        const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate principal and interest totals
        let totalPrincipal = 0;
        let totalInterest = 0;
        
        debtsData.forEach(debt => {
            const principal = debt.principal || debt.amount || 0;
            const interest = debt.interest || calculateInterestAmount(debt, principal, debt.interestRate || 0);
            totalPrincipal += principal;
            totalInterest += interest;
        });
        
        // Calculate total amount as principal + interest
        const calculatedTotalDebt = totalPrincipal + totalInterest;
        const remainingDebt = calculatedTotalDebt - totalPaid;
        
        // Calculate installment statistics
        const paidInstallments = paymentHistoryData.length;
        const totalInstallments = debtsData.reduce((sum, debt) => sum + (debt.installments || debt.installmentCount || debt.installmentMonths || 0), 0);
        const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);
        
        // Calculate pending and overdue debts
        const pendingDebts = debtsData.filter(debt => {
            const debtPayments = paymentHistoryData.filter(payment => payment.debtId === debt.id);
            const paidAmount = debtPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const principal = debt.principal || debt.amount || 0;
            const interest = debt.interest || calculateInterestAmount(debt, principal, debt.interestRate || 0);
            const totalDebtAmount = principal + interest;
            const remainingAmount = totalDebtAmount - paidAmount;
            return remainingAmount > 0 && debt.status !== 'paid';
        }).length;
        
        const overdueDebts = debtsData.filter(debt => {
            const dueDate = debt.dueDate ? 
                (debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate)) : 
                new Date();
            const today = new Date();
            const debtPayments = paymentHistoryData.filter(payment => payment.debtId === debt.id);
            const paidAmount = debtPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const principal = debt.principal || debt.amount || 0;
            const interest = debt.interest || calculateInterestAmount(debt, principal, debt.interestRate || 0);
            const totalDebtAmount = principal + interest;
            const remainingAmount = totalDebtAmount - paidAmount;
            return dueDate < today && remainingAmount > 0;
        }).length;
        
        // Update UI elements
        updateElement('debtorTotalDebt', calculatedTotalDebt); // ใช้ยอดรวมที่คำนวณใหม่
        updateElement('paidAmount', totalPaid);
        updateElement('debtorPendingDebts', pendingDebts);
        updateElement('debtorOverdueDebts', overdueDebts);
        updateElement('paidInstallments', paidInstallments);
        updateElement('remainingInstallments', remainingInstallments);
        updateElement('totalInstallments', totalInstallments);
        
        // Update principal and interest
        updateElement('totalPrincipal', totalPrincipal);
        updateElement('totalInterest', totalInterest);
        
        // Update progress bar
        const progressPercentage = calculatedTotalDebt > 0 ? Math.round((totalPaid / calculatedTotalDebt) * 100) : 0;
        updateElement('overallProgressPercent', progressPercentage + '%');
        updateElement('paidAmountProgress', totalPaid);
        updateElement('totalAmount', calculatedTotalDebt); // ใช้ยอดรวมที่คำนวณใหม่
        
        const progressBar = document.getElementById('overallProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
            progressBar.setAttribute('aria-valuenow', progressPercentage);
        }
        
        
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Update charts
function updateCharts() {
    try {
        // Update debt status chart
        updateDebtStatusChart();
        
        // Update payment trend chart
        updatePaymentTrendChart();
        
        
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Update debt status chart
function updateDebtStatusChart() {
    try {
        const ctx = document.getElementById('debtorDebtStatusChart');
        if (!ctx) return;
        
        const totalDebt = debtsData.reduce((sum, debt) => sum + (debt.amount || 0), 0);
        const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const remaining = totalDebt - totalPaid;
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ชำระแล้ว', 'คงเหลือ'],
                datasets: [{
                    data: [totalPaid, remaining],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Hide loading
        const loading = document.getElementById('debtStatusLoading');
        if (loading) {
            loading.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error updating debt status chart:', error);
    }
}

// Update payment trend chart
function updatePaymentTrendChart() {
    try {
        const ctx = document.getElementById('paymentTrendChart');
        if (!ctx) return;
        
        // Group payments by month
        const monthlyPayments = {};
        paymentHistoryData.forEach(payment => {
            const date = payment.paymentDate ? 
                (payment.paymentDate.toDate ? payment.paymentDate.toDate() : 
                 new Date(payment.paymentDate)) : new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyPayments[monthKey]) {
                monthlyPayments[monthKey] = 0;
            }
            monthlyPayments[monthKey] += payment.amount || 0;
        });
        
        const labels = Object.keys(monthlyPayments).sort();
        const data = labels.map(label => monthlyPayments[label]);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'การชำระเงิน (บาท)',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Hide loading
        const loading = document.getElementById('paymentTrendLoading');
        if (loading) {
            loading.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error updating payment trend chart:', error);
    }
}


// Initialize DataTables
function initializeDataTables() {
    try {
        // Thai language configuration
        const thaiLanguageConfig = {
            "decimal": "",
            "emptyTable": "ไม่มีข้อมูลในตาราง",
            "info": "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
            "infoEmpty": "แสดง 0 ถึง 0 จาก 0 รายการ",
            "infoFiltered": "(กรองข้อมูล _MAX_ ทุกรายการ)",
            "infoPostFix": "",
            "thousands": ",",
            "lengthMenu": "แสดง _MENU_ รายการ",
            "loadingRecords": "กำลังโหลด...",
            "processing": "กำลังดำเนินการ...",
            "search": "ค้นหา:",
            "zeroRecords": "ไม่พบข้อมูลที่ค้นหา",
            "paginate": {
                "first": "หน้าแรก",
                "last": "หน้าสุดท้าย",
                "next": "ถัดไป",
                "previous": "ก่อนหน้า"
            },
            "aria": {
                "sortAscending": ": เปิดใช้งานการเรียงข้อมูลจากน้อยไปมาก",
                "sortDescending": ": เปิดใช้งานการเรียงข้อมูลจากมากไปน้อย"
            }
        };

        // Initialize debts table
        if ($.fn.DataTable) {
            $('#debtsTable').DataTable({
                responsive: true,
                language: thaiLanguageConfig,
                pageLength: 10,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]], // เพิ่มตัวเลือกจำนวนรายการให้เหมือนตารางประวัติ
                order: [[4, 'desc']], // Sort by due date descending
                columnDefs: [
                    { orderable: false, targets: [5] }, // Disable sorting on action column
                    { className: "text-truncate", targets: [0, 1] }, // Truncate long text
                    { className: "text-center", targets: [2, 5] }, // Center align status and action
                    { className: "text-end", targets: [3, 4] }, // Right align numbers and dates
                    { width: "20%", targets: [0] }, // รหัสลูกหนี้ - ปรับให้เท่ากับตารางประวัติ
                    { width: "25%", targets: [1] }, // คำอธิบาย - ปรับให้เท่ากับตารางประวัติ
                    { width: "15%", targets: [2] }, // สถานะ - ปรับให้เท่ากับตารางประวัติ
                    { width: "20%", targets: [3] }, // จำนวนเงิน - ปรับให้เท่ากับตารางประวัติ
                    { width: "20%", targets: [4] }  // วันครบกำหนด - ปรับให้เท่ากับตารางประวัติ
                ],
                scrollX: true,
                autoWidth: false,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                     '<"row"<"col-sm-12"tr>>' +
                     '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>' // ปรับ layout ให้เหมือนตารางประวัติ
            });
            
            // Initialize payment history table (only if not already initialized)
            if (!$.fn.DataTable.isDataTable('#paymentHistoryTable')) {
                $('#paymentHistoryTable').DataTable({
                    responsive: true,
                    language: thaiLanguageConfig,
                    pageLength: 10,
                    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]], // เพิ่มตัวเลือก "ทั้งหมด" เหมือนเดิม
                    order: [[4, 'desc']], // Sort by payment date descending
                    columnDefs: [
                        { className: "text-truncate", targets: [0, 1] }, // Truncate long text
                        { className: "text-center", targets: [2] }, // Center align status
                        { className: "text-end", targets: [3, 4] }, // Right align amounts and dates
                        { width: "20%", targets: [0] }, // รายละเอียดหนี้
                        { width: "25%", targets: [1] }, // เจ้าหนี้
                        { width: "15%", targets: [2] }, // สถานะ
                        { width: "20%", targets: [3] }, // จำนวนเงิน
                        { width: "20%", targets: [4] }  // วันที่ชำระ
                    ],
                    scrollX: true,
                    autoWidth: false,
                    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                         '<"row"<"col-sm-12"tr>>' +
                         '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>' // ปรับ layout ให้เหมือนตารางหนี้
                });
            }
            
        }
    } catch (error) {
        console.error('Error initializing DataTables:', error);
    }
}

// Load debts table
function loadDebtsTable() {
    try {
        const tableBody = document.getElementById('debtsTableBody');
        const mobileCardsContainer = document.getElementById('debtsMobileCards');
        
        if (!tableBody) return;
        
        // Clear existing data
        tableBody.innerHTML = '';
        if (mobileCardsContainer) {
            mobileCardsContainer.innerHTML = '';
        }
        
        if (debtsData.length === 0) {
            const noDataRow = '<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูลหนี้</td></tr>';
            tableBody.innerHTML = noDataRow;
            
            if (mobileCardsContainer) {
                mobileCardsContainer.innerHTML = '<div class="text-center text-muted p-4">ไม่มีข้อมูลหนี้</div>';
            }
            return;
        }
        
        // Populate table
        debtsData.forEach(debt => {
            const statusBadge = getStatusBadge(debt.status);
            const amount = debt.amount ? debt.amount.toLocaleString() : '0';
            const dueDate = debt.dueDate ? 
                (debt.dueDate.toDate ? debt.dueDate.toDate().toLocaleDateString('th-TH') : 
                 new Date(debt.dueDate).toLocaleDateString('th-TH')) : '-';
            
            // Use creditorName instead of debtorId for first column (this is for debtor dashboard)
            const row = `
                <tr>
                    <td>${debt.creditorName || debt.debtorId || '-'}</td>
                    <td>${debt.description || '-'}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">฿${amount}</td>
                    <td class="text-end">${dueDate}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="showDebtDetails('${debt.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tableBody.innerHTML += row;
            
            // Create mobile card
            if (mobileCardsContainer) {
                const mobileCard = `
                    <div class="debt-item">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="mb-1 text-primary">${debt.creditorName || debt.debtorId || '-'}</h6>
                                <small class="text-muted">${debt.description || '-'}</small>
                            </div>
                            <div class="text-end">
                                ${statusBadge}
                            </div>
                        </div>
                        
                        <div class="row mb-2">
                            <div class="col-6">
                                <small class="text-muted">จำนวนเงิน:</small>
                                <div class="fw-bold text-success">฿${amount}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">วันครบกำหนด:</small>
                                <div class="fw-bold">${dueDate}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-end mt-3">
                            <button class="btn btn-sm btn-outline-primary" onclick="showDebtDetails('${debt.id}')">
                                <i class="fas fa-eye me-1"></i>ดูรายละเอียด
                            </button>
                        </div>
                    </div>
                `;
                mobileCardsContainer.innerHTML += mobileCard;
            }
        });
        
        
        // Refresh DataTable if it exists
        if ($.fn.DataTable && $.fn.DataTable.isDataTable('#debtsTable')) {
            $('#debtsTable').DataTable().clear().rows.add($(tableBody).find('tr')).draw();
        }
        
    } catch (error) {
        console.error('Error loading debts table:', error);
    }
}

// Load payment history table
function loadPaymentHistoryTable() {
    try {
        const tableBody = document.getElementById('debtorPaymentHistoryTableBody');
        const tableBodyMobile = document.getElementById('debtorPaymentHistoryTableBodyMobile');
        
        if (!tableBody || !tableBodyMobile) return;
        
        // Clear existing data
        tableBody.innerHTML = '';
        tableBodyMobile.innerHTML = '';
        
        if (paymentHistoryData.length === 0) {
            const noDataRow = '<tr><td colspan="5" class="text-center text-muted">ไม่มีประวัติการชำระเงิน</td></tr>';
            tableBody.innerHTML = noDataRow;
            tableBodyMobile.innerHTML = noDataRow;
            return;
        }
        
        // Populate table
        paymentHistoryData.forEach(payment => {
            const amount = payment.amount ? payment.amount.toLocaleString() : '0';
            const paymentDate = payment.paymentDate ? 
                (payment.paymentDate.toDate ? payment.paymentDate.toDate().toLocaleDateString('th-TH') : 
                 new Date(payment.paymentDate).toLocaleDateString('th-TH')) : '-';
            
            const row = `
                <tr>
                    <td>${payment.debtDescription || '-'}</td>
                    <td>${payment.creditorName || '-'}</td>
                    <td><span class="badge bg-success">ชำระแล้ว</span></td>
                    <td class="text-end">฿${amount}</td>
                    <td class="text-end">${paymentDate}</td>
                </tr>
            `;
            
            tableBody.innerHTML += row;
            tableBodyMobile.innerHTML += row;
        });
        
        
        // Refresh DataTable if it exists
        if ($.fn.DataTable && $.fn.DataTable.isDataTable('#paymentHistoryTable')) {
            $('#paymentHistoryTable').DataTable().clear().rows.add($(tableBody).find('tr')).draw();
        }
        
        // Refresh mobile cards after payment history is loaded
        if (window.mobileCardSystem) {
            setTimeout(() => {
                // Remove any existing emergency indicators first
                if (window.removeEmergencyIndicators) {
                    window.removeEmergencyIndicators();
                }
                
                window.mobileCardSystem.refreshCards();
                
                // Also fix payment history cards specifically
                if (window.fixPaymentHistoryMobileCards) {
                    window.fixPaymentHistoryMobileCards();
                }
            }, 200);
        }
        
    } catch (error) {
        console.error('Error loading payment history table:', error);
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    switch (status) {
        case 'pending':
            return '<span class="badge bg-warning">รอชำระ</span>';
        case 'overdue':
            return '<span class="badge bg-danger">เกินกำหนด</span>';
        case 'paid':
            return '<span class="badge bg-success">ชำระแล้ว</span>';
        default:
            return '<span class="badge bg-secondary">ไม่ระบุ</span>';
    }
}

// Show debt details modal
function showDebtDetails(debtId) {
    const debt = debtsData.find(d => d.id === debtId);
    if (!debt) {
        return;
    }
    
    
    // Update modal content with better data handling
    document.getElementById('modalCreditorName').textContent = debt.creditorName || debt.creditorEmail || '-';
    document.getElementById('modalDescription').textContent = debt.description || '-';
    document.getElementById('modalStatus').innerHTML = getStatusBadge(debt.status);
    
    // Better date handling
    const createdAt = debt.createdAt ? 
        (debt.createdAt.toDate ? debt.createdAt.toDate().toLocaleDateString('th-TH') : 
         new Date(debt.createdAt).toLocaleDateString('th-TH')) : '-';
    document.getElementById('modalCreatedDate').textContent = createdAt;
    
    const dueDate = debt.dueDate ? 
        (debt.dueDate.toDate ? debt.dueDate.toDate().toLocaleDateString('th-TH') : 
         new Date(debt.dueDate).toLocaleDateString('th-TH')) : '-';
    document.getElementById('modalDueDate').textContent = dueDate;
    
    // Financial data with better handling
    const principalAmount = debt.principal || debt.amount || 0;
    const interestRate = debt.interestRate || 0;
    
    // Calculate interest amount properly
    const interestAmount = calculateInterestAmount(debt, principalAmount, interestRate);
    const totalAmount = principalAmount + interestAmount;
    
    // Calculate paid amount from payment history
    const debtPayments = paymentHistoryData.filter(payment => payment.debtId === debt.id);
    const paidAmountFromHistory = debtPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const paidAmount = paidAmountFromHistory || debt.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    
    document.getElementById('modalPrincipal').textContent = `฿${principalAmount.toLocaleString()}`;
    document.getElementById('modalInterestRate').textContent = interestRate ? `${interestRate}%` : '-';
    
    // Add interest type display
    const interestType = debt.interestType || 'reducing'; // Default to reducing if not specified
    const translatedInterestType = getInterestTypeText(interestType);
    document.getElementById('modalInterestType').textContent = translatedInterestType;
    
    document.getElementById('modalInterest').textContent = `฿${interestAmount.toLocaleString()}`;
    document.getElementById('modalTotalAmount').textContent = `฿${totalAmount.toLocaleString()}`;
    document.getElementById('modalPaidAmount').textContent = `฿${paidAmount.toLocaleString()}`;
    document.getElementById('modalRemainingAmount').textContent = `฿${remainingAmount.toLocaleString()}`;
    
    // Additional data with better handling
    // Determine payment type based on available data
    let paymentType = debt.paymentType || debt.paymentMethod || debt.installmentType;
    
    // If no payment type specified but has installments, assume installment payment
    if (!paymentType && (debt.installments || debt.installmentCount || debt.installmentMonths)) {
        paymentType = 'installment';
    }
    
    const translatedPaymentType = getPaymentTypeText(paymentType);
    document.getElementById('modalPaymentType').textContent = translatedPaymentType;
    
    const installments = debt.installments || debt.installmentCount || debt.installmentMonths;
    document.getElementById('modalInstallments').textContent = installments ? `${installments} งวด` : '-';
    
    // Calculate monthly payment amount
    const monthlyPayment = installments && totalAmount > 0 ? Math.round(totalAmount / installments) : 0;
    document.getElementById('debtorModalMonthlyPaymentDetail').textContent = monthlyPayment > 0 ? `฿${monthlyPayment.toLocaleString()}` : '-';
    
    document.getElementById('modalNotes').textContent = debt.notes || '-';
    
    
    // Add sample data button if no payments exist
    const existingPayments = paymentHistoryData.filter(p => p.debtId === debt.id);
    if (existingPayments.length === 0) {
        addSampleDataButton(debt.id);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('debtDetailsModal'));
    setupModalAriaHandling(document.getElementById('debtDetailsModal'));
    modal.show();
}

// Add sample data button to modal footer
function addSampleDataButton(debtId) {
    const modalFooter = document.querySelector('#debtDetailsModal .modal-footer');
    if (!modalFooter) return;
    
    // Check if button already exists
    const existingButton = modalFooter.querySelector('#sampleDataBtn');
    if (existingButton) return;
    
    const sampleButton = document.createElement('button');
    sampleButton.id = 'sampleDataBtn';
    sampleButton.className = 'btn btn-info btn-sm me-2';
    sampleButton.innerHTML = '<i class="fas fa-flask me-1"></i>สร้างข้อมูลตัวอย่าง';
    sampleButton.onclick = () => {
        createSamplePaymentDataManually(debtId);
        // Close modal and reopen to show updated data
        const modal = bootstrap.Modal.getInstance(document.getElementById('debtDetailsModal'));
        modal.hide();
        setTimeout(() => {
            showDebtDetails(debtId);
        }, 300);
    };
    
    // Insert before the close button
    const closeButton = modalFooter.querySelector('button[data-bs-dismiss="modal"]');
    if (closeButton) {
        modalFooter.insertBefore(sampleButton, closeButton);
    } else {
        modalFooter.appendChild(sampleButton);
    }
}

// Calculate interest amount
function calculateInterestAmount(debt, principalAmount, interestRate) {
    try {
        // If no interest rate, return 0
        if (!interestRate || interestRate === 0) {
            return 0;
        }
        
        // If debt already has calculated interest, use it
        if (debt.interest && debt.interest > 0) {
            return debt.interest;
        }
        
        // Calculate interest based on interest type
        const interestType = debt.interestType || 'fixed';
        const interestPeriod = debt.interestPeriod || 'yearly';
        
        let interestAmount = 0;
        
        switch (interestType) {
            case 'fixed':
            case 'simple':
                // Simple interest calculation
                interestAmount = (principalAmount * interestRate) / 100;
                break;
                
            case 'reducing':
            case 'compound':
                // For reducing balance, calculate based on remaining principal
                const paidAmount = debt.paidAmount || 0;
                const remainingPrincipal = principalAmount - paidAmount;
                interestAmount = (remainingPrincipal * interestRate) / 100;
                break;
                
            default:
                // Default to simple interest
                interestAmount = (principalAmount * interestRate) / 100;
        }
        
        // Adjust based on period
        switch (interestPeriod) {
            case 'monthly':
                // Monthly interest - no adjustment needed
                break;
            case 'quarterly':
                // Quarterly interest - multiply by 3 months
                interestAmount = interestAmount * 3;
                break;
            case 'yearly':
                // Yearly interest - calculate based on time period
                if (debt.createdAt && debt.dueDate) {
                    const startDate = debt.createdAt.toDate ? debt.createdAt.toDate() : new Date(debt.createdAt);
                    const endDate = debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
                    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                     (endDate.getMonth() - startDate.getMonth());
                    const yearsDiff = monthsDiff / 12;
                    interestAmount = interestAmount * yearsDiff;
                }
                break;
            case 'total':
                // Total interest for entire period
                if (debt.createdAt && debt.dueDate) {
                    const startDate = debt.createdAt.toDate ? debt.createdAt.toDate() : new Date(debt.createdAt);
                    const endDate = debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
                    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                     (endDate.getMonth() - startDate.getMonth());
                    interestAmount = interestAmount * monthsDiff;
                }
                break;
        }
        
        
        return Math.max(0, interestAmount);
        
    } catch (error) {
        console.error('Error calculating interest amount:', error);
        return 0;
    }
}

// Get payment type text in Thai
function getPaymentTypeText(paymentType) {
    if (!paymentType) return '-';
    
    const paymentTypeMap = {
        'installment': 'ผ่อนชำระ',
        'installments': 'ผ่อนชำระ',
        'monthly': 'รายเดือน',
        'weekly': 'รายสัปดาห์',
        'daily': 'รายวัน',
        'lump_sum': 'ชำระครั้งเดียว',
        'lumpsum': 'ชำระครั้งเดียว',
        'full_payment': 'ชำระเต็มจำนวน',
        'partial': 'ชำระบางส่วน',
        'bank_transfer': 'โอนเงิน',
        'cash': 'เงินสด',
        'credit_card': 'บัตรเครดิต',
        'debit_card': 'บัตรเดบิต',
        'online': 'ออนไลน์',
        'mobile_banking': 'โมบายล์แบงก์กิ้ง',
        'qr_code': 'QR Code',
        'promptpay': 'พร้อมเพย์'
    };
    
    const lowerPaymentType = paymentType.toLowerCase();
    return paymentTypeMap[lowerPaymentType] || paymentType;
}

// Get interest type text in Thai
function getInterestTypeText(interestType) {
    if (!interestType) return '-';
    
    const interestTypeMap = {
        'fixed': 'ดอกเบี้ยคงที่',
        'simple': 'ดอกเบี้ยคงที่',
        'reducing': 'ดอกเบี้ยแบบลดต้นลดดอก',
        'compound': 'ดอกเบี้ยแบบลดต้นลดดอก',
        'flat': 'ดอกเบี้ยคงที่',
        'effective': 'ดอกเบี้ยแบบลดต้นลดดอก',
        'monthly': 'ดอกเบี้ยรายเดือน',
        'quarterly': 'ดอกเบี้ยรายไตรมาส',
        'yearly': 'ดอกเบี้ยรายปี',
        'total': 'ดอกเบี้ยรวมทั้งหมด'
    };
    
    const lowerInterestType = interestType.toLowerCase();
    return interestTypeMap[lowerInterestType] || interestType;
}

// Update element by ID
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        if (typeof value === 'number') {
            element.textContent = value.toLocaleString();
        } else {
            element.textContent = value;
        }
    } else {
        console.warn(`❌ Element with id '${id}' not found`);
    }
}

// Handle debtor logout button click
function handleDebtorLogoutClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple calls - enhanced protection
    if (window.logoutInProgress) {
        return false;
    }
    
    // Check if function has been called recently
    const now = Date.now();
    if (window.lastLogoutCall && (now - window.lastLogoutCall) < 2000) {
        return false;
    }
    
    window.lastLogoutCall = now;
    window.logoutInProgress = true;
    
    try {
        // Single confirmation
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            logoutUser().then(() => {
                window.location.href = '../../index.html';
            }).catch(error => {
                console.error('Logout error:', error);
                window.location.href = '../../index.html';
            }).finally(() => {
                // Reset the flag after logout
                setTimeout(() => {
                    window.logoutInProgress = false;
                }, 3000);
            });
        } else {
            window.logoutInProgress = false;
        }
    } catch (error) {
        console.error('Error in handleDebtorLogoutClick:', error);
        window.logoutInProgress = false;
    }
    
    return false;
}


// Show error message
function showErrorMessage(message) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Create sample payment data for testing (manual function)
function createSamplePaymentDataManually(debtId) {
    
    // Check if sample data already exists
    const existingSamplePayments = paymentHistoryData.filter(p => p.id && p.id.includes('sample-payment'));
    if (existingSamplePayments.length > 0) {
        // Remove existing sample data
        paymentHistoryData = paymentHistoryData.filter(p => !p.id || !p.id.includes('sample-payment'));
    }
    
    createSamplePaymentData(debtId);
    
    // Update dashboard after creating sample data
    setTimeout(() => {
        updateDashboardStatistics();
        updateCharts();
        loadDebtsTable();
        loadPaymentHistoryTable();
    }, 100);
    
}

// Force update dashboard data function
function forceUpdateDashboard() {
    
    // Reset data arrays
    debtsData = [];
    paymentHistoryData = [];
    
    // Create sample data
    createSampleDebtData();
    
    // Update UI immediately
    setTimeout(() => {
        updateDashboardStatistics();
    }, 100);
}


// Export functions for global use
window.handleDebtorLogoutClick = handleDebtorLogoutClick;
window.handleNavigation = handleNavigation;
window.showContentSection = showContentSection;
window.showDebtDetails = showDebtDetails;
window.loadDashboardData = loadDashboardData;
window.createSamplePaymentDataManually = createSamplePaymentDataManually;
window.forceUpdateDashboard = forceUpdateDashboard;
window.updateDashboardStatistics = updateDashboardStatistics;
