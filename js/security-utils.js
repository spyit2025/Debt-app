// Security Utilities for Debt Management System
if (typeof loginAttempts === 'undefined') {
// XSS Protection - Sanitize HTML input
function sanitizeHTML(input) {
    if (typeof input !== 'string') return input;
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// XSS Protection - Sanitize for display
function sanitizeForDisplay(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Input validation for email
function validateEmailSecurity(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    }
    
    // Check for suspicious patterns
    if (email.includes('<script>') || email.includes('javascript:')) {
        throw new Error('อีเมลมีรูปแบบที่ไม่ปลอดภัย');
    }
    
    return sanitizeHTML(email);
}

// Input validation for names
function validateNameSecurity(name) {
    if (!name || name.length < 2 || name.length > 100) {
        throw new Error('ชื่อต้องมีความยาว 2-100 ตัวอักษร');
    }
    
    // Check for suspicious patterns
    if (name.includes('<script>') || name.includes('javascript:')) {
        throw new Error('ชื่อมีรูปแบบที่ไม่ปลอดภัย');
    }
    
    return sanitizeHTML(name);
}

// Input validation for amounts
function validateAmountSecurity(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0 || numAmount > 999999999) {
        throw new Error('จำนวนเงินไม่ถูกต้อง');
    }
    
    return numAmount;
}

// CSRF Protection - Generate CSRF token
function generateCSRFToken() {
    const token = Math.random().toString(36).substr(2, 15);
    sessionStorage.setItem('csrfToken', token);
    return token;
}

// CSRF Protection - Validate CSRF token
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrfToken');
    return token === storedToken;
}

// Rate limiting for login attempts
const loginAttempts = new Map();

function checkLoginRateLimit(email) {
    const now = Date.now();
    const attempts = loginAttempts.get(email) || [];
    
    // Remove attempts older than 15 minutes
    const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
    
    if (recentAttempts.length >= 5) {
        throw new Error('คุณพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที');
    }
    
    recentAttempts.push(now);
    loginAttempts.set(email, recentAttempts);
    
    return true;
}

// Export functions to global scope
window.securityUtils = {
    sanitizeHTML,
    sanitizeForDisplay,
    validateEmailSecurity,
    validateNameSecurity,
    validateAmountSecurity,
    generateCSRFToken,
    validateCSRFToken,
    checkLoginRateLimit
};

} // End of security-utils check
