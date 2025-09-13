import { 
    protectPage, 
    displayUserInfo, 
    createUserMenu, 
    createMainMenu,
    logoutUser, 
    checkSessionExpiry,
    getUserCourses,
    getUserQuizzes,
    getUserStatistics
} from './auth.js';
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy,
    limit 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ตัวแปรสำหรับป้องกันการโหลดซ้ำ
let isInitialized = false;
let isLoading = false;

// เริ่มต้นหน้า dashboard
document.addEventListener('DOMContentLoaded', function() {
    // ป้องกันการเริ่มต้นซ้ำ
    if (isInitialized) {
        console.log('Dashboard เริ่มต้นแล้ว ไม่ต้องเริ่มต้นซ้ำ');
        return;
    }
    
    try {
        // ตรวจสอบสิทธิ์การเข้าถึงหน้า (เฉพาะผู้เรียน)
        protectPage('student');
        
        // ตรวจสอบ session expiry
        checkSessionExpiry();
        
        // แสดงข้อมูลผู้ใช้
        displayUserInfo();
        
        // สร้างเมนูหลัก
        createMainMenu();
        
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
        
        // โหลดข้อมูล dashboard
        loadDashboardData().then(() => {
            isInitialized = true;
            console.log('Student Dashboard เริ่มต้นสำเร็จ');
        }).catch(error => {
            console.error('เกิดข้อผิดพลาดในการเริ่มต้น Dashboard:', error);
        });
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น Dashboard:', error);
        showError('เกิดข้อผิดพลาดในการโหลดระบบ');
    }
});

// โหลดข้อมูล dashboard
async function loadDashboardData() {
    // ป้องกันการโหลดซ้ำ
    if (isLoading) {
        console.log('กำลังโหลดข้อมูลอยู่ กรุณารอสักครู่');
        return;
    }
    
    isLoading = true;
    
    try {
        console.log('เริ่มต้นโหลดข้อมูล Dashboard...');
        
        // แสดงสถานะกำลังโหลด
        showLoadingState();
        
        // โหลดข้อมูลแบบแยกกันเพื่อป้องกัน error
        try {
            await loadStatistics();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดสถิติ:', error);
        }
        
        try {
            await loadRecentCourses();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดคอร์สล่าสุด:', error);
        }
        
        try {
            await loadRecentQuizzes();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดข้อสอบล่าสุด:', error);
        }
        
        try {
            await loadUpcomingDeadlines();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดกำหนดส่ง:', error);
        }
        
        // ซ่อนสถานะกำลังโหลด
        hideLoadingState();
        
        console.log('โหลดข้อมูล Dashboard สำเร็จ');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        hideLoadingState();
    } finally {
        isLoading = false;
    }
}

// แสดงสถานะกำลังโหลด
function showLoadingState() {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(element => {
        element.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> กำลังโหลด...';
    });
}

// ซ่อนสถานะกำลังโหลด
function hideLoadingState() {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(element => {
        element.innerHTML = '';
    });
}

// แสดงข้อผิดพลาด
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

// ป้องกันการรีเฟรชอัตโนมัติจาก JavaScript errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    // ไม่ให้รีเฟรชหน้าอัตโนมัติเมื่อเกิด error
    e.preventDefault();
});

// ป้องกันการรีเฟรชอัตโนมัติจาก unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    // ไม่ให้รีเฟรชหน้าอัตโนมัติเมื่อเกิด unhandled rejection
    e.preventDefault();
});

// โหลดสถิติ
async function loadStatistics() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        const statsResult = await getUserStatistics(currentUser.uid);
        
        if (statsResult.success) {
            const stats = statsResult.data;
            
            document.getElementById('enrolledCourses').textContent = stats.totalCourses;
            document.getElementById('completedQuizzes').textContent = stats.totalQuizzes;
            document.getElementById('averageScore').textContent = stats.averageScore;
            document.getElementById('pendingQuizzes').textContent = stats.pendingQuizzes || 0;
        } else {
            // ใช้ข้อมูลเริ่มต้นหากไม่มีข้อมูล
            const defaultStats = {
                totalCourses: 0,
                completedCourses: 0,
                totalQuizzes: 0,
                averageScore: '0%'
            };
            
            document.getElementById('enrolledCourses').textContent = defaultStats.totalCourses;
            document.getElementById('completedQuizzes').textContent = defaultStats.totalQuizzes;
            document.getElementById('averageScore').textContent = defaultStats.averageScore;
            document.getElementById('pendingQuizzes').textContent = '0';
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        // ใช้ข้อมูลเริ่มต้น
        document.getElementById('enrolledCourses').textContent = '0';
        document.getElementById('completedQuizzes').textContent = '0';
        document.getElementById('averageScore').textContent = '0%';
        document.getElementById('pendingQuizzes').textContent = '0';
    }
}

// โหลดคอร์สล่าสุด
async function loadRecentCourses() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        const coursesResult = await getUserCourses(currentUser.uid);
        
        if (coursesResult.success && coursesResult.data.length > 0) {
            const courses = coursesResult.data.slice(0, 5); // แสดง 5 คอร์สล่าสุด
            
            const tbody = document.querySelector('#coursesTable tbody');
            if (tbody) {
                tbody.innerHTML = courses.map(course => {
                    const progress = course.progress || 0;
                    const status = progress >= 100 ? 'เรียนจบ' : 'กำลังเรียน';
                    const statusClass = progress >= 100 ? 'bg-success' : 'bg-warning';
                    const icon = course.icon || 'bi-book';
                    const color = course.color || 'bg-primary';
                    
                    return `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="${color} rounded p-2 me-3">
                                        <i class="${icon} text-white"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">${course.title || course.name}</h6>
                                        <small class="text-muted">คอร์ส ${course.duration || '12'} ชั่วโมง</small>
                                    </div>
                                </div>
                            </td>
                            <td>${course.instructorName || course.instructor || 'ไม่ระบุ'}</td>
                            <td>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar" style="width: ${progress}%"></div>
                                </div>
                                <small class="text-muted">${progress}%</small>
                            </td>
                            <td><span class="badge ${statusClass}">${status}</span></td>
                            <td>
                                <a href="../courses/course-detail.html?id=${course.id}" class="btn btn-sm ${progress >= 100 ? 'btn-outline-primary' : 'btn-primary'}">
                                    <i class="bi ${progress >= 100 ? 'bi-eye' : 'bi-play-circle'} me-1"></i>
                                    ${progress >= 100 ? 'ดูซ้ำ' : 'เรียนต่อ'}
                                </a>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            // แสดงข้อความเมื่อไม่มีคอร์ส
            const tbody = document.querySelector('#coursesTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="bi bi-book me-2"></i>
                            ยังไม่มีคอร์สที่ลงทะเบียน
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading courses:', error);
        const tbody = document.querySelector('#coursesTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส
                    </td>
                </tr>
            `;
        }
    }
}

// โหลดข้อสอบล่าสุด
async function loadRecentQuizzes() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        const quizzesResult = await getUserQuizzes(currentUser.uid);
        
        if (quizzesResult.success && quizzesResult.data.length > 0) {
            const quizzes = quizzesResult.data.slice(0, 5); // แสดง 5 ข้อสอบล่าสุด
            
            const tbody = document.querySelector('#quizzesTable tbody');
            if (tbody) {
                tbody.innerHTML = quizzes.map(quiz => {
                    const score = quiz.score || 0;
                    const maxScore = quiz.maxScore || 100;
                    const scoreText = `${score}/${maxScore}`;
                    const scoreClass = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';
                    const status = score >= 60 ? 'ผ่าน' : 'ไม่ผ่าน';
                    const statusClass = score >= 60 ? 'bg-success' : 'bg-danger';
                    const date = quiz.completedAt ? formatDateTime(quiz.completedAt, false) : 'ไม่ระบุ';
                    
                    return `
                        <tr>
                            <td>${quiz.quizTitle || quiz.title}</td>
                            <td>${quiz.courseTitle || quiz.course}</td>
                            <td><span class="badge ${scoreClass}">${scoreText}</span></td>
                            <td>${date}</td>
                            <td><span class="badge ${statusClass}">${status}</span></td>
                            <td>
                                <a href="../quiz/quiz-review.html?id=${quiz.id}" class="btn btn-sm btn-outline-primary">
                                    <i class="bi bi-eye me-1"></i>ดูผล
                                </a>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            // แสดงข้อความเมื่อไม่มีข้อสอบ
            const tbody = document.querySelector('#quizzesTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            <i class="bi bi-question-circle me-2"></i>
                            ยังไม่มีผลการทำข้อสอบ
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        const tbody = document.querySelector('#quizzesTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ
                    </td>
                </tr>
            `;
        }
    }
}

// โหลดกำหนดส่งที่ใกล้เข้ามา
async function loadUpcomingDeadlines() {
    try {
        // ดึงข้อมูลกำหนดส่งจาก Firestore
        const deadlinesQuery = query(
            collection(db, 'assignments'),
            where('dueDate', '>=', new Date()),
            orderBy('dueDate', 'asc'),
            limit(5)
        );
        
        const deadlinesSnapshot = await getDocs(deadlinesQuery);
        const deadlines = [];
        
        deadlinesSnapshot.forEach((doc) => {
            const assignmentData = doc.data();
            const dueDate = assignmentData.dueDate.toDate();
            const today = new Date();
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let urgency = 'bg-success';
            if (daysLeft <= 1) urgency = 'bg-danger';
            else if (daysLeft <= 3) urgency = 'bg-warning';
            else if (daysLeft <= 7) urgency = 'bg-info';
            
            deadlines.push({
                title: assignmentData.title || 'ไม่ระบุชื่อ',
                course: assignmentData.courseName || 'ไม่ระบุคอร์ส',
                daysLeft: daysLeft,
                dueDate: formatDateTime(dueDate, false),
                urgency: urgency
            });
        });
        
        const container = document.querySelector('.list-group-flush');
        if (container) {
            if (deadlines.length > 0) {
                container.innerHTML = deadlines.map(deadline => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${deadline.title}</h6>
                            <small class="text-muted">คอร์ส: ${deadline.course}</small>
                        </div>
                        <div class="text-end">
                            <span class="badge ${deadline.urgency}">เหลือ ${deadline.daysLeft} วัน</span>
                            <br>
                            <small class="text-muted">กำหนดส่ง: ${deadline.dueDate}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="list-group-item text-center text-muted py-4">
                        <i class="bi bi-calendar-check me-2"></i>
                        ไม่มีกำหนดส่งที่ใกล้เข้ามา
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading deadlines:', error);
        const container = document.querySelector('.list-group-flush');
        if (container) {
            container.innerHTML = `
                <div class="list-group-item text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    เกิดข้อผิดพลาดในการโหลดข้อมูลกำหนดส่ง
                </div>
            `;
        }
    }
}
