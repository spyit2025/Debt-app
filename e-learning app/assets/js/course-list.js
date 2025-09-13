import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, displayUserInfo, showSuccessMessage, showErrorMessage } from './auth.js';
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc,
    doc, 
    deleteDoc,
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('เริ่มต้น Course List...');
    
    // ตรวจสอบสิทธิ์การเข้าถึง
    protectPage(['admin', 'instructor', 'student']);
    checkSessionExpiry();
    displayUserInfo();
    createMainMenu();
    createUserMenu();
    
    // เริ่มต้น DataTable
    initializeDataTable();
    
    // โหลดข้อมูลคอร์ส
    loadCourses();
    
    // เพิ่ม event listeners
    addEventListeners();
});

// เริ่มต้น DataTable
function initializeDataTable() {
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
        order: [[5, 'desc']], // เรียงตามวันที่สร้าง
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        autoWidth: false,
        scrollX: false,
        columnDefs: [
            {
                targets: [0], // รหัสคอร์ส
                width: '10%',
                responsivePriority: 1
            },
            {
                targets: [1], // ชื่อคอร์ส
                width: '25%',
                responsivePriority: 1
            },
            {
                targets: [2], // คำอธิบาย
                width: '25%',
                responsivePriority: 2
            },
            {
                targets: [3], // ผู้สอน
                width: '15%',
                responsivePriority: 2
            },
            {
                targets: [4], // สถานะ
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [5], // วันที่สร้าง
                width: '10%',
                responsivePriority: 3
            },
            {
                targets: [6], // การดำเนินการ
                width: '5%',
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
    //     };
    // }
    
    $('#courseTable').DataTable(dataTableConfig);
}

// โหลดข้อมูลคอร์ส
async function loadCourses() {
    try {
        console.log('กำลังโหลดข้อมูลคอร์ส...');
        showLoading('กำลังโหลดข้อมูลคอร์ส...');
        
        // ดึงข้อมูลคอร์สจาก Firebase
        const coursesQuery = query(
            collection(db, 'courses'),
            orderBy('createdAt', 'desc')
        );
        
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses = [];
        
        coursesSnapshot.forEach((doc) => {
            const courseData = doc.data();
            courses.push({
                id: doc.id,
                code: courseData.code || 'ไม่ระบุ',
                name: courseData.name || courseData.title || 'ไม่ระบุชื่อ',
                description: courseData.description || 'ไม่มีคำอธิบาย',
                instructor: courseData.instructorName || courseData.instructor || 'ไม่ระบุผู้สอน',
                status: courseData.isActive !== false ? 'active' : 'inactive',
                createdAt: courseData.createdAt ? formatDateTime(courseData.createdAt, false) : 'ไม่ระบุ'
            });
        });
        
        displayCourses(courses);
        hideLoading();
        console.log('โหลดข้อมูลคอร์สสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส:', error);
        hideLoading();
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส: ' + error.message);
    }
}

// แสดงข้อมูลคอร์สในตาราง
function displayCourses(courses) {
    const table = $('#courseTable').DataTable();
    table.clear();
    
    // ตรวจสอบสิทธิ์ผู้ใช้
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const isStudent = currentUser.userType === 'student';
    
    courses.forEach(course => {
        const statusBadge = getStatusBadge(course.status);
        
        // สร้างปุ่มตามสิทธิ์ผู้ใช้
        let actions = '';
        if (isStudent) {
            // สำหรับผู้เรียน: แสดงเฉพาะปุ่มดูรายละเอียด
            actions = `
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewCourse('${course.id}')" title="ดูรายละเอียด">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            `;
        } else {
            // สำหรับ admin และ instructor: แสดงปุ่มทั้งหมด
            actions = `
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editCourse('${course.id}')" title="แก้ไข">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCourse('${course.id}')" title="ลบ">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewCourse('${course.id}')" title="ดูรายละเอียด">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            `;
        }
        
        table.row.add([
            course.code,
            course.name,
            course.description,
            course.instructor,
            statusBadge,
            formatDate(course.createdAt),
            actions
        ]);
    });
    
    table.draw();
}

// สร้าง badge สำหรับสถานะ
function getStatusBadge(status) {
    const statusMap = {
        'active': '<span class="badge bg-success">เปิดใช้งาน</span>',
        'inactive': '<span class="badge bg-secondary">ปิดใช้งาน</span>',
        'draft': '<span class="badge bg-warning">ร่าง</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">ไม่ทราบ</span>';
}

// จัดรูปแบบวันที่
function formatDate(dateString) {
    return formatDateTime(dateString, false);
}

// เพิ่ม event listeners
function addEventListeners() {
    // ตรวจสอบสิทธิ์ผู้ใช้
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const isStudent = currentUser.userType === 'student';
    
    // ซ่อนปุ่มสำหรับผู้เรียน
    if (isStudent) {
        const addCourseBtn = document.getElementById('addCourseBtn');
        if (addCourseBtn) {
            addCourseBtn.style.display = 'none';
        }
    }
    
    // ปุ่มเพิ่มคอร์สใหม่ (เฉพาะ admin และ instructor)
    const addCourseBtn = document.getElementById('addCourseBtn');
    if (addCourseBtn && !isStudent) {
        addCourseBtn.addEventListener('click', function() {
            $('#addCourseModal').modal('show');
        });
    }
    
    // ปุ่มบันทึกคอร์สใหม่
    const saveCourseBtn = document.getElementById('saveCourseBtn');
    if (saveCourseBtn && !isStudent) {
        saveCourseBtn.addEventListener('click', function() {
            saveCourse();
        });
    }
    
    // ปุ่มอัปเดตคอร์ส
    const updateCourseBtn = document.getElementById('updateCourseBtn');
    if (updateCourseBtn && !isStudent) {
        updateCourseBtn.addEventListener('click', function() {
            updateCourse();
        });
    }
}

// บันทึกคอร์สใหม่
async function saveCourse() {
    try {
        const courseData = {
            code: document.getElementById('courseCode').value,
            name: document.getElementById('courseName').value,
            description: document.getElementById('courseDescription').value,
            instructor: document.getElementById('courseInstructor').value,
            status: document.getElementById('courseStatus').value
        };
        
        // ตรวจสอบข้อมูล
        if (!courseData.code || !courseData.name || !courseData.instructor) {
            showErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // จำลองการบันทึก (ในอนาคตจะเชื่อมต่อกับ Firebase)
        console.log('บันทึกคอร์สใหม่:', courseData);
        
        // ปิด modal และรีเฟรชข้อมูล
        $('#addCourseModal').modal('hide');
        showSuccessMessage('เพิ่มคอร์สใหม่สำเร็จ');
        
        // รีเซ็ตฟอร์ม
        document.getElementById('addCourseForm').reset();
        
        // โหลดข้อมูลใหม่
        loadCourses();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกคอร์ส:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกคอร์ส');
    }
}

// อัปเดตคอร์ส
async function updateCourse() {
    try {
        const courseId = document.getElementById('editCourseId').value;
        const courseData = {
            code: document.getElementById('editCourseCode').value,
            name: document.getElementById('editCourseName').value,
            description: document.getElementById('editCourseDescription').value,
            instructor: document.getElementById('editCourseInstructor').value,
            status: document.getElementById('editCourseStatus').value
        };
        
        // ตรวจสอบข้อมูล
        if (!courseData.code || !courseData.name || !courseData.instructor) {
            showErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // จำลองการอัปเดต (ในอนาคตจะเชื่อมต่อกับ Firebase)
        console.log('อัปเดตคอร์ส:', courseId, courseData);
        
        // ปิด modal และรีเฟรชข้อมูล
        $('#editCourseModal').modal('hide');
        showSuccessMessage('อัปเดตคอร์สสำเร็จ');
        
        // โหลดข้อมูลใหม่
        loadCourses();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตคอร์ส:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการอัปเดตคอร์ส');
    }
}

// ฟังก์ชันสำหรับแก้ไขคอร์ส (เรียกจาก HTML)
window.editCourse = async function(courseId) {
    console.log('แก้ไขคอร์ส:', courseId);
    
    // ดึงข้อมูลคอร์สจาก Firebase
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            
            // เติมข้อมูลในฟอร์ม
            document.getElementById('editCourseId').value = courseId;
            document.getElementById('editCourseCode').value = courseData.code || '';
            document.getElementById('editCourseName').value = courseData.name || courseData.title || '';
            document.getElementById('editCourseDescription').value = courseData.description || '';
            document.getElementById('editCourseInstructor').value = courseData.instructorName || courseData.instructor || '';
            document.getElementById('editCourseStatus').value = courseData.isActive !== false ? 'active' : 'inactive';
            
            // แสดง modal
            $('#editCourseModal').modal('show');
        } else {
            showErrorMessage('ไม่พบข้อมูลคอร์ส');
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส: ' + error.message);
    }
};

// ฟังก์ชันสำหรับลบคอร์ส (เรียกจาก HTML)
window.deleteCourse = async function(courseId) {
    if (confirm('คุณต้องการลบคอร์สนี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้')) {
        try {
            console.log('ลบคอร์ส:', courseId);
            
            // ลบคอร์สจาก Firebase
            await deleteDoc(doc(db, 'courses', courseId));
            
            showSuccessMessage('ลบคอร์สสำเร็จ');
            loadCourses();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการลบคอร์ส:', error);
            showErrorMessage('เกิดข้อผิดพลาดในการลบคอร์ส: ' + error.message);
        }
    }
};

// ฟังก์ชันสำหรับดูรายละเอียดคอร์ส (เรียกจาก HTML)
window.viewCourse = function(courseId) {
    console.log('ดูรายละเอียดคอร์ส:', courseId);
    
    // ดึงข้อมูลคอร์สและแสดงใน modal
    getDoc(doc(db, 'courses', courseId)).then((courseDoc) => {
        if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            
            // สร้าง modal content
            const modalContent = `
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="bi bi-book me-2"></i>${courseData.title || courseData.name || 'ไม่ระบุชื่อ'}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>รหัสคอร์ส:</strong> ${courseData.code || 'ไม่ระบุ'}</p>
                            <p><strong>ผู้สอน:</strong> ${courseData.instructorName || courseData.instructor || 'ไม่ระบุ'}</p>
                            <p><strong>สถานะ:</strong> ${courseData.isActive !== false ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>วันที่สร้าง:</strong> ${courseData.createdAt ? formatDateTime(courseData.createdAt, false) : 'ไม่ระบุ'}</p>
                            <p><strong>จำนวนบทเรียน:</strong> ${courseData.lessons ? courseData.lessons.length : 0}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <h6>คำอธิบาย:</h6>
                        <p>${courseData.description || 'ไม่มีคำอธิบาย'}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-primary" onclick="enrollCourse('${courseId}')">
                        <i class="bi bi-plus-circle me-1"></i>ลงทะเบียนเรียน
                    </button>
                </div>
            `;
            
            // แสดง modal
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'courseDetailModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        ${modalContent}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
            
            // ลบ modal เมื่อปิด
            modal.addEventListener('hidden.bs.modal', function() {
                modal.remove();
            });
        } else {
            showErrorMessage('ไม่พบข้อมูลคอร์ส');
        }
    }).catch((error) => {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส');
    });
};

// ฟังก์ชันสำหรับลงทะเบียนเรียน
window.enrollCourse = async function(courseId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            showErrorMessage('กรุณาเข้าสู่ระบบก่อน');
            return;
        }
        
        if (currentUser.userType !== 'student') {
            showErrorMessage('เฉพาะผู้เรียนเท่านั้นที่สามารถลงทะเบียนเรียนได้');
            return;
        }
        
        // ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลคอร์ส');
            return;
        }
        
        const courseData = courseDoc.data();
        const enrolledStudents = courseData.enrolledStudents || {};
        
        if (enrolledStudents[currentUser.uid]) {
            showErrorMessage('คุณได้ลงทะเบียนเรียนคอร์สนี้แล้ว');
            return;
        }
        
        // เพิ่มผู้เรียนเข้าไปในคอร์ส
        const { updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        await updateDoc(doc(db, 'courses', courseId), {
            [`enrolledStudents.${currentUser.uid}`]: {
                enrolledAt: new Date(),
                progress: 0,
                status: 'enrolled'
            }
        });
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('courseDetailModal'));
        if (modal) {
            modal.hide();
        }
        
        showSuccessMessage('ลงทะเบียนเรียนสำเร็จ!');
        
        // โหลดข้อมูลใหม่
        loadCourses();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลงทะเบียนเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการลงทะเบียนเรียน');
    }
};

// ฟังก์ชันกรองคอร์ส (เรียกจาก HTML)
window.filterCourses = function(filter) {
    console.log('กรองคอร์ส:', filter);
    
    // จำลองการกรอง (ในอนาคตจะกรองข้อมูลจริงจาก Firebase)
    // ตอนนี้จะโหลดข้อมูลใหม่
    loadCourses();
};

// ฟังก์ชันแสดง loading
function showLoading(message) {
    // สร้าง loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
    loadingDiv.style.cssText = 'background: rgba(0,0,0,0.5); z-index: 9999;';
    loadingDiv.innerHTML = `
        <div class="text-center text-white">
            <div class="spinner-border mb-3" role="status">
                <span class="visually-hidden">กำลังโหลด...</span>
            </div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(loadingDiv);
}

// ฟังก์ชันซ่อน loading
function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

