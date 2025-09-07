// Register Page JavaScript
// DOM Elements
const registerForm = document.getElementById('registerForm');
const displayNameInput = document.getElementById('displayName');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const toggleRegisterPasswordBtn = document.getElementById('toggleRegisterPassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const registerSubmitBtn = document.querySelector('button[type="submit"]');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Add fade-in animation
    document.body.classList.add('fade-in');
});

// Initialize event listeners
function initializeEventListeners() {
    // Form submission
    registerForm.addEventListener('submit', handleRegister);
    
    // Password toggle
    toggleRegisterPasswordBtn.addEventListener('click', () => togglePasswordVisibility(registerPasswordInput, toggleRegisterPasswordBtn));
    toggleConfirmPasswordBtn.addEventListener('click', () => togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn));
    
    
    // Form validation
    displayNameInput.addEventListener('blur', validateDisplayName);
    registerEmailInput.addEventListener('blur', validateEmail);
    registerPasswordInput.addEventListener('blur', validatePassword);
    confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
    
    // Real-time validation
    displayNameInput.addEventListener('input', clearValidation);
    registerEmailInput.addEventListener('input', clearValidation);
    registerPasswordInput.addEventListener('input', clearValidation);
    confirmPasswordInput.addEventListener('input', clearValidation);
}

// Handle register form submission
async function handleRegister(e) {
    e.preventDefault();
    
    // Get form data
    const displayName = displayNameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const userType = 'debtor'; // กำหนดเป็นลูกหนี้เท่านั้น
    
    // Validate form
    if (!validateForm(displayName, email, password, confirmPassword)) {
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Create user with Firebase Auth
        const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: displayName
        });
        
        // Create user document in Firestore
        const userData = {
            email: user.email,
            displayName: displayName,
            userType: userType,
            createdAt: new Date(),
            phoneNumber: user.phoneNumber || ''
        };
        
        try {
            await window.firebaseDb.collection('users').doc(user.uid).set(userData);
        } catch (firestoreError) {
            console.error('Firestore error:', firestoreError);
            // Continue even if Firestore fails
        }
        
        // Show success message
        showAlert('ลงทะเบียนสำเร็จ! กำลังนำคุณไปยังแดชบอร์ดลูกหนี้', 'success');
        
        // Redirect to debtor dashboard
        setTimeout(() => {
            window.location.href = '../dashboard/debtor-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Register error:', error);
        
        // Show error message
        const errorMessage = getRegisterErrorMessage(error.code);
        showAlert(errorMessage, 'danger');
        
        // Clear password fields
        registerPasswordInput.value = '';
        confirmPasswordInput.value = '';
        registerPasswordInput.focus();
    } finally {
        // Hide loading state
        setLoadingState(false);
    }
}

// Toggle password visibility
function togglePasswordVisibility(inputField, button) {
    const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
    inputField.setAttribute('type', type);
    
    const icon = button.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}


// Validate form
function validateForm(displayName, email, password, confirmPassword) {
    let isValid = true;
    
    // Validate display name
    if (!validateDisplayName()) {
        isValid = false;
    }
    
    // Validate email
    if (!validateEmail()) {
        isValid = false;
    }
    
    // Validate password
    if (!validatePassword()) {
        isValid = false;
    }
    
    // Validate confirm password
    if (!validateConfirmPassword()) {
        isValid = false;
    }
    
    return isValid;
}

// Validate display name
function validateDisplayName() {
    const displayName = displayNameInput.value.trim();
    
    if (!displayName) {
        showFieldError(displayNameInput, 'กรุณากรอกชื่อ-นามสกุล');
        return false;
    }
    
    if (displayName.length < 2) {
        showFieldError(displayNameInput, 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร');
        return false;
    }
    
    clearFieldError(displayNameInput);
    return true;
}

// Validate email
function validateEmail() {
    const email = registerEmailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        showFieldError(registerEmailInput, 'กรุณากรอกอีเมล');
        return false;
    }
    
    if (!emailRegex.test(email)) {
        showFieldError(registerEmailInput, 'รูปแบบอีเมลไม่ถูกต้อง');
        return false;
    }
    
    clearFieldError(registerEmailInput);
    return true;
}

// Validate password
function validatePassword() {
    const password = registerPasswordInput.value;
    
    if (!password) {
        showFieldError(registerPasswordInput, 'กรุณากรอกรหัสผ่าน');
        return false;
    }
    
    if (password.length < 6) {
        showFieldError(registerPasswordInput, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return false;
    }
    
    clearFieldError(registerPasswordInput);
    return true;
}

// Validate confirm password
function validateConfirmPassword() {
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!confirmPassword) {
        showFieldError(confirmPasswordInput, 'กรุณายืนยันรหัสผ่าน');
        return false;
    }
    
    if (password !== confirmPassword) {
        showFieldError(confirmPasswordInput, 'รหัสผ่านไม่ตรงกัน');
        return false;
    }
    
    clearFieldError(confirmPasswordInput);
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
    const fields = [displayNameInput, registerEmailInput, registerPasswordInput, confirmPasswordInput];
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
}

// Set loading state
function setLoadingState(isLoading) {
    if (isLoading) {
        registerSubmitBtn.disabled = true;
        registerSubmitBtn.classList.add('btn-loading');
        registerSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังลงทะเบียน...';
    } else {
        registerSubmitBtn.disabled = false;
        registerSubmitBtn.classList.remove('btn-loading');
        registerSubmitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>ลงทะเบียน';
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
    registerForm.parentNode.insertBefore(alertDiv, registerForm);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Register error message mapping
const registerErrorMessages = {
    'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/operation-not-allowed': 'การลงทะเบียนด้วยอีเมล/รหัสผ่านไม่ได้เปิดใช้งาน',
    'auth/weak-password': 'รหัสผ่านอ่อนเกินไป กรุณาใช้รหัสผ่านที่แข็งแกร่งกว่า',
    'auth/network-request-failed': 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
    'default': 'เกิดข้อผิดพลาดในการลงทะเบียน'
};

// Get register error message
function getRegisterErrorMessage(errorCode) {
    return registerErrorMessages[errorCode] || registerErrorMessages['default'];
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key to submit form
    if (e.key === 'Enter' && !registerSubmitBtn.disabled) {
        registerForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape key to clear form
    if (e.key === 'Escape') {
        registerForm.reset();
        clearValidation();
    }
});

// Prevent form submission on Enter in input fields (let the form handle it)
[displayNameInput, registerEmailInput, registerPasswordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            registerForm.dispatchEvent(new Event('submit'));
        }
    });
});
