import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';
import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, displayUserInfo, getCurrentUser, showSuccessMessage, showErrorMessage } from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('เริ่มต้น Profile...');
    
    // ตรวจสอบสิทธิ์การเข้าถึง
    protectPage(['admin', 'instructor', 'student']);
    checkSessionExpiry();
    displayUserInfo();
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
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้ในระบบ');
            return;
        }
        
        const userData = userDoc.data();
        
        // ดึงข้อมูลคอร์สที่เรียน (สำหรับนักเรียน)
        let enrolledCourses = [];
        if (currentUser.userType === 'student') {
            const coursesSnapshot = await getDocs(collection(db, 'courses'));
            for (const courseDoc of coursesSnapshot.docs) {
                const courseData = courseDoc.data();
                if (courseData.enrolledStudents && courseData.enrolledStudents[currentUser.uid]) {
                    const enrollment = courseData.enrolledStudents[currentUser.uid];
                    enrolledCourses.push({
                        id: courseDoc.id,
                        name: courseData.title,
                        progress: enrollment.progress || 0,
                        status: enrollment.progress >= 100 ? 'เสร็จสิ้น' : 'กำลังเรียน'
                    });
                }
            }
        }
        
        // ดึงข้อมูลกิจกรรมล่าสุด
        let recentActivities = [];
        if (currentUser.userType === 'student') {
            const resultsSnapshot = await getDocs(
                query(
                    collection(db, 'quiz_results'),
                    where('studentId', '==', currentUser.uid)
                )
            );
            
            // แปลงข้อมูลเป็น array และเรียงลำดับ
            const resultsArray = [];
            for (const resultDoc of resultsSnapshot.docs) {
                const resultData = resultDoc.data();
                
                // ดึงข้อมูลข้อสอบ
                let quizName = 'ไม่ระบุ';
                if (resultData.quizId) {
                    try {
                        const quizDoc = await getDoc(doc(db, 'quizzes', resultData.quizId));
                        const quizData = quizDoc.data();
                        quizName = quizData?.title || 'ไม่ระบุ';
                    } catch (error) {
                        console.error('ไม่สามารถดึงข้อมูลข้อสอบได้:', error);
                    }
                }
                
                const percentage = resultData.totalQuestions > 0 ? 
                    Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100) : 0;
                
                resultsArray.push({
                    id: resultDoc.id,
                    type: 'quiz',
                    description: `ทำข้อสอบ ${quizName}`,
                    date: resultData.completedAt || resultData.createdAt || null,
                    score: percentage
                });
            }
            
            // เรียงลำดับตามวันที่ (ใหม่สุดก่อน) และจำกัด 5 รายการ
            resultsArray.sort((a, b) => {
                const dateA = a.date?.toDate?.() || new Date(a.date);
                const dateB = b.date?.toDate?.() || new Date(b.date);
                return dateB - dateA;
            });
            
            recentActivities = resultsArray.slice(0, 5);
        }
        
        const profileData = {
            id: currentUser.uid,
            firstName: userData.firstName || userData.name?.split(' ')[0] || 'ไม่ระบุ',
            lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || 'ไม่ระบุ',
            email: userData.email || currentUser.email,
            phone: userData.phone || '-',
            role: getRoleDisplayName(currentUser.userType),
            status: userData.status || 'active',
            joinDate: userData.createdAt || userData.joinDate || null,
            lastUpdate: userData.updatedAt || userData.lastUpdate || null,
            bio: userData.bio || 'ไม่มีข้อมูลเพิ่มเติม',
            courses: enrolledCourses,
            activities: recentActivities
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
    
    // แสดงไอคอนและสีตามประเภทสิทธิ์
    const avatarElement = document.querySelector('.profile-avatar');
    const avatarIconElement = document.querySelector('.profile-avatar-icon');
    
    if (avatarElement && avatarIconElement) {
        const userType = getCurrentUser()?.userType;
        const { icon, bgColor } = getAvatarStyle(userType);
        
        avatarElement.className = `rounded-circle ${bgColor} d-flex align-items-center justify-content-center profile-avatar`;
        avatarIconElement.className = `bi ${icon} text-white profile-avatar-icon`;
    }
    
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
async function loadProfileForEdit() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        // ดึงข้อมูลผู้ใช้จาก Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้ในระบบ');
            return;
        }
        
        const userData = userDoc.data();
        
        // เติมข้อมูลในฟอร์ม
        document.getElementById('editFirstName').value = userData.firstName || userData.name?.split(' ')[0] || '';
        document.getElementById('editLastName').value = userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '';
        document.getElementById('editEmail').value = userData.email || currentUser.email || '';
        document.getElementById('editPhone').value = userData.phone || '';
        document.getElementById('editBio').value = userData.bio || '';
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์');
    }
}

// บันทึกโปรไฟล์
async function saveProfile() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }
        
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
        
        // บันทึกข้อมูลลง Firestore
        const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        await updateDoc(doc(db, 'users', currentUser.uid), {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            phone: profileData.phone,
            bio: profileData.bio,
            updatedAt: new Date()
        });
        
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

function getAvatarStyle(userType) {
    const avatarMap = {
        'admin': {
            icon: 'bi-shield-fill',
            bgColor: 'bg-danger'
        },
        'instructor': {
            icon: 'bi-mortarboard-fill',
            bgColor: 'bg-primary'
        },
        'student': {
            icon: 'bi-person-circle',
            bgColor: 'bg-success'
        }
    };
    
    return avatarMap[userType] || {
        icon: 'bi-person-circle',
        bgColor: 'bg-secondary'
    };
}

function formatDate(dateInput) {
    return formatDateTime(dateInput, false);
}

