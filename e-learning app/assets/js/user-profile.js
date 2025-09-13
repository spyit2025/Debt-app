import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, getCurrentUser, showSuccessMessage, showErrorMessage } from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('เริ่มต้น User Profile...');
    
    // ตรวจสอบสิทธิ์การเข้าถึง
    protectPage(['admin', 'instructor', 'student']);
    checkSessionExpiry();
    createMainMenu();
    createUserMenu();
    
    // โหลดข้อมูลโปรไฟล์
    loadUserProfile();
    
    // เพิ่ม event listeners
    addEventListeners();
});

// โหลดข้อมูลโปรไฟล์
async function loadUserProfile() {
    try {
        console.log('กำลังโหลดข้อมูลโปรไฟล์...');
        
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }
        
        // จำลองข้อมูลโปรไฟล์ (ในอนาคตจะเชื่อมต่อกับ Firebase)
        const profileData = {
            id: currentUser.id,
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            email: currentUser.email,
            phone: '081-234-5678',
            role: getRoleDisplayName(currentUser.userType),
            status: 'active',
            joinDate: '2024-01-10',
            lastUpdate: '2024-02-15',
            bio: 'ผู้ใช้ที่รักการเรียนรู้และพัฒนาตัวเองอย่างต่อเนื่อง',
            courses: [
                {
                    id: '1',
                    name: 'การเขียนโปรแกรมพื้นฐาน',
                    progress: 75,
                    status: 'กำลังเรียน'
                },
                {
                    id: '2',
                    name: 'โครงสร้างข้อมูลและอัลกอริทึม',
                    progress: 30,
                    status: 'กำลังเรียน'
                }
            ],
            activities: [
                {
                    id: '1',
                    type: 'quiz',
                    description: 'ทำข้อสอบการเขียนโปรแกรมพื้นฐาน',
                    date: '2024-02-14',
                    score: 85
                },
                {
                    id: '2',
                    type: 'course',
                    description: 'เริ่มเรียนคอร์สโครงสร้างข้อมูลและอัลกอริทึม',
                    date: '2024-02-10'
                },
                {
                    id: '3',
                    type: 'login',
                    description: 'เข้าสู่ระบบ',
                    date: '2024-02-15'
                }
            ]
        };
        
        displayProfile(profileData);
        displayEnrolledCourses(profileData.courses);
        displayRecentActivity(profileData.activities);
        updateStats(profileData);
        
        console.log('โหลดข้อมูลโปรไฟล์สำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์');
    }
}

// แสดงข้อมูลโปรไฟล์
function displayProfile(profileData) {
    // ข้อมูลหลัก
    document.getElementById('profileName').textContent = `${profileData.firstName} ${profileData.lastName}`;
    document.getElementById('profileRole').textContent = profileData.role;
    document.getElementById('profileEmail').textContent = profileData.email;
    
    // ข้อมูลส่วนตัว
    document.getElementById('profileFirstName').textContent = profileData.firstName;
    document.getElementById('profileLastName').textContent = profileData.lastName;
    document.getElementById('profilePhone').textContent = profileData.phone || '-';
    document.getElementById('profileJoinDate').textContent = formatDate(profileData.joinDate);
    document.getElementById('profileLastUpdate').textContent = formatDate(profileData.lastUpdate);
    
    // สถานะ
    const statusElement = document.getElementById('profileStatus');
    statusElement.textContent = getStatusDisplayName(profileData.status);
    statusElement.className = `badge ${getStatusBadgeClass(profileData.status)}`;
}

// แสดงคอร์สที่เรียน
function displayEnrolledCourses(courses) {
    const container = document.getElementById('enrolledCourses');
    
    if (courses.length === 0) {
        container.innerHTML = '<p class="text-muted">ยังไม่มีคอร์สที่เรียน</p>';
        return;
    }
    
    const coursesHTML = courses.map(course => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="card-title">${course.name}</h6>
                        <p class="card-text text-muted">สถานะ: ${course.status}</p>
                    </div>
                    <span class="badge bg-primary">${course.progress}%</span>
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar" role="progressbar" style="width: ${course.progress}%" 
                         aria-valuenow="${course.progress}" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = coursesHTML;
}

// แสดงกิจกรรมล่าสุด
function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-muted">ยังไม่มีกิจกรรม</p>';
        return;
    }
    
    const activitiesHTML = activities.map(activity => {
        const icon = getActivityIcon(activity.type);
        const scoreText = activity.score ? ` (${activity.score} คะแนน)` : '';
        
        return `
            <div class="d-flex align-items-center mb-3">
                <div class="flex-shrink-0">
                    <i class="bi ${icon} text-primary"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                    <p class="mb-0">${activity.description}${scoreText}</p>
                    <small class="text-muted">${formatDate(activity.date)}</small>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = activitiesHTML;
}

// อัปเดตสถิติ
function updateStats(profileData) {
    document.getElementById('coursesCount').textContent = profileData.courses.length;
    document.getElementById('completedCount').textContent = profileData.courses.filter(c => c.progress === 100).length;
    document.getElementById('quizzesCount').textContent = profileData.activities.filter(a => a.type === 'quiz').length;
    
    const quizActivities = profileData.activities.filter(a => a.type === 'quiz' && a.score);
    const avgScore = quizActivities.length > 0 
        ? Math.round(quizActivities.reduce((sum, a) => sum + a.score, 0) / quizActivities.length)
        : 0;
    document.getElementById('avgScore').textContent = `${avgScore}%`;
}

// เพิ่ม event listeners
function addEventListeners() {
    // ปุ่มแก้ไขโปรไฟล์
    document.getElementById('editProfileBtn').addEventListener('click', function() {
        loadProfileForEdit();
        $('#editProfileModal').modal('show');
    });
    
    // ปุ่มบันทึกโปรไฟล์
    document.getElementById('saveProfileBtn').addEventListener('click', function() {
        saveProfile();
    });
}

// โหลดข้อมูลโปรไฟล์สำหรับแก้ไข
function loadProfileForEdit() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // จำลองการโหลดข้อมูล (ในอนาคตจะเชื่อมต่อกับ Firebase)
    const profileData = {
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        email: currentUser.email,
        phone: '081-234-5678',
        bio: 'ผู้ใช้ที่รักการเรียนรู้และพัฒนาตัวเองอย่างต่อเนื่อง'
    };
    
    // เติมข้อมูลในฟอร์ม
    document.getElementById('editFirstName').value = profileData.firstName;
    document.getElementById('editLastName').value = profileData.lastName;
    document.getElementById('editEmail').value = profileData.email;
    document.getElementById('editPhone').value = profileData.phone;
    document.getElementById('editBio').value = profileData.bio;
}

// บันทึกโปรไฟล์
async function saveProfile() {
    try {
        const profileData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            bio: document.getElementById('editBio').value
        };
        
        // ตรวจสอบข้อมูล
        if (!profileData.firstName || !profileData.lastName || !profileData.email) {
            showErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // จำลองการบันทึก (ในอนาคตจะเชื่อมต่อกับ Firebase)
        console.log('บันทึกโปรไฟล์:', profileData);
        
        // ปิด modal และรีเฟรชข้อมูล
        $('#editProfileModal').modal('hide');
        showSuccessMessage('อัปเดตโปรไฟล์สำเร็จ');
        
        // โหลดข้อมูลใหม่
        loadUserProfile();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
    }
}

// Helper functions
function getRoleDisplayName(userType) {
    const roleMap = {
        'admin': 'ผู้ดูแลระบบ',
        'instructor': 'ผู้สอน',
        'student': 'นักเรียน'
    };
    return roleMap[userType] || 'ผู้ใช้';
}

function getStatusDisplayName(status) {
    const statusMap = {
        'active': 'เปิดใช้งาน',
        'inactive': 'ปิดใช้งาน',
        'pending': 'รอการยืนยัน'
    };
    return statusMap[status] || 'ไม่ทราบ';
}

function getStatusBadgeClass(status) {
    const badgeMap = {
        'active': 'bg-success',
        'inactive': 'bg-secondary',
        'pending': 'bg-warning'
    };
    return badgeMap[status] || 'bg-secondary';
}

function getActivityIcon(type) {
    const iconMap = {
        'quiz': 'bi-question-circle',
        'course': 'bi-book',
        'login': 'bi-box-arrow-in-right',
        'logout': 'bi-box-arrow-left'
    };
    return iconMap[type] || 'bi-circle';
}

function formatDate(dateString) {
    return formatDateTime(dateString, false);
}

