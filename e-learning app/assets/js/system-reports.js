import { 
    protectPage, 
    displayUserInfo, 
    createUserMenu, 
    logoutUser, 
    checkSessionExpiry 
} from './auth.js';
import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy,
    getDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ตัวแปรสำหรับ Charts
let userDistributionChart;
let activityChart;

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบสิทธิ์การเข้าถึงหน้า (เฉพาะแอดมิน)
    protectPage('admin');
    
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
    
    // โหลดข้อมูลรายงาน
    loadReportData();
});

// โหลดข้อมูลรายงานทั้งหมด
async function loadReportData() {
    try {
        showLoading('กำลังโหลดข้อมูลรายงาน...');
        
        // โหลดข้อมูลทั้งหมดพร้อมกัน
        const [users, courses, quizzes, enrollments] = await Promise.all([
            loadUsersData(),
            loadCoursesData(),
            loadQuizzesData(),
            loadEnrollmentsData()
        ]);
        
        // อัปเดตสถิติ
        updateStatistics(users, courses, quizzes, enrollments);
        
        // สร้างกราฟ
        createCharts(users, courses, quizzes, enrollments);
        
        // สร้างรายงานรายละเอียด
        createDetailedReports(users, courses, quizzes, enrollments);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading report data:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน: ' + error.message);
        hideLoading();
    }
}

// โหลดข้อมูลผู้ใช้
async function loadUsersData() {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const usersSnapshot = await getDocs(usersQuery);
    const users = [];
    
    usersSnapshot.forEach((doc) => {
        users.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return users;
}

// โหลดข้อมูลคอร์ส
async function loadCoursesData() {
    const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const coursesSnapshot = await getDocs(coursesQuery);
    const courses = [];
    
    coursesSnapshot.forEach((doc) => {
        courses.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return courses;
}

// โหลดข้อมูลข้อสอบ
async function loadQuizzesData() {
    const quizzesQuery = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const quizzesSnapshot = await getDocs(quizzesQuery);
    const quizzes = [];
    
    quizzesSnapshot.forEach((doc) => {
        quizzes.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return quizzes;
}

// โหลดข้อมูลการลงทะเบียน
async function loadEnrollmentsData() {
    const enrollmentsQuery = query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc'));
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    const enrollments = [];
    
    enrollmentsSnapshot.forEach((doc) => {
        enrollments.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return enrollments;
}

// อัปเดตสถิติ
function updateStatistics(users, courses, quizzes, enrollments) {
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalCourses').textContent = courses.length;
    document.getElementById('totalQuizzes').textContent = quizzes.length;
    document.getElementById('totalEnrollments').textContent = enrollments.length;
}

// สร้างกราฟ
function createCharts(users, courses, quizzes, enrollments) {
    createUserDistributionChart(users);
    createActivityChart(courses, quizzes, enrollments);
}

// สร้างกราฟการกระจายของผู้ใช้
function createUserDistributionChart(users) {
    const ctx = document.getElementById('userDistributionChart').getContext('2d');
    
    // นับจำนวนผู้ใช้แต่ละประเภท
    const userTypes = {};
    users.forEach(user => {
        userTypes[user.userType] = (userTypes[user.userType] || 0) + 1;
    });
    
    // เตรียมข้อมูลสำหรับกราฟ
    const labels = Object.keys(userTypes).map(type => getUserTypeText(type));
    const data = Object.values(userTypes);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
    
    if (userDistributionChart) {
        userDistributionChart.destroy();
    }
    
    userDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// สร้างกราฟกิจกรรมการใช้งาน
function createActivityChart(courses, quizzes, enrollments) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // เตรียมข้อมูลสำหรับกราฟ
    const labels = ['คอร์ส', 'ข้อสอบ', 'การลงทะเบียน'];
    const data = [courses.length, quizzes.length, enrollments.length];
    const colors = ['#4BC0C0', '#FF6384', '#36A2EB'];
    
    if (activityChart) {
        activityChart.destroy();
    }
    
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวน',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color + '80'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// สร้างรายงานรายละเอียด
function createDetailedReports(users, courses, quizzes, enrollments) {
    createUsersReport(users);
    createCoursesReport(courses, enrollments);
    createQuizzesReport(quizzes);
    
    // Initialize DataTables for all tables
    initializeDataTables();
}

// สร้างรายงานผู้ใช้
function createUsersReport(users) {
    const tableBody = document.getElementById('usersReportTable');
    
    // นับจำนวนผู้ใช้แต่ละประเภท
    const userTypes = {};
    const activeUsers = {};
    
    users.forEach(user => {
        userTypes[user.userType] = (userTypes[user.userType] || 0) + 1;
        if (user.isActive !== false) {
            activeUsers[user.userType] = (activeUsers[user.userType] || 0) + 1;
        }
    });
    
    const totalUsers = users.length;
    
    tableBody.innerHTML = Object.keys(userTypes).map(userType => {
        const count = userTypes[userType];
        const activeCount = activeUsers[userType] || 0;
        const percentage = ((count / totalUsers) * 100).toFixed(1);
        
        return `
            <tr>
                <td>${getUserTypeText(userType)}</td>
                <td>${count}</td>
                <td>${percentage}%</td>
                <td>${activeCount}</td>
            </tr>
        `;
    }).join('');
}

// สร้างรายงานคอร์ส
function createCoursesReport(courses, enrollments) {
    const tableBody = document.getElementById('coursesReportTable');
    
    tableBody.innerHTML = courses.map(course => {
        // นับจำนวนนักเรียนที่ลงทะเบียนในคอร์สนี้
        const studentCount = enrollments.filter(enrollment => 
            enrollment.courseId === course.id
        ).length;
        
        const statusBadge = course.isActive !== false ? 
            '<span class="badge bg-success">เปิดใช้งาน</span>' : 
            '<span class="badge bg-secondary">ปิดใช้งาน</span>';
        
        return `
            <tr>
                <td>${course.title}</td>
                <td>${course.instructorName || 'ไม่ระบุ'}</td>
                <td>${studentCount}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// สร้างรายงานข้อสอบ
async function createQuizzesReport(quizzes) {
    const tableBody = document.getElementById('quizzesReportTable');
    
    // ดึงข้อมูลผลการทำข้อสอบ
    const quizResultsQuery = query(collection(db, 'quizResults'));
    const quizResultsSnapshot = await getDocs(quizResultsQuery);
    const quizResults = [];
    
    quizResultsSnapshot.forEach((doc) => {
        quizResults.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    // ดึงข้อมูลคอร์สทั้งหมด
    const coursesQuery = query(collection(db, 'courses'));
    const coursesSnapshot = await getDocs(coursesQuery);
    const courses = {};
    
    coursesSnapshot.forEach((doc) => {
        courses[doc.id] = doc.data();
    });
    
    tableBody.innerHTML = quizzes.map(quiz => {
        // นับจำนวนผู้ทำข้อสอบนี้
        const participants = quizResults.filter(result => 
            result.quizId === quiz.id
        ).length;
        
        // คำนวณคะแนนเฉลี่ย
        const results = quizResults.filter(result => result.quizId === quiz.id);
        const averageScore = results.length > 0 ? 
            (results.reduce((sum, result) => sum + (result.score || 0), 0) / results.length).toFixed(1) : 
            '0';
        
        // ดึงชื่อคอร์สจาก courseId
        let courseTitle = 'ไม่ระบุ';
        if (quiz.courseId && courses[quiz.courseId]) {
            courseTitle = courses[quiz.courseId].title || 'ไม่ระบุ';
        } else if (quiz.courseTitle) {
            courseTitle = quiz.courseTitle;
        }
        
        return `
            <tr>
                <td>${quiz.title}</td>
                <td>${courseTitle}</td>
                <td>${quiz.questions ? quiz.questions.length : 0}</td>
                <td>${participants}</td>
                <td>${averageScore}%</td>
            </tr>
        `;
    }).join('');
}

// ฟังก์ชันส่งออกรายงาน
window.exportReport = function() {
    try {
        // สร้างข้อมูลรายงาน
        const reportData = {
            generatedAt: formatDateTime(new Date(), true),
            statistics: {
                totalUsers: document.getElementById('totalUsers').textContent,
                totalCourses: document.getElementById('totalCourses').textContent,
                totalQuizzes: document.getElementById('totalQuizzes').textContent,
                totalEnrollments: document.getElementById('totalEnrollments').textContent
            }
        };
        
        // สร้างไฟล์ JSON
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        // ดาวน์โหลดไฟล์
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showSuccess('ส่งออกรายงานสำเร็จ!');
        
    } catch (error) {
        console.error('Error exporting report:', error);
        showError('เกิดข้อผิดพลาดในการส่งออกรายงาน: ' + error.message);
    }
};

// ฟังก์ชันรีเฟรชข้อมูล
window.refreshData = function() {
    loadReportData();
};

// ฟังก์ชันช่วยเหลือ
function getUserTypeText(userType) {
    const userTypes = {
        'student': 'นักเรียน',
        'instructor': 'ผู้สอน',
        'admin': 'แอดมิน'
    };
    return userTypes[userType] || userType;
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
}

function hideLoading() {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = '';
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

// Initialize DataTables for all report tables
function initializeDataTables() {
    // Destroy existing DataTables if they exist
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }
    if ($.fn.DataTable.isDataTable('#coursesTable')) {
        $('#coursesTable').DataTable().destroy();
    }
    if ($.fn.DataTable.isDataTable('#quizzesTable')) {
        $('#quizzesTable').DataTable().destroy();
    }
    
    // Initialize DataTable for Users table
    const usersTableConfig = {
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
            "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
            "infoEmpty": "ไม่มีข้อมูล",
            "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
            "search": "ค้นหา:",
            "paginate": {
                "first": "หน้าแรก",
                "last": "หน้าสุดท้าย",
                "next": "ถัดไป",
                "previous": "ก่อนหน้า"
            },
            "processing": "กำลังประมวลผล...",
            "loadingRecords": "กำลังโหลดข้อมูล...",
            "emptyTable": "ไม่มีข้อมูลในตาราง"
        },
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        ordering: true,
        searching: true,
        info: true,
        paging: true,
        columnDefs: [
            {
                targets: [1, 2, 3], // จำนวน, เปอร์เซ็นต์, ผู้ใช้ที่ใช้งาน
                responsivePriority: 2
            },
            {
                targets: [0], // ประเภทผู้ใช้
                responsivePriority: 1
            }
        ]
    };
    
    // เพิ่ม responsive configuration ถ้า plugin โหลดแล้ว
    if (typeof $.fn.dataTable.Responsive !== 'undefined') {
        usersTableConfig.responsive = {
            details: {
                display: $.fn.dataTable.Responsive.display.childRowImmediate,
                type: 'column',
                target: 0
            }
        };
    }
    
    $('#usersTable').DataTable(usersTableConfig);
    
    // Initialize DataTable for Courses table
    const coursesTableConfig = {
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
            "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
            "infoEmpty": "ไม่มีข้อมูล",
            "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
            "search": "ค้นหา:",
            "paginate": {
                "first": "หน้าแรก",
                "last": "หน้าสุดท้าย",
                "next": "ถัดไป",
                "previous": "ก่อนหน้า"
            },
            "processing": "กำลังประมวลผล...",
            "loadingRecords": "กำลังโหลดข้อมูล...",
            "emptyTable": "ไม่มีข้อมูลในตาราง"
        },
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        ordering: true,
        searching: true,
        info: true,
        paging: true,
        columnDefs: [
            {
                targets: [1, 2, 3], // ผู้สอน, จำนวนนักเรียน, สถานะ
                responsivePriority: 2
            },
            {
                targets: [0], // ชื่อคอร์ส
                responsivePriority: 1
            }
        ]
    };
    
    // เพิ่ม responsive configuration ถ้า plugin โหลดแล้ว
    if (typeof $.fn.dataTable.Responsive !== 'undefined') {
        coursesTableConfig.responsive = {
            details: {
                display: $.fn.dataTable.Responsive.display.childRowImmediate,
                type: 'column',
                target: 0
            }
        };
    }
    
    $('#coursesTable').DataTable(coursesTableConfig);
    
    // Initialize DataTable for Quizzes table
    const quizzesTableConfig = {
        language: {
            "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
            "zeroRecords": "ไม่พบข้อมูล",
            "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
            "infoEmpty": "ไม่มีข้อมูล",
            "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
            "search": "ค้นหา:",
            "paginate": {
                "first": "หน้าแรก",
                "last": "หน้าสุดท้าย",
                "next": "ถัดไป",
                "previous": "ก่อนหน้า"
            },
            "processing": "กำลังประมวลผล...",
            "loadingRecords": "กำลังโหลดข้อมูล...",
            "emptyTable": "ไม่มีข้อมูลในตาราง"
        },
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        ordering: true,
        searching: true,
        info: true,
        paging: true,
        columnDefs: [
            {
                targets: [1, 2, 3, 4], // คอร์ส, จำนวนคำถาม, จำนวนผู้ทำ, คะแนนเฉลี่ย
                responsivePriority: 2
            },
            {
                targets: [0], // ชื่อข้อสอบ
                responsivePriority: 1
            }
        ]
    };
    
    // เพิ่ม responsive configuration ถ้า plugin โหลดแล้ว
    if (typeof $.fn.dataTable.Responsive !== 'undefined') {
        quizzesTableConfig.responsive = {
            details: {
                display: $.fn.dataTable.Responsive.display.childRowImmediate,
                type: 'column',
                target: 0
            }
        };
    }
    
    $('#quizzesTable').DataTable(quizzesTableConfig);
}