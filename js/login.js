// Login Page JavaScript
// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const rememberMeCheckbox = document.getElementById('rememberMe');
const submitBtn = document.querySelector('button[type="submit"]');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // ล้าง redirect flag เมื่อโหลดหน้า login
    sessionStorage.removeItem('isRedirecting');
    
    // Load saved email if remember me was checked
    loadRememberedEmail();
    
    // Check if user is already logged in
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    
    if (userId && userType) {
        // Set redirect flag before redirecting
        sessionStorage.setItem('isRedirecting', 'true');
        
        // Redirect to appropriate dashboard with delay
        setTimeout(() => {
            const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
            
            if (userType === 'creditor') {
                window.location.replace(baseUrl + 'pages/dashboard/creditor-dashboard.html');
            } else if (userType === 'debtor') {
                window.location.replace(baseUrl + 'pages/dashboard/debtor-dashboard.html');
            }
        }, 100);
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Add fade-in animation
    document.body.classList.add('fade-in');
});

// Initialize event listeners
function initializeEventListeners() {
    // Check if elements exist before adding event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }
    
    
    if (emailInput) {
        emailInput.addEventListener('blur', validateEmail);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', validatePassword);
    }
    
    // Real-time validation
    if (emailInput) {
        emailInput.addEventListener('input', clearValidation);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', clearValidation);
    }
    
    // Remember me checkbox event listener
    if (rememberMeCheckbox) {
        rememberMeCheckbox.addEventListener('change', handleRememberMeChange);
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    // Get form data
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    // Validate form
    if (!validateForm(email, password)) {
        return;
    }
    
    // Check network connection
    if (!navigator.onLine) {
        showAlert('ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อและลองใหม่', 'warning');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Attempt to sign in - ระบบจะดึง userType จาก Firebase โดยอัตโนมัติ
        const result = await window.authModule.signIn(email, password);
        
        if (result.success) {
            // Handle remember me functionality
            handleRememberMe(email, rememberMe);
            
            // Show success message
            showAlert('เข้าสู่ระบบสำเร็จ!', 'success');
            
            // Show warning if exists
            if (result.warning) {
                showAlert(result.warning, 'warning');
            }
            
            // Redirect to appropriate dashboard based on userType from database
            setTimeout(() => {
                // Set redirect flag to prevent redirect loop
                sessionStorage.setItem('isRedirecting', 'true');
                
                // Clear any existing hash or query parameters
                const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                
                const userType = result.userData.userType;
                if (userType === 'creditor') {
                    window.location.replace(baseUrl + 'pages/dashboard/creditor-dashboard.html');
                } else if (userType === 'debtor') {
                    window.location.replace(baseUrl + 'pages/dashboard/debtor-dashboard.html');
                } else {
                    showAlert('ไม่พบประเภทผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ', 'danger');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Handle specific error types
        let errorMessage;
        if (error.message.includes('ใช้เวลานานเกินไป')) {
            errorMessage = error.message;
        } else if (error.message.includes('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล')) {
            errorMessage = error.message;
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่แล้วลองใหม่';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'ไม่พบผู้ใช้นี้ในระบบ';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'รหัสผ่านไม่ถูกต้อง';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (error.code === 'unavailable') {
            errorMessage = 'บริการไม่พร้อมใช้งาน กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่';
        } else {
            errorMessage = window.getErrorMessage ? window.getErrorMessage(error.code) : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่';
        }
        
        showAlert(errorMessage, 'danger');
        
        // Clear password field
        passwordInput.value = '';
        passwordInput.focus();
    } finally {
        // Hide loading state
        setLoadingState(false);
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = togglePasswordBtn.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}


// Validate form
function validateForm(email, password) {
    let isValid = true;
    
    // Validate email
    if (!validateEmail()) {
        isValid = false;
    }
    
    // Validate password
    if (!validatePassword()) {
        isValid = false;
    }
    
    return isValid;
}

// Validate email
function validateEmail() {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        showFieldError(emailInput, 'กรุณากรอกอีเมล');
        return false;
    }
    
    if (!emailRegex.test(email)) {
        showFieldError(emailInput, 'รูปแบบอีเมลไม่ถูกต้อง');
        return false;
    }
    
    clearFieldError(emailInput);
    return true;
}

// Validate password
function validatePassword() {
    const password = passwordInput.value;
    
    if (!password) {
        showFieldError(passwordInput, 'กรุณากรอกรหัสผ่าน');
        return false;
    }
    
    if (password.length < 6) {
        showFieldError(passwordInput, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return false;
    }
    
    clearFieldError(passwordInput);
    return true;
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.textContent = message;
    }
}

// Clear field error
function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
}

// Clear validation
function clearValidation() {
    const fields = [emailInput, passwordInput];
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
}

// Set loading state
function setLoadingState(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังเข้าสู่ระบบ...';
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบ';
    }
}

// Handle remember me functionality
function handleRememberMe(email, rememberMe) {
    if (rememberMe) {
        // Save email to localStorage for next time
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
    } else {
        // Remove saved email if remember me is unchecked
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
    }
}

// Load remembered email on page load
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (rememberedEmail && rememberMe === 'true') {
        emailInput.value = rememberedEmail;
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

// Handle remember me checkbox change
function handleRememberMeChange() {
    if (!rememberMeCheckbox.checked) {
        // If unchecked, remove saved email
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
    }
}

// Show alert message
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert alert before form
    loginForm.parentNode.insertBefore(alertDiv, loginForm);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key to submit form
    if (e.key === 'Enter' && !submitBtn.disabled) {
        loginForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape key to clear form
    if (e.key === 'Escape') {
        loginForm.reset();
        clearValidation();
    }
});

// Prevent form submission on Enter in input fields (let the form handle it)
[emailInput, passwordInput].filter(input => input !== null).forEach(input => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (loginForm) {
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    });
});
