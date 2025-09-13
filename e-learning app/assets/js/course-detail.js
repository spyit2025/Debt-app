import { 
    protectPage, 
    displayUserInfo, 
    createUserMenu, 
    logoutUser, 
    checkSessionExpiry 
} from './auth.js';
import { auth, db } from './firebase-config.js';
import { 
    doc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ตัวแปรสำหรับเก็บข้อมูลคอร์ส
let courseData = null;

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบสิทธิ์การเข้าถึงหน้า (ผู้สอนและแอดมิน)
    protectPage(['instructor', 'admin']);
    
    // ตรวจสอบ session expiry
    checkSessionExpiry();
    
    // แสดงข้อมูลผู้ใช้
    displayUserInfo();
    
    // สร้างเมนูผู้ใช้
    createUserMenu();
    
    // จัดการการออกจากระบบ
    document.addEventListener('click', function(e) {
        if (e.target.closest('#logoutBtn') || e.target.closest('[data-action="logout"]')) {
            e.preventDefault();
            logoutUser().then(() => {
                window.location.href = '../auth/login.html';
            });
        }
    });
    
    // ตรวจสอบ session ทุก 5 นาที
    setInterval(() => {
        checkSessionExpiry();
    }, 5 * 60 * 1000);
    
    // โหลดข้อมูลคอร์ส
    loadCourseData();
});

// โหลดข้อมูลคอร์ส
async function loadCourseData() {
    try {
        // แสดง loading
        document.getElementById('loadingSpinner').classList.remove('loading-spinner');
        document.getElementById('courseDetails').classList.add('course-details');
        document.getElementById('errorMessage').classList.add('error-message');
        
        // ดึง course ID จาก URL
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        if (!courseId) {
            throw new Error('ไม่พบรหัสคอร์ส');
        }
        
        console.log('🔄 โหลดข้อมูลคอร์ส ID:', courseId);
        
        // ดึงข้อมูลคอร์สจาก Firestore
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        
        if (!courseDoc.exists()) {
            throw new Error('ไม่พบข้อมูลคอร์ส');
        }
        
        courseData = {
            id: courseDoc.id,
            ...courseDoc.data()
        };
        
        console.log('📋 ข้อมูลคอร์ส:', courseData);
        
        // แสดงข้อมูลคอร์ส
        displayCourseData(courseData);
        
        // ซ่อน loading และแสดงข้อมูล
        document.getElementById('loadingSpinner').classList.add('loading-spinner');
        document.getElementById('courseDetails').classList.remove('course-details');
        
    } catch (error) {
        console.error('❌ Error loading course:', error);
        
        // ซ่อน loading และแสดงข้อผิดพลาด
        document.getElementById('loadingSpinner').classList.add('loading-spinner');
        document.getElementById('errorMessage').classList.remove('error-message');
        
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส: ' + error.message);
    }
}

// แสดงข้อมูลคอร์ส
function displayCourseData(course) {
    // ข้อมูลหลัก
    document.getElementById('courseTitle').textContent = course.title || 'ไม่ระบุ';
    document.getElementById('courseDescription').textContent = course.description || 'ไม่มีคำอธิบาย';
    document.getElementById('courseId').textContent = course.id;
    
    // ไอคอนและสี
    const courseIconElement = document.getElementById('courseIcon');
    courseIconElement.className = `${course.color || 'bg-primary'} rounded p-3 mb-3`;
    courseIconElement.innerHTML = `<i class="${course.icon || 'bi-book'} text-white fs-1"></i>`;
    
    // หมวดหมู่
    const categoryText = getCategoryText(course.category);
    document.getElementById('courseCategory').innerHTML = `<span class="badge bg-secondary">${categoryText}</span>`;
    
    // ระดับ
    const levelText = getLevelText(course.level);
    document.getElementById('courseLevel').innerHTML = `<span class="badge bg-info">${levelText}</span>`;
    
    // ระยะเวลา
    document.getElementById('courseDuration').textContent = `${course.duration || 0} ชั่วโมง`;
    
    // สถานะ
    const statusBadge = course.isActive ? 
        '<span class="badge bg-success">เปิดใช้งาน</span>' : 
        '<span class="badge bg-secondary">ปิดใช้งาน</span>';
    document.getElementById('courseStatus').innerHTML = statusBadge;
    
    // สถิติ
    document.getElementById('studentCount').textContent = course.studentCount || 0;
    document.getElementById('quizCount').textContent = course.quizCount || 0;
    document.getElementById('completionRate').textContent = '0%'; // จะคำนวณจากข้อมูลจริง
    
    // ข้อมูลเพิ่มเติม
    document.getElementById('instructorName').textContent = course.instructorName || 'ไม่ระบุ';
    
    // วันที่
    const createdAt = course.createdAt ? 
        formatDateTime(course.createdAt, false) : 
        'ไม่ระบุ';
    document.getElementById('createdAt').textContent = createdAt;
    
    const updatedAt = course.updatedAt ? 
        formatDateTime(course.updatedAt, false) : 
        'ไม่ระบุ';
    document.getElementById('updatedAt').textContent = updatedAt;
}

// ฟังก์ชันช่วยเหลือ
function getCategoryText(category) {
    const categories = {
        'programming': 'การเขียนโปรแกรม',
        'database': 'ฐานข้อมูล',
        'web-development': 'การพัฒนาเว็บ',
        'design': 'การออกแบบ',
        'business': 'ธุรกิจ',
        'language': 'ภาษา',
        'Excel': 'การใช้งาน Excel เบื้องต้น'
    };
    return categories[category] || category || 'ไม่ระบุ';
}

function getLevelText(level) {
    const levels = {
        'beginner': 'เริ่มต้น',
        'intermediate': 'ปานกลาง',
        'advanced': 'ขั้นสูง'
    };
    return levels[level] || level || 'ไม่ระบุ';
}

// ฟังก์ชันแสดงข้อความ
function showSuccess(message) {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="bi bi-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function showError(message) {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// ฟังก์ชันการจัดการคอร์ส
function editCourseFromDetail() {
    if (courseData) {
        window.location.href = `manage-courses.html?edit=${courseData.id}`;
    }
}

function manageQuizzes() {
    if (courseData) {
        window.location.href = `../quiz/manage-quizzes.html?courseId=${courseData.id}`;
    }
}

function toggleCourseStatus() {
    // TODO: เพิ่มฟังก์ชันเปลี่ยนสถานะคอร์ส
    showError('ฟังก์ชันนี้ยังไม่พร้อมใช้งาน');
}

function deleteCourseFromDetail() {
    if (courseData) {
        if (confirm(`คุณแน่ใจหรือไม่ที่จะลบคอร์ส "${courseData.title}"?`)) {
            window.location.href = `manage-courses.html?delete=${courseData.id}`;
        }
    }
}

// Export functions สำหรับ global access
window.editCourseFromDetail = editCourseFromDetail;
window.manageQuizzes = manageQuizzes;
window.toggleCourseStatus = toggleCourseStatus;
window.deleteCourseFromDetail = deleteCourseFromDetail;
