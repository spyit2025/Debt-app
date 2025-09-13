import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, showSuccessMessage, showErrorMessage } from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('เริ่มต้น Student List...');
    
    // ตรวจสอบสิทธิ์การเข้าถึง
    protectPage(['admin', 'instructor']);
    checkSessionExpiry();
    createMainMenu();
    createUserMenu();
    
    // เริ่มต้น DataTable
    initializeDataTable();
    
    // โหลดข้อมูลนักเรียน
    loadStudents();
    
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
        order: [[5, 'desc']], // เรียงตามวันที่สมัคร
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        autoWidth: false,
        scrollX: false,
        columnDefs: [
            {
                targets: [0], // รหัสนักเรียน
                width: '12%',
                responsivePriority: 1
            },
            {
                targets: [1], // ชื่อ-นามสกุล
                width: '20%',
                responsivePriority: 1
            },
            {
                targets: [2], // อีเมล
                width: '20%',
                responsivePriority: 2
            },
            {
                targets: [3], // เบอร์โทร
                width: '12%',
                responsivePriority: 2
            },
            {
                targets: [4], // สถานะ
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [5], // วันที่สมัคร
                width: '12%',
                responsivePriority: 3
            },
            {
                targets: [6], // คอร์สที่เรียน
                width: '14%',
                responsivePriority: 3
            },
            {
                targets: [7], // การดำเนินการ
                width: '10%',
                responsivePriority: 3,
                orderable: false,
                searchable: false
            }
        ]
    };
    
    // เพิ่ม responsive configuration ถ้า plugin โหลดแล้ว
    if (typeof $.fn.dataTable.Responsive !== 'undefined') {
        dataTableConfig.responsive = {
            details: {
                display: $.fn.dataTable.Responsive.display.childRowImmediate,
                type: 'column',
                target: 0
            }
        };
    }
    
    $('#studentTable').DataTable(dataTableConfig);
}

// โหลดข้อมูลนักเรียน
async function loadStudents() {
    try {
        console.log('กำลังโหลดข้อมูลนักเรียน...');
        
        // จำลองข้อมูลนักเรียน (ในอนาคตจะเชื่อมต่อกับ Firebase)
        const students = [
            {
                id: '1',
                studentId: '6400000001',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                email: 'somchai@example.com',
                phone: '081-234-5678',
                status: 'active',
                joinDate: '2024-01-10',
                courses: ['การเขียนโปรแกรมพื้นฐาน', 'โครงสร้างข้อมูลและอัลกอริทึม']
            },
            {
                id: '2',
                studentId: '6400000002',
                firstName: 'สมหญิง',
                lastName: 'รักเรียน',
                email: 'somying@example.com',
                phone: '082-345-6789',
                status: 'active',
                joinDate: '2024-01-15',
                courses: ['การเขียนโปรแกรมพื้นฐาน']
            },
            {
                id: '3',
                studentId: '6400000003',
                firstName: 'สมศักดิ์',
                lastName: 'ขยันเรียน',
                email: 'somsak@example.com',
                phone: '083-456-7890',
                status: 'pending',
                joinDate: '2024-02-01',
                courses: []
            }
        ];
        
        displayStudents(students);
        console.log('โหลดข้อมูลนักเรียนสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลนักเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลนักเรียน');
    }
}

// แสดงข้อมูลนักเรียนในตาราง
function displayStudents(students) {
    const table = $('#studentTable').DataTable();
    table.clear();
    
    students.forEach(student => {
        const statusBadge = getStatusBadge(student.status);
        const coursesText = student.courses.length > 0 ? student.courses.join(', ') : 'ยังไม่มีคอร์ส';
        const actions = `
            <div class="btn-group" role="group">
                <button class="btn btn-sm btn-outline-primary" onclick="editStudent('${student.id}')" title="แก้ไข">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.id}')" title="ลบ">
                    <i class="bi bi-trash"></i>
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="viewStudent('${student.id}')" title="ดูรายละเอียด">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        `;
        
        table.row.add([
            student.studentId,
            `${student.firstName} ${student.lastName}`,
            student.email,
            student.phone,
            statusBadge,
            formatDate(student.joinDate),
            coursesText,
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
        'pending': '<span class="badge bg-warning">รอการยืนยัน</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">ไม่ทราบ</span>';
}

// จัดรูปแบบวันที่
function formatDate(dateString) {
    return formatDateTime(dateString, false);
}

// เพิ่ม event listeners
function addEventListeners() {
    // ปุ่มเพิ่มนักเรียนใหม่
    document.getElementById('addStudentBtn').addEventListener('click', function() {
        $('#addStudentModal').modal('show');
    });
    
    // ปุ่มส่งออกข้อมูล
    document.getElementById('exportStudentsBtn').addEventListener('click', function() {
        exportStudents();
    });
    
    // ปุ่มบันทึกนักเรียนใหม่
    document.getElementById('saveStudentBtn').addEventListener('click', function() {
        saveStudent();
    });
    
    // ปุ่มอัปเดตนักเรียน
    document.getElementById('updateStudentBtn').addEventListener('click', function() {
        updateStudent();
    });
}

// บันทึกนักเรียนใหม่
async function saveStudent() {
    try {
        const studentData = {
            studentId: document.getElementById('studentId').value,
            email: document.getElementById('studentEmail').value,
            firstName: document.getElementById('studentFirstName').value,
            lastName: document.getElementById('studentLastName').value,
            phone: document.getElementById('studentPhone').value,
            status: document.getElementById('studentStatus').value,
            courses: Array.from(document.getElementById('studentCourses').selectedOptions).map(option => option.value)
        };
        
        // ตรวจสอบข้อมูล
        if (!studentData.studentId || !studentData.email || !studentData.firstName || !studentData.lastName) {
            showErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // จำลองการบันทึก (ในอนาคตจะเชื่อมต่อกับ Firebase)
        console.log('บันทึกนักเรียนใหม่:', studentData);
        
        // ปิด modal และรีเฟรชข้อมูล
        $('#addStudentModal').modal('hide');
        showSuccessMessage('เพิ่มนักเรียนใหม่สำเร็จ');
        
        // รีเซ็ตฟอร์ม
        document.getElementById('addStudentForm').reset();
        
        // โหลดข้อมูลใหม่
        loadStudents();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกนักเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกนักเรียน');
    }
}

// อัปเดตนักเรียน
async function updateStudent() {
    try {
        const studentId = document.getElementById('editStudentId').value;
        const studentData = {
            studentId: document.getElementById('editStudentId').value,
            email: document.getElementById('editStudentEmail').value,
            firstName: document.getElementById('editStudentFirstName').value,
            lastName: document.getElementById('editStudentLastName').value,
            phone: document.getElementById('editStudentPhone').value,
            status: document.getElementById('editStudentStatus').value,
            courses: Array.from(document.getElementById('editStudentCourses').selectedOptions).map(option => option.value)
        };
        
        // ตรวจสอบข้อมูล
        if (!studentData.studentId || !studentData.email || !studentData.firstName || !studentData.lastName) {
            showErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // จำลองการอัปเดต (ในอนาคตจะเชื่อมต่อกับ Firebase)
        console.log('อัปเดตนักเรียน:', studentId, studentData);
        
        // ปิด modal และรีเฟรชข้อมูล
        $('#editStudentModal').modal('hide');
        showSuccessMessage('อัปเดตนักเรียนสำเร็จ');
        
        // โหลดข้อมูลใหม่
        loadStudents();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตนักเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการอัปเดตนักเรียน');
    }
}

// ส่งออกข้อมูลนักเรียน
function exportStudents() {
    try {
        console.log('ส่งออกข้อมูลนักเรียน...');
        
        // จำลองการส่งออก (ในอนาคตจะสร้างไฟล์ Excel หรือ CSV)
        showSuccessMessage('ส่งออกข้อมูลนักเรียนสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
}

// ฟังก์ชันสำหรับแก้ไขนักเรียน (เรียกจาก HTML)
window.editStudent = function(studentId) {
    console.log('แก้ไขนักเรียน:', studentId);
    
    // จำลองการโหลดข้อมูลนักเรียน (ในอนาคตจะเชื่อมต่อกับ Firebase)
    const studentData = {
        id: studentId,
        studentId: '6400000001',
        email: 'somchai@example.com',
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        phone: '081-234-5678',
        status: 'active',
        courses: ['การเขียนโปรแกรมพื้นฐาน', 'โครงสร้างข้อมูลและอัลกอริทึม']
    };
    
    // เติมข้อมูลในฟอร์ม
    document.getElementById('editStudentId').value = studentData.id;
    document.getElementById('editStudentId').value = studentData.studentId;
    document.getElementById('editStudentEmail').value = studentData.email;
    document.getElementById('editStudentFirstName').value = studentData.firstName;
    document.getElementById('editStudentLastName').value = studentData.lastName;
    document.getElementById('editStudentPhone').value = studentData.phone;
    document.getElementById('editStudentStatus').value = studentData.status;
    
    // เติมคอร์สที่เลือก
    const courseSelect = document.getElementById('editStudentCourses');
    Array.from(courseSelect.options).forEach(option => {
        option.selected = studentData.courses.includes(option.text);
    });
    
    // แสดง modal
    $('#editStudentModal').modal('show');
};

// ฟังก์ชันสำหรับลบนักเรียน (เรียกจาก HTML)
window.deleteStudent = function(studentId) {
    if (confirm('คุณต้องการลบนักเรียนนี้หรือไม่?')) {
        console.log('ลบนักเรียน:', studentId);
        
        // จำลองการลบ (ในอนาคตจะเชื่อมต่อกับ Firebase)
        showSuccessMessage('ลบนักเรียนสำเร็จ');
        loadStudents();
    }
};

// ฟังก์ชันสำหรับดูรายละเอียดนักเรียน (เรียกจาก HTML)
window.viewStudent = function(studentId) {
    console.log('ดูรายละเอียดนักเรียน:', studentId);
    // ในอนาคตจะนำไปยังหน้าดูรายละเอียดนักเรียน
    alert('ฟีเจอร์นี้จะเปิดใช้งานในอนาคต');
};

