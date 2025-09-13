import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp,
    addDoc,
    getDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { initializePerformanceOptimizer, cacheManager, performanceMonitor, debounce } from './performance-optimizer.js';
import { protectPage, displayUserInfo, createUserMenu, logoutUser, checkSessionExpiry, showSuccessMessage, showErrorMessage, getCurrentUser } from './auth.js';

// ฟังก์ชันดึงสถิติทั้งหมด
export async function loadDashboardStats() {
    const startTime = performance.now();
    try {
        console.log('กำลังโหลดสถิติ Dashboard...');
        
        // ตรวจสอบ cache ก่อน
        const cacheKey = 'dashboard_stats';
        const cachedStats = cacheManager.get(cacheKey);
        if (cachedStats) {
            console.log('Performance: ใช้ข้อมูลจาก Cache');
            updateStatsCards(cachedStats.totalUsers, cachedStats.totalCourses, cachedStats.totalQuizzes);
            updateUserStats(cachedStats.students, cachedStats.instructors, cachedStats.admins, cachedStats.newUsersThisMonth, cachedStats.totalUsers);
            return;
        }
        
        // ดึงข้อมูลผู้ใช้ทั้งหมด
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;
        
        // นับประเภทผู้ใช้
        let students = 0;
        let instructors = 0;
        let admins = 0;
        let newUsersThisMonth = 0;
        
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            
            // นับประเภทผู้ใช้
            switch (userData.userType) {
                case 'student':
                    students++;
                    break;
                case 'instructor':
                    instructors++;
                    break;
                case 'admin':
                    admins++;
                    break;
            }
            
            // นับผู้ใช้ใหม่ในเดือนนี้
            if (userData.createdAt && userData.createdAt.toDate) {
                const createdAt = userData.createdAt.toDate();
                if (createdAt >= firstDayOfMonth) {
                    newUsersThisMonth++;
                }
            }
        });
        
        // ดึงข้อมูลคอร์สทั้งหมด
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const totalCourses = coursesSnapshot.size;
        
        // ดึงข้อมูลข้อสอบทั้งหมด
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        const totalQuizzes = quizzesSnapshot.size;
        
        // อัปเดตการ์ดสถิติ
        updateStatsCards(totalUsers, totalCourses, totalQuizzes);
        
        // เก็บข้อมูลใน cache
        const statsData = {
            totalUsers,
            totalCourses,
            totalQuizzes,
            students,
            instructors,
            admins,
            newUsersThisMonth
        };
        cacheManager.set(cacheKey, statsData, 2 * 60 * 1000); // 2 นาที
        
        // อัปเดตสถิติผู้ใช้
        updateUserStats(students, instructors, admins, newUsersThisMonth, totalUsers);
        
        // ตรวจสอบและแจ้งเตือนสถานะระบบ
        const systemStatus = checkSystemStatus(totalUsers, totalCourses, totalQuizzes);
        if (systemStatus.status !== 'ปกติ' && systemStatus.status !== 'ใช้งานสูง') {
            showSystemAlert(systemStatus);
        }
        
        // วัดประสิทธิภาพ
        const endTime = performance.now();
        performanceMonitor.measureApiCall('loadDashboardStats', startTime);
        
        console.log('โหลดสถิติ Dashboard สำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดสถิติ:', error);
        showError('เกิดข้อผิดพลาดในการโหลดสถิติ');
    }
}

// ฟังก์ชันตรวจสอบสถานะระบบ
function checkSystemStatus(totalUsers, totalCourses, totalQuizzes) {
    // ตรวจสอบเงื่อนไขต่างๆ เพื่อกำหนดสถานะระบบ
    
    // เงื่อนไข 1: ตรวจสอบจำนวนผู้ใช้
    if (totalUsers === 0) {
        return {
            status: 'ไม่มีผู้ใช้',
            class: 'text-warning'
        };
    }
    
    // เงื่อนไข 2: ตรวจสอบจำนวนคอร์ส
    if (totalCourses === 0) {
        return {
            status: 'ไม่มีคอร์ส',
            class: 'text-warning'
        };
    }
    
    // เงื่อนไข 3: ตรวจสอบจำนวนข้อสอบ
    if (totalQuizzes === 0) {
        return {
            status: 'ไม่มีข้อสอบ',
            class: 'text-warning'
        };
    }
    
    // เงื่อนไข 4: ตรวจสอบสัดส่วนผู้ใช้ต่อคอร์ส
    const userToCourseRatio = totalUsers / totalCourses;
    if (userToCourseRatio > 50) {
        return {
            status: 'คอร์สไม่เพียงพอ',
            class: 'text-warning'
        };
    }
    
    // เงื่อนไข 5: ตรวจสอบสัดส่วนข้อสอบต่อคอร์ส
    const quizToCourseRatio = totalQuizzes / totalCourses;
    if (quizToCourseRatio < 0.5) {
        return {
            status: 'ข้อสอบน้อย',
            class: 'text-info'
        };
    }
    
    // เงื่อนไข 6: ตรวจสอบการใช้งานสูง
    if (totalUsers > 100 && totalCourses > 10 && totalQuizzes > 20) {
        return {
            status: 'ใช้งานสูง',
            class: 'text-success'
        };
    }
    
    // สถานะปกติ - เมื่อทุกอย่างสมดุล
    return {
        status: 'ปกติ',
        class: 'text-success'
    };
}

// ฟังก์ชันแสดงการแจ้งเตือนสถานะระบบ
function showSystemAlert(systemStatus) {
    const alertContainer = document.getElementById('systemAlerts');
    if (!alertContainer) return;
    
    const alertId = `alert-${Date.now()}`;
    const alertHtml = `
        <div id="${alertId}" class="alert alert-warning alert-dismissible" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>สถานะระบบ:</strong> ${systemStatus.status}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="ปิดการแจ้งเตือน"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
            // ลบการแจ้งเตือนอัตโนมัติหลังจาก 30 วินาที (เพิ่มเวลาให้มากขึ้น)
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 30000);
}

// ฟังก์ชันอัปเดตการ์ดสถิติ
function updateStatsCards(totalUsers, totalCourses, totalQuizzes) {
    // อัปเดตจำนวนผู้ใช้ทั้งหมด
    const totalUsersElement = document.getElementById('totalUsers');
    if (totalUsersElement) {
        totalUsersElement.textContent = totalUsers.toLocaleString();
    }
    
    // อัปเดตจำนวนคอร์สทั้งหมด
    const totalCoursesElement = document.getElementById('totalCourses');
    if (totalCoursesElement) {
        totalCoursesElement.textContent = totalCourses.toLocaleString();
    }
    
    // อัปเดตจำนวนข้อสอบทั้งหมด
    const totalQuizzesElement = document.getElementById('totalQuizzes');
    if (totalQuizzesElement) {
        totalQuizzesElement.textContent = totalQuizzes.toLocaleString();
    }
    
    // อัปเดตสถานะระบบ
    const systemStatusElement = document.getElementById('systemStatus');
    if (systemStatusElement) {
        const systemStatus = checkSystemStatus(totalUsers, totalCourses, totalQuizzes);
        systemStatusElement.textContent = systemStatus.status;
        systemStatusElement.className = systemStatus.class;
    }
}

// ฟังก์ชันอัปเดตสถิติผู้ใช้
function updateUserStats(students, instructors, admins, newUsers, totalUsers) {
    // คำนวณเปอร์เซ็นต์
    const studentPercent = totalUsers > 0 ? Math.round((students / totalUsers) * 100) : 0;
    const instructorPercent = totalUsers > 0 ? Math.round((instructors / totalUsers) * 100) : 0;
    const adminPercent = totalUsers > 0 ? Math.round((admins / totalUsers) * 100) : 0;
    
    // อัปเดตสถิติผู้ใช้
    const userStatsContainer = document.querySelector('.card-body .row');
    if (userStatsContainer) {
        userStatsContainer.innerHTML = `
            <div class="col-md-3 text-center">
                <div class="border rounded p-3">
                    <h4 class="text-primary">${students.toLocaleString()}</h4>
                    <p class="mb-0">นักเรียน</p>
                    <small class="text-muted">${studentPercent}% ของผู้ใช้ทั้งหมด</small>
                </div>
            </div>
            <div class="col-md-3 text-center">
                <div class="border rounded p-3">
                    <h4 class="text-success">${instructors.toLocaleString()}</h4>
                    <p class="mb-0">ผู้สอน</p>
                    <small class="text-muted">${instructorPercent}% ของผู้ใช้ทั้งหมด</small>
                </div>
            </div>
            <div class="col-md-3 text-center">
                <div class="border rounded p-3">
                    <h4 class="text-warning">${admins.toLocaleString()}</h4>
                    <p class="mb-0">แอดมิน</p>
                    <small class="text-muted">${adminPercent}% ของผู้ใช้ทั้งหมด</small>
                </div>
            </div>
            <div class="col-md-3 text-center">
                <div class="border rounded p-3">
                    <h4 class="text-info">${newUsers.toLocaleString()}</h4>
                    <p class="mb-0">ผู้ใช้ใหม่</p>
                    <small class="text-muted">เดือนนี้</small>
                </div>
            </div>
        `;
    }
}

// ฟังก์ชันดึงผู้ใช้ล่าสุด
export async function loadRecentUsers() {
    const startTime = performance.now();
    try {
        console.log('กำลังโหลดผู้ใช้ล่าสุด...');
        
        // ตรวจสอบ cache ก่อน
        const cacheKey = 'recent_users';
        const cachedUsers = cacheManager.get(cacheKey);
        if (cachedUsers) {
            console.log('Performance: ใช้ข้อมูลผู้ใช้จาก Cache');
            updateRecentUsersTable(cachedUsers);
            return;
        }
        
        // ดึงผู้ใช้ล่าสุด 10 คน
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const recentUsers = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            recentUsers.push({
                id: doc.id,
                ...userData,
                createdAt: userData.createdAt ? userData.createdAt.toDate() : new Date()
            });
        });
        
        // เก็บข้อมูลใน cache
        cacheManager.set(cacheKey, recentUsers, 3 * 60 * 1000); // 3 นาที
        
        // อัปเดตตารางผู้ใช้ล่าสุด
        updateRecentUsersTable(recentUsers);
        
        // วัดประสิทธิภาพ
        performanceMonitor.measureApiCall('loadRecentUsers', startTime);
        
        console.log('โหลดผู้ใช้ล่าสุดสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดผู้ใช้ล่าสุด:', error);
        showError('เกิดข้อผิดพลาดในการโหลดผู้ใช้ล่าสุด');
    }
}

// ฟังก์ชันอัปเดตตารางผู้ใช้ล่าสุด
function updateRecentUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    ไม่มีข้อมูลผู้ใช้
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // กำหนดสีและไอคอนตามประเภทผู้ใช้
        let userIconClass = 'bi-person';
        let userBadgeClass = 'bg-primary';
        let userTypeText = 'ไม่ระบุ';
        
        switch (user.userType) {
            case 'student':
                userIconClass = 'bi-mortarboard';
                userBadgeClass = 'bg-primary';
                userTypeText = 'นักเรียน';
                break;
            case 'instructor':
                userIconClass = 'bi-person-workspace';
                userBadgeClass = 'bg-success';
                userTypeText = 'ผู้สอน';
                break;
            case 'admin':
                userIconClass = 'bi-shield-check';
                userBadgeClass = 'bg-danger';
                userTypeText = 'แอดมิน';
                break;
        }
        
        // จัดรูปแบบวันที่
        const formattedDate = formatDateTime(user.createdAt, false);
        
        // สถานะผู้ใช้
        const status = user.isActive !== false ? 'ใช้งาน' : 'ระงับ';
        const statusClass = user.isActive !== false ? 'bg-success' : 'bg-warning';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-primary rounded-circle p-2 me-3">
                        <i class="${userIconClass} text-white"></i>
                    </div>
                    <div>
                        <h6 class="mb-0">${user.name || user.firstName + ' ' + user.lastName || 'ไม่ระบุชื่อ'}</h6>
                        <small class="text-muted">${user.email}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge ${userBadgeClass}">${userTypeText}</span></td>
            <td>${formattedDate}</td>
            <td><span class="badge ${statusClass}">${status}</span></td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewUser('${user.id}')" title="ดูข้อมูล">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.id}')" title="แก้ไข">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Initialize DataTable
    const dataTableConfig = {
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
        pageLength: 5,
        order: [[2, 'desc']], // เรียงตามวันที่สมัคร
        columnDefs: [
            {
                targets: [1, 3], // ประเภท, สถานะ
                responsivePriority: 2
            },
            {
                targets: [2], // วันที่สมัคร
                responsivePriority: 1
            },
            {
                targets: [4], // การดำเนินการ
                responsivePriority: 3,
                orderable: false,
                searchable: false
            }
        ]
    };
    
    // ปิดการใช้งาน DataTables responsive มาตรฐาน เพื่อไม่ให้มีจุดสีน้ำเงิน
    // if (typeof $.fn.dataTable.Responsive !== 'undefined') {
    //     dataTableConfig.responsive = {
    //         details: {
    //             display: $.fn.dataTable.Responsive.display.childRowImmediate,
    //             type: 'column',
    //             target: 0
    //         }
    //     };
    // }
    
    $('#usersTable').DataTable(dataTableConfig);
}

// ฟังก์ชันดึงกิจกรรมระบบล่าสุด
export async function loadSystemActivities() {
    try {
        console.log('กำลังโหลดกิจกรรมระบบ...');
        
        // ดึงกิจกรรมระบบล่าสุด 5 รายการ
        const activitiesQuery = query(
            collection(db, 'system_activities'),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = [];
        
        activitiesSnapshot.forEach(doc => {
            const activityData = doc.data();
            activities.push({
                id: doc.id,
                ...activityData,
                timestamp: activityData.timestamp ? activityData.timestamp.toDate() : new Date()
            });
        });
        
        // อัปเดตกิจกรรมระบบ
        updateSystemActivities(activities);
        
        console.log('โหลดกิจกรรมระบบสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดกิจกรรมระบบ:', error);
        // ไม่แสดง error เพราะอาจไม่มีคอลเลกชัน system_activities
    }
}

// ฟังก์ชันอัปเดตกิจกรรมระบบ
function updateSystemActivities(activities) {
    const activitiesContainer = document.querySelector('.list-group.list-group-flush');
    if (!activitiesContainer) return;
    
    if (activities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="bi bi-activity fs-1 d-block mb-2"></i>
                ไม่มีกิจกรรมระบบ
            </div>
        `;
        return;
    }
    
    activitiesContainer.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        // จัดรูปแบบวันที่
        const formattedDate = formatDateTime(activity.timestamp, true);
        
        // กำหนด badge ตามประเภทกิจกรรม
        let badgeClass = 'bg-info';
        let badgeText = 'ข้อมูล';
        
        switch (activity.type) {
            case 'user_registration':
                badgeClass = 'bg-success';
                badgeText = 'ใหม่';
                break;
            case 'course_created':
                badgeClass = 'bg-primary';
                badgeText = 'คอร์ส';
                break;
            case 'quiz_created':
                badgeClass = 'bg-warning';
                badgeText = 'ข้อสอบ';
                break;
            case 'system_backup':
                badgeClass = 'bg-secondary';
                badgeText = 'ระบบ';
                break;
        }
        
        item.innerHTML = `
            <div>
                <h6 class="mb-1">${activity.title}</h6>
                <small class="text-muted">${activity.description}</small>
            </div>
            <div class="text-end">
                <span class="badge ${badgeClass}">${badgeText}</span>
                <br>
                <small class="text-muted">${formattedDate}</small>
            </div>
        `;
        
        activitiesContainer.appendChild(item);
    });
}

// ฟังก์ชันบันทึกกิจกรรมระบบ
export async function logSystemActivity(title, description, type = 'info') {
    try {
        await addDoc(collection(db, 'system_activities'), {
            title,
            description,
            type,
            timestamp: serverTimestamp(),
            userId: auth.currentUser?.uid || 'system'
        });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกกิจกรรมระบบ:', error);
    }
}

// ฟังก์ชันแสดงข้อความ error
function showError(message) {
    // สร้าง toast notification หรือ alert
    const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // ลบข้อความหลังจาก 5 วินาที
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ฟังก์ชันแสดงข้อความ success
function showSuccess(message) {
    // สร้าง toast notification หรือ alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // ลบข้อความหลังจาก 3 วินาที
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// ฟังก์ชันสำหรับดูข้อมูลผู้ใช้
window.viewUser = function(userId) {
    // เปลี่ยนเส้นทางไปหน้าแสดงข้อมูลผู้ใช้
    window.location.href = `../users/user-detail.html?id=${userId}`;
};

// ฟังก์ชันสำหรับแก้ไขข้อมูลผู้ใช้
window.editUser = function(userId) {
    // เปลี่ยนเส้นทางไปหน้าแก้ไขข้อมูลผู้ใช้
    window.location.href = `../users/user-edit.html?id=${userId}`;
};

// ฟังก์ชันรีเฟรชข้อมูล
let isRefreshing = false;

// ฟังก์ชันสำหรับดูรายงานประสิทธิภาพ
window.showPerformanceReport = function() {
    const report = performanceMonitor.getReport();
    
    const reportHtml = `
        <div class="modal fade" id="performanceModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">รายงานประสิทธิภาพระบบ</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title">เวลาการโหลดหน้า</h6>
                                        <p class="card-text text-primary fw-bold">${report.pageLoadTime}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title">เวลาตอบสนอง API</h6>
                                        <p class="card-text text-info fw-bold">${report.apiResponseTime}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title">Cache Hit Rate</h6>
                                        <p class="card-text text-success fw-bold">${report.cacheHitRate}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title">การใช้ Memory</h6>
                                        <p class="card-text text-warning fw-bold">${report.memoryUsage}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-body">
                                        <h6 class="card-title">ขนาด Cache</h6>
                                        <p class="card-text text-secondary fw-bold">${report.cacheSize} รายการ</p>
                                        <button class="btn btn-sm btn-outline-danger" onclick="clearCache()">
                                            <i class="bi bi-trash me-1"></i>ล้าง Cache
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // เพิ่ม modal ลงใน DOM
    document.body.insertAdjacentHTML('beforeend', reportHtml);
    
    // แสดง modal
    const modal = new bootstrap.Modal(document.getElementById('performanceModal'));
    modal.show();
    
    // ลบ modal เมื่อปิด
    document.getElementById('performanceModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
};

// ฟังก์ชันล้าง Cache
window.clearCache = function() {
    cacheManager.clear();
    showSuccess('ล้าง Cache เรียบร้อยแล้ว');
    
    // อัปเดตรายงาน
    const cacheSizeElement = document.querySelector('#performanceModal .text-secondary');
    if (cacheSizeElement) {
        cacheSizeElement.textContent = '0 รายการ';
    }
};

// ฟังก์ชันรีเฟรชข้อมูล (ใช้ debounce)
window.refreshData = debounce(async function() {
    try {
        showSuccess('กำลังรีเฟรชข้อมูล...');
        await refreshDashboard();
        showSuccess('รีเฟรชข้อมูลสำเร็จ');
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
    }
}, 1000);

// ฟังก์ชันส่งออกข้อมูล
window.exportData = function() {
    try {
        // สร้างข้อมูลสำหรับส่งออก
        const exportData = {
            timestamp: new Date().toISOString(),
            dashboardStats: {
                totalUsers: document.getElementById('totalUsers')?.textContent || '0',
                totalCourses: document.getElementById('totalCourses')?.textContent || '0',
                totalQuizzes: document.getElementById('totalQuizzes')?.textContent || '0',
                systemStatus: document.getElementById('systemStatus')?.textContent || 'ปกติ'
            },
            performanceReport: performanceMonitor.getReport()
        };
        
        // สร้างไฟล์ JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        // ดาวน์โหลดไฟล์
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showSuccess('ส่งออกข้อมูลสำเร็จ');
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
};

// ฟังก์ชันพิมพ์ Dashboard
window.printDashboard = function() {
    try {
        window.print();
        showSuccess('กำลังพิมพ์ Dashboard');
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการพิมพ์');
    }
};

export async function refreshDashboard() {
    if (isRefreshing) {
        console.log('กำลังรีเฟรชข้อมูลอยู่ กรุณารอสักครู่');
        return;
    }
    
    isRefreshing = true;
    
    try {
        await loadDashboardStats();
        await loadRecentUsers();
        await loadSystemActivities();
    } finally {
        isRefreshing = false;
    }
}

// ฟังก์ชันเริ่มต้น Dashboard
export async function initializeDashboard() {
    try {
        console.log('เริ่มต้น Admin Dashboard...');
        
        // ตรวจสอบสิทธิ์การเข้าถึง (ต้องเป็น admin)
        protectPage('admin');
        
        // เริ่มต้น Performance Optimizer
        initializePerformanceOptimizer();
        
        // ตรวจสอบการเชื่อมต่อ Firebase
        if (!auth || !db) {
            throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้');
        }
        
        // แสดงสถานะกำลังโหลด
        showLoadingState();
        
        // โหลดข้อมูลทั้งหมดแบบแยกกันเพื่อป้องกัน error
        try {
            await loadDashboardStats();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดสถิติ:', error);
        }
        
        try {
            await loadRecentUsers();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดผู้ใช้ล่าสุด:', error);
        }
        
        try {
            await loadSystemActivities();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดกิจกรรมระบบ:', error);
        }
        
        // ซ่อนสถานะกำลังโหลด
        hideLoadingState();
        
        console.log('Admin Dashboard พร้อมใช้งาน');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น Dashboard:', error);
        hideLoadingState();
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard');
        throw error; // ส่ง error ต่อไป
    }
}

// ฟังก์ชันแสดงสถานะกำลังโหลด
function showLoadingState() {
    // เพิ่ม loading spinner ไปยังการ์ดต่างๆ
    const cards = document.querySelectorAll('.stat-card h3');
    cards.forEach(card => {
        card.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>กำลังโหลด...';
    });
}

// ฟังก์ชันซ่อนสถานะกำลังโหลด
function hideLoadingState() {
    // ลบ loading spinner
    const cards = document.querySelectorAll('.stat-card h3');
    cards.forEach(card => {
        if (card.innerHTML.includes('spinner-border')) {
            card.innerHTML = '0';
        }
    });
}

// เริ่มต้นเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Admin Dashboard: เริ่มต้นระบบ...');
        await initializeDashboard();
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น Admin Dashboard:', error);
    }
});
