import { registerUser } from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupUserTypeSelection();
    setupPasswordValidation();
});

// ตั้งค่า Event Listeners
function setupEventListeners() {
    // ฟอร์มสมัครสมาชิก
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // การตรวจสอบรหัสผ่าน
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

// ตั้งค่าการเลือกประเภทผู้ใช้
function setupUserTypeSelection() {
    const userTypeCards = document.querySelectorAll('.user-type-card');
    const userTypeInput = document.getElementById('userType');
    
    userTypeCards.forEach(card => {
        card.addEventListener('click', function() {
            // ลบการเลือกทั้งหมด
            userTypeCards.forEach(c => c.classList.remove('selected'));
            
            // เลือกการ์ดที่คลิก
            this.classList.add('selected');
            
            // อัปเดตค่าใน input
            const userType = this.getAttribute('data-type');
            userTypeInput.value = userType;
        });
    });
    
    // เลือกนักเรียนเป็นค่าเริ่มต้น
    const studentCard = document.querySelector('[data-type="student"]');
    if (studentCard) {
        studentCard.classList.add('selected');
    }
}

// ตั้งค่าการตรวจสอบรหัสผ่าน
function setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordHint = document.getElementById('passwordHint');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            updatePasswordStrengthIndicator(strength);
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            checkPasswordMatch();
        });
    }
}

// ตรวจสอบความแข็งแกร่งของรหัสผ่าน
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    // ตรวจสอบความยาว
    if (password.length >= 8) {
        score += 1;
    } else {
        feedback.push('รหัสผ่านควรมีความยาวอย่างน้อย 8 ตัวอักษร');
    }
    
    // ตรวจสอบตัวอักษรเล็ก
    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('ควรมีตัวอักษรเล็ก');
    }
    
    // ตรวจสอบตัวอักษรใหญ่
    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        feedback.push('ควรมีตัวอักษรใหญ่');
    }
    
    // ตรวจสอบตัวเลข
    if (/\d/.test(password)) {
        score += 1;
    } else {
        feedback.push('ควรมีตัวเลข');
    }
    
    // ตรวจสอบอักขระพิเศษ
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
    } else {
        feedback.push('ควรมีอักขระพิเศษ');
    }
    
    return {
        score: score,
        feedback: feedback,
        strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
}

// อัปเดตตัวบ่งชี้ความแข็งแกร่งของรหัสผ่าน
function updatePasswordStrengthIndicator(strengthInfo) {
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordHint = document.getElementById('passwordHint');
    
    if (passwordStrength) {
        passwordStrength.className = 'password-strength';
        
        if (strengthInfo.strength === 'weak') {
            passwordStrength.classList.add('strength-weak');
        } else if (strengthInfo.strength === 'medium') {
            passwordStrength.classList.add('strength-medium');
        } else {
            passwordStrength.classList.add('strength-strong');
        }
    }
    
    if (passwordHint) {
        if (strengthInfo.feedback.length > 0) {
            passwordHint.textContent = strengthInfo.feedback[0];
            passwordHint.className = 'text-muted';
        } else {
            passwordHint.textContent = 'รหัสผ่านแข็งแกร่ง!';
            passwordHint.className = 'text-success';
        }
    }
}

// ตรวจสอบการตรงกันของรหัสผ่าน
function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmPasswordInput.setCustomValidity('รหัสผ่านไม่ตรงกัน');
        confirmPasswordInput.classList.add('is-invalid');
    } else {
        confirmPasswordInput.setCustomValidity('');
        confirmPasswordInput.classList.remove('is-invalid');
    }
}

// จัดการการสมัครสมาชิก
async function handleRegistration(e) {
    e.preventDefault();
    
    try {
        // ตรวจสอบการตรวจสอบความถูกต้องของฟอร์ม
        if (!e.target.checkValidity()) {
            e.target.reportValidity();
            return;
        }
        

        
        // ตรวจสอบการตรงกันของรหัสผ่าน
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        
        // ตรวจสอบความแข็งแกร่งของรหัสผ่าน
        const strengthInfo = checkPasswordStrength(password);
        if (strengthInfo.strength === 'weak') {
            showError('รหัสผ่านไม่แข็งแกร่งพอ กรุณาใช้รหัสผ่านที่แข็งแกร่งกว่า');
            return;
        }
        
        // แสดงสถานะการโหลด
        showLoading('กำลังสมัครสมาชิก...');
        
        // รวบรวมข้อมูล
        const userData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            userType: document.getElementById('userType').value,
            department: document.getElementById('department').value.trim(),
            password: password
        };
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
            showError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            hideLoading();
            return;
        }
        
        // ตรวจสอบรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            showError('รูปแบบอีเมลไม่ถูกต้อง');
            hideLoading();
            return;
        }
        
        // กำหนดสถานะการอนุมัติตามประเภทผู้ใช้
        let approvalStatus = 'approved'; // นักเรียนอนุมัติทันที
        if (userData.userType === 'instructor' || userData.userType === 'admin') {
            approvalStatus = 'pending'; // ผู้สอนและแอดมินต้องรออนุมัติ
        }
        
        // เรียกใช้ฟังก์ชันสมัครสมาชิก
        const result = await registerUser(
            userData.email,
            userData.password,
            {
                name: `${userData.firstName} ${userData.lastName}`,
                userType: userData.userType,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                department: userData.department,
                approvalStatus: approvalStatus,
                profile: {
                    department: userData.department,
                    phone: userData.phone
                }
            }
        );
        
        if (result.success) {
            // รีเซ็ตฟอร์ม
            document.getElementById('registerForm').reset();
            
            // ลบการเลือกประเภทผู้ใช้
            document.querySelectorAll('.user-type-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelector('[data-type="student"]').classList.add('selected');
            
            // แสดง modal ตามประเภทผู้ใช้
            showRegistrationSuccessModal(userData.userType);
            
        } else {
            // แสดงข้อความ error ที่เฉพาะเจาะจง
            let errorMessage = result.error;
            
            if (result.error.includes('email-already-in-use')) {
                errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบด้วยบัญชีที่มีอยู่';
            } else if (result.error.includes('weak-password')) {
                errorMessage = 'รหัสผ่านไม่แข็งแกร่งพอ กรุณาใช้รหัสผ่านที่มีตัวอักษร ตัวเลข และอักขระพิเศษ';
            } else if (result.error.includes('invalid-email')) {
                errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง';
            }
            
            showError(errorMessage);
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // แสดงข้อความ error ที่เฉพาะเจาะจง
        let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        
        if (error.message.includes('email-already-in-use')) {
            errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบด้วยบัญชีที่มีอยู่';
        } else if (error.message.includes('weak-password')) {
            errorMessage = 'รหัสผ่านไม่แข็งแกร่งพอ กรุณาใช้รหัสผ่านที่มีตัวอักษร ตัวเลข และอักขระพิเศษ';
        } else if (error.message.includes('invalid-email')) {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
        hideLoading();
    }
}

// ฟังก์ชันแสดงสถานะ
function showLoading(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    ${message}
                </div>
            </div>
        `;
    }
    
    // ปิดการใช้งานปุ่ม
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            กำลังสมัครสมาชิก...
        `;
    }
}

function hideLoading() {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
    
    // เปิดการใช้งานปุ่ม
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.innerHTML = `
            <i class="bi bi-person-plus me-2"></i>
            สมัครสมาชิก
        `;
    }
}

function showSuccess(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

function showError(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

// ฟังก์ชันแสดง modal ลงทะเบียนสำเร็จ
function showRegistrationSuccessModal(userType) {
    const modal = new bootstrap.Modal(document.getElementById('registrationSuccessModal'));
    const successMessage = document.getElementById('successMessage');
    const successDescription = document.getElementById('successDescription');
    
    if (userType === 'student') {
        successMessage.textContent = 'ลงทะเบียนสำเร็จ!';
        successDescription.textContent = 'กรุณาเข้าสู่ระบบเพื่อใช้งาน';
    } else {
        successMessage.textContent = 'ลงทะเบียนสำเร็จ!';
        successDescription.textContent = 'กรุณารอการอนุมัติจากแอดมินภายใน 24 ชั่วโมง';
    }
    
    modal.show();
}


