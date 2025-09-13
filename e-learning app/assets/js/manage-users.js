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
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { 
    createUserWithEmailAndPassword,
    deleteUser 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// ตัวแปรสำหรับ DataTable
let usersTable;

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
    
    // โหลดข้อมูล
    loadUsersData();
    
    // ตั้งค่า Event Listeners
    setupEventListeners();
});

// ตั้งค่า Event Listeners
function setupEventListeners() {
    // ฟอร์มเพิ่มผู้ใช้ใหม่
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    // ฟอร์มแก้ไขผู้ใช้
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    // ปุ่มยืนยันการลบ
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteUser);
    }
    
    // ปุ่มแก้ไขจาก modal view
    const editFromViewBtn = document.getElementById('editFromViewBtn');
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            if (userId) {
                // ปิด modal view
                const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewUserModal'));
                viewModal.hide();
                
                // รอสักครู่แล้วเปิด modal edit
                setTimeout(() => {
                    editUser(userId);
                }, 150);
            }
        });
    }
    
    // จัดการ focus เมื่อ modal เปิด/ปิด
    const viewUserModal = document.getElementById('viewUserModal');
    if (viewUserModal) {
        viewUserModal.addEventListener('shown.bs.modal', function() {
            // ตั้ง focus ไปที่ปุ่มปิดเมื่อ modal เปิด
            const closeBtn = this.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.focus();
            }
        });
        
        viewUserModal.addEventListener('hidden.bs.modal', function() {
            // ลบ focus เมื่อ modal ปิด
            if (document.activeElement && this.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
    }
    
    const editUserModal = document.getElementById('editUserModal');
    if (editUserModal) {
        editUserModal.addEventListener('shown.bs.modal', function() {
            // ตั้ง focus ไปที่ปุ่มปิดเมื่อ modal เปิด
            const closeBtn = this.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.focus();
            }
        });
        
        editUserModal.addEventListener('hidden.bs.modal', function() {
            // ลบ focus เมื่อ modal ปิด
            if (document.activeElement && this.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
        
        // เพิ่มการจัดการ focus เมื่อ modal กำลังจะซ่อน
        editUserModal.addEventListener('hide.bs.modal', function() {
            // ย้าย focus ออกจาก modal ก่อนที่จะซ่อน
            const activeElement = document.activeElement;
            if (activeElement && this.contains(activeElement)) {
                activeElement.blur();
            }
        });
    }
    
    // จัดการ focus สำหรับ modal อื่นๆ
    const addUserModal = document.getElementById('addUserModal');
    if (addUserModal) {
        addUserModal.addEventListener('hide.bs.modal', function() {
            const activeElement = document.activeElement;
            if (activeElement && this.contains(activeElement)) {
                activeElement.blur();
            }
        });
    }
    
    const deleteUserModal = document.getElementById('deleteUserModal');
    if (deleteUserModal) {
        deleteUserModal.addEventListener('hide.bs.modal', function() {
            const activeElement = document.activeElement;
            if (activeElement && this.contains(activeElement)) {
                activeElement.blur();
            }
        });
    }
    
    // เพิ่ม event listener สำหรับการเปลี่ยนแปลงค่าในฟอร์มแก้ไข
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        const formInputs = editForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('change', function() {
                // เพิ่ม class เพื่อแสดงว่ามีการเปลี่ยนแปลง
                this.classList.add('is-modified');
            });
        });
    }
    

    

    

}

// โหลดข้อมูลผู้ใช้
async function loadUsersData() {
    try {
        showLoading('กำลังโหลดข้อมูลผู้ใช้...');
        
        // ดึงข้อมูลผู้ใช้ทั้งหมด
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const users = [];
        
        usersSnapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // อัปเดตสถิติ
        updateStatistics(users);
        
        // สร้างตาราง
        createUsersTable(users);
        
        // Initialize dropdowns after table is created
        setTimeout(() => {
            const dropdowns = document.querySelectorAll('.dropdown-toggle');
            dropdowns.forEach(dropdown => {
                if (!dropdown.hasAttribute('data-bs-toggle')) {
                    dropdown.setAttribute('data-bs-toggle', 'dropdown');
                }
            });
        }, 100);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้: ' + error.message);
        hideLoading();
    }
}

// อัปเดตสถิติ
function updateStatistics(users) {
    const totalUsers = users.length;
    const totalStudents = users.filter(user => user.userType === 'student').length;
    const totalInstructors = users.filter(user => user.userType === 'instructor').length;
    const activeUsers = users.filter(user => user.isActive !== false).length;
    const pendingApprovals = users.filter(user => user.approvalStatus === 'pending').length;
    const rejectedUsers = users.filter(user => user.approvalStatus === 'rejected').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalInstructors').textContent = totalInstructors;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('pendingApprovals').textContent = pendingApprovals;
    document.getElementById('rejectedUsers').textContent = rejectedUsers;
}

// สร้างตารางผู้ใช้
function createUsersTable(users) {
    const tableBody = document.querySelector('#usersTable tbody');
    
    if (tableBody) {
        tableBody.innerHTML = users.map(user => {
                    const userTypeText = getUserTypeText(user.userType);
        const statusBadge = user.isActive !== false ? 
            '<span class="badge bg-success">ใช้งาน</span>' : 
            '<span class="badge bg-secondary">ระงับการใช้งาน</span>';
        
        // สถานะการอนุมัติ
        let approvalBadge = '';
        if (user.userType === 'student') {
            approvalBadge = '<span class="badge bg-success">อนุมัติแล้ว</span>';
        } else {
            switch(user.approvalStatus) {
                case 'approved':
                    approvalBadge = '<span class="badge bg-success">อนุมัติแล้ว</span>';
                    break;
                case 'pending':
                    approvalBadge = '<span class="badge bg-warning">รออนุมัติ</span>';
                    break;
                case 'rejected':
                    approvalBadge = '<span class="badge bg-danger">ถูกปฏิเสธ</span>';
                    break;
                default:
                    approvalBadge = '<span class="badge bg-secondary">ไม่ระบุ</span>';
            }
        }
        
        const createdAt = user.createdAt ? 
            formatDateTime(user.createdAt, false) : 
            'ไม่ระบุ';
        
        const lastLoginAt = user.lastLoginAt ? 
            formatDateTime(user.lastLoginAt, false) : 
            'ไม่เคยล็อกอิน';
        
        // ปุ่มการจัดการแบบ popup
        let actionButtons = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="ตัวเลือก" style="position: relative; z-index: 10000;">
                    <i class="bi bi-three-dots-vertical"></i>
                    <span class="ms-1 d-none d-sm-inline">ตัวเลือก</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" style="position: absolute; z-index: 10000; min-width: 150px;">
                    <li>
                        <a class="dropdown-item" href="#" onclick="viewUser('${user.id}'); return false;">
                            <i class="bi bi-eye me-2"></i>ดูข้อมูล
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#" onclick="editUser('${user.id}'); return false;">
                            <i class="bi bi-pencil me-2"></i>แก้ไข
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-danger" href="#" onclick="deleteUser('${user.id}', '${user.name}'); return false;">
                            <i class="bi bi-trash me-2"></i>ลบ
                        </a>
                    </li>
                </ul>
            </div>
        `;
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar me-3">
                            <i class="bi ${getUserTypeIcon(user.userType)} fs-3"></i>
                        </div>
                        <div>
                            <h6 class="mb-0">${user.name}</h6>
                            <small class="text-muted">${user.profile?.department || 'ไม่ระบุ'}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${userTypeText}</td>
                <td>${statusBadge}</td>
                <td>${approvalBadge}</td>
                <td>${createdAt}</td>
                <td>${lastLoginAt}</td>
                <td>${user.loginCount || 0}</td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button class="btn btn-sm btn-outline-info" onclick="viewUser('${user.id}')" title="ดูข้อมูล">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.id}')" title="แก้ไข">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}', '${user.name}')" title="ลบ">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }
    
    // เริ่มต้น DataTable
    if (usersTable) {
        usersTable.destroy();
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
        order: [[4, 'desc']], // เรียงตามวันที่สมัคร
        scrollX: false, // ปิดการใช้งาน scrollX เพื่อป้องกัน inline styles
        scrollCollapse: false, // ปิดการใช้งาน scrollCollapse
        autoWidth: true, // เปิดการใช้งาน autoWidth
        fixedHeader: false, // ปิดการใช้งาน fixedHeader
        responsive: false, // ปิดการใช้งาน responsive เพื่อป้องกันปัญหาส่วนหัวซ้ำซ้อน
        columnDefs: [
            {
                targets: [2, 3, 5, 6], // ประเภท, สถานะ, ล็อกอินล่าสุด, จำนวนล็อกอิน
                width: 'auto'
            },
            {
                targets: [1, 4], // อีเมล, วันที่สมัคร
                width: 'auto'
            },
            {
                targets: [0], // ชื่อผู้ใช้
                orderable: true,
                searchable: true,
                width: 'auto'
            },
            {
                targets: [8], // การจัดการ
                orderable: false,
                searchable: false,
                width: 'auto',
                className: 'text-center'
            }
        ]
    };
    
    // ป้องกันการสร้าง inline styles
    dataTableConfig.fixedColumns = false;
    dataTableConfig.scrollXInner = false;
    dataTableConfig.scrollY = false;
    dataTableConfig.scrollCollapse = false;
    
    usersTable = $('#usersTable').DataTable(dataTableConfig);
    
    // ฟังก์ชันสำหรับแสดงแถวหัวข้อที่ถูกต้อง
    function showCorrectHeaders() {
        // ลบส่วนหัวตารางที่ซ้ำซ้อน
        const scrollHead = document.querySelector('.dataTables_scrollHead');
        if (scrollHead) {
            scrollHead.style.display = 'none';
        }
        
        // ลบแถวหัวข้อที่ซ้ำซ้อนในตารางหลัก
        const duplicateHeaders = document.querySelectorAll('#usersTable thead tr:nth-child(2)');
        duplicateHeaders.forEach(header => {
            header.style.display = 'none';
        });
        
        // ลบแถวหัวข้อที่มี height: 0px
        const zeroHeightRows = document.querySelectorAll('#usersTable thead tr[style*="height: 0px"]');
        zeroHeightRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // ลบแถวหัวข้อที่มี dataTables_sizing
        const sizingRows = document.querySelectorAll('#usersTable thead tr:has(.dataTables_sizing)');
        sizingRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // ลบแถวหัวข้อที่มี aria-controls
        const ariaControlRows = document.querySelectorAll('#usersTable thead tr[aria-controls]');
        ariaControlRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // แสดงแถวหัวข้อแรกและซ่อนแถวที่ซ้ำซ้อน
        const allHeaderRows = document.querySelectorAll('#usersTable thead tr');
        allHeaderRows.forEach((row, index) => {
            if (index === 0) {
                row.style.display = 'table-row';
                row.style.height = 'auto';
                // แสดง th elements ในแถวแรก
                const thElements = row.querySelectorAll('th');
                thElements.forEach(th => {
                    th.style.display = 'table-cell';
                    th.style.height = 'auto';
                    th.style.padding = '12px 8px';
                    th.style.border = '1px solid #dee2e6';
                    th.style.backgroundColor = '#f8f9fa';
                    th.style.fontWeight = '600';
                    th.style.color = '#495057';
                    
                    // แสดงชื่อคอลัมน์ที่ถูกซ่อนใน dataTables_sizing
                    const sizingElement = th.querySelector('.dataTables_sizing');
                    if (sizingElement) {
                        sizingElement.style.display = 'block';
                        sizingElement.style.height = 'auto';
                        sizingElement.style.overflow = 'visible';
                        sizingElement.style.visibility = 'visible';
                        sizingElement.style.opacity = '1';
                        sizingElement.style.position = 'static';
                        sizingElement.style.fontWeight = '600';
                        sizingElement.style.color = '#495057';
                        sizingElement.style.background = 'none';
                        sizingElement.style.border = 'none';
                        sizingElement.style.padding = '0';
                        sizingElement.style.margin = '0';
                    }
                });
            } else {
                row.style.display = 'none';
            }
        });
        
        // ลบ DataTables sizing elements (ยกเว้นในแถวหัวข้อแรก)
        const sizingElements = document.querySelectorAll('.dataTables_sizing');
        sizingElements.forEach(element => {
            const parentTh = element.closest('th');
            const parentTr = element.closest('tr');
            if (!parentTh || !parentTr || parentTr !== document.querySelector('#usersTable thead tr:first-child')) {
                element.style.display = 'none';
            }
        });
        
        // ลบ elements ที่มี height: 0px
        const zeroHeightElements = document.querySelectorAll('[style*="height: 0px"]');
        zeroHeightElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // ลบ inline styles
        const tables = document.querySelectorAll('.dataTables_scrollHeadInner table, .dataTables_scrollBody table');
        tables.forEach(table => {
            table.removeAttribute('style');
        });
        
        const cells = document.querySelectorAll('.dataTables_scrollHeadInner th, .dataTables_scrollBody th, .dataTables_scrollBody td');
        cells.forEach(cell => {
            if (cell.style.width) {
                cell.style.width = 'auto';
            }
            if (cell.style.padding) {
                cell.style.padding = '0.75rem';
            }
            if (cell.style.border) {
                cell.style.border = '1px solid #dee2e6';
            }
            if (cell.style.height) {
                cell.style.height = 'auto';
            }
        });
        
        const divs = document.querySelectorAll('.dataTables_scrollHeadInner div, .dataTables_scrollBody div');
        divs.forEach(div => {
            if (div.style.overflow) {
                div.style.overflow = 'visible';
            }
            if (div.style.position) {
                div.style.position = 'static';
            }
            if (div.style.boxSizing) {
                div.style.boxSizing = 'border-box';
            }
        });
    }
    
    // เรียกใช้ฟังก์ชันทันทีและตั้ง interval เพื่อให้แถวหัวข้อแสดงผลตลอดเวลา
    showCorrectHeaders();
    
    // ตั้ง interval เพื่อให้แถวหัวข้อแสดงผลตลอดเวลา (ทุก 100ms)
    const headerInterval = setInterval(showCorrectHeaders, 100);
    
    // หยุด interval เมื่อหน้าเปลี่ยนหรือ component ถูกทำลาย
    window.addEventListener('beforeunload', () => {
        clearInterval(headerInterval);
    });
    
    // เพิ่ม event listener สำหรับ DataTables เพื่อให้ชื่อคอลัมน์แสดงผลตลอดเวลา
    usersTable.on('init', function() {
        showCorrectHeaders();
    });
    
    usersTable.on('draw', function() {
        showCorrectHeaders();
    });
    
    usersTable.on('page', function() {
        showCorrectHeaders();
    });
    
    usersTable.on('search', function() {
        showCorrectHeaders();
    });
    
    usersTable.on('order', function() {
        showCorrectHeaders();
    });
    
    usersTable.on('length', function() {
        showCorrectHeaders();
    });
    
    // เพิ่มการจัดการ responsive สำหรับปุ่ม (ถ้าจำเป็น)
    usersTable.on('draw', function() {
        // อัปเดตปุ่มหลังจากตารางถูกวาดใหม่
        const buttons = document.querySelectorAll('.btn-sm');
        buttons.forEach(button => {
            button.classList.add('btn-responsive');
        });
    });
    
    // Initialize Bootstrap dropdowns after DataTable is created
    setTimeout(() => {
        const dropdowns = document.querySelectorAll('.dropdown-toggle');
        dropdowns.forEach(dropdown => {
            // Destroy existing dropdown if any
            const existingDropdown = bootstrap.Dropdown.getInstance(dropdown);
            if (existingDropdown) {
                existingDropdown.dispose();
            }
            // Create new dropdown
            new bootstrap.Dropdown(dropdown, {
                boundary: 'viewport',
                display: 'dynamic',
                popperConfig: {
                    modifiers: [
                        {
                            name: 'preventOverflow',
                            options: {
                                boundary: 'viewport'
                            }
                        },
                        {
                            name: 'flip',
                            options: {
                                fallbackPlacements: ['top', 'bottom']
                            }
                        }
                    ]
                }
            });
        });
    }, 100);
}

// ฟังก์ชันจัดการการเพิ่มผู้ใช้ใหม่
async function handleAddUser(e) {
    e.preventDefault();
    
    try {
        const userData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            password: document.getElementById('userPassword').value,
            userType: document.getElementById('userType').value,
            department: document.getElementById('userDepartment').value,
            phone: document.getElementById('userPhone').value,
            isActive: document.getElementById('userStatus').value === 'active',
            loginCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // สร้างผู้ใช้ใน Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password
        );
        
        // บันทึกข้อมูลผู้ใช้ใน Firestore
        await addDoc(collection(db, 'users'), {
            name: userData.name,
            email: userData.email,
            userType: userData.userType,
            profile: {
                department: userData.department,
                phone: userData.phone
            },
            isActive: userData.isActive,
            loginCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        showSuccess('เพิ่มผู้ใช้ใหม่สำเร็จ!');
        
        // ปิด modal และรีเซ็ตฟอร์ม
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();
        document.getElementById('addUserForm').reset();
        
        // โหลดข้อมูลใหม่
        loadUsersData();
        
    } catch (error) {
        console.error('Error adding user:', error);
        
        let errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
        }
        
        showError(errorMessage);
    }
}

// ฟังก์ชันจัดการการแก้ไขผู้ใช้
async function handleEditUser(e) {
    e.preventDefault();
    
    // แสดงสถานะกำลังประมวลผล
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>กำลังบันทึก...';
    submitBtn.disabled = true;
    
    try {
        const userId = document.getElementById('editUserId').value;
        
        const newApprovalStatus = document.getElementById('editUserApprovalStatus').value;
        const userData = {
            name: document.getElementById('editUserName').value,
            email: document.getElementById('editUserEmail').value,
            userType: document.getElementById('editUserType').value,
            isActive: document.getElementById('editUserStatus').value === 'active',
            approvalStatus: newApprovalStatus,
            profile: {
                department: document.getElementById('editUserDepartment').value,
                phone: document.getElementById('editUserPhone').value,
                additionalInfo: document.getElementById('editUserProfile').value
            },
            updatedAt: serverTimestamp()
        };
        
        // เพิ่มข้อมูลตามสถานะการอนุมัติใหม่
        if (newApprovalStatus === 'approved') {
            userData.approvedAt = serverTimestamp();
            userData.approvalReason = 'อนุมัติโดยแอดมิน';
        } else if (newApprovalStatus === 'rejected') {
            userData.rejectedAt = serverTimestamp();
            userData.rejectionReason = 'ถูกปฏิเสธโดยแอดมิน';
        }
        
        // อัปเดตข้อมูลผู้ใช้ในฐานข้อมูล
        await updateDoc(doc(db, 'users', userId), userData);
        
        // อัปเดตข้อมูลในตารางทันที
        updateUserInTable(userId, userData);
        
        showSuccess('อัปเดตข้อมูลผู้ใช้สำเร็จ!');
        
        // ลบ class is-modified จากทุก input
        const formInputs = document.querySelectorAll('#editUserForm input, #editUserForm select, #editUserForm textarea');
        formInputs.forEach(input => {
            input.classList.remove('is-modified');
        });
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();
        
        // เลื่อนไปด้านบนของตาราง
        const tableContainer = document.querySelector('.card-body');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
    } catch (error) {
        console.error('Error updating user:', error);
        showError('เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้: ' + error.message);
    } finally {
        // คืนค่าปุ่มกลับเป็นปกติ
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ฟังก์ชันจัดการการลบผู้ใช้
async function handleDeleteUser() {
    try {
        const userId = document.getElementById('confirmDeleteBtn').getAttribute('data-user-id');
        
        // ลบข้อมูลผู้ใช้จาก Firestore
        await deleteDoc(doc(db, 'users', userId));
        
        showSuccess('ลบผู้ใช้สำเร็จ!');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
        modal.hide();
        
        // โหลดข้อมูลใหม่
        loadUsersData();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + error.message);
    }
}

// ฟังก์ชันแก้ไขผู้ใช้ (เรียกจาก HTML)
window.editUser = async function(userId) {
    try {
        // ดึงข้อมูลผู้ใช้
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const user = userDoc.data();
            
            // เติมข้อมูลในฟอร์ม
            document.getElementById('editUserId').value = userId;
            document.getElementById('editUserName').value = user.name;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserType').value = user.userType;
            document.getElementById('editUserStatus').value = user.isActive !== false ? 'active' : 'inactive';
            document.getElementById('editUserApprovalStatus').value = user.approvalStatus || 'pending';
            document.getElementById('editUserDepartment').value = user.profile?.department || '';
            document.getElementById('editUserPhone').value = user.profile?.phone || '';
            document.getElementById('editUserProfile').value = user.profile?.additionalInfo || '';
            
            // ลบ class is-modified จากทุก input
            const formInputs = document.querySelectorAll('#editUserForm input, #editUserForm select, #editUserForm textarea');
            formInputs.forEach(input => {
                input.classList.remove('is-modified');
            });
            
            // เปิด modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
            
            // ตั้ง focus ไปที่ปุ่มปิดหลังจาก modal เปิด
            setTimeout(() => {
                const closeBtn = document.querySelector('#editUserModal .btn-close');
                if (closeBtn) {
                    closeBtn.focus();
                }
            }, 150);
        }
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้: ' + error.message);
    }
};

// ฟังก์ชันดูผู้ใช้ (เรียกจาก HTML)
window.viewUser = async function(userId) {
    try {
        // ดึงข้อมูลผู้ใช้
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const user = userDoc.data();
            
            // เติมข้อมูลใน modal
            document.getElementById('viewUserName').textContent = user.name;
            document.getElementById('viewUserType').textContent = getUserTypeText(user.userType);
            document.getElementById('viewUserEmail').textContent = user.email;
            
            // สถานะ
            const statusText = user.isActive !== false ? 'ใช้งาน' : 'ระงับการใช้งาน';
            const statusClass = user.isActive !== false ? 'text-success' : 'text-danger';
            document.getElementById('viewUserStatus').innerHTML = `<span class="${statusClass}">${statusText}</span>`;
            
            // ข้อมูลส่วนตัว
            document.getElementById('viewUserDepartment').textContent = user.profile?.department || 'ไม่ระบุ';
            document.getElementById('viewUserPhone').textContent = user.profile?.phone || 'ไม่ระบุ';
            document.getElementById('viewUserProfile').textContent = user.profile?.additionalInfo || 'ไม่มีข้อมูลเพิ่มเติม';
            
            // ข้อมูลระบบ
            const createdAt = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleString('th-TH') : 'ไม่ระบุ';
            const lastLoginAt = user.lastLoginAt ? new Date(user.lastLoginAt.toDate()).toLocaleString('th-TH') : 'ไม่เคยล็อกอิน';
            document.getElementById('viewUserCreatedAt').textContent = createdAt;
            document.getElementById('viewUserLastLogin').textContent = lastLoginAt;
            document.getElementById('viewUserLoginCount').textContent = user.loginCount || 0;
            
            // ตั้งค่า user ID สำหรับปุ่มแก้ไข
            document.getElementById('editFromViewBtn').setAttribute('data-user-id', userId);
            
            // เปิด modal
            const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
            modal.show();
            
            // ตั้ง focus ไปที่ปุ่มปิดหลังจาก modal เปิด
            setTimeout(() => {
                const closeBtn = document.querySelector('#viewUserModal .btn-close');
                if (closeBtn) {
                    closeBtn.focus();
                }
            }, 150);
        } else {
            showError('ไม่พบข้อมูลผู้ใช้');
        }
        
    } catch (error) {
        console.error('Error loading user for view:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้: ' + error.message);
    }
};

// ฟังก์ชันอัปเดตข้อมูลผู้ใช้ในตารางทันที
function updateUserInTable(userId, userData) {
    if (!usersTable) return;
    
    try {
        // หาแถวในตารางที่ต้องการอัปเดต
        const table = document.getElementById('usersTable');
        const rows = table.querySelectorAll('tbody tr');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // ตรวจสอบว่าแถวนี้เป็นของผู้ใช้ที่ต้องการอัปเดตหรือไม่
            const actionButtons = row.querySelector('.btn-outline-primary');
            if (actionButtons && actionButtons.getAttribute('onclick')?.includes(userId)) {
                // อัปเดตข้อมูลในแถว
                const cells = row.querySelectorAll('td');
                
                // อัปเดตชื่อผู้ใช้และแผนก
                const nameCell = cells[0];
                nameCell.innerHTML = `
                    <div class="d-flex align-items-center">
                        <div class="avatar me-3">
                            <i class="bi ${getUserTypeIcon(userData.userType)} fs-3"></i>
                        </div>
                        <div>
                            <h6 class="mb-0">${userData.name}</h6>
                            <small class="text-muted">${userData.profile?.department || 'ไม่ระบุ'}</small>
                        </div>
                    </div>
                `;
                
                // อัปเดตประเภทผู้ใช้
                cells[2].textContent = getUserTypeText(userData.userType);
                
                // อัปเดตสถานะ
                const statusBadge = userData.isActive !== false ? 
                    '<span class="badge bg-success">ใช้งาน</span>' : 
                    '<span class="badge bg-secondary">ระงับการใช้งาน</span>';
                cells[3].innerHTML = statusBadge;
                
                // อัปเดตสถานะการอนุมัติ
                let approvalBadge = '';
                if (userData.userType === 'student') {
                    approvalBadge = '<span class="badge bg-success">อนุมัติแล้ว</span>';
                } else {
                    switch(userData.approvalStatus) {
                        case 'approved':
                            approvalBadge = '<span class="badge bg-success">อนุมัติแล้ว</span>';
                            break;
                        case 'pending':
                            approvalBadge = '<span class="badge bg-warning">รออนุมัติ</span>';
                            break;
                        case 'rejected':
                            approvalBadge = '<span class="badge bg-danger">ถูกปฏิเสธ</span>';
                            break;
                        default:
                            approvalBadge = '<span class="badge bg-secondary">ไม่ระบุ</span>';
                    }
                }
                cells[4].innerHTML = approvalBadge;
                
                // อัปเดต DataTable และรีเฟรชการแสดงผล
                usersTable.row(i).draw(false);
                
                // อัปเดตสถิติทันที
                updateStatisticsFromTable();
                
                console.log('อัปเดตข้อมูลผู้ใช้ในตารางสำเร็จ:', userId);
                break;
            }
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตตาราง:', error);
        // หากเกิดข้อผิดพลาด ให้โหลดข้อมูลใหม่ทั้งหมด
        loadUsersData();
    }
}

// ฟังก์ชันอัปเดตสถิติจากข้อมูลในตาราง
function updateStatisticsFromTable() {
    const table = document.getElementById('usersTable');
    const rows = table.querySelectorAll('tbody tr');
    
    let totalUsers = rows.length;
    let totalStudents = 0;
    let totalInstructors = 0;
    let activeUsers = 0;
    let pendingApprovals = 0;
    let rejectedUsers = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        
        // นับประเภทผู้ใช้
        const userTypeText = cells[2].textContent;
        if (userTypeText === 'นักเรียน') totalStudents++;
        if (userTypeText === 'ผู้สอน') totalInstructors++;
        
        // นับสถานะ
        const statusText = cells[3].textContent;
        if (statusText.includes('ใช้งาน')) activeUsers++;
        
        // นับสถานะการอนุมัติ
        const approvalText = cells[4].textContent;
        if (approvalText.includes('รออนุมัติ')) pendingApprovals++;
        if (approvalText.includes('ถูกปฏิเสธ')) rejectedUsers++;
    });
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalInstructors').textContent = totalInstructors;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('pendingApprovals').textContent = pendingApprovals;
    document.getElementById('rejectedUsers').textContent = rejectedUsers;
}

// ฟังก์ชันลบผู้ใช้ (เรียกจาก HTML)
window.deleteUser = function(userId, userName) {
    // เติมข้อมูลใน modal ยืนยันการลบ
    document.getElementById('deleteUserName').textContent = userName;
    document.getElementById('confirmDeleteBtn').setAttribute('data-user-id', userId);
    
    // เปิด modal
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
    
    // ตั้ง focus ไปที่ปุ่มปิดหลังจาก modal เปิด
    setTimeout(() => {
        const closeBtn = document.querySelector('#deleteUserModal .btn-close');
        if (closeBtn) {
            closeBtn.focus();
        }
    }, 150);
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

// ฟังก์ชันสำหรับไอคอนตามประเภทผู้ใช้
function getUserTypeIcon(userType) {
    const userTypeIcons = {
        'student': 'bi-mortarboard text-primary',
        'instructor': 'bi-person-workspace text-warning',
        'admin': 'bi-shield-check text-danger'
    };
    return userTypeIcons[userType] || 'bi-person-circle text-primary';
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

// Event Listener สำหรับ DataTable draw event เพื่อ initialize dropdowns
document.addEventListener('DOMContentLoaded', function() {
    const usersTableElement = document.getElementById('usersTable');
    if (usersTableElement) {
        usersTableElement.addEventListener('draw.dt', function() {
            // Initialize Bootstrap dropdowns after DataTable redraw
            setTimeout(() => {
                const dropdowns = document.querySelectorAll('.dropdown-toggle');
                dropdowns.forEach(dropdown => {
                    if (!dropdown.hasAttribute('data-bs-toggle')) {
                        dropdown.setAttribute('data-bs-toggle', 'dropdown');
                    }
                });
            }, 50);
        });
    }
});










