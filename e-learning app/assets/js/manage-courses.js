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
    addDoc, 
    getDocs, 
    getDoc,
    doc, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy,
    serverTimestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ตัวแปรสำหรับ DataTable
let coursesTable;

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

    // ตั้งค่า Event Listeners สำหรับจัดการหมวดหมู่
    setupCategoryEventListeners();
    
    // โหลดข้อมูล
    loadCoursesData();
    
    // โหลดข้อมูลหมวดหมู่
    loadCategories();
    
    // ตั้งค่า Event Listeners
    setupEventListeners();
});

// ตั้งค่า Event Listeners สำหรับจัดการหมวดหมู่
function setupCategoryEventListeners() {
    // ฟอร์มเพิ่มหมวดหมู่ใหม่
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', handleAddCategory);
    }
    
    // ฟอร์มแก้ไขหมวดหมู่
    const editCategoryForm = document.getElementById('editCategoryForm');
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', handleEditCategory);
    }
    
    // ปุ่มยืนยันการลบหมวดหมู่
    const confirmDeleteCategoryBtn = document.getElementById('confirmDeleteCategoryBtn');
    if (confirmDeleteCategoryBtn) {
        confirmDeleteCategoryBtn.addEventListener('click', handleDeleteCategory);
    }
    
    // จัดการ modal จัดการหมวดหมู่
    const manageCategoriesModal = document.getElementById('manageCategoriesModal');
    if (manageCategoriesModal) {
        manageCategoriesModal.addEventListener('shown.bs.modal', function() {
            // โหลดข้อมูลหมวดหมู่เมื่อ modal เปิด
            loadCategories();
        });
        
        // จัดการ focus management
        manageCategoriesModal.addEventListener('hidden.bs.modal', function() {
            // ย้าย focus กลับไปที่ปุ่มที่เปิด modal
            const triggerBtn = document.querySelector('[data-bs-target="#manageCategoriesModal"]');
            if (triggerBtn) {
                triggerBtn.focus();
            }
        });
    }
}

// จัดการ Focus Management สำหรับ Modals
function setupModalFocusManagement() {
    // จัดการ keyboard navigation ใน modal
    document.addEventListener('keydown', function(e) {
        const activeModal = document.querySelector('.modal.show');
        if (!activeModal) return;
        
        // ปิด modal ด้วย Escape key
        if (e.key === 'Escape') {
            const closeBtn = activeModal.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.click();
            }
        }
        
        // จัดการ Tab key ใน modal
        if (e.key === 'Tab') {
            const focusableElements = activeModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

// ตั้งค่า Event Listeners
function setupEventListeners() {
    // จัดการ focus management สำหรับ modals
    setupModalFocusManagement();
    
    // ฟอร์มเพิ่มคอร์สใหม่
    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', handleAddCourse);
    }
    
    // จัดการ modal เพิ่มคอร์ส
    const addCourseModal = document.getElementById('addCourseModal');
    if (addCourseModal) {
        addCourseModal.addEventListener('shown.bs.modal', function() {
            // โหลดข้อมูลหมวดหมู่เมื่อ modal เปิด
            loadCategories();
            
            // ย้าย focus ไปที่ input แรก
            const firstInput = addCourseModal.querySelector('#courseTitle');
            if (firstInput) {
                firstInput.focus();
            }
        });
        
        addCourseModal.addEventListener('hidden.bs.modal', function() {
            // ย้าย focus กลับไปที่ปุ่มที่เปิด modal
            const triggerBtn = document.querySelector('[data-bs-target="#addCourseModal"]');
            if (triggerBtn) {
                triggerBtn.focus();
            }
        });
    }
    
    // จัดการ modal แก้ไขหมวดหมู่
    const editCategoryModal = document.getElementById('editCategoryModal');
    if (editCategoryModal) {
        editCategoryModal.addEventListener('shown.bs.modal', function() {
            // โหลดข้อมูลหมวดหมู่เมื่อ modal เปิด
            loadCategories();
            
            // ย้าย focus ไปที่ input แรก
            const firstInput = editCategoryModal.querySelector('#editCategoryName');
            if (firstInput) {
                firstInput.focus();
            }
        });
        
        editCategoryModal.addEventListener('hidden.bs.modal', function() {
            // ย้าย focus กลับไปที่ปุ่มที่เปิด modal
            const triggerBtn = document.querySelector('[data-bs-target="#editCategoryModal"]');
            if (triggerBtn) {
                triggerBtn.focus();
            }
        });
    }
    
    // ฟอร์มแก้ไขคอร์ส
    const editCourseForm = document.getElementById('editCourseForm');
    if (editCourseForm) {
        editCourseForm.addEventListener('submit', handleEditCourse);
    }
    
    // ปุ่มยืนยันการลบ
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteCourse);
    }
}

// โหลดข้อมูลคอร์ส
async function loadCoursesData() {
    try {
        console.log('🔄 เริ่มต้นโหลดข้อมูลคอร์ส...');
        showLoading('กำลังโหลดข้อมูลคอร์ส...');
        
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        console.log('👤 ผู้ใช้ที่โหลดข้อมูล:', currentUser.uid);
        
        // ดึงข้อมูลคอร์สของผู้สอน
        const coursesQuery = query(
            collection(db, 'courses'),
            where('instructorId', '==', currentUser.uid)
        );
        
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses = [];
        
        console.log('📊 พบคอร์ส:', coursesSnapshot.size, 'รายการ');
        
        coursesSnapshot.forEach((doc) => {
            courses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('📋 ข้อมูลคอร์ส:', courses);
        
        // เรียงลำดับตามวันที่สร้าง (desc) ใน JavaScript
        courses.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        
        // อัปเดตสถิติ
        updateStatistics(courses);
        
        // สร้างตาราง
        createCoursesTable(courses);
        
        console.log('✅ โหลดข้อมูลคอร์สเสร็จสิ้น');
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error loading courses:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส: ' + error.message);
        hideLoading();
    }
}

// อัปเดตสถิติ
function updateStatistics(courses) {
    const totalCourses = courses.length;
    const activeCourses = courses.filter(course => course.isActive).length;
    
    // นับจำนวนนักเรียนทั้งหมด
    const totalStudents = courses.reduce((sum, course) => sum + (course.studentCount || 0), 0);
    
    // นับจำนวนข้อสอบทั้งหมด (จะต้องดึงจาก collection quizzes)
    const totalQuizzes = courses.reduce((sum, course) => sum + (course.quizCount || 0), 0);
    
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('activeCourses').textContent = activeCourses;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalQuizzes').textContent = totalQuizzes;
}

// สร้างตารางคอร์ส
function createCoursesTable(courses) {
    console.log('🎨 เริ่มต้นสร้างตารางคอร์ส...');
    
    const tableBody = document.querySelector('#coursesTable tbody');
    
    if (!tableBody) {
        console.error('❌ ไม่พบ tbody ของตาราง coursesTable');
        return;
    }
    
    console.log('📋 แสดงข้อมูลคอร์ส:', courses.length, 'รายการ');
    
    if (tableBody) {
        tableBody.innerHTML = courses.map(course => {
            const categoryText = getCategoryText(course.category);
            const levelText = getLevelText(course.level);
            const statusBadge = course.isActive ? 
                '<span class="badge bg-success">เปิดใช้งาน</span>' : 
                '<span class="badge bg-secondary">ปิดใช้งาน</span>';
            
            const createdAt = course.createdAt ? 
                new Date(course.createdAt.toDate()).toLocaleDateString('th-TH') : 
                'ไม่ระบุ';
            
            return `
                <tr data-course-id="${course.id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="${course.color || 'bg-primary'} rounded p-2 me-3">
                                <i class="${course.icon || 'bi-book'} text-white"></i>
                            </div>
                            <div>
                                <h6 class="mb-0">${course.title}</h6>
                                <small class="text-muted">${course.description?.substring(0, 50)}${course.description?.length > 50 ? '...' : ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${categoryText}</td>
                    <td>${levelText}</td>
                    <td>${course.duration || 0} ชั่วโมง</td>
                    <td>${course.studentCount || 0} คน</td>
                    <td>${statusBadge}</td>
                    <td>${createdAt}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary" onclick="editCourse('${course.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-outline-info" onclick="viewCourse('${course.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger" onclick="deleteCourse('${course.id}', '${course.title}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    console.log('✅ สร้างตารางเสร็จสิ้น');
    
    // เริ่มต้น DataTable
    if (coursesTable) {
        coursesTable.destroy();
    }
    
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
        pageLength: 10,
        order: [[6, 'desc']], // เรียงตามวันที่สร้าง
        columnDefs: [
            {
                targets: [1, 2, 3, 5], // หมวดหมู่, ระดับ, ระยะเวลา, สถานะ
                responsivePriority: 2
            },
            {
                targets: [4, 6], // นักเรียน, วันที่สร้าง
                responsivePriority: 1
            },
            {
                targets: [7], // การจัดการ
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
    
    coursesTable = $('#coursesTable').DataTable(dataTableConfig);
}

// ฟังก์ชันจัดการการสร้างคอร์สใหม่
async function handleAddCourse(e) {
    e.preventDefault();
    
    try {
        console.log('🎯 เริ่มต้นการสร้างคอร์สใหม่');
        
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        console.log('👤 ผู้ใช้ปัจจุบัน:', currentUser);
        
        const courseData = {
            title: document.getElementById('courseTitle').value,
            description: document.getElementById('courseDescription').value,
            category: document.getElementById('courseCategory').value,
            level: document.getElementById('courseLevel').value,
            duration: parseInt(document.getElementById('courseDuration').value),
            icon: document.getElementById('courseIcon').value,
            color: document.getElementById('courseColor').value,
            instructorId: currentUser.uid,
            instructorName: currentUser.name,
            isActive: true,
            studentCount: 0,
            quizCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        console.log('📝 ข้อมูลคอร์สที่จะสร้าง:', courseData);
        
        // เพิ่มคอร์สใหม่
        const docRef = await addDoc(collection(db, 'courses'), courseData);
        
        console.log('✅ สร้างคอร์สสำเร็จ ID:', docRef.id);
        
        // เพิ่มข้อมูลลงในตารางทันที
        addCourseToTable(docRef.id, courseData);
        
        // อัปเดตสถิติ
        updateStatisticsFromTable();
        
        showSuccess('สร้างคอร์สใหม่สำเร็จ!');
        
        // ปิด modal และรีเซ็ตฟอร์ม
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCourseModal'));
        modal.hide();
        document.getElementById('addCourseForm').reset();
        
    } catch (error) {
        console.error('❌ Error adding course:', error);
        showError('เกิดข้อผิดพลาดในการสร้างคอร์ส: ' + error.message);
    }
}

// ฟังก์ชันจัดการการแก้ไขคอร์ส
async function handleEditCourse(e) {
    e.preventDefault();
    
    try {
        const courseId = document.getElementById('editCourseId').value;
        
        const courseData = {
            title: document.getElementById('editCourseTitle').value,
            description: document.getElementById('editCourseDescription').value,
            category: document.getElementById('editCourseCategory').value,
            level: document.getElementById('editCourseLevel').value,
            duration: parseInt(document.getElementById('editCourseDuration').value),
            icon: document.getElementById('editCourseIcon').value,
            color: document.getElementById('editCourseColor').value,
            isActive: document.getElementById('editCourseActive').checked,
            updatedAt: serverTimestamp()
        };
        
        console.log('🔄 กำลังอัปเดตคอร์ส ID:', courseId);
        console.log('📝 ข้อมูลที่อัปเดต:', courseData);
        
        // อัปเดตคอร์สในฐานข้อมูล
        await updateDoc(doc(db, 'courses', courseId), courseData);
        
        // อัปเดตข้อมูลในตารางทันที
        updateCourseInTable(courseId, courseData);
        
        // อัปเดตสถิติ
        updateStatisticsFromTable();
        
        showSuccess('อัปเดตคอร์สสำเร็จ!');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editCourseModal'));
        modal.hide();
        
    } catch (error) {
        console.error('❌ Error updating course:', error);
        showError('เกิดข้อผิดพลาดในการอัปเดตคอร์ส: ' + error.message);
    }
}

// ฟังก์ชันจัดการการลบคอร์ส
async function handleDeleteCourse() {
    try {
        const courseId = document.getElementById('confirmDeleteBtn').getAttribute('data-course-id');
        
        console.log('🗑️ กำลังลบคอร์ส ID:', courseId);
        
        // ลบคอร์สจากฐานข้อมูล
        await deleteDoc(doc(db, 'courses', courseId));
        
        // ลบแถวออกจากตารางทันที
        removeCourseFromTable(courseId);
        
        // อัปเดตสถิติ
        updateStatisticsFromTable();
        
        showSuccess('ลบคอร์สสำเร็จ!');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCourseModal'));
        modal.hide();
        
    } catch (error) {
        console.error('❌ Error deleting course:', error);
        showError('เกิดข้อผิดพลาดในการลบคอร์ส: ' + error.message);
    }
}

// ฟังก์ชันแก้ไขคอร์ส (เรียกจาก HTML)
window.editCourse = async function(courseId) {
    try {
        console.log('🎯 เริ่มต้นแก้ไขคอร์ส ID:', courseId);
        
        // ดึงข้อมูลคอร์ส
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        
        if (courseDoc.exists()) {
            const course = courseDoc.data();
            console.log('📋 ข้อมูลคอร์สที่โหลด:', course);
            
            // เติมข้อมูลในฟอร์ม
            document.getElementById('editCourseId').value = courseId;
            document.getElementById('editCourseTitle').value = course.title;
            document.getElementById('editCourseDescription').value = course.description;
            document.getElementById('editCourseCategory').value = course.category;
            document.getElementById('editCourseLevel').value = course.level;
            document.getElementById('editCourseDuration').value = course.duration;
            document.getElementById('editCourseIcon').value = course.icon || 'bi-book';
            document.getElementById('editCourseColor').value = course.color || 'bg-primary';
            document.getElementById('editCourseActive').checked = course.isActive;
            
            console.log('✅ เติมข้อมูลในฟอร์มเสร็จสิ้น');
            
            // เปิด modal
            const modal = new bootstrap.Modal(document.getElementById('editCourseModal'));
            modal.show();
            
            console.log('✅ เปิด modal แก้ไขคอร์ส');
        } else {
            console.error('❌ ไม่พบข้อมูลคอร์ส ID:', courseId);
            showError('ไม่พบข้อมูลคอร์สที่ต้องการแก้ไข');
        }
        
    } catch (error) {
        console.error('❌ Error loading course for edit:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส: ' + error.message);
    }
};

// ฟังก์ชันดูคอร์ส (เรียกจาก HTML) - แสดงแบบ popup
window.viewCourse = function(courseId) {
    // เปิด modal และโหลดข้อมูลคอร์ส
    const modal = new bootstrap.Modal(document.getElementById('courseDetailModal'));
    modal.show();
    
    // โหลดข้อมูลคอร์ส
    loadCourseDetailForModal(courseId);
};

// โหลดข้อมูลคอร์สสำหรับแสดงใน modal
async function loadCourseDetailForModal(courseId) {
    try {
        // แสดง loading
        hideCourseDetailContent();
        
        console.log('🔄 โหลดข้อมูลคอร์สสำหรับ modal ID:', courseId);
        
        // ดึงข้อมูลคอร์สจาก Firestore
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        
        if (!courseDoc.exists()) {
            throw new Error('ไม่พบข้อมูลคอร์ส');
        }
        
        const courseData = {
            id: courseDoc.id,
            ...courseDoc.data()
        };
        
        console.log('📋 ข้อมูลคอร์สสำหรับ modal:', courseData);
        
        // แสดงข้อมูลคอร์สใน modal
        displayCourseDataInModal(courseData);
        
        // แสดงข้อมูล
        showCourseDetailContent();
        
    } catch (error) {
        console.error('❌ Error loading course for modal:', error);
        
        // แสดงข้อผิดพลาด
        showCourseDetailError();
    }
}

// แสดงข้อมูลคอร์สใน modal
async function displayCourseDataInModal(course) {
    console.log('📊 กำลังโหลดสถิติสำหรับคอร์ส:', course.id);
    
    // ข้อมูลหลัก
    document.getElementById('modalCourseTitle').textContent = course.title || 'ไม่ระบุ';
    document.getElementById('modalCourseDescription').textContent = course.description || 'ไม่มีคำอธิบาย';
    document.getElementById('modalCourseId').textContent = course.id;
    
    // ไอคอนและสี
    const courseIconElement = document.getElementById('modalCourseIcon');
    courseIconElement.className = `${course.color || 'bg-primary'} rounded p-3 mb-3`;
    courseIconElement.innerHTML = `<i class="${course.icon || 'bi-book'} text-white fs-1"></i>`;
    
    // หมวดหมู่
    const categoryText = getCategoryText(course.category);
    document.getElementById('modalCourseCategory').innerHTML = `<span class="badge bg-secondary">${categoryText}</span>`;
    
    // ระดับ
    const levelText = getLevelText(course.level);
    document.getElementById('modalCourseLevel').innerHTML = `<span class="badge bg-info">${levelText}</span>`;
    
    // ระยะเวลา
    document.getElementById('modalCourseDuration').textContent = `${course.duration || 0} ชั่วโมง`;
    
    // สถานะ
    const statusBadge = course.isActive ? 
        '<span class="badge bg-success">เปิดใช้งาน</span>' : 
        '<span class="badge bg-secondary">ปิดใช้งาน</span>';
    document.getElementById('modalCourseStatus').innerHTML = statusBadge;
    
    // โหลดสถิติจริงจากฐานข้อมูล
    try {
        // นับจำนวนนักเรียนที่ลงทะเบียนในคอร์สนี้
        const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('courseId', '==', course.id)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const studentCount = enrollmentsSnapshot.size;
        
        // นับจำนวนข้อสอบในคอร์สนี้
        const quizzesQuery = query(
            collection(db, 'quizzes'),
            where('courseId', '==', course.id)
        );
        const quizzesSnapshot = await getDocs(quizzesQuery);
        const quizCount = quizzesSnapshot.size;
        
        // คำนวณอัตราการเรียนจบ (นักเรียนที่เรียนจบ / นักเรียนทั้งหมด)
        let completionRate = 0;
        if (studentCount > 0) {
            const completedEnrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('courseId', '==', course.id),
                where('status', '==', 'completed')
            );
            const completedSnapshot = await getDocs(completedEnrollmentsQuery);
            const completedCount = completedSnapshot.size;
            completionRate = Math.round((completedCount / studentCount) * 100);
        }
        
        // แสดงสถิติ
        document.getElementById('modalStudentCount').textContent = studentCount;
        document.getElementById('modalQuizCount').textContent = quizCount;
        document.getElementById('modalCompletionRate').textContent = `${completionRate}%`;
        
        console.log('✅ โหลดสถิติเสร็จสิ้น:', { studentCount, quizCount, completionRate });
        
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
        // แสดงค่าเริ่มต้นถ้าเกิดข้อผิดพลาด
        document.getElementById('modalStudentCount').textContent = course.studentCount || 0;
        document.getElementById('modalQuizCount').textContent = course.quizCount || 0;
        document.getElementById('modalCompletionRate').textContent = '0%';
    }
    
    // ข้อมูลเพิ่มเติม
    document.getElementById('modalInstructorName').textContent = course.instructorName || 'ไม่ระบุ';
    
    // วันที่
            const createdAt = course.createdAt ? 
            formatDateTime(course.createdAt, false) : 
            'ไม่ระบุ';
        document.getElementById('modalCreatedAt').textContent = createdAt;
        
        const updatedAt = course.updatedAt ? 
            formatDateTime(course.updatedAt, false) : 
            'ไม่ระบุ';
        document.getElementById('modalUpdatedAt').textContent = updatedAt;
}

// ฟังก์ชันลบคอร์ส (เรียกจาก HTML)
window.deleteCourse = function(courseId, courseName) {
    // เติมข้อมูลใน modal ยืนยันการลบ
    document.getElementById('deleteCourseName').textContent = courseName;
    document.getElementById('confirmDeleteBtn').setAttribute('data-course-id', courseId);
    
    // เปิด modal
    const modal = new bootstrap.Modal(document.getElementById('deleteCourseModal'));
    modal.show();
};

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
    return categories[category] || category;
}

function getLevelText(level) {
    const levels = {
        'beginner': 'เริ่มต้น',
        'intermediate': 'ปานกลาง',
        'advanced': 'ขั้นสูง'
    };
    return levels[level] || level;
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

// ==================== ฟังก์ชันจัดการหมวดหมู่ ====================

// โหลดข้อมูลหมวดหมู่
async function loadCategories() {
    try {
        const categoriesQuery = query(
            collection(db, 'categories'),
            orderBy('createdAt', 'desc')
        );
        
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categories = [];
        
        categoriesSnapshot.forEach((doc) => {
            const categoryData = doc.data();
            categories.push({
                id: doc.id,
                name: categoryData.name,
                code: categoryData.code,
                courseCount: categoryData.courseCount || 0,
                createdAt: categoryData.createdAt ? formatDateTime(categoryData.createdAt, false) : 'ไม่ระบุ'
            });
        });
        
        renderCategoriesTable(categories);
        updateCategorySelects(categories);
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่');
    }
}

// แสดงข้อมูลหมวดหมู่ในตาราง
function renderCategoriesTable(categories) {
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;
    
    if (categories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    ไม่มีข้อมูลหมวดหมู่
                </td>
            </tr>
        `;
        return;
    }
    
    const tableRows = categories.map(category => `
        <tr>
            <td>${category.name}</td>
            <td><code>${category.code}</code></td>
            <td>
                <span class="badge bg-primary">${category.courseCount} คอร์ส</span>
            </td>
            <td>${category.createdAt}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editCategory('${category.id}')" title="แก้ไข">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteCategory('${category.id}', '${category.name}')" title="ลบ">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = tableRows;
}

// อัปเดต select options ในฟอร์มคอร์ส
function updateCategorySelects(categories) {
    console.log('🔄 อัปเดต select หมวดหมู่:', categories.length, 'รายการ');
    
    const categorySelects = [
        document.getElementById('courseCategory'),
        document.getElementById('editCourseCategory')
    ];
    
    categorySelects.forEach((select, index) => {
        if (select) {
            console.log(`📋 อัปเดต select ${index + 1}:`, select.id);
            
            // เก็บค่าเดิม
            const currentValue = select.value;
            
            // ลบตัวเลือกเก่า (ยกเว้นตัวเลือกแรก)
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            select.appendChild(firstOption);
            
            // เพิ่มตัวเลือกใหม่
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.code;
                option.textContent = category.name;
                select.appendChild(option);
                console.log(`  ✅ เพิ่ม: ${category.name} (${category.code})`);
            });
            
            // คืนค่าเดิม
            select.value = currentValue;
            console.log(`✅ อัปเดต select ${select.id} เสร็จสิ้น`);
        } else {
            console.warn(`⚠️ ไม่พบ select ${index + 1}`);
        }
    });
}

// จัดการการเพิ่มหมวดหมู่ใหม่
async function handleAddCategory(e) {
    e.preventDefault();
    
    try {
        const name = document.getElementById('newCategoryName').value.trim();
        const code = document.getElementById('newCategoryCode').value.trim();
        
        if (!name || !code) {
            showError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // ตรวจสอบรหัสซ้ำ
        const existingQuery = query(
            collection(db, 'categories'),
            where('code', '==', code)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
            showError('รหัสหมวดหมู่นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
            return;
        }
        
        // บันทึกหมวดหมู่ใหม่
        const newCategoryRef = await addDoc(collection(db, 'categories'), {
            name: name,
            code: code,
            courseCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        showSuccess('เพิ่มหมวดหมู่สำเร็จ!');
        
        // รีเซ็ตฟอร์ม
        e.target.reset();
        
        // โหลดข้อมูลใหม่
        await loadCategories();
        
    } catch (error) {
        console.error('Error adding category:', error);
        showError('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่: ' + error.message);
    }
}

// แก้ไขหมวดหมู่
async function editCategory(categoryId) {
    try {
        const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
        
        if (categoryDoc.exists()) {
            const categoryData = categoryDoc.data();
            
            document.getElementById('editCategoryId').value = categoryId;
            document.getElementById('editCategoryName').value = categoryData.name;
            document.getElementById('editCategoryCode').value = categoryData.code;
            
            // เปิด modal แก้ไข
            const editModal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
            editModal.show();
        }
        
    } catch (error) {
        console.error('Error loading category for edit:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่');
    }
}

// จัดการการแก้ไขหมวดหมู่
async function handleEditCategory(e) {
    e.preventDefault();
    
    try {
        const categoryId = document.getElementById('editCategoryId').value;
        const name = document.getElementById('editCategoryName').value.trim();
        const code = document.getElementById('editCategoryCode').value.trim();
        
        if (!name || !code) {
            showError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // ตรวจสอบรหัสซ้ำ (ยกเว้นตัวเอง)
        const existingQuery = query(
            collection(db, 'categories'),
            where('code', '==', code)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        const duplicateExists = existingSnapshot.docs.some(doc => doc.id !== categoryId);
        if (duplicateExists) {
            showError('รหัสหมวดหมู่นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
            return;
        }
        
        // อัปเดตข้อมูล
        await updateDoc(doc(db, 'categories', categoryId), {
            name: name,
            code: code,
            updatedAt: serverTimestamp()
        });
        
        showSuccess('แก้ไขหมวดหมู่สำเร็จ!');
        
        // ปิด modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
        editModal.hide();
        
        // โหลดข้อมูลใหม่
        loadCategories();
        
    } catch (error) {
        console.error('Error updating category:', error);
        showError('เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่: ' + error.message);
    }
}

// ลบหมวดหมู่
async function deleteCategory(categoryId, categoryName) {
    try {
        // เติมข้อมูลใน modal ยืนยันการลบ
        document.getElementById('deleteCategoryName').textContent = categoryName;
        document.getElementById('confirmDeleteCategoryBtn').setAttribute('data-category-id', categoryId);
        document.getElementById('confirmDeleteCategoryBtn').setAttribute('data-category-name', categoryName);
        
        // เปิด modal ยืนยัน
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
        deleteModal.show();
        
    } catch (error) {
        console.error('Error preparing delete category:', error);
        showError('เกิดข้อผิดพลาดในการเตรียมลบหมวดหมู่');
    }
}

// จัดการการลบหมวดหมู่ (เรียกจากปุ่มยืนยัน)
async function handleDeleteCategory() {
    try {
        const categoryId = document.getElementById('confirmDeleteCategoryBtn').getAttribute('data-category-id');
        const categoryName = document.getElementById('confirmDeleteCategoryBtn').getAttribute('data-category-name');
        
        if (!categoryId || !categoryName) {
            showError('ไม่พบข้อมูลหมวดหมู่ที่ต้องการลบ');
            return;
        }
        
        // ตรวจสอบว่ามีคอร์สใช้หมวดหมู่นี้หรือไม่
        const coursesQuery = query(
            collection(db, 'courses'),
            where('category', '==', categoryName)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        
        if (!coursesSnapshot.empty) {
            // อัปเดตคอร์สที่ใช้หมวดหมู่นี้
            const batch = writeBatch(db);
            coursesSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { category: 'ไม่ระบุหมวดหมู่' });
            });
            await batch.commit();
        }
        
        // ลบหมวดหมู่
        await deleteDoc(doc(db, 'categories', categoryId));
        
        showSuccess('ลบหมวดหมู่สำเร็จ!');
        
        // ปิด modal ยืนยัน
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
        deleteModal.hide();
        
        // โหลดข้อมูลใหม่
        loadCategories();
        loadCoursesData(); // โหลดข้อมูลคอร์สใหม่
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showError('เกิดข้อผิดพลาดในการลบหมวดหมู่: ' + error.message);
    }
}



// ฟังก์ชันสำหรับเรียกใช้จาก HTML
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

// ฟังก์ชันอัปเดตข้อมูลคอร์สในตารางทันที
function updateCourseInTable(courseId, courseData) {
    console.log('🔄 กำลังอัปเดตข้อมูลในตารางสำหรับคอร์ส ID:', courseId);
    
    // หาแถวในตารางที่ต้องการอัปเดต
    const tableRow = document.querySelector(`tr[data-course-id="${courseId}"]`);
    
    if (tableRow) {
        // อัปเดตข้อมูลในแต่ละคอลัมน์
        const cells = tableRow.querySelectorAll('td');
        
        if (cells.length >= 8) {
            // ชื่อคอร์ส
            cells[0].innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-${courseData.color || 'primary'} rounded p-2 me-3">
                        <i class="bi ${courseData.icon || 'bi-book'} text-white"></i>
                    </div>
                    <div>
                        <h6 class="mb-0">${courseData.title}</h6>
                        <small class="text-muted">${courseData.description.substring(0, 50)}${courseData.description.length > 50 ? '...' : ''}</small>
                    </div>
                </div>
            `;
            
            // หมวดหมู่
            cells[1].innerHTML = `<span class="badge bg-secondary">${courseData.category}</span>`;
            
            // ระดับ
            const levelText = {
                'beginner': 'เริ่มต้น',
                'intermediate': 'ปานกลาง',
                'advanced': 'ขั้นสูง'
            };
            cells[2].innerHTML = `<span class="badge bg-info">${levelText[courseData.level] || courseData.level}</span>`;
            
            // ระยะเวลา
            cells[3].textContent = `${courseData.duration} ชั่วโมง`;
            
            // นักเรียน (คงเดิม)
            // cells[4] ไม่เปลี่ยนแปลง
            
            // สถานะ
            const statusBadge = courseData.isActive ? 
                '<span class="badge bg-success">เปิดใช้งาน</span>' : 
                '<span class="badge bg-danger">ปิดใช้งาน</span>';
            cells[5].innerHTML = statusBadge;
            
            // วันที่สร้าง (คงเดิม)
            // cells[6] ไม่เปลี่ยนแปลง
            
            // การจัดการ (คงเดิม)
            // cells[7] ไม่เปลี่ยนแปลง
        }
        
        console.log('✅ อัปเดตข้อมูลในตารางเสร็จสิ้น');
    } else {
        console.warn('⚠️ ไม่พบแถวในตารางสำหรับคอร์ส ID:', courseId);
    }
}

// ฟังก์ชันเพิ่มคอร์สใหม่ลงในตารางทันที
function addCourseToTable(courseId, courseData) {
    console.log('🔄 กำลังเพิ่มคอร์สใหม่ลงในตาราง ID:', courseId);
    
    const tableBody = document.querySelector('#coursesTable tbody');
    
    if (!tableBody) {
        console.error('❌ ไม่พบ tbody ของตาราง coursesTable');
        return;
    }
    
    // สร้างแถวใหม่
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-course-id', courseId);
    
    // เตรียมข้อมูลสำหรับแสดงผล
    const categoryText = getCategoryText(courseData.category);
    const levelText = getLevelText(courseData.level);
    const statusBadge = courseData.isActive ? 
        '<span class="badge bg-success">เปิดใช้งาน</span>' : 
        '<span class="badge bg-secondary">ปิดใช้งาน</span>';
    
            const createdAt = formatDateTime(new Date(), false);
    
    // สร้าง HTML สำหรับแถวใหม่
    newRow.innerHTML = `
        <td>
            <div class="d-flex align-items-center">
                <div class="${courseData.color || 'bg-primary'} rounded p-2 me-3">
                    <i class="${courseData.icon || 'bi-book'} text-white"></i>
                </div>
                <div>
                    <h6 class="mb-0">${courseData.title}</h6>
                    <small class="text-muted">${courseData.description?.substring(0, 50)}${courseData.description?.length > 50 ? '...' : ''}</small>
                </div>
            </div>
        </td>
        <td>${categoryText}</td>
        <td>${levelText}</td>
        <td>${courseData.duration || 0} ชั่วโมง</td>
        <td>${courseData.studentCount || 0} คน</td>
        <td>${statusBadge}</td>
        <td>${createdAt}</td>
        <td>
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-primary" onclick="editCourse('${courseId}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-outline-info" onclick="viewCourse('${courseId}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-danger" onclick="deleteCourse('${courseId}', '${courseData.title}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    // เพิ่มแถวใหม่ไว้ที่ต้นตาราง (เพราะเรียงตามวันที่สร้าง desc)
    if (tableBody.firstChild) {
        tableBody.insertBefore(newRow, tableBody.firstChild);
    } else {
        tableBody.appendChild(newRow);
    }
    
    console.log('✅ เพิ่มคอร์สใหม่ลงในตารางเสร็จสิ้น');
}

// ฟังก์ชันลบคอร์สออกจากตารางทันที
function removeCourseFromTable(courseId) {
    console.log('🗑️ กำลังลบคอร์สออกจากตาราง ID:', courseId);
    
    const tableRow = document.querySelector(`tr[data-course-id="${courseId}"]`);
    
    if (tableRow) {
        tableRow.remove();
        console.log('✅ ลบคอร์สออกจากตารางเสร็จสิ้น');
    } else {
        console.warn('⚠️ ไม่พบแถวในตารางสำหรับคอร์ส ID:', courseId);
    }
}

// ฟังก์ชันอัปเดตสถิติจากข้อมูลในตาราง
function updateStatisticsFromTable() {
    console.log('📊 กำลังอัปเดตสถิติจากข้อมูลในตาราง...');
    
    const tableRows = document.querySelectorAll('#coursesTable tbody tr');
    let totalCourses = 0;
    let activeCourses = 0;
    let totalStudents = 0;
    
    tableRows.forEach(row => {
        totalCourses++;
        
        // ตรวจสอบสถานะ
        const statusCell = row.querySelector('td:nth-child(6)');
        if (statusCell && statusCell.textContent.includes('เปิดใช้งาน')) {
            activeCourses++;
        }
        
        // นับจำนวนนักเรียน
        const studentCell = row.querySelector('td:nth-child(5)');
        if (studentCell) {
            const studentCount = parseInt(studentCell.textContent) || 0;
            totalStudents += studentCount;
        }
    });
    
    // อัปเดตสถิติในหน้า
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('activeCourses').textContent = activeCourses;
    document.getElementById('totalStudents').textContent = totalStudents;
    
    console.log('✅ อัปเดตสถิติเสร็จสิ้น:', { totalCourses, activeCourses, totalStudents });
}

// ฟังก์ชันแสดง/ซ่อน course detail content
function showCourseDetailContent() {
    const content = document.getElementById('courseDetailContent');
    const error = document.getElementById('courseDetailError');
    const loading = document.getElementById('courseDetailLoading');
    
    if (content) content.classList.remove('course-detail-content');
    if (error) error.classList.add('course-detail-error');
    if (loading) loading.style.display = 'none';
}

function hideCourseDetailContent() {
    const content = document.getElementById('courseDetailContent');
    const error = document.getElementById('courseDetailError');
    const loading = document.getElementById('courseDetailLoading');
    
    if (content) content.classList.add('course-detail-content');
    if (error) error.classList.remove('course-detail-error');
    if (loading) loading.style.display = 'block';
}

function showCourseDetailError() {
    const content = document.getElementById('courseDetailContent');
    const error = document.getElementById('courseDetailError');
    const loading = document.getElementById('courseDetailLoading');
    
    if (content) content.classList.add('course-detail-content');
    if (error) error.classList.remove('course-detail-error');
    if (loading) loading.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Event listener สำหรับปุ่มยืนยันการลบคอร์ส
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteCourse);
    
    // Event listener สำหรับปุ่มยืนยันการลบหมวดหมู่
    document.getElementById('confirmDeleteCategoryBtn').addEventListener('click', handleDeleteCategory);
});


