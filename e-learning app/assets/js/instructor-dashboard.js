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
import { 
    protectPage, 
    displayUserInfo, 
    createUserMenu, 
    createMainMenu,
    logoutUser, 
    checkSessionExpiry,
    showErrorMessage 
} from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    try {
        // ตรวจสอบสิทธิ์การเข้าถึงหน้า (เฉพาะผู้สอน)
        protectPage('instructor');
        
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
        
        // เริ่มต้น Dashboard
        initializeInstructorDashboard();
        

        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้นหน้า:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดระบบ');
    }
});

// เริ่มต้น Instructor Dashboard
async function initializeInstructorDashboard() {
    try {
        // รอให้ authentication พร้อม
        await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('ไม่พบผู้ใช้ที่เข้าสู่ระบบ');
            // ตรวจสอบข้อมูลจาก localStorage/sessionStorage
            const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            if (userData.uid) {
                console.log('ใช้ข้อมูลจาก storage:', userData.uid);
                await loadDashboardStats(userData.uid);
                await loadInstructorCourses(userData.uid);
                await loadInstructorQuizzes(userData.uid);
                await loadInstructorStudents(userData.uid);
                return;
            }
            showErrorMessage('กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        // โหลดข้อมูลสถิติ
        await loadDashboardStats(currentUser.uid);
        
        // โหลดข้อมูลนักเรียน
        await loadInstructorStudents(currentUser.uid);

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard');
    }
}

// โหลดข้อมูลสถิติ
async function loadDashboardStats(instructorId) {
    try {
        // นับจำนวนคอร์ส
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        let totalCourses = 0;

        // นับจำนวนนักเรียน
        let totalStudents = 0;
        let totalQuizzes = 0;
        let totalScore = 0;
        let scoreCount = 0;

        coursesSnapshot.forEach(courseDoc => {
            const courseData = courseDoc.data();
            
            // กรองเฉพาะคอร์สของผู้สอนคนนี้
            if (courseData.instructorId !== instructorId) {
                return;
            }
            
            totalCourses++;
            
            // นับนักเรียนในคอร์สนี้
            if (courseData.enrolledStudents) {
                totalStudents += Object.keys(courseData.enrolledStudents).length;
            }
            
            // นับข้อสอบในคอร์สนี้
            if (courseData.quizzes) {
                totalQuizzes += Object.keys(courseData.quizzes).length;
            }
        });

        // คำนวณคะแนนเฉลี่ย
        const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        // อัปเดตสถิติ
        document.getElementById('totalCourses').textContent = totalCourses;
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('averageScore').textContent = averageScore + '%';

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดสถิติ:', error);
    }
}



// โหลดข้อมูลนักเรียนของผู้สอน
async function loadInstructorStudents(instructorId) {
    try {
        // ดึงคอร์สของผู้สอนแบบไม่ใช้ complex query
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        
        const studentsTable = document.getElementById('studentsTable');
        if (!studentsTable) {
            console.error('ไม่พบตาราง studentsTable');
            return;
        }

        const tbody = studentsTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (coursesSnapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-people me-2"></i>
                        ยังไม่มีนักเรียนที่ลงทะเบียน
                    </td>
                </tr>
            `;
            return;
        }

        // รวบรวมข้อมูลนักเรียนจากทุกคอร์ส
        const studentsMap = new Map();
        
        for (const courseDoc of coursesSnapshot.docs) {
            const courseData = courseDoc.data();
            
            // กรองเฉพาะคอร์สของผู้สอนคนนี้
            if (courseData.instructorId !== instructorId) {
                continue;
            }
            
            if (courseData.enrolledStudents) {
                for (const [studentId, enrollmentData] of Object.entries(courseData.enrolledStudents)) {
                    if (!studentsMap.has(studentId)) {
                        studentsMap.set(studentId, {
                            studentId: studentId,
                            courseTitle: courseData.title,
                            progress: enrollmentData.progress || 0,
                            lastScore: enrollmentData.lastScore || 0,
                            lastAccessed: enrollmentData.lastAccessed || null
                        });
                    }
                }
            }
        }

        // แสดงข้อมูลนักเรียน
        const students = Array.from(studentsMap.values()).slice(0, 5); // แสดง 5 คนแรก

        if (students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-people me-2"></i>
                        ยังไม่มีนักเรียนที่ลงทะเบียน
                    </td>
                </tr>
            `;
            return;
        }

        for (const student of students) {
            // ดึงข้อมูลนักเรียน
            const studentDoc = await getDoc(doc(db, 'users', student.studentId));
            const studentData = studentDoc.data();
            
            const progressBarClass = student.progress >= 100 ? 'progress-width-100' : 
                                   student.progress >= 75 ? 'progress-width-75' : 
                                   student.progress >= 50 ? 'progress-width-50' : 'progress-width-25';
            
            const scoreBadge = student.lastScore >= 80 ? 'bg-success' : 
                              student.lastScore >= 60 ? 'bg-warning' : 'bg-danger';

            const row = `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="bg-primary rounded-circle p-2 me-3">
                                <i class="bi bi-person text-white"></i>
                            </div>
                            <div>
                                <h6 class="mb-0">${studentData?.name || 'ไม่ระบุ'}</h6>
                                <small class="text-muted">${studentData?.email || 'ไม่ระบุ'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${student.courseTitle}</td>
                    <td>
                        <div class="progress progress-sm">
                            <div class="progress-bar ${progressBarClass}"></div>
                        </div>
                        <small class="text-muted">${student.progress}%</small>
                    </td>
                    <td><span class="badge ${scoreBadge}">${student.lastScore}/100</span></td>
                    <td>${student.lastAccessed ? formatDate(student.lastAccessed) : 'ไม่ระบุ'}</td>
                </tr>
            `;
            
            tbody.innerHTML += row;
        }

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลนักเรียน:', error);
    }
}





// ฟังก์ชันช่วยเหลือ
function formatDate(timestamp) {
    return formatDateTime(timestamp, false);
}

// Export functions for use in HTML
window.initializeInstructorDashboard = initializeInstructorDashboard;
window.loadDashboardStats = loadDashboardStats;
window.loadInstructorStudents = loadInstructorStudents;
