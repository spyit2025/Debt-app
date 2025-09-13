// Creditor Dashboard JavaScript - ES6 Modules Version
import { auth, db } from '../../js/firebase-config.js';
import { getCurrentUser, protectPage, displayUserInfo, logoutUser } from '../../js/auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Show alert function
function showAlert(message, type = 'info') {
    try {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-custom');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show alert-custom`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to page
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error showing alert:', error);
        // Fallback to browser alert
        alert(message);
    }
}

// Global variables
let currentUser = null;
let debtsData = [];
let paymentHistoryData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Protect page for creditor users only
    protectPage('creditor');
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data after user is initialized
    setTimeout(() => {
        loadDashboardData();
    }, 100);
    
    // Initialize mobile card system
    setTimeout(() => {
        if (typeof MobileCardSystem !== 'undefined') {
            window.mobileCardSystem = new MobileCardSystem();
        }
    }, 200);
    
    // Show dashboard by default
    showContentSection('#dashboard');
    
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
        
        // Setup mobile nav links
        setupMobileNavLinks();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout buttons - prevent duplicate listeners
    const logoutBtnDesktop = document.getElementById('logoutBtnDesktop');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    
    if (logoutBtnDesktop && !logoutBtnDesktop.hasAttribute('data-event-bound')) {
        logoutBtnDesktop.addEventListener('click', handleLogoutClick);
        logoutBtnDesktop.setAttribute('data-event-bound', 'true');
    }
    
    if (logoutBtnMobile && !logoutBtnMobile.hasAttribute('data-event-bound')) {
        logoutBtnMobile.addEventListener('click', handleLogoutClick);
        logoutBtnMobile.setAttribute('data-event-bound', 'true');
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        if (!link.hasAttribute('data-event-bound')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                handleNavigation(href);
            });
            link.setAttribute('data-event-bound', 'true');
        }
    });
    
    // Mobile menu navigation
    setupMobileMenuNavigation();
}

// Handle navigation
function handleNavigation(href) {
    // Update URL hash
    window.location.hash = href;
    
    // Show content section (this will handle active state)
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
    // Decode the href if it's encoded
    let decodedHref = href;
    try {
        decodedHref = decodeURIComponent(href);
    } catch (e) {
        // If decoding fails, use original href
        decodedHref = href;
    }
    
    // Hide all content sections
    const sections = ['creditor-dashboard-content', 'debts-content', 'payment-history-content', 'reports-content', 'creditor-settings-content'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('hidden');
        }
    });
    
    // Remove active class from all navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show the appropriate section
    let targetSectionId = 'creditor-dashboard-content'; // default
    let activeNavHref = '#dashboard'; // default active nav
    
    // Check both original and decoded href
    const checkHref = decodedHref || href;
    
    switch (checkHref) {
        case '#dashboard':
            targetSectionId = 'creditor-dashboard-content';
            activeNavHref = '#dashboard';
            break;
        case '#debts':
        case '#List of debtors':
        case '#List-of-debtors':
            targetSectionId = 'debts-content';
            activeNavHref = '#List-of-debtors';
            break;
        case '#payment-history':
            targetSectionId = 'payment-history-content';
            activeNavHref = '#payment-history';
            break;
        case '#reports':
            targetSectionId = 'reports-content';
            activeNavHref = '#reports';
            break;
        case '#settings':
            targetSectionId = 'creditor-settings-content';
            activeNavHref = '#settings';
            break;
    }
    
    // Add active class to the correct navigation link
    const activeLink = document.querySelector(`.nav-link[href="${activeNavHref}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    const targetSection = document.getElementById(targetSectionId);
    
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // Refresh mobile card system when section changes
        if (window.mobileCardSystem) {
            setTimeout(() => {
                window.mobileCardSystem.refreshCardContainers();
            }, 100);
        }
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
        
        
        // Wait for currentUser to be available
        if (!currentUser) {
            await new Promise(resolve => {
                const checkUser = () => {
                    if (currentUser) {
                        resolve();
                    } else {
                        setTimeout(checkUser, 50);
                    }
                };
                checkUser();
            });
        }
        
        
        
        // Load debts data
        await loadDebtsData();
        
        // Load payment history
        await loadPaymentHistory();
        
        // Update dashboard statistics
        updateDashboardStatistics();
        
        // Update payment statistics cards
        updatePaymentStatisticsCards();
        
        // Update charts
        updateCharts();
        
        // Load tables for each section
        loadDebtsTable();
        loadPaymentHistoryTable();
        
        // Initialize DataTables and mobile cards after tables are loaded
        setTimeout(() => {
            initializeDataTables();
            
            // Initialize mobile card system after DataTables
            if (window.mobileCardSystem) {
                setTimeout(() => {
                    window.mobileCardSystem.refreshCards();
                }, 300);
            }
        }, 100);
        
        // Load recent debts
        loadRecentDebts();
        
        // Load filter dropdowns
        loadFilterDropdowns();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// Load debts data
async function loadDebtsData() {
    try {
        if (!currentUser) return;
        
        const debtsQuery = query(
            collection(db, 'debts'),
            where('creditorId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(debtsQuery);
        debtsData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Validate that this is real data, not mock data
            if (data && typeof data === 'object' && !data.isMockData) {
                debtsData.push({ id: doc.id, ...data });
            }
        });
        
        // Log if no debts found
        if (debtsData.length === 0) {
        }
        
    } catch (error) {
        console.error('Error loading debts:', error);
        throw error;
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        if (!currentUser) {
            return;
        }
        
        // First try with orderBy (if index is ready)
        try {
            
            
            
            // First check if payments collection exists
            const allPaymentsQuery = query(collection(db, 'payments'));
            const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
            
            const paymentsQuery = query(
                collection(db, 'payments'),
                where('creditorId', '==', currentUser.uid),
                orderBy('paymentDate', 'desc'),
                limit(50)
            );
            
            const querySnapshot = await getDocs(paymentsQuery);
            paymentHistoryData = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Include all data (including test data)
                if (data && typeof data === 'object') {
                    paymentHistoryData.push({ id: doc.id, ...data });
                }
            });
        } catch (indexError) {
            // If index is not ready, fallback to query without orderBy
            
            try {
                const paymentsQuery = query(
                    collection(db, 'payments'),
                    where('creditorId', '==', currentUser.uid)
                );
                
                const querySnapshot = await getDocs(paymentsQuery);
                paymentHistoryData = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    
                    // Include all data (including test data)
                    if (data && typeof data === 'object') {
                        paymentHistoryData.push({ id: doc.id, ...data });
                    }
                });// Sort in JavaScript by paymentDate descending
                paymentHistoryData.sort((a, b) => {
                    const dateA = new Date(a.paymentDate || 0);
                    const dateB = new Date(b.paymentDate || 0);
                    return dateB - dateA;
                });
                
                // Limit to 50 items
                paymentHistoryData = paymentHistoryData.slice(0, 50);
                
                
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError.message);
                // If both queries fail, set empty array
                paymentHistoryData = [];
            }
        }
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        throw error;
    }
}

// Update dashboard statistics
function updateDashboardStatistics() {
    try {
        // Calculate statistics with interest
        const totalDebt = debtsData.reduce((sum, debt) => {
            const principalAmount = debt.amount || 0;
            const interestRate = debt.interestRate || 0;
            const interestAmount = (principalAmount * interestRate) / 100;
            return sum + principalAmount + interestAmount;
        }, 0);
        
        const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Also calculate from debt.paymentHistory if paymentHistoryData is empty
        let totalPaidFromDebts = 0;
        if (totalPaid === 0) {
            totalPaidFromDebts = debtsData.reduce((sum, debt) => {
                if (debt.paymentHistory && debt.paymentHistory.length > 0) {
                    return sum + debt.paymentHistory.reduce((debtSum, payment) => debtSum + (payment.amount || 0), 0);
                }
                return sum;
            }, 0);
        }
        
        const finalTotalPaid = totalPaid > 0 ? totalPaid : totalPaidFromDebts;
        const remainingDebt = totalDebt - finalTotalPaid;
        
        
        const activeDebts = debtsData.filter(debt => {
            const principalAmount = debt.amount || 0;
            const interestRate = debt.interestRate || 0;
            const interestAmount = (principalAmount * interestRate) / 100;
            return (principalAmount + interestAmount) > 0;
        }).length;
        
        const overdueDebts = debtsData.filter(debt => {
            const dueDate = new Date(debt.dueDate);
            const today = new Date();
            const principalAmount = debt.amount || 0;
            const interestRate = debt.interestRate || 0;
            const interestAmount = (principalAmount * interestRate) / 100;
            return dueDate < today && (principalAmount + interestAmount) > 0;
        }).length;
        
        // Update UI
        updateElement('totalDebt', totalDebt);
        updateElement('paidDebts', finalTotalPaid);
        updateElement('pendingDebts', activeDebts);
        updateElement('overdueDebts', overdueDebts);
        
        // Update additional statistics
        const uniqueDebtors = new Set(debtsData.map(debt => debt.debtorEmail)).size;
        const avgPaymentAmount = paymentHistoryData.length > 0 ? 
            Math.round(totalPaid / paymentHistoryData.length) : 0;
        
        updateElement('activeDebtors', uniqueDebtors);
        updateElement('avgPaymentAmount', avgPaymentAmount);
        
        // Update payment statistics cards
        updateElement('totalPayments', totalPaid);
        updateElement('totalPaymentCount', paymentHistoryData.length);
        
        // Calculate debtors who have made payments
        const debtorsWithPayments = new Set(paymentHistoryData.map(payment => payment.debtorEmail)).size;
        updateElement('activeDebtors', debtorsWithPayments);
        
        
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Update payment statistics cards specifically
function updatePaymentStatisticsCards() {
    try {
        // Calculate payment statistics
        const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const paymentCount = paymentHistoryData.length;
        const debtorsWithPayments = new Set(paymentHistoryData.map(payment => payment.debtorEmail)).size;
        const avgPaymentAmount = paymentCount > 0 ? Math.round(totalPaid / paymentCount) : 0;
        
        // Update card elements
        updateElement('totalPayments', totalPaid);
        updateElement('totalPaymentCount', paymentCount);
        updateElement('activeDebtors', debtorsWithPayments);
        updateElement('avgPaymentAmount', avgPaymentAmount);
        
    } catch (error) {
        console.error('Error updating payment statistics cards:', error);
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
        const ctx = document.getElementById('creditorDebtStatusChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        Chart.getChart(ctx)?.destroy();
        
        // Get current filters
        const filters = window.currentFilters || {};
        
        // Filter debts based on current filters
        const filteredDebts = debtsData.filter(debt => passesDebtFilters(debt, filters));
        
        let totalPaid = 0;
        let totalRemaining = 0;
        
        filteredDebts.forEach(debt => {
            const principalAmount = debt.amount || 0;
            const interestRate = debt.interestRate || 0;
            const interestAmount = (principalAmount * interestRate) / 100;
            const totalAmount = principalAmount + interestAmount;
            
            // Calculate total paid for this debt
            let debtPaid = 0;
            if (debt.paymentHistory && debt.paymentHistory.length > 0) {
                debtPaid = debt.paymentHistory.reduce((sum, payment) => {
                    // Apply payment filters
                    if (!passesPaymentFilters(payment, filters)) return sum;
                    return sum + (payment.amount || 0);
                }, 0);
            }
            
            const remaining = totalAmount - debtPaid;
            totalPaid += debtPaid;
            totalRemaining += remaining;
        });
        
        // If no data, show empty chart
        if (totalPaid === 0 && totalRemaining === 0) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['ไม่มีข้อมูล'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#6c757d'],
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
            return;
        }
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['ชำระแล้ว', 'คงเหลือ'],
                datasets: [{
                    data: [totalPaid, totalRemaining],
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ฿' + context.parsed.toLocaleString('th-TH');
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error updating debt status chart:', error);
    }
}

// Update payment trend chart
function updatePaymentTrendChart() {
    try {
        const ctx = document.getElementById('monthlyDebtChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        Chart.getChart(ctx)?.destroy();
        
        // Group payments by month
        const monthlyPayments = {};
        
        // Get current filters
        const filters = window.currentFilters || {};
        
        // First try to use paymentHistoryData
        if (paymentHistoryData.length > 0) {
            paymentHistoryData.forEach(payment => {
                // Apply filters
                if (!passesFilters(payment, filters)) return;
                
                let date;
                
                // Better date handling - check multiple date fields
                if (payment.paymentDate) {
                    date = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
                } else if (payment.date) {
                    date = payment.date.toDate ? payment.date.toDate() : new Date(payment.date);
                } else if (payment.createdAt) {
                    date = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
                } else {
                    return; // Skip if no valid date
                }
                
                // Validate date
                if (isNaN(date.getTime())) {
                    return; // Skip invalid dates
                }
                
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyPayments[monthKey]) {
                    monthlyPayments[monthKey] = 0;
                }
                monthlyPayments[monthKey] += payment.amount || 0;
            });
        } else {
            // Fallback: use payment data from debt.paymentHistory
            debtsData.forEach(debt => {
                // Apply debt filters first
                if (!passesDebtFilters(debt, filters)) return;
                
                if (debt.paymentHistory && debt.paymentHistory.length > 0) {
                    debt.paymentHistory.forEach(payment => {
                        // Apply payment filters
                        if (!passesPaymentFilters(payment, filters)) return;
                        
                        let date;
                        
                        // Better date handling - check multiple date fields
                        if (payment.paymentDate) {
                            date = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
                        } else if (payment.date) {
                            date = payment.date.toDate ? payment.date.toDate() : new Date(payment.date);
                        } else if (payment.createdAt) {
                            date = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
                        } else {
                            return; // Skip if no valid date
                        }
                        
                        // Validate date
                        if (isNaN(date.getTime())) {
                            return; // Skip invalid dates
                        }
                        
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        
                        if (!monthlyPayments[monthKey]) {
                            monthlyPayments[monthKey] = 0;
                        }
                        monthlyPayments[monthKey] += payment.amount || 0;
                    });
                }
            });
        }
        
        const labels = Object.keys(monthlyPayments).sort();
        const data = labels.map(label => monthlyPayments[label]);
        
        // If no data, show empty chart
        if (labels.length === 0) {
            // Check if we have any payment history in debts
            const hasPaymentHistory = debtsData.some(debt => debt.paymentHistory && debt.paymentHistory.length > 0);
            const emptyMessage = hasPaymentHistory ? 'ไม่มีข้อมูลการชำระที่ถูกต้อง' : 'ไม่มีข้อมูลการชำระ';
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [emptyMessage],
                    datasets: [{
                        label: 'การชำระเงิน (บาท)',
                        data: [0],
                        borderColor: '#6c757d',
                        backgroundColor: 'rgba(108, 117, 125, 0.1)',
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
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
            
            // Hide loading indicator
            const loading = document.getElementById('monthlyDebtChartLoading');
            if (loading) {
                loading.style.display = 'none';
            }
            
            return;
        }
        
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
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('th-TH') + ' บาท';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('th-TH') + ' บาท';
                            }
                        }
                    }
                }
            }
        });
        
        // Hide loading indicator
        const loading = document.getElementById('monthlyDebtChartLoading');
        if (loading) {
            loading.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error updating payment trend chart:', error);
        
        // Hide loading indicator
        const loading = document.getElementById('monthlyDebtChartLoading');
        if (loading) {
            loading.style.display = 'none';
        }
        
        // Show error message on chart
        const ctx = document.getElementById('monthlyDebtChart');
        if (ctx) {
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            ctx.getContext('2d').fillStyle = '#6c757d';
            ctx.getContext('2d').font = '14px Arial';
            ctx.getContext('2d').textAlign = 'center';
            ctx.getContext('2d').fillText('เกิดข้อผิดพลาดในการโหลดกราฟ', ctx.width / 2, ctx.height / 2);
        }
    }
}

// Helper functions for filtering
function passesFilters(payment, filters) {
    // Filter by debtor
    if (filters.debtor && payment.debtorName && payment.debtorEmail) {
        const debtorMatch = payment.debtorName.toLowerCase().includes(filters.debtor.toLowerCase()) ||
                          payment.debtorEmail.toLowerCase().includes(filters.debtor.toLowerCase());
        if (!debtorMatch) return false;
    }
    
    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
        let paymentDate;
        if (payment.paymentDate) {
            paymentDate = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        } else if (payment.date) {
            paymentDate = payment.date.toDate ? payment.date.toDate() : new Date(payment.date);
        } else if (payment.createdAt) {
            paymentDate = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
        } else {
            return false; // No valid date
        }
        
        if (filters.dateFrom && paymentDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && paymentDate > new Date(filters.dateTo)) return false;
    }
    
    // Filter by amount range
    if (filters.amountRange && payment.amount) {
        const amount = payment.amount;
        switch (filters.amountRange) {
            case '0-10000':
                if (amount > 10000) return false;
                break;
            case '10000-50000':
                if (amount < 10000 || amount > 50000) return false;
                break;
            case '50000-100000':
                if (amount < 50000 || amount > 100000) return false;
                break;
            case '100000+':
                if (amount < 100000) return false;
                break;
        }
    }
    
    return true;
}

function passesDebtFilters(debt, filters) {
    // Filter by debtor
    if (filters.debtor && debt.debtorName && debt.debtorEmail) {
        const debtorMatch = debt.debtorName.toLowerCase().includes(filters.debtor.toLowerCase()) ||
                          debt.debtorEmail.toLowerCase().includes(filters.debtor.toLowerCase());
        if (!debtorMatch) return false;
    }
    
    // Filter by status
    if (filters.status) {
        const debtStatus = getDebtStatus(debt);
        if (debtStatus !== filters.status) return false;
    }
    
    // Filter by amount range
    if (filters.amountRange && debt.amount) {
        const amount = debt.amount;
        switch (filters.amountRange) {
            case '0-10000':
                if (amount > 10000) return false;
                break;
            case '10000-50000':
                if (amount < 10000 || amount > 50000) return false;
                break;
            case '50000-100000':
                if (amount < 50000 || amount > 100000) return false;
                break;
            case '100000+':
                if (amount < 100000) return false;
                break;
        }
    }
    
    return true;
}

function passesPaymentFilters(payment, filters) {
    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
        let paymentDate;
        if (payment.paymentDate) {
            paymentDate = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        } else if (payment.date) {
            paymentDate = payment.date.toDate ? payment.date.toDate() : new Date(payment.date);
        } else if (payment.createdAt) {
            paymentDate = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
        } else {
            return false; // No valid date
        }
        
        if (filters.dateFrom && paymentDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && paymentDate > new Date(filters.dateTo)) return false;
    }
    
    // Filter by amount range
    if (filters.amountRange && payment.amount) {
        const amount = payment.amount;
        switch (filters.amountRange) {
            case '0-10000':
                if (amount > 10000) return false;
                break;
            case '10000-50000':
                if (amount < 10000 || amount > 50000) return false;
                break;
            case '50000-100000':
                if (amount < 50000 || amount > 100000) return false;
                break;
            case '100000+':
                if (amount < 100000) return false;
                break;
        }
    }
    
    return true;
}

function getDebtStatus(debt) {
    const principalAmount = debt.amount || 0;
    const interestRate = debt.interestRate || 0;
    const interestAmount = (principalAmount * interestRate) / 100;
    const totalAmount = principalAmount + interestAmount;
    
    // Calculate total paid
    let totalPaid = 0;
    if (debt.paymentHistory && debt.paymentHistory.length > 0) {
        totalPaid = debt.paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }
    
    const remaining = totalAmount - totalPaid;
    
    if (remaining <= 0) {
        return 'paid';
    } else if (debt.dueDate) {
        const dueDate = debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
        const today = new Date();
        if (today > dueDate) {
            return 'overdue';
        }
    }
    
    return 'active';
}

// Utility functions
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        if (typeof value === 'number') {
            element.textContent = value.toLocaleString();
        } else {
            element.textContent = value;
        }
    }
}

// Handle logout button click
function handleLogoutClick(e) {
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
        console.error('Error in handleLogoutClick:', error);
        window.logoutInProgress = false;
    }
    
    return false;
}

// Confirm logout (legacy function - kept for compatibility)
function confirmLogout() {
    // Redirect to new handler
    handleLogoutClick({ preventDefault: () => {}, stopPropagation: () => {} });
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

// Load debts table
function loadDebtsTable() {
    try {
        const tableBody = document.getElementById('debtsTableBody');
        
        if (!tableBody) {
            return;
        }
        
        // Clear existing data
        tableBody.innerHTML = '';
        
        if (debtsData.length === 0) {
            const noDataRow = '<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูลหนี้</td></tr>';
            tableBody.innerHTML = noDataRow;
            return;
        }
        
        // Populate table
        debtsData.forEach(debt => {
            const statusBadge = getStatusBadge(debt.status);
            
            // Calculate total amount with interest using proper calculation
            const principalAmount = debt.amount || 0;
            const interestAmount = calculateInterest(debt, 0); // 0 = no payments yet
            const totalAmountWithInterest = principalAmount + interestAmount;
            
            const amount = totalAmountWithInterest.toLocaleString();
            const dueDate = debt.dueDate ? 
                (debt.dueDate.toDate ? debt.dueDate.toDate().toLocaleDateString('th-TH') : 
                 new Date(debt.dueDate).toLocaleDateString('th-TH')) : '-';
            
            const row = `
                <tr>
                    <td>${debt.debtorName || debt.debtorEmail || '-'}</td>
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
        });
        
        // Refresh mobile cards after loading debts table
        if (window.mobileCardSystem) {
            setTimeout(() => {
                window.mobileCardSystem.refreshCards();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error loading debts table:', error);
    }
}

// Load payment history table
function loadPaymentHistoryTable() {
    try {
        
        
        const tableBody = document.getElementById('creditorPaymentHistoryTableBody');
        
        if (!tableBody) {
            return;
        }
        
        // Clear existing data
        tableBody.innerHTML = '';
        
        // If paymentHistoryData is empty, try to get data from debt.paymentHistory
        let allPayments = [...paymentHistoryData];
        if (paymentHistoryData.length === 0) {
            debtsData.forEach(debt => {
                if (debt.paymentHistory && debt.paymentHistory.length > 0) {
                    debt.paymentHistory.forEach(payment => {
                        allPayments.push({
                            ...payment,
                            debtId: debt.id,
                            debtorName: debt.debtorName || debt.debtorEmail,
                            debtorEmail: debt.debtorEmail
                        });
                    });
                }
            });
        }
        
        if (allPayments.length === 0) {
            // Create proper no data row with all 7 columns (no colspan)
            const noDataRow = `
                <tr>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center text-muted">ไม่มีข้อมูลการชำระ</td>
                    <td class="text-center text-muted">-</td>
                </tr>
            `;
            tableBody.innerHTML = noDataRow;
            return;
        }
        
        
        // Populate table
        allPayments.forEach((payment, index) => {
            const amount = payment.amount ? payment.amount.toLocaleString() : '0';
            
            // Better date handling - check multiple date fields
            let paymentDate = '-';
            let dateToProcess = payment.paymentDate || payment.date || payment.createdAt;
            
            
            if (dateToProcess) {
                try {
                    if (dateToProcess.toDate) {
                        // Firestore Timestamp
                        paymentDate = dateToProcess.toDate().toLocaleDateString('th-TH');
                    } else if (typeof dateToProcess === 'string') {
                        // String date
                        paymentDate = new Date(dateToProcess).toLocaleDateString('th-TH');
                    } else if (dateToProcess instanceof Date) {
                        // Date object
                        paymentDate = dateToProcess.toLocaleDateString('th-TH');
                    } else {
                        // Try to parse as date
                        paymentDate = new Date(dateToProcess).toLocaleDateString('th-TH');
                    }
                } catch (error) {
                    console.error('Error parsing payment date:', dateToProcess, error);
                    paymentDate = '-';
                }
            }
            
            
            const method = getPaymentMethodText(payment.paymentMethod);
            
            const row = `
                <tr>
                    <td>${payment.id || `PAY-${index + 1}`}</td>
                    <td>${paymentDate}</td>
                    <td>${payment.debtorName || payment.debtorEmail || '-'}</td>
                    <td>${payment.installmentNumber || '-'}</td>
                    <td class="text-end">฿${amount}</td>
                    <td>${payment.description || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="showPaymentDetails('${payment.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tableBody.innerHTML += row;
        });
        
        
        
        // Refresh mobile cards after payment history is loaded
        if (window.mobileCardSystem) {
            setTimeout(() => {
                
                window.mobileCardSystem.refreshCards();
            }, 200);
        }
        
    } catch (error) {
        console.error('Error loading payment history table:', error);
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        'active': '<span class="badge bg-success">ใช้งาน</span>',
        'paid': '<span class="badge bg-primary">ชำระแล้ว</span>',
        'overdue': '<span class="badge bg-danger">เกินกำหนด</span>',
        'cancelled': '<span class="badge bg-secondary">ยกเลิก</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">ไม่ระบุ</span>';
}

// Get payment method text
function getPaymentMethodText(method) {
    const methodMap = {
        'bank_transfer': 'โอนเงิน',
        'cash': 'เงินสด',
        'check': 'เช็ค',
        'credit_card': 'บัตรเครดิต'
    };
    return methodMap[method] || method || 'ไม่ระบุ';
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
        if ($.fn.DataTable && $('#debtsTable').length > 0) {
            // Destroy existing DataTable if it exists
            if ($.fn.DataTable.isDataTable('#debtsTable')) {
                $('#debtsTable').DataTable().destroy();
            }
            
            $('#debtsTable').DataTable({
                responsive: true,
                language: thaiLanguageConfig,
                pageLength: 10,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "ทั้งหมด"]],
                order: [[4, 'desc']], // Sort by due date descending
                columnDefs: [
                    { orderable: false, targets: [5] }, // Disable sorting on action column
                    { className: "text-truncate", targets: [0, 1] }, // Truncate long text
                    { className: "text-center", targets: [2, 5] }, // Center align status and action
                    { className: "text-end", targets: [3, 4] }, // Right align numbers and dates
                    { width: "25%", targets: [0] }, // ชื่อลูกหนี้ - ให้พื้นที่มากขึ้น
                    { width: "30%", targets: [1] }, // คำอธิบาย - ให้พื้นที่มากขึ้น
                    { width: "12%", targets: [2] }, // สถานะ - ลดความกว้าง
                    { width: "15%", targets: [3] }, // จำนวนเงิน - เหมาะสม
                    { width: "13%", targets: [4] }, // วันครบกำหนด - ลดความกว้าง
                    { width: "5%", targets: [5] }  // รายละเอียด - ลดความกว้างให้เหลือแค่ปุ่ม
                ],
                scrollX: true,
                autoWidth: false,
                fixedColumns: {
                    leftColumns: 1
                },
                // Enhanced features
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                     '<"row"<"col-sm-12"tr>>' +
                     '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                stateSave: true, // Save table state (sorting, page, etc.)
                processing: true, // Show processing indicator
                deferRender: true, // Improve performance for large datasets
                // Custom search functionality
                search: {
                    smart: true,
                    regex: false,
                    caseInsensitive: true
                },
                // Enhanced pagination
                pagingType: "simple_numbers",
                // Row highlighting
                rowCallback: function(row, data, index) {
                    // Add hover effects
                    $(row).hover(
                        function() { $(this).addClass('table-active'); },
                        function() { $(this).removeClass('table-active'); }
                    );
                    
                    // Highlight overdue debts
                    const dueDate = data[4];
                    if (dueDate && dueDate !== '-') {
                        const dueDateObj = new Date(dueDate.split('/').reverse().join('-'));
                        const today = new Date();
                        if (dueDateObj < today) {
                            $(row).addClass('table-danger');
                        }
                    }
                }
            });
        }
        
        // Add export functionality
        window.exportDebtsData = function(format) {
            try {
                const table = $('#debtsTable').DataTable();
                
                if (format === 'excel') {
                    // Export to Excel using SheetJS
                    const data = table.data().toArray();
                    const headers = ['ชื่อลูกหนี้', 'คำอธิบาย', 'สถานะ', 'จำนวนเงิน', 'วันครบกำหนด'];
                    
                    // Create Excel data
                    const excelData = [headers];
                    data.forEach(row => {
                        excelData.push([
                            row[0], // ชื่อลูกหนี้
                            row[1], // คำอธิบาย
                            row[2].replace(/<[^>]*>/g, ''), // สถานะ (remove HTML)
                            row[3], // จำนวนเงิน
                            row[4]  // วันครบกำหนด
                        ]);
                    });
                    
                    // Convert to CSV and download
                    const csvContent = excelData.map(row => 
                        row.map(cell => `"${cell}"`).join(',')
                    ).join('\n');
                    
                    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `รายการหนี้_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;
                    link.click();
                    
                    showAlert('ส่งออกข้อมูลเป็น Excel สำเร็จ', 'success');
                    
                } else if (format === 'pdf') {
                    // Export to PDF using jsPDF
                    if (typeof jsPDF !== 'undefined') {
                        const { jsPDF } = window.jspdf;
                        const doc = new jsPDF();
                        
                        // Add title
                        doc.setFontSize(16);
                        doc.text('รายการหนี้ทั้งหมด', 14, 22);
                        
                        // Add date
                        doc.setFontSize(10);
                        doc.text(`วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}`, 14, 30);
                        
                        // Add table
                        const data = table.data().toArray();
                        const headers = ['ชื่อลูกหนี้', 'คำอธิบาย', 'สถานะ', 'จำนวนเงิน', 'วันครบกำหนด'];
                        
                        // Prepare data for PDF
                        const pdfData = data.map(row => [
                            row[0], // ชื่อลูกหนี้
                            row[1], // คำอธิบาย
                            row[2].replace(/<[^>]*>/g, ''), // สถานะ (remove HTML)
                            row[3], // จำนวนเงิน
                            row[4]  // วันครบกำหนด
                        ]);
                        
                        // Simple table implementation
                        let y = 40;
                        doc.setFontSize(8);
                        
                        // Headers
                        headers.forEach((header, i) => {
                            doc.text(header, 14 + (i * 35), y);
                        });
                        y += 10;
                        
                        // Data rows
                        pdfData.forEach(row => {
                            row.forEach((cell, i) => {
                                const text = cell.length > 15 ? cell.substring(0, 15) + '...' : cell;
                                doc.text(text, 14 + (i * 35), y);
                            });
                            y += 8;
                            
                            // Add new page if needed
                            if (y > 280) {
                                doc.addPage();
                                y = 20;
                            }
                        });
                        
                        // Save PDF
                        doc.save(`รายการหนี้_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.pdf`);
                        showAlert('ส่งออกข้อมูลเป็น PDF สำเร็จ', 'success');
                        
                    } else {
                        showAlert('ไม่พบไลบรารี PDF กรุณาติดตั้ง jsPDF', 'error');
                    }
                }
                
            } catch (error) {
                console.error('Error exporting data:', error);
                showAlert('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'error');
            }
        };
        
        // Advanced filtering functions
        window.filterByStatus = function() {
            const statusFilter = document.getElementById('statusFilter').value;
            const table = $('#debtsTable').DataTable();
            
            if (statusFilter === '') {
                table.column(2).search('').draw();
            } else {
                let searchTerm = '';
                switch(statusFilter) {
                    case 'active':
                        searchTerm = 'ใช้งาน';
                        break;
                    case 'inactive':
                        searchTerm = 'ไม่ใช้งาน';
                        break;
                    case 'completed':
                        searchTerm = 'ชำระครบแล้ว';
                        break;
                }
                table.column(2).search(searchTerm).draw();
            }
        };
        
        window.filterByAmount = function() {
            const amountFilter = document.getElementById('amountFilter').value;
            const table = $('#debtsTable').DataTable();
            
            if (amountFilter === '') {
                table.column(3).search('').draw();
            } else {
                // Custom search function for amount ranges
                $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
                    if (settings.nTable.id !== 'debtsTable') return true;
                    
                    const amount = data[3].replace(/[฿,]/g, '');
                    const amountNum = parseFloat(amount);
                    
                    switch(amountFilter) {
                        case '0-10000':
                            return amountNum >= 0 && amountNum <= 10000;
                        case '10000-50000':
                            return amountNum > 10000 && amountNum <= 50000;
                        case '50000-100000':
                            return amountNum > 50000 && amountNum <= 100000;
                        case '100000+':
                            return amountNum > 100000;
                        default:
                            return true;
                    }
                });
                table.draw();
                $.fn.dataTable.ext.search.pop(); // Remove the custom search function
            }
        };
        
        window.filterByDueDate = function() {
            const dueDateFilter = document.getElementById('dueDateFilter').value;
            const table = $('#debtsTable').DataTable();
            
            if (dueDateFilter === '') {
                table.column(4).search('').draw();
            } else {
                // Custom search function for date ranges
                $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
                    if (settings.nTable.id !== 'debtsTable') return true;
                    
                    const dueDateStr = data[4];
                    if (dueDateStr === '-') return false;
                    
                    // Convert Thai date format to Date object
                    const dateParts = dueDateStr.split('/');
                    const dueDate = new Date(parseInt(dateParts[2]) - 543, parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                    const today = new Date();
                    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                    
                    switch(dueDateFilter) {
                        case 'overdue':
                            return dueDate < today;
                        case 'thisWeek':
                            return dueDate >= today && dueDate <= oneWeekFromNow;
                        case 'thisMonth':
                            return dueDate >= today && dueDate <= oneMonthFromNow;
                        case 'nextMonth':
                            return dueDate > oneMonthFromNow;
                        default:
                            return true;
                    }
                });
                table.draw();
                $.fn.dataTable.ext.search.pop(); // Remove the custom search function
            }
        };
        
        window.resetFilters = function() {
            // Reset all filter dropdowns
            document.getElementById('statusFilter').value = '';
            document.getElementById('amountFilter').value = '';
            document.getElementById('dueDateFilter').value = '';
            
            // Reset table search
            const table = $('#debtsTable').DataTable();
            table.search('').columns().search('').draw();
            
            showAlert('รีเซ็ตตัวกรองเรียบร้อย', 'info');
        };
            
            // Initialize payment history table
        if ($.fn.DataTable && $('#mainPaymentHistoryTable').length > 0) {
            // Destroy existing DataTable if it exists
            if ($.fn.DataTable.isDataTable('#mainPaymentHistoryTable')) {
                $('#mainPaymentHistoryTable').DataTable().destroy();
            }
            
            // Check if table has actual data rows (not just the "no data" row)
            const tableBody = $('#mainPaymentHistoryTable tbody');
            const rows = tableBody.find('tr');
            const hasData = rows.length > 0 && 
                           !rows.first().find('td').attr('colspan') &&
                           !rows.first().text().includes('ไม่มีข้อมูลการชำระ');
            
            
            
            if (hasData) {
                // Initialize DataTable only if not already initialized
                if (!$.fn.DataTable.isDataTable('#mainPaymentHistoryTable')) {
                    $('#mainPaymentHistoryTable').DataTable({
                        responsive: true,
                        language: thaiLanguageConfig,
                        pageLength: 10,
                        order: [[1, 'desc']], // Sort by payment date descending
                        columnDefs: [
                            { orderable: false, targets: [6] }, // Disable sorting on action column
                            { className: "text-truncate", targets: [0, 2, 5] }, // Truncate long text (รหัส, ชื่อลูกหนี้, หมายเหตุ)
                            { className: "text-center", targets: [3, 6] }, // Center align installment and action
                            { className: "text-end", targets: [1, 4] }, // Right align dates and amounts
                            { width: "15%", targets: [0] }, // รหัสการชำระ
                            { width: "20%", targets: [1] }, // วันที่และเวลาชำระ
                            { width: "20%", targets: [2] }, // ชื่อลูกหนี้
                            { width: "10%", targets: [3] }, // งวดที่
                            { width: "15%", targets: [4] }, // จำนวนเงิน
                            { width: "15%", targets: [5] }, // หมายเหตุ
                            { width: "5%", targets: [6] }   // การดำเนินการ
                        ],
                        scrollX: true,
                        autoWidth: false,
                        fixedColumns: {
                            leftColumns: 1
                        }
                    });
                }
                
                // Add event listener for DataTable redraw to refresh mobile cards
                const dataTable = window.jQuery('#mainPaymentHistoryTable').DataTable();
                if (dataTable) {
                    dataTable.on('draw', function() {
                        if (window.mobileCardSystem) {
                            setTimeout(() => {
                                window.mobileCardSystem.refreshCards();
                            }, 100);
                        }
                    });
                }
            } else {
                
            }
            
        // Always refresh mobile cards after table is processed (with or without data)
        if (window.mobileCardSystem) {
            setTimeout(() => {
                
                window.mobileCardSystem.refreshCards();
            }, 300); // Increased delay to ensure DataTable is ready
        }
        }
    } catch (error) {
        console.error('Error initializing DataTables:', error);
    }
}

// Load recent debts for dashboard
function loadRecentDebts() {
    try {
        const recentDebtsContainer = document.getElementById('recentDebtsList');
        if (!recentDebtsContainer) return;
        
        // Clear existing content
        recentDebtsContainer.innerHTML = '';
        
        if (debtsData.length === 0) {
            recentDebtsContainer.innerHTML = `
                <div class="debt-item">
                    <div class="row align-items-center">
                        <div class="col-md-1">
                            <div class="user-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                        </div>
                        <div class="col-md-3">
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
                            <button class="btn btn-sm btn-outline-primary" disabled>
                                <i class="fas fa-eye me-1"></i>ดูรายละเอียด
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Show only the first 5 recent debts
        const recentDebts = debtsData.slice(0, 5);
        
        recentDebts.forEach(debt => {
            const statusBadge = getStatusBadge(debt.status);
            
            // Calculate total amount with interest
            const principalAmount = debt.amount || 0;
            const interestRate = debt.interestRate || 0;
            const interestAmount = (principalAmount * interestRate) / 100;
            const totalAmountWithInterest = principalAmount + interestAmount;
            
            const amount = totalAmountWithInterest.toLocaleString();
            const dueDate = debt.dueDate ? 
                (debt.dueDate.toDate ? debt.dueDate.toDate().toLocaleDateString('th-TH') : 
                 new Date(debt.dueDate).toLocaleDateString('th-TH')) : '-';
            
            const debtItem = document.createElement('div');
            debtItem.className = 'debt-item';
            debtItem.innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-1">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <h6 class="mb-1">${debt.debtorName || debt.debtorEmail || '-'}</h6>
                        <small class="text-muted">${debt.description || '-'}</small>
                    </div>
                    <div class="col-md-2">
                        ${statusBadge}
                    </div>
                    <div class="col-md-2 text-end">
                        <strong>฿${amount}</strong>
                    </div>
                    <div class="col-md-2 text-end">
                        <small class="text-muted">${dueDate}</small>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="showDebtDetails('${debt.id}')">
                            <i class="fas fa-eye me-1"></i>ดูรายละเอียด
                        </button>
                    </div>
                </div>
            `;
            
            recentDebtsContainer.appendChild(debtItem);
        });
        
    } catch (error) {
        console.error('Error loading recent debts:', error);
    }
}

// Show debt details
function showDebtDetails(debtId) {
    try {
        // Find debt data
        const debt = debtsData.find(d => d.id === debtId);
        if (!debt) {
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('debtDetailsModal');
        if (!modal) {
            modal = createDebtDetailsModal();
            document.body.appendChild(modal);
        }
        
        // Populate debt details
        populateDebtDetails(debt);
        
        // Show the modal
        const bootstrapModal = new bootstrap.Modal(modal);
        setupModalAriaHandling(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('Error showing debt details:', error);
        showAlert('เกิดข้อผิดพลาดในการแสดงรายละเอียดหนี้', 'error');
    }
}

// Create debt details modal HTML
function createDebtDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'debtDetailsModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'debtDetailsModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    
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
                    <div id="debtDetailsContent">
                        <!-- Debt details will be loaded here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-success" onclick="recordPayment()">
                        <i class="fas fa-money-bill-wave me-2"></i>ชำระหนี้
                    </button>
                    <button type="button" class="btn btn-warning" onclick="editDebt()">
                        <i class="fas fa-edit me-2"></i>แก้ไข
                    </button>
                    <button type="button" class="btn btn-danger" onclick="deleteDebt()">
                        <i class="fas fa-trash me-2"></i>ลบ
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Populate debt details
function populateDebtDetails(debt) {
    const content = document.getElementById('debtDetailsContent');
    if (!content) return;
    
    // Format dates
    const createdAt = debt.createdAt ? 
        (debt.createdAt.toDate ? debt.createdAt.toDate().toLocaleDateString('th-TH') : 
         new Date(debt.createdAt).toLocaleDateString('th-TH')) : '-';
    
    const dueDate = debt.dueDate ? 
        (debt.dueDate.toDate ? debt.dueDate.toDate().toLocaleDateString('th-TH') : 
         new Date(debt.dueDate).toLocaleDateString('th-TH')) : '-';
    
    // Get payment history for this debt
    const debtPayments = paymentHistoryData.filter(p => p.debtId === debt.id);
    const totalPaid = debtPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate interest and total amount
    const principalAmount = debt.amount || 0;
    const interestRate = debt.interestRate || 0;
    const interestAmount = calculateInterest(debt, totalPaid);
    const totalAmountWithInterest = principalAmount + interestAmount;
    const remainingAmount = totalAmountWithInterest - totalPaid;
    
    content.innerHTML = `
        <!-- First Row: Debtor Info and Financial Summary -->
        <div class="row mb-3">
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0"><i class="fas fa-user me-2"></i>ข้อมูลลูกหนี้</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <strong>ชื่อ:</strong><br>
                            <span class="text-primary">${debt.debtorName || '-'}</span>
                        </div>
                        <div class="mb-2">
                            <strong>อีเมล:</strong><br>
                            <small class="text-muted">${debt.debtorEmail || '-'}</small>
                        </div>
                        <div class="mb-0">
                            <strong>สถานะ:</strong><br>
                            ${getStatusBadge(debt.status)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0"><i class="fas fa-money-bill-wave me-2"></i>สรุปการเงิน</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 text-center">
                                <div class="border-end pe-3">
                                    <h5 class="text-primary mb-1">฿${principalAmount.toLocaleString()}</h5>
                                    <small class="text-muted">เงินต้น</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="border-end pe-3">
                                    <h5 class="text-warning mb-1">฿${interestAmount.toLocaleString()}</h5>
                                    <small class="text-muted">ดอกเบี้ย</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <div class="border-end pe-3">
                                    <h5 class="text-info mb-1">฿${totalPaid.toLocaleString()}</h5>
                                    <small class="text-muted">ชำระแล้ว</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center">
                                <h5 class="text-danger mb-1">฿${remainingAmount.toLocaleString()}</h5>
                                <small class="text-muted">คงเหลือ</small>
                            </div>
                        </div>
                        <hr class="my-3">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>ยอดรวมทั้งหมด:</strong>
                                <h4 class="text-primary mb-0">฿${totalAmountWithInterest.toLocaleString()}</h4>
                            </div>
                            <div class="col-md-6">
                                <strong>ความคืบหน้า:</strong>
                                <div class="progress mt-1" style="height: 10px;">
                                    <div class="progress-bar bg-success" role="progressbar" 
                                         style="width: ${totalAmountWithInterest > 0 ? (totalPaid / totalAmountWithInterest * 100) : 0}%">
                                    </div>
                                </div>
                                <small class="text-muted">${totalAmountWithInterest > 0 ? Math.round(totalPaid / totalAmountWithInterest * 100) : 0}%</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Second Row: Debt Details and Payment Schedule -->
        <div class="row mb-3">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0"><i class="fas fa-calculator me-2"></i>รายละเอียดหนี้</h6>
                    </div>
                    <div class="card-body">
                        <div class="row mb-2">
                            <div class="col-5"><strong>อัตราดอกเบี้ย:</strong></div>
                            <div class="col-7">${interestRate}%</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5"><strong>ประเภทดอกเบี้ย:</strong></div>
                            <div class="col-7">${getInterestTypeText(debt.interestType || 'fixed')}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5"><strong>ระยะเวลาดอกเบี้ย:</strong></div>
                            <div class="col-7">${getInterestPeriodText(debt.interestPeriod || 'monthly')}</div>
                        </div>
                        <div class="row mb-0">
                            <div class="col-5"><strong>จำนวนงวด:</strong></div>
                            <div class="col-7">${debt.installmentCount || 1} งวด</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0"><i class="fas fa-calendar-alt me-2"></i>ข้อมูลวันที่และงวด</h6>
                    </div>
                    <div class="card-body">
                        <div class="row mb-2">
                            <div class="col-5"><strong>วันที่สร้าง:</strong></div>
                            <div class="col-7">${createdAt}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5"><strong>วันครบกำหนด:</strong></div>
                            <div class="col-7">${dueDate}</div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-5"><strong>งวดที่ชำระ:</strong></div>
                            <div class="col-7">
                                <span class="badge bg-primary">${debtPayments.length}/${debt.installmentCount || 1}</span>
                            </div>
                        </div>
                        <div class="row mb-0">
                            <div class="col-5"><strong>สถานะการชำระ:</strong></div>
                            <div class="col-7">
                                ${totalPaid >= totalAmountWithInterest ? 
                                    '<span class="badge bg-success">ชำระครบแล้ว</span>' : 
                                    '<span class="badge bg-warning">ยังไม่ครบ</span>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Third Row: Description and Notes -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-secondary text-white">
                        <h6 class="mb-0"><i class="fas fa-file-alt me-2"></i>คำอธิบายและหมายเหตุ</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <strong>คำอธิบายหนี้:</strong>
                            <p class="mt-2 mb-0 p-3 bg-light rounded">${debt.description || '-'}</p>
                        </div>
                        ${debt.notes ? `
                        <div>
                            <strong>หมายเหตุเพิ่มเติม:</strong>
                            <p class="mt-2 mb-0 p-3 bg-light rounded">${debt.notes}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Store current debt ID for edit/delete functions
    window.currentDebtId = debt.id;
}

// Edit debt function
function editDebt() {
    const debtId = window.currentDebtId;
    if (!debtId) {
        showAlert('ไม่พบข้อมูลหนี้', 'error');
        return;
    }
    
    try {
        // Find debt data
        const debt = debtsData.find(d => d.id === debtId);
        if (!debt) {
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Close current modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('debtDetailsModal'));
        modal.hide();
        
        // Create edit modal if it doesn't exist
        let editModal = document.getElementById('editDebtModal');
        if (!editModal) {
            editModal = createEditDebtModal();
            document.body.appendChild(editModal);
        }
        
        // Populate edit form with current debt data
        populateEditDebtForm(debt);
        
        // Show the edit modal
        const bootstrapEditModal = new bootstrap.Modal(editModal);
        
        // Handle ARIA attributes properly
        editModal.addEventListener('shown.bs.modal', function() {
            editModal.setAttribute('aria-hidden', 'false');
            // Focus on the first focusable element
            const firstFocusable = editModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        });
        
        editModal.addEventListener('hidden.bs.modal', function() {
            editModal.setAttribute('aria-hidden', 'true');
        });
        
        bootstrapEditModal.show();
        
    } catch (error) {
        console.error('Error editing debt:', error);
        showAlert('เกิดข้อผิดพลาดในการแก้ไขหนี้', 'error');
    }
}

// Create edit debt modal HTML
function createEditDebtModal() {
    const modal = document.createElement('div');
    modal.id = 'editDebtModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'editDebtModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editDebtModalLabel">
                        <i class="fas fa-edit me-2"></i>แก้ไขหนี้
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editDebtForm">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editDebtorEmail" class="form-label">อีเมลลูกหนี้ <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="editDebtorEmail" required>
                                    <div class="form-text">กรุณากรอกอีเมลของลูกหนี้</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editDebtorName" class="form-label">ชื่อลูกหนี้</label>
                                    <input type="text" class="form-control" id="editDebtorName">
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="editDebtDescription" class="form-label">คำอธิบายหนี้ <span class="text-danger">*</span></label>
                            <textarea class="form-control" id="editDebtDescription" rows="3" required></textarea>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editDebtAmount" class="form-label">จำนวนเงิน <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text">฿</span>
                                        <input type="number" class="form-control" id="editDebtAmount" min="1" required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editDueDate" class="form-label">วันครบกำหนด <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="editDueDate" required>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editInstallmentCount" class="form-label">จำนวนงวด</label>
                                    <input type="number" class="form-control" id="editInstallmentCount" min="1" value="1">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editInterestRate" class="form-label">อัตราดอกเบี้ย (%)</label>
                                    <input type="number" class="form-control" id="editInterestRate" min="0" max="100" step="0.01" value="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editInterestType" class="form-label">ประเภทดอกเบี้ย</label>
                                    <select class="form-select" id="editInterestType">
                                        <option value="fixed">ดอกเบี้ยคงที่</option>
                                        <option value="reducing">ดอกเบี้ยแบบลดต้นลดดอก</option>
                                        <option value="fixed_total">ดอกเบี้ยคงที่ต่อเงินกู้ทั้งหมด</option>
                                    </select>
                                    <div class="form-text">
                                        <small>
                                            <strong>ดอกเบี้ยคงที่:</strong> คำนวณจากเงินต้นคงเดิม<br>
                                            <strong>ลดต้นลดดอก:</strong> คำนวณจากเงินต้นคงเหลือ<br>
                                            <strong>คงที่ต่อเงินกู้ทั้งหมด:</strong> คำนวณจากยอดเงินกู้ทั้งหมด
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="editInterestPeriod" class="form-label">ระยะเวลาดอกเบี้ย</label>
                                    <select class="form-select" id="editInterestPeriod">
                                        <option value="monthly">รายเดือน</option>
                                        <option value="quarterly">รายไตรมาส</option>
                                        <option value="yearly">รายปี</option>
                                        <option value="total">ตลอดระยะเวลา</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="editDebtStatus" class="form-label">สถานะ</label>
                            <select class="form-select" id="editDebtStatus">
                                <option value="active">ใช้งาน</option>
                                <option value="paid">ชำระแล้ว</option>
                                <option value="cancelled">ยกเลิก</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="editDebtNotes" class="form-label">หมายเหตุเพิ่มเติม</label>
                            <textarea class="form-control" id="editDebtNotes" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary" onclick="submitEditDebtForm()">
                        <i class="fas fa-save me-2"></i>บันทึกการแก้ไข
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Populate edit debt form with current data
function populateEditDebtForm(debt) {
    try {
        // Populate form fields
        document.getElementById('editDebtorEmail').value = debt.debtorEmail || '';
        document.getElementById('editDebtorName').value = debt.debtorName || '';
        document.getElementById('editDebtDescription').value = debt.description || '';
        document.getElementById('editDebtAmount').value = debt.amount || '';
        
        // Format due date
        if (debt.dueDate) {
            const dueDate = debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
            document.getElementById('editDueDate').value = dueDate.toISOString().split('T')[0];
        }
        
        document.getElementById('editInstallmentCount').value = debt.installmentCount || 1;
        document.getElementById('editInterestRate').value = debt.interestRate || 0;
        document.getElementById('editInterestType').value = debt.interestType || 'fixed';
        document.getElementById('editInterestPeriod').value = debt.interestPeriod || 'monthly';
        document.getElementById('editDebtStatus').value = debt.status || 'active';
        document.getElementById('editDebtNotes').value = debt.notes || '';
        
    } catch (error) {
        console.error('Error populating edit form:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

// Submit edit debt form
function submitEditDebtForm() {
    try {
        const form = document.getElementById('editDebtForm');
        if (!form) {
            showAlert('ไม่พบฟอร์มข้อมูล', 'error');
            return;
        }
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const debtId = window.currentDebtId;
        if (!debtId) {
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Get form data
        const formData = {
            debtorEmail: document.getElementById('editDebtorEmail').value.trim(),
            debtorName: document.getElementById('editDebtorName').value.trim(),
            description: document.getElementById('editDebtDescription').value.trim(),
            amount: parseFloat(document.getElementById('editDebtAmount').value),
            dueDate: document.getElementById('editDueDate').value,
            installmentCount: parseInt(document.getElementById('editInstallmentCount').value) || 1,
            interestRate: parseFloat(document.getElementById('editInterestRate').value) || 0,
            interestType: document.getElementById('editInterestType').value,
            interestPeriod: document.getElementById('editInterestPeriod').value,
            status: document.getElementById('editDebtStatus').value,
            notes: document.getElementById('editDebtNotes').value.trim(),
            updatedAt: new Date()
        };
        
        // Validate required fields
        if (!formData.debtorEmail || !formData.description || !formData.amount || !formData.dueDate) {
            showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
            return;
        }
        
        // Validate amount
        if (formData.amount <= 0) {
            showAlert('จำนวนเงินต้องมากกว่า 0', 'error');
            return;
        }
        
        // Validate due date
        const dueDate = new Date(formData.dueDate);
        const today = new Date();
        if (dueDate <= today) {
            showAlert('วันครบกำหนดต้องเป็นวันในอนาคต', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#editDebtModal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังบันทึก...';
        submitBtn.disabled = true;
        
        // Update in Firebase
        updateDebtInFirebase(debtId, formData)
            .then(() => {
                showAlert('บันทึกการแก้ไขหนี้เรียบร้อยแล้ว', 'success');
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editDebtModal'));
                modal.hide();
                // Refresh data
                loadDashboardData();
            })
            .catch((error) => {
                console.error('Error updating debt:', error);
                showAlert('เกิดข้อผิดพลาดในการบันทึกการแก้ไข', 'error');
            })
            .finally(() => {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
            
    } catch (error) {
        console.error('Error submitting edit debt form:', error);
        showAlert('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    }
}

// Update debt in Firebase
async function updateDebtInFirebase(debtId, debtData) {
    try {
        // Update debt document
        const debtRef = doc(db, 'debts', debtId);
        await updateDoc(debtRef, debtData);
        
        return debtId;
        
    } catch (error) {
        console.error('Error updating debt in Firebase:', error);
        throw error;
    }
}

// Record payment function
function recordPayment() {
    const debtId = window.currentDebtId;
    if (!debtId) {
        showAlert('ไม่พบข้อมูลหนี้', 'error');
        return;
    }
    
    try {
        // Find debt data
        const debt = debtsData.find(d => d.id === debtId);
        if (!debt) {
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Check if debt is already paid
        if (debt.status === 'paid') {
            showAlert('หนี้นี้ชำระครบแล้ว', 'info');
            return;
        }
        
        // Close current modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('debtDetailsModal'));
        modal.hide();
        
        // Create payment modal if it doesn't exist
        let paymentModal = document.getElementById('recordPaymentModal');
        if (!paymentModal) {
            paymentModal = createRecordPaymentModal();
            document.body.appendChild(paymentModal);
        }
        
        // Show the payment modal first
        const bootstrapPaymentModal = new bootstrap.Modal(paymentModal);
        setupModalAriaHandling(paymentModal);
        bootstrapPaymentModal.show();
        
        // Wait for modal to be fully shown, then populate form
        paymentModal.addEventListener('shown.bs.modal', function() {
            populateRecordPaymentForm(debt);
        }, { once: true });
        
    } catch (error) {
        console.error('Error recording payment:', error);
        showAlert('เกิดข้อผิดพลาดในการบันทึกการชำระ', 'error');
    }
}

// Create record payment modal HTML
function createRecordPaymentModal() {
    const modal = document.createElement('div');
    modal.id = 'recordPaymentModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'recordPaymentModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="recordPaymentModalLabel">
                        <i class="fas fa-money-bill-wave me-2"></i>บันทึกการชำระหนี้
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="recordPaymentForm">
                        <div class="row mb-3">
                            <div class="col-12">
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <h6 class="card-title">ข้อมูลหนี้</h6>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <small class="text-muted">ลูกหนี้:</small>
                                                <div id="paymentDebtorName">-</div>
                                            </div>
                                            <div class="col-md-6">
                                                <small class="text-muted">ยอดหนี้ทั้งหมด:</small>
                                                <div id="paymentTotalAmount">฿0</div>
                                            </div>
                                        </div>
                                        <div class="row mt-2">
                                            <div class="col-md-6">
                                                <small class="text-muted">ชำระแล้ว:</small>
                                                <div id="paymentPaidAmount">฿0</div>
                                            </div>
                                            <div class="col-md-6">
                                                <small class="text-muted">คงเหลือ:</small>
                                                <div id="paymentRemainingAmount" class="text-danger fw-bold">฿0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="paymentAmount" class="form-label">จำนวนเงินที่ชำระ <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text">฿</span>
                                        <input type="number" class="form-control" id="paymentAmount" min="1" required>
                                    </div>
                                    <div class="form-text">กรุณากรอกจำนวนเงินที่ชำระ</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="paymentDate" class="form-label">วันที่ชำระ <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="paymentDate" required>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="paymentMethod" class="form-label">วิธีการชำระ <span class="text-danger">*</span></label>
                                    <select class="form-select" id="paymentMethod" required>
                                        <option value="">เลือกวิธีการชำระ</option>
                                        <option value="cash">เงินสด</option>
                                        <option value="bank_transfer">โอนเงิน</option>
                                        <option value="check">เช็ค</option>
                                        <option value="credit_card">บัตรเครดิต</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="paymentDescription" class="form-label">หมายเหตุการชำระ</label>
                            <textarea class="form-control" id="paymentDescription" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติมเกี่ยวกับการชำระ"></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="markAsPaid" value="1">
                                <label class="form-check-label" for="markAsPaid">
                                    <strong>ชำระหนี้ครบถ้วน</strong> - เปลี่ยนสถานะหนี้เป็น "ชำระแล้ว"
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success" onclick="submitRecordPaymentForm()">
                        <i class="fas fa-save me-2"></i>บันทึกการชำระ
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Populate record payment form with debt data
function populateRecordPaymentForm(debt) {
    try {
        
        // Get payment history for this debt
        // First try from paymentHistoryData (collection 'payments')
        let debtPayments = paymentHistoryData.filter(p => p.debtId === debt.id);
        let totalPaid = debtPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // If no payments found in paymentHistoryData, try from debt.paymentHistory
        if (debtPayments.length === 0 && debt.paymentHistory && debt.paymentHistory.length > 0) {
            debtPayments = debt.paymentHistory;
            totalPaid = debtPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        }
        
        
        // Calculate interest and total amount
        const principalAmount = debt.amount || 0;
        const interestAmount = calculateInterest(debt, totalPaid);
        const totalAmountWithInterest = principalAmount + interestAmount;
        const remainingAmount = totalAmountWithInterest - totalPaid;
        
        
        // Populate debt info
        const debtorNameEl = document.getElementById('paymentDebtorName');
        const totalAmountEl = document.getElementById('paymentTotalAmount');
        const paidAmountEl = document.getElementById('paymentPaidAmount');
        const remainingAmountEl = document.getElementById('paymentRemainingAmount');
        
        if (debtorNameEl) debtorNameEl.textContent = debt.debtorName || debt.debtorEmail || '-';
        if (totalAmountEl) totalAmountEl.textContent = `฿${totalAmountWithInterest.toLocaleString()}`;
        if (paidAmountEl) paidAmountEl.textContent = `฿${totalPaid.toLocaleString()}`;
        if (remainingAmountEl) remainingAmountEl.textContent = `฿${remainingAmount.toLocaleString()}`;
        
        // Set default payment amount to remaining amount
        const paymentAmountEl = document.getElementById('paymentAmount');
        if (paymentAmountEl) {
            paymentAmountEl.value = remainingAmount;
            paymentAmountEl.max = remainingAmount;
        }
        
        // Set default payment date to today
        const today = new Date();
        const paymentDateEl = document.getElementById('paymentDate');
        if (paymentDateEl) {
            const todayString = today.toISOString().split('T')[0];
            paymentDateEl.value = todayString;
            // Force the value to be set
            paymentDateEl.setAttribute('value', todayString);
        } else {
            console.error('Payment date element not found');
        }
        
        // Set default payment method to cash
        const paymentMethodEl = document.getElementById('paymentMethod');
        if (paymentMethodEl) {
            paymentMethodEl.value = 'cash';
        }
        
        // Auto-check "mark as paid" if paying full amount
        const markAsPaidCheckbox = document.getElementById('markAsPaid');
        if (markAsPaidCheckbox) {
            markAsPaidCheckbox.checked = remainingAmount <= 0;
        }
        
        
    } catch (error) {
        console.error('Error populating payment form:', error);
        showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

// Submit record payment form
function submitRecordPaymentForm() {
    try {
        
        const form = document.getElementById('recordPaymentForm');
        if (!form) {
            console.error('Form not found');
            showAlert('ไม่พบฟอร์มข้อมูล', 'error');
            return;
        }
        
        // Get form values for debugging
        const paymentAmount = document.getElementById('paymentAmount').value;
        let paymentDate = document.getElementById('paymentDate').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        
        // If payment date is empty, set it to today
        if (!paymentDate) {
            const today = new Date();
            paymentDate = today.toISOString().split('T')[0];
            document.getElementById('paymentDate').value = paymentDate;
        }
        
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const debtId = window.currentDebtId;
        if (!debtId) {
            console.error('No debt ID found');
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Find debt data
        const debt = debtsData.find(d => d.id === debtId);
        if (!debt) {
            console.error('Debt not found:', debtId);
            showAlert('ไม่พบข้อมูลหนี้', 'error');
            return;
        }
        
        // Get form data
        const paymentData = {
            debtId: debtId,
            debtorName: debt.debtorName || debt.debtorEmail,
            debtorEmail: debt.debtorEmail,
            creditorId: currentUser.uid,
            amount: parseFloat(paymentAmount),
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            description: document.getElementById('paymentDescription').value.trim(),
            markAsPaid: document.getElementById('markAsPaid').checked,
            createdAt: new Date()
        };
        
        
        // Validate required fields
        if (!paymentData.amount || !paymentData.paymentDate || !paymentData.paymentMethod) {
            console.error('Required fields missing:', {
                amount: paymentData.amount,
                paymentDate: paymentData.paymentDate,
                paymentMethod: paymentData.paymentMethod
            });
            showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
            return;
        }
        
        // Validate amount
        if (paymentData.amount <= 0) {
            showAlert('จำนวนเงินต้องมากกว่า 0', 'error');
            return;
        }
        
        // Check if payment amount exceeds remaining amount
        const debtPayments = paymentHistoryData.filter(p => p.debtId === debtId);
        const totalPaid = debtPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Calculate interest and total amount
        const principalAmount = debt.amount || 0;
        const interestRate = debt.interestRate || 0;
        const interestAmount = (principalAmount * interestRate) / 100;
        const totalAmountWithInterest = principalAmount + interestAmount;
        const remainingAmount = totalAmountWithInterest - totalPaid;
        
        if (paymentData.amount > remainingAmount) {
            showAlert(`จำนวนเงินที่ชำระเกินยอดคงเหลือ (฿${remainingAmount.toLocaleString()})`, 'error');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#recordPaymentModal .btn-success');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังบันทึก...';
        submitBtn.disabled = true;
        
        // Save payment to Firebase
        savePaymentToFirebase(paymentData)
            .then(() => {
                showAlert('บันทึกการชำระเรียบร้อยแล้ว', 'success');
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('recordPaymentModal'));
                modal.hide();
                // Refresh data
                loadDashboardData();
                // Update payment statistics specifically
                updatePaymentStatisticsCards();
            })
            .catch((error) => {
                console.error('Error saving payment:', error);
                showAlert('เกิดข้อผิดพลาดในการบันทึกการชำระ', 'error');
            })
            .finally(() => {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
            
    } catch (error) {
        console.error('Error submitting payment form:', error);
        showAlert('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    }
}

// Save payment to Firebase
async function savePaymentToFirebase(paymentData) {
    try {
        // Add payment document
        const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
        
        // If mark as paid, update debt status
        if (paymentData.markAsPaid) {
            const debtRef = doc(db, 'debts', paymentData.debtId);
            await updateDoc(debtRef, {
                status: 'paid',
                updatedAt: new Date()
            });
        }
        
        return paymentRef.id;
        
    } catch (error) {
        console.error('Error saving payment to Firebase:', error);
        throw error;
    }
}

// Delete debt function (placeholder)
function deleteDebt() {
    const debtId = window.currentDebtId;
    if (!debtId) return;
    
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบหนี้นี้?')) {
        showAlert('ฟีเจอร์ลบหนี้กำลังพัฒนา', 'info');
    }
}

// Show add debt form
function showAddDebtForm() {
    try {
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('addDebtModal');
        if (!modal) {
            modal = createAddDebtModal();
            document.body.appendChild(modal);
        }
        
        // Show the modal
        const bootstrapModal = new bootstrap.Modal(modal);
        setupModalAriaHandling(modal);
        bootstrapModal.show();
        
        // Reset form
        resetAddDebtForm();
        
        // Setup form listeners for real-time calculation
        setTimeout(() => {
            setupDebtFormListeners();
            handleInterestTypeChange(); // Set initial interest rate state
            updateDebtCalculation(); // Initial calculation
        }, 100);
        
    } catch (error) {
        console.error('Error showing add debt form:', error);
        showAlert('เกิดข้อผิดพลาดในการเปิดฟอร์มเพิ่มหนี้', 'error');
    }
}

// Create add debt modal HTML
function createAddDebtModal() {
    const modal = document.createElement('div');
    modal.id = 'addDebtModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'addDebtModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addDebtModalLabel">
                        <i class="fas fa-plus me-2"></i>เพิ่มหนี้ใหม่
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="addDebtForm">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="debtorEmail" class="form-label">อีเมลลูกหนี้ <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="debtorEmail" required>
                                    <div class="form-text">กรุณากรอกอีเมลของลูกหนี้</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="debtorName" class="form-label">ชื่อลูกหนี้</label>
                                    <input type="text" class="form-control" id="debtorName">
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="debtDescription" class="form-label">คำอธิบายหนี้ <span class="text-danger">*</span></label>
                            <textarea class="form-control" id="debtDescription" rows="3" required></textarea>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="debtAmount" class="form-label">จำนวนเงิน <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text">฿</span>
                                        <input type="number" class="form-control" id="debtAmount" min="1" required>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="dueDate" class="form-label">วันครบกำหนด <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="dueDate" required>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="installmentCount" class="form-label">จำนวนงวด</label>
                                    <input type="number" class="form-control" id="installmentCount" min="1" value="1">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="interestRate" class="form-label">อัตราดอกเบี้ย (%)</label>
                                    <input type="number" class="form-control" id="interestRate" min="0" max="100" step="0.01" value="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="interestType" class="form-label">ประเภทดอกเบี้ย</label>
                                    <select class="form-select" id="interestType">
                                        <option value="fixed">ดอกเบี้ยคงที่</option>
                                        <option value="reducing">ดอกเบี้ยแบบลดต้นลดดอก</option>
                                        <option value="fixed_total">ดอกเบี้ยคงที่ต่อเงินกู้ทั้งหมด</option>
                                    </select>
                                    <div class="form-text">
                                        <small>
                                            <strong>ดอกเบี้ยคงที่:</strong> คำนวณจากเงินต้นคงเดิม<br>
                                            <strong>ลดต้นลดดอก:</strong> คำนวณจากเงินต้นคงเหลือ<br>
                                            <strong>คงที่ต่อเงินกู้ทั้งหมด:</strong> คำนวณจากยอดเงินกู้ทั้งหมด
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="interestPeriod" class="form-label">ระยะเวลาดอกเบี้ย</label>
                                    <select class="form-select" id="interestPeriod">
                                        <option value="monthly">รายเดือน</option>
                                        <option value="quarterly">รายไตรมาส</option>
                                        <option value="yearly">รายปี</option>
                                        <option value="total">ตลอดระยะเวลา</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="debtNotes" class="form-label">หมายเหตุเพิ่มเติม</label>
                            <textarea class="form-control" id="debtNotes" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary" onclick="submitAddDebtForm()">
                        <i class="fas fa-save me-2"></i>บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Submit add debt form
function submitAddDebtForm() {
    try {
        const form = document.getElementById('addDebtForm');
        if (!form) {
            showAlert('ไม่พบฟอร์มข้อมูล', 'error');
            return;
        }
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Get form data
        const formData = {
            debtorEmail: document.getElementById('debtorEmail').value.trim(),
            debtorName: document.getElementById('debtorName').value.trim(),
            description: document.getElementById('debtDescription').value.trim(),
            amount: parseFloat(document.getElementById('debtAmount').value),
            dueDate: document.getElementById('dueDate').value,
            installmentCount: parseInt(document.getElementById('installmentCount').value) || 1,
            interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
            interestType: document.getElementById('interestType').value,
            interestPeriod: document.getElementById('interestPeriod').value,
            notes: document.getElementById('debtNotes').value.trim(),
            status: 'active',
            createdAt: new Date(),
            creditorId: currentUser.uid
        };
        
        // Validate required fields
        if (!formData.debtorEmail || !formData.description || !formData.amount || !formData.dueDate) {
            showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
            return;
        }
        
        // Validate amount
        if (formData.amount <= 0) {
            showAlert('จำนวนเงินต้องมากกว่า 0', 'error');
            return;
        }
        
        // Validate due date
        const dueDate = new Date(formData.dueDate);
        const today = new Date();
        if (dueDate <= today) {
            showAlert('วันครบกำหนดต้องเป็นวันในอนาคต', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#addDebtModal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังบันทึก...';
        submitBtn.disabled = true;
        
        // Save to Firebase
        saveDebtToFirebase(formData)
            .then(() => {
                showAlert('บันทึกข้อมูลหนี้เรียบร้อยแล้ว', 'success');
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addDebtModal'));
                modal.hide();
                // Refresh data
                loadDashboardData();
            })
            .catch((error) => {
                console.error('Error saving debt:', error);
                showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
            })
            .finally(() => {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
            
    } catch (error) {
        console.error('Error submitting add debt form:', error);
        showAlert('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    }
}

// Save debt to Firebase
async function saveDebtToFirebase(debtData) {
    try {
        // Add debt document
        const debtRef = await addDoc(collection(db, 'debts'), debtData);
        
        return debtRef.id;
        
    } catch (error) {
        console.error('Error saving debt to Firebase:', error);
        throw error;
    }
}

// Show payment details (placeholder)
function showPaymentDetails(paymentId) {
    // TODO: Implement payment details modal
}

// Calculate interest based on type
function calculateInterest(debt, totalPaid = 0) {
    try {
        
        const principalAmount = debt.amount || 0;
        const interestRate = debt.interestRate || 0;
        const interestType = debt.interestType || 'fixed';
        const interestPeriod = debt.interestPeriod || 'monthly';
        
        if (interestRate === 0) return 0;
        
        let interestAmount = 0;
        
        switch (interestType) {
            case 'fixed':
                // ดอกเบี้ยคงที่ - คำนวณจากเงินต้นคงเดิม
                interestAmount = (principalAmount * interestRate) / 100;
                break;
                
            case 'reducing':
                // ดอกเบี้ยแบบลดต้นลดดอก - คำนวณจากเงินต้นคงเหลือ
                const remainingPrincipal = principalAmount - totalPaid;
                interestAmount = (remainingPrincipal * interestRate) / 100;
                break;
                
            case 'fixed_total':
                // ดอกเบี้ยคงที่ต่อเงินกู้ทั้งหมด - คำนวณจากยอดเงินกู้ทั้งหมด
                interestAmount = (principalAmount * interestRate) / 100;
                break;
                
            default:
                interestAmount = (principalAmount * interestRate) / 100;
        }
        
        // Adjust based on period - สำหรับดอกเบี้ยรายปี ควรคำนวณตามระยะเวลาจริง
        switch (interestPeriod) {
            case 'monthly':
                // คำนวณดอกเบี้ยรายเดือน - ไม่ต้องปรับ
                break;
            case 'quarterly':
                // คำนวณดอกเบี้ยรายไตรมาส - คูณด้วย 3 เดือน
                interestAmount = interestAmount * 3;
                break;
            case 'yearly':
                // คำนวณดอกเบี้ยรายปี - คำนวณตามระยะเวลาจริง
                const monthsDiff = getMonthsDifference(debt.createdAt, debt.dueDate);
                const yearsDiff = monthsDiff / 12;
                interestAmount = interestAmount * yearsDiff;
                break;
            case 'total':
                // คำนวณดอกเบี้ยตลอดระยะเวลา
                const totalMonthsDiff = getMonthsDifference(debt.createdAt, debt.dueDate);
                interestAmount = interestAmount * totalMonthsDiff;
                break;
        }
        
        
        return Math.max(0, interestAmount);
        
    } catch (error) {
        console.error('Error calculating interest:', error);
        return 0;
    }
}

// Get months difference between two dates
function getMonthsDifference(startDate, endDate) {
    try {
        const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
        const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
        
        const yearDiff = end.getFullYear() - start.getFullYear();
        const monthDiff = end.getMonth() - start.getMonth();
        
        return yearDiff * 12 + monthDiff;
    } catch (error) {
        console.error('Error calculating months difference:', error);
        return 1;
    }
}

// Get interest type text
function getInterestTypeText(interestType) {
    const typeMap = {
        'fixed': 'ดอกเบี้ยคงที่',
        'reducing': 'ดอกเบี้ยแบบลดต้นลดดอก',
        'fixed_total': 'ดอกเบี้ยคงที่ต่อเงินกู้ทั้งหมด'
    };
    return typeMap[interestType] || 'ไม่ระบุ';
}

// Test interest calculation with sample data
function testInterestCalculation() {
    
    // Sample data from your example
    const sampleDebt = {
        amount: 79000,
        interestRate: 5,
        interestType: 'reducing',
        interestPeriod: 'yearly',
        createdAt: new Date('2025-06-17'),
        dueDate: new Date('2027-06-17')
    };
    
    const totalPaid = 0; // ยังไม่ได้ชำระ
    
    const interestAmount = calculateInterest(sampleDebt, totalPaid);
    const totalAmount = sampleDebt.amount + interestAmount;
    
    
    // Manual calculation for verification
    const monthsDiff = getMonthsDifference(sampleDebt.createdAt, sampleDebt.dueDate);
    const yearsDiff = monthsDiff / 12;
    const manualInterest = (sampleDebt.amount * sampleDebt.interestRate / 100) * yearsDiff;
    
    
    return {
        calculated: interestAmount,
        manual: manualInterest,
        totalAmount: totalAmount
    };
}

// Test with actual debt data
function testActualDebtCalculation() {
    
    // Find the debt with amount 82,950
    const actualDebt = debtsData.find(debt => {
        const principalAmount = debt.amount || 0;
        const interestAmount = calculateInterest(debt, 0);
        const totalAmount = principalAmount + interestAmount;
        return totalAmount === 82950;
    });
    
    if (actualDebt) {
        const interestAmount = calculateInterest(actualDebt, 0);
        const totalAmount = actualDebt.amount + interestAmount;
        
        
        return {
            debt: actualDebt,
            interestAmount: interestAmount,
            totalAmount: totalAmount
        };
    } else {
        return null;
    }
}

// Test payment statistics display
function testPaymentStatistics() {
    
    
    // Calculate statistics manually
    const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const paymentCount = paymentHistoryData.length;
    const debtorsWithPayments = new Set(paymentHistoryData.map(payment => payment.debtorEmail)).size;
    const avgPaymentAmount = paymentCount > 0 ? Math.round(totalPaid / paymentCount) : 0;
    
    
    // Check if elements exist
    const elements = {
        totalPayments: document.getElementById('totalPayments'),
        totalPaymentCount: document.getElementById('totalPaymentCount'),
        activeDebtors: document.getElementById('activeDebtors'),
        avgPaymentAmount: document.getElementById('avgPaymentAmount')
    };
    
    
    // Update statistics
    updatePaymentStatisticsCards();
    
    return {
        calculated: { totalPaid, paymentCount, debtorsWithPayments, avgPaymentAmount },
        elements: elements
    };
}

// Get interest period text
function getInterestPeriodText(interestPeriod) {
    const periodMap = {
        'monthly': 'รายเดือน',
        'quarterly': 'รายไตรมาส',
        'yearly': 'รายปี',
        'total': 'ตลอดระยะเวลา'
    };
    return periodMap[interestPeriod] || 'ไม่ระบุ';
}

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
    
    // Handle focus events to ensure aria-hidden is properly managed
    modal.addEventListener('focusin', function(event) {
        if (modal.classList.contains('show')) {
            modal.setAttribute('aria-hidden', 'false');
        }
    });
    
    modal.addEventListener('focusout', function(event) {
        // Only set aria-hidden to true if focus is moving outside the modal
        if (!modal.contains(event.relatedTarget)) {
            modal.setAttribute('aria-hidden', 'true');
        }
    });
}

// Debt calculation functions
function updateDebtCalculation() {
    try {
        const amount = parseFloat(document.getElementById('debtAmount')?.value || 0);
        const interestRate = parseFloat(document.getElementById('interestRate')?.value || 0);
        const installmentMonths = parseInt(document.getElementById('installmentMonths')?.value || 1);
        const interestType = document.getElementById('interestType')?.value || 'none';
        
        const calculationSummary = document.getElementById('calculationSummary');
        if (!calculationSummary) return;
        
        if (amount <= 0) {
            calculationSummary.innerHTML = '<small class="text-muted">กรอกข้อมูลเพื่อดูการคำนวณ</small>';
            return;
        }
        
        let totalInterest = 0;
        let monthlyPayment = 0;
        let totalAmount = amount;
        
        if (interestType !== 'none' && interestRate > 0) {
            if (interestType === 'simple') {
                // Simple interest calculation
                totalInterest = (amount * interestRate * installmentMonths) / 1200; // Monthly rate
                monthlyPayment = (amount + totalInterest) / installmentMonths;
            } else if (interestType === 'compound') {
                // Compound interest calculation (reducing balance)
                const monthlyRate = interestRate / 1200; // Convert annual to monthly
                monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, installmentMonths)) / 
                                (Math.pow(1 + monthlyRate, installmentMonths) - 1);
                totalInterest = (monthlyPayment * installmentMonths) - amount;
            }
            totalAmount = amount + totalInterest;
        } else {
            monthlyPayment = amount / installmentMonths;
        }
        
        // Format numbers
        const formatNumber = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        calculationSummary.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-2">
                        <strong>เงินต้น:</strong> ฿${formatNumber(amount)}
                    </div>
                    <div class="mb-2">
                        <strong>ดอกเบี้ยรวม:</strong> ฿${formatNumber(totalInterest)}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-2">
                        <strong>ยอดรวม:</strong> <span class="text-primary">฿${formatNumber(totalAmount)}</span>
                    </div>
                    <div class="mb-2">
                        <strong>งวดละ:</strong> <span class="text-success">฿${formatNumber(monthlyPayment)}</span>
                    </div>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-12">
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        ${installmentMonths} งวด × ฿${formatNumber(monthlyPayment)} = ฿${formatNumber(monthlyPayment * installmentMonths)}
                    </small>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error calculating debt:', error);
        const calculationSummary = document.getElementById('calculationSummary');
        if (calculationSummary) {
            calculationSummary.innerHTML = '<small class="text-danger">เกิดข้อผิดพลาดในการคำนวณ</small>';
        }
    }
}

// Setup form event listeners for real-time calculation
function setupDebtFormListeners() {
    const formFields = [
        'debtAmount',
        'interestRate', 
        'installmentMonths',
        'interestType'
    ];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateDebtCalculation);
            field.addEventListener('change', updateDebtCalculation);
        }
    });
    
    // Add special handling for interest type changes
    const interestTypeField = document.getElementById('interestType');
    if (interestTypeField) {
        interestTypeField.addEventListener('change', handleInterestTypeChange);
    }
    
    // Add payment date example listener
    const paymentDateField = document.getElementById('paymentDate');
    if (paymentDateField) {
        paymentDateField.addEventListener('input', updatePaymentDateExample);
    }
}

// Handle interest type changes
function handleInterestTypeChange() {
    try {
        const interestType = document.getElementById('interestType')?.value;
        const interestRateField = document.getElementById('interestRate');
        
        if (!interestRateField) return;
        
        if (interestType === 'none') {
            // Disable interest rate field and set to 0
            interestRateField.disabled = true;
            interestRateField.value = '0';
            interestRateField.classList.add('bg-light');
            interestRateField.classList.add('text-muted');
        } else {
            // Enable interest rate field
            interestRateField.disabled = false;
            interestRateField.classList.remove('bg-light');
            interestRateField.classList.remove('text-muted');
            
            // If value is 0 and we're enabling, set a default value
            if (interestRateField.value === '0' || interestRateField.value === '') {
                interestRateField.value = '5'; // Default 5% interest rate
            }
        }
        
        // Update calculation after changing interest type
        updateDebtCalculation();
        
    } catch (error) {
        console.error('Error handling interest type change:', error);
    }
}

// Update payment date example
function updatePaymentDateExample() {
    try {
        const paymentDate = document.getElementById('paymentDate')?.value;
        const exampleElement = document.getElementById('paymentDateExample');
        
        if (!exampleElement || !paymentDate) return;
        
        const date = parseInt(paymentDate);
        if (date >= 1 && date <= 31) {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            
            // Calculate next payment date
            let nextPaymentDate = new Date(currentYear, currentMonth, date);
            if (nextPaymentDate <= today) {
                nextPaymentDate = new Date(currentYear, currentMonth + 1, date);
            }
            
            const formattedDate = nextPaymentDate.toLocaleDateString('th-TH');
            exampleElement.textContent = `เช่น งวดถัดไป: ${formattedDate}`;
        } else {
            exampleElement.textContent = '';
        }
    } catch (error) {
        console.error('Error updating payment date example:', error);
    }
}

// Clear debtor search function
window.clearDebtorSearch = function() {
    try {
        const searchInput = document.getElementById('debtorSearchInput');
        const searchResults = document.getElementById('debtorSearchResults');
        
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
        
    } catch (error) {
        console.error('Error clearing debtor search:', error);
    }
};

// Clear selected debtor function
window.clearSelectedDebtor = function() {
    try {
        const debtorNameField = document.getElementById('debtorName');
        const debtorPhoneField = document.getElementById('debtorPhone');
        const selectedDebtorInfo = document.getElementById('selectedDebtorInfo');
        
        if (debtorNameField) debtorNameField.value = '';
        if (debtorPhoneField) debtorPhoneField.value = '';
        if (selectedDebtorInfo) selectedDebtorInfo.style.display = 'none';
        
    } catch (error) {
        console.error('Error clearing selected debtor:', error);
    }
};

// Reset add debt form function
function resetAddDebtForm() {
    try {
        // Reset form fields
        const form = document.getElementById('addDebtForm');
        if (form) {
            form.reset();
            
            // Set default due date to 30 days from now
            const dueDateInput = document.getElementById('dueDate');
            if (dueDateInput) {
                const today = new Date();
                const futureDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
                dueDateInput.value = futureDate.toISOString().split('T')[0];
            }
        }
        
        // Clear selected debtor info
        const selectedDebtorInfo = document.getElementById('selectedDebtorInfo');
        if (selectedDebtorInfo) {
            selectedDebtorInfo.style.display = 'none';
        }
        
        // Clear search results
        const searchResults = document.getElementById('debtorSearchResults');
        const searchInput = document.getElementById('debtorSearchInput');
        
        if (searchResults) searchResults.innerHTML = '';
        if (searchInput) searchInput.value = '';
        
        // Reset calculation summary
        const calculationSummary = document.getElementById('calculationSummary');
        if (calculationSummary) {
            calculationSummary.innerHTML = '<small class="text-muted">กรอกข้อมูลเพื่อดูการคำนวณ</small>';
        }
        
        // Show add button, hide update button
        const addBtn = document.getElementById('addNewDebtBtn');
        const updateBtn = document.getElementById('updateDebtBtn');
        
        if (addBtn) addBtn.classList.remove('d-none');
        if (updateBtn) updateBtn.classList.add('d-none');
        
    } catch (error) {
        console.error('Error resetting add debt form:', error);
    }
}

// Close add debt modal function
window.closeAddDebtModal = function() {
    try {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDebtModal'));
        if (modal) {
            modal.hide();
        }
        // Reset form when closing
        resetAddDebtForm();
    } catch (error) {
        console.error('Error closing add debt modal:', error);
    }
};

// Search registered debtors function
window.searchRegisteredDebtors = function() {
    try {
        const searchInput = document.getElementById('debtorSearchInput');
        const searchTerm = searchInput.value.trim();
        const resultsContainer = document.getElementById('debtorSearchResults');
        
        if (!searchTerm) {
            showAlert('กรุณาใส่คำค้นหา', 'warning');
            return;
        }
        
        // Show loading
        resultsContainer.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <i class="fas fa-spinner fa-spin me-2"></i>กำลังค้นหา...
                </div>
            </div>
        `;
        
        // Simulate search (replace with actual Firebase search)
        setTimeout(() => {
            // Mock search results - replace with actual Firebase query
            const mockResults = [
                {
                    name: 'ทินกร ตาอิน',
                    email: 'tinnakorn@gmail.com',
                    phone: '081-234-5678',
                    status: 'active'
                },
                {
                    name: 'สมชาย ใจดี',
                    email: 'somchai@example.com',
                    phone: '082-345-6789',
                    status: 'active'
                }
            ];
            
            // Filter results based on search term
            const filteredResults = mockResults.filter(debtor => 
                debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debtor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debtor.phone.includes(searchTerm)
            );
            
            if (filteredResults.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body text-center text-muted">
                            <i class="fas fa-search me-2"></i>ไม่พบข้อมูลที่ค้นหา
                        </div>
                    </div>
                `;
                return;
            }
            
            // Display results
            let resultsHTML = '<div class="card"><div class="card-body p-0">';
            filteredResults.forEach(debtor => {
                resultsHTML += `
                    <div class="border-bottom p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${debtor.name}</h6>
                                <small class="text-muted">${debtor.email}</small><br>
                                <small class="text-muted">${debtor.phone}</small>
                            </div>
                            <div>
                                <span class="badge bg-success">${debtor.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}</span>
                                <button class="btn btn-sm btn-outline-primary ms-2" onclick="selectDebtor('${debtor.email}', '${debtor.name}', '${debtor.phone}')">
                                    <i class="fas fa-check"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            resultsHTML += '</div></div>';
            
            resultsContainer.innerHTML = resultsHTML;
            
        }, 1000);
        
    } catch (error) {
        console.error('Error searching debtors:', error);
        showAlert('เกิดข้อผิดพลาดในการค้นหา', 'error');
    }
};

// Select debtor function
window.selectDebtor = function(email, name, phone = '') {
    try {
        // Update form fields with null checks
        const debtorEmailField = document.getElementById('debtorEmail');
        const debtorNameField = document.getElementById('debtorName');
        const debtorPhoneField = document.getElementById('debtorPhone');
        
        if (debtorNameField) {
            debtorNameField.value = name;
        } else {
            
        }
        
        if (debtorPhoneField) {
            debtorPhoneField.value = phone;
        } else {
            
        }
        
        if (debtorEmailField) {
            debtorEmailField.value = email;
        } else {
            
        }
        
        // Update selected debtor info display
        const selectedDebtorName = document.getElementById('selectedDebtorName');
        const selectedDebtorPhone = document.getElementById('selectedDebtorPhone');
        const selectedDebtorInfo = document.getElementById('selectedDebtorInfo');
        
        if (selectedDebtorName) selectedDebtorName.textContent = name;
        if (selectedDebtorPhone) selectedDebtorPhone.textContent = phone;
        if (selectedDebtorInfo) selectedDebtorInfo.style.display = 'block';
        
        // Clear search results
        const searchResults = document.getElementById('debtorSearchResults');
        const searchInput = document.getElementById('debtorSearchInput');
        
        if (searchResults) {
            searchResults.innerHTML = '';
        }
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Trigger calculation update
        updateDebtCalculation();
        
        showAlert(`เลือกลูกหนี้: ${name}`, 'success');
        
    } catch (error) {
        console.error('Error selecting debtor:', error);
        showAlert('เกิดข้อผิดพลาดในการเลือกลูกหนี้', 'error');
    }
};

// Load filter dropdowns
function loadFilterDropdowns() {
    try {
        // Load debtor filter dropdown
        loadDebtorFilterDropdown();
        
        // Load status filter dropdown
        loadStatusFilterDropdown();
        
        // Load amount range filter dropdown
        loadAmountRangeFilterDropdown();
        
        // Load payment history filter dropdown
        loadPaymentHistoryFilterDropdown();
        
    } catch (error) {
        console.error('Error loading filter dropdowns:', error);
    }
}

// Load debtor filter dropdown
function loadDebtorFilterDropdown() {
    try {
        const debtorSelect = document.getElementById('filterDebtor');
        if (!debtorSelect) return;
        
        // Clear existing options except the first one
        debtorSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        
        // Get unique debtors from debts data
        const uniqueDebtors = [...new Set(debtsData.map(debt => debt.debtorEmail))].filter(email => email);
        
        // Add debtor options
        uniqueDebtors.forEach(email => {
            const debtor = debtsData.find(d => d.debtorEmail === email);
            const debtorName = debtor?.debtorName || email;
            
            const option = document.createElement('option');
            option.value = email;
            option.textContent = debtorName;
            debtorSelect.appendChild(option);
        });
        
        
    } catch (error) {
        console.error('Error loading debtor filter dropdown:', error);
    }
}

// Load status filter dropdown
function loadStatusFilterDropdown() {
    try {
        const statusSelect = document.getElementById('filterStatus');
        if (!statusSelect) return;
        
        // Clear existing options except the first one
        statusSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        
        // Add status options
        const statusOptions = [
            { value: 'active', text: 'ใช้งาน' },
            { value: 'paid', text: 'ชำระแล้ว' },
            { value: 'overdue', text: 'เกินกำหนด' },
            { value: 'cancelled', text: 'ยกเลิก' }
        ];
        
        statusOptions.forEach(status => {
            const option = document.createElement('option');
            option.value = status.value;
            option.textContent = status.text;
            statusSelect.appendChild(option);
        });
        
        
    } catch (error) {
        console.error('Error loading status filter dropdown:', error);
    }
}

// Load amount range filter dropdown
function loadAmountRangeFilterDropdown() {
    try {
        const amountSelect = document.getElementById('filterAmountRange');
        if (!amountSelect) return;
        
        // Clear existing options except the first one
        amountSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        
        // Add amount range options
        const amountRanges = [
            { value: '0-10000', text: '฿0 - ฿10,000' },
            { value: '10000-50000', text: '฿10,000 - ฿50,000' },
            { value: '50000-100000', text: '฿50,000 - ฿100,000' },
            { value: '100000+', text: '฿100,000+' }
        ];
        
        amountRanges.forEach(range => {
            const option = document.createElement('option');
            option.value = range.value;
            option.textContent = range.text;
            amountSelect.appendChild(option);
        });
        
        
    } catch (error) {
        console.error('Error loading amount range filter dropdown:', error);
    }
}

// Load payment history filter dropdown
function loadPaymentHistoryFilterDropdown() {
    try {
        const debtorSelect = document.getElementById('filterDebtorPayment');
        if (!debtorSelect) return;
        
        // Clear existing options except the first one
        debtorSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        
        // Get unique debtors from payment history data
        const uniqueDebtors = [...new Set(paymentHistoryData.map(payment => payment.debtorEmail))].filter(email => email);
        
        // Add debtor options
        uniqueDebtors.forEach(email => {
            const payment = paymentHistoryData.find(p => p.debtorEmail === email);
            const debtorName = payment?.debtorName || email;
            
            const option = document.createElement('option');
            option.value = email;
            option.textContent = debtorName;
            debtorSelect.appendChild(option);
        });
        
        
    } catch (error) {
        console.error('Error loading payment history filter dropdown:', error);
    }
}

// Chart utility functions
function exportChartAsImage(chartType) {
    // TODO: Implement chart export functionality
}

function exportChartData(chartType) {
    // TODO: Implement chart data export functionality
}

function printChart(chartType) {
    // TODO: Implement chart print functionality
}

function toggleChartFullscreen(chartType) {
    // TODO: Implement chart fullscreen functionality
}

function refreshCharts() {
    updateCharts();
}

function toggleChartAutoRefreshButton() {
    // TODO: Implement auto refresh functionality
}

function applyChartFilters() {
    try {
        // Get filter values
        const debtorFilter = document.getElementById('filterDebtor')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        const amountRangeFilter = document.getElementById('filterAmountRange')?.value || '';
        const dateFromFilter = document.getElementById('creditorFilterDateFrom')?.value || '';
        const dateToFilter = document.getElementById('creditorFilterDateTo')?.value || '';
        
        // Store filter values globally for use in chart functions
        window.currentFilters = {
            debtor: debtorFilter,
            status: statusFilter,
            amountRange: amountRangeFilter,
            dateFrom: dateFromFilter,
            dateTo: dateToFilter
        };
        
        // Apply filters to charts and tables
        updateCharts();
        loadDebtsTable();
        loadRecentDebts();
        
    } catch (error) {
        console.error('Error applying chart filters:', error);
    }
}

function clearChartFilters() {
    try {
        // Clear all filter inputs
        const debtorFilter = document.getElementById('filterDebtor');
        const statusFilter = document.getElementById('filterStatus');
        const amountRangeFilter = document.getElementById('filterAmountRange');
        const dateFromFilter = document.getElementById('creditorFilterDateFrom');
        const dateToFilter = document.getElementById('creditorFilterDateTo');
        
        if (debtorFilter) debtorFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (amountRangeFilter) amountRangeFilter.value = '';
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';
        
        // Clear global filters
        window.currentFilters = {
            debtor: '',
            status: '',
            amountRange: '',
            dateFrom: '',
            dateTo: ''
        };
        
        // Refresh charts and tables
        updateCharts();
        loadDebtsTable();
        loadRecentDebts();
        
    } catch (error) {
        console.error('Error clearing chart filters:', error);
    }
}

function refreshPaymentHistory() {
    loadPaymentHistory().then(() => {
        loadPaymentHistoryTable();
        updateDashboardStatistics();
    });
}

function downloadPaymentHistoryReport() {
    // TODO: Implement report download
}

function downloadSummaryReport() {
    // TODO: Implement summary report download
}

function downloadDetailedReport() {
    // TODO: Implement detailed report download
}

function saveProfileSettings() {
    // TODO: Implement profile settings save
}

// Export functions for global use
window.confirmLogout = confirmLogout;
window.handleLogoutClick = handleLogoutClick;
window.testInterestCalculation = testInterestCalculation;
window.testActualDebtCalculation = testActualDebtCalculation;
window.handleNavigation = handleNavigation;
window.showContentSection = showContentSection;
window.showDebtDetails = showDebtDetails;
window.editDebt = editDebt;
window.submitEditDebtForm = submitEditDebtForm;
window.recordPayment = recordPayment;
window.submitRecordPaymentForm = submitRecordPaymentForm;
window.deleteDebt = deleteDebt;
window.showAddDebtForm = showAddDebtForm;
window.submitAddDebtForm = submitAddDebtForm;
window.showPaymentDetails = showPaymentDetails;
window.loadDashboardData = loadDashboardData;
window.refreshCharts = refreshCharts;
window.exportChartAsImage = exportChartAsImage;
window.exportChartData = exportChartData;
window.printChart = printChart;
window.toggleChartFullscreen = toggleChartFullscreen;
window.toggleChartAutoRefreshButton = toggleChartAutoRefreshButton;
window.updateDashboardStatistics = updateDashboardStatistics;
window.updatePaymentStatisticsCards = updatePaymentStatisticsCards;
window.calculateInterest = calculateInterest;
window.getMonthsDifference = getMonthsDifference;
window.getInterestTypeText = getInterestTypeText;
window.getInterestPeriodText = getInterestPeriodText;
window.testInterestCalculation = testInterestCalculation;
window.testPaymentStatistics = testPaymentStatistics;
window.loadFilterDropdowns = loadFilterDropdowns;
window.loadDebtorFilterDropdown = loadDebtorFilterDropdown;
window.loadStatusFilterDropdown = loadStatusFilterDropdown;
window.loadAmountRangeFilterDropdown = loadAmountRangeFilterDropdown;
window.loadPaymentHistoryFilterDropdown = loadPaymentHistoryFilterDropdown;
window.applyChartFilters = applyChartFilters;
window.clearChartFilters = clearChartFilters;
window.refreshPaymentHistory = refreshPaymentHistory;
window.downloadPaymentHistoryReport = downloadPaymentHistoryReport;
window.downloadSummaryReport = downloadSummaryReport;
window.downloadDetailedReport = downloadDetailedReport;



// Apply payment history filter
function applyPaymentHistoryFilter() {
    try {
        // Get filter values
        const debtorFilter = document.getElementById('filterDebtorPayment').value;
        const dateFromFilter = document.getElementById('creditorPaymentFilterDateFrom').value;
        const dateToFilter = document.getElementById('creditorPaymentFilterDateTo').value;
        const amountFilter = document.getElementById('filterAmount').value;
        
        // Apply filters to payment history data
        let filteredData = [...paymentHistoryData];
        
        // Filter by debtor
        if (debtorFilter) {
            filteredData = filteredData.filter(payment => 
                payment.debtorName && payment.debtorName.toLowerCase().includes(debtorFilter.toLowerCase())
            );
        }
        
        // Filter by date range
        if (dateFromFilter) {
            const fromDate = new Date(dateFromFilter);
            filteredData = filteredData.filter(payment => {
                const paymentDate = payment.paymentDate ? 
                    (payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate)) : 
                    new Date();
                return paymentDate >= fromDate;
            });
        }
        
        if (dateToFilter) {
            const toDate = new Date(dateToFilter);
            filteredData = filteredData.filter(payment => {
                const paymentDate = payment.paymentDate ? 
                    (payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate)) : 
                    new Date();
                return paymentDate <= toDate;
            });
        }
        
        // Filter by amount range
        if (amountFilter) {
            const [minAmount, maxAmount] = amountFilter.split('-').map(amount => 
                amount.includes('+') ? Infinity : parseInt(amount.replace(/,/g, ''))
            );
            
            filteredData = filteredData.filter(payment => {
                const amount = payment.amount || 0;
                return amount >= minAmount && amount <= maxAmount;
            });
        }
        
        // Update payment history data temporarily
        const originalData = paymentHistoryData;
        paymentHistoryData = filteredData;
        
        // Reload table with filtered data
        loadPaymentHistoryTable();
        
        // Reinitialize DataTables
        setTimeout(() => {
            initializeDataTables();
        }, 500);
        
        showAlert(`แสดงผล ${filteredData.length} รายการ`, 'info');
        
    } catch (error) {
        console.error('Error applying payment history filter:', error);
        showAlert('เกิดข้อผิดพลาดในการกรองข้อมูล', 'error');
    }
}

// Clear payment history filter
function clearPaymentHistoryFilter() {
    try {
        // Clear all filter inputs
        document.getElementById('filterDebtorPayment').value = '';
        document.getElementById('creditorPaymentFilterDateFrom').value = '';
        document.getElementById('creditorPaymentFilterDateTo').value = '';
        document.getElementById('filterAmount').value = '';
        
        // Reload payment history without filters
        loadPaymentHistory();
        loadPaymentHistoryTable();
        
        // Reinitialize DataTables
        setTimeout(() => {
            initializeDataTables();
        }, 500);
        
        showAlert('ล้างตัวกรองเรียบร้อย', 'info');
        
    } catch (error) {
        console.error('Error clearing payment history filter:', error);
        showAlert('เกิดข้อผิดพลาดในการล้างตัวกรอง', 'error');
    }
}

// Close mobile menu when nav link is clicked
function closeMobileMenu() {
    try {
        const mobileMenu = document.getElementById('mobileNavMenu');
        const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
        
        if (mobileMenu && mobileMenuButton) {
            // Close the mobile menu
            const bsCollapse = new bootstrap.Collapse(mobileMenu, {
                toggle: false
            });
            bsCollapse.hide();
            
            // Update button state
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
        }
    } catch (error) {
        console.error('Error closing mobile menu:', error);
    }
}

// Add click event listeners to mobile nav links
function setupMobileNavLinks() {
    try {
        const mobileNavLinks = document.querySelectorAll('#mobileNavMenu .nav-link[href^="#"]');
        
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                handleNavigation(href);
                
                // Close mobile menu after a short delay
                setTimeout(() => {
                    closeMobileMenu();
                }, 100);
            });
        });
    } catch (error) {
        console.error('Error setting up mobile nav links:', error);
    }
}

window.saveProfileSettings = saveProfileSettings;
window.applyPaymentHistoryFilter = applyPaymentHistoryFilter;
window.clearPaymentHistoryFilter = clearPaymentHistoryFilter;
