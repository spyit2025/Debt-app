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

// Global variables
let currentUser = null;
let debtsData = [];
let paymentHistoryData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Creditor Dashboard: Initializing...');
    
    // Protect page for creditor users only
    protectPage('creditor');
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    loadDashboardData();
});

// Initialize dashboard
function initializeDashboard() {
    try {
        currentUser = getCurrentUser();
        
        if (!currentUser) {
            console.error('No current user found');
            return;
        }
        
        console.log('Current user:', currentUser);
        
        // Display user info
        displayUserInfo();
        
        // Update user name in mobile menu
        updateMobileUserName();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.querySelector('[onclick="confirmLogout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', confirmLogout);
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            handleNavigation(href);
        });
    });
    
    // Mobile menu navigation
    setupMobileMenuNavigation();
}

// Handle navigation
function handleNavigation(href) {
    console.log('Navigating to:', href);
    
    // Remove active class from all links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    const activeLink = document.querySelector(`.nav-link[href="${href}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
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
    // Hide all content sections
    const sections = ['dashboard-content', 'debts-content', 'payment-history-content', 'reports-content', 'settings-content'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Show the appropriate section
    let targetSectionId = 'dashboard-content'; // default
    
    switch (href) {
        case '#dashboard':
            targetSectionId = 'dashboard-content';
            break;
        case '#debts':
            targetSectionId = 'debts-content';
            break;
        case '#payment-history':
            targetSectionId = 'payment-history-content';
            break;
        case '#reports':
            targetSectionId = 'reports-content';
            break;
        case '#settings':
            targetSectionId = 'settings-content';
            break;
    }
    
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
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
        console.log('Loading dashboard data...');
        
        // Load debts data
        await loadDebtsData();
        
        // Load payment history
        await loadPaymentHistory();
        
        // Update dashboard statistics
        updateDashboardStatistics();
        
        // Update charts
        updateCharts();
        
        console.log('Dashboard data loaded successfully');
        
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
            debtsData.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('Debts loaded:', debtsData.length);
        
    } catch (error) {
        console.error('Error loading debts:', error);
        throw error;
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        if (!currentUser) return;
        
        const paymentsQuery = query(
            collection(db, 'payments'),
            where('creditorId', '==', currentUser.uid),
            orderBy('paymentDate', 'desc'),
            limit(50)
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        paymentHistoryData = [];
        
        querySnapshot.forEach((doc) => {
            paymentHistoryData.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('Payment history loaded:', paymentHistoryData.length);
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        throw error;
    }
}

// Update dashboard statistics
function updateDashboardStatistics() {
    try {
        // Calculate statistics
        const totalDebt = debtsData.reduce((sum, debt) => sum + (debt.amount || 0), 0);
        const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const remainingDebt = totalDebt - totalPaid;
        
        const activeDebts = debtsData.filter(debt => (debt.amount || 0) > 0).length;
        const overdueDebts = debtsData.filter(debt => {
            const dueDate = new Date(debt.dueDate);
            const today = new Date();
            return dueDate < today && (debt.amount || 0) > 0;
        }).length;
        
        // Update UI
        updateElement('totalDebtAmount', totalDebt);
        updateElement('totalPaidAmount', totalPaid);
        updateElement('remainingDebtAmount', remainingDebt);
        updateElement('activeDebts', activeDebts);
        updateElement('overdueDebts', overdueDebts);
        
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
        const ctx = document.getElementById('debtStatusChart');
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
            const date = new Date(payment.paymentDate);
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
        
    } catch (error) {
        console.error('Error updating payment trend chart:', error);
    }
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

// Confirm logout
function confirmLogout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        logoutUser().then(() => {
            window.location.href = '../../index.html';
        }).catch(error => {
            console.error('Logout error:', error);
            window.location.href = '../../index.html';
        });
    }
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

// Export functions for global use
window.confirmLogout = confirmLogout;
window.handleNavigation = handleNavigation;
window.showContentSection = showContentSection;
