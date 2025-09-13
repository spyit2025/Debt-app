import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';
import { 
    protectPage, 
    displayUserInfo, 
    createUserMenu, 
    createMainMenu,
    logoutUser, 
    checkSessionExpiry,
    showErrorMessage,
    showSuccessMessage,
    getCurrentUser
} from './auth.js';

// ตัวแปรสำหรับ DataTable
let quizzesDataTable;

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
        
        // เริ่มต้นหน้า
        initializeQuizCreatePage();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้นหน้า:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดระบบ');
    }
});

// เริ่มต้นหน้า Quiz Create
async function initializeQuizCreatePage() {
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
            showErrorMessage('กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        // โหลดข้อมูลคอร์ส
        await loadCourses();
        
        // โหลดข้อมูลข้อสอบ
        await loadQuizzes();
        
        // โหลดข้อมูลเนื้อหา
        await loadContent();
        
        // เพิ่ม event listeners
        addEventListeners();
        
        // เพิ่ม event listeners สำหรับเนื้อหา
        addContentEventListeners();
        
        // จัดการ modal events
        setupModalEvents();

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// โหลดข้อมูลคอร์ส
async function loadCourses() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const courseSelects = [
            document.getElementById('quizCourse'),
            document.getElementById('modalQuizCourse'),
            document.getElementById('editQuizCourse')
        ];
        
        courseSelects.forEach(select => {
            if (select) {
                // ล้างตัวเลือกเดิม
                select.innerHTML = '<option value="">เลือกคอร์ส</option>';
                
                coursesSnapshot.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    if (courseData.instructorId === currentUser.uid) {
                        const option = document.createElement('option');
                        option.value = courseDoc.id;
                        option.textContent = courseData.title;
                        select.appendChild(option);
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดคอร์ส:', error);
    }
}

// โหลดข้อมูลข้อสอบ
async function loadQuizzes() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        
        // แปลง snapshot เป็น array และกรองเฉพาะข้อสอบของผู้สอน
        const quizzes = [];
        for (const quizDoc of quizzesSnapshot.docs) {
            const quizData = quizDoc.data();
            if (quizData.instructorId === currentUser.uid) {
                // ดึงข้อมูลคอร์ส
                let courseTitle = 'ไม่ระบุ';
                if (quizData.courseId) {
                    try {
                        const courseDoc = await getDoc(doc(db, 'courses', quizData.courseId));
                        const courseData = courseDoc.data();
                        courseTitle = courseData?.title || 'ไม่ระบุ';
                    } catch (error) {
                        console.error('ไม่สามารถดึงข้อมูลคอร์สได้:', error);
                    }
                }
                
                quizzes.push({
                    id: quizDoc.id,
                    title: quizData.title || 'ไม่ระบุ',
                    courseTitle: courseTitle,
                    questionCount: quizData.questions ? quizData.questions.length : 0,
                    duration: quizData.timeLimit || 0,
                    passingScore: quizData.passingScore || 60,
                    isActive: quizData.isActive || false,
                    createdAt: quizData.createdAt || null
                });
            }
        }
        
        // Sort ตาม createdAt (ใหม่สุดก่อน)
        quizzes.sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const bTime = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return bTime - aTime;
        });
        
        // สร้าง DataTable
        createQuizzesDataTable(quizzes);
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อสอบ:', error);
    }
}

// สร้าง DataTable สำหรับข้อสอบ
function createQuizzesDataTable(quizzes) {
    const table = document.getElementById('quizzesTable');
    if (!table) return;
    
    // ลบ DataTable เดิมถ้ามี
    if (quizzesDataTable) {
        quizzesDataTable.destroy();
    }
    
    // สร้าง DataTable ใหม่
    const quizzesDataTableConfig = {
        data: quizzes,
        columns: [
            { 
                data: 'title',
                render: function(data, type, row) {
                    return `<strong>${data}</strong>`;
                }
            },
            { data: 'courseTitle' },
            { 
                data: 'questionCount',
                render: function(data) {
                    return `<span class="badge bg-info">${data} ข้อ</span>`;
                }
            },
            { 
                data: 'duration',
                render: function(data) {
                    return data > 0 ? `${data} นาที` : 'ไม่จำกัด';
                }
            },
            { 
                data: 'passingScore',
                render: function(data) {
                    return `<span class="badge bg-warning">${data}%</span>`;
                }
            },
            { 
                data: 'isActive',
                render: function(data) {
                    return data ? 
                        '<span class="badge bg-success">เปิดใช้งาน</span>' : 
                        '<span class="badge bg-secondary">ปิดใช้งาน</span>';
                }
            },
            { 
                data: 'createdAt',
                render: function(data) {
                    return formatDate(data);
                }
            },
            { 
                data: 'id',
                render: function(data, type, row) {
                    return `
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary edit-quiz" data-id="${data}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-info view-quiz" data-id="${data}">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-quiz" data-id="${data}" data-title="${row.title}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/th.json'
        },
        pageLength: 10,
        order: [[6, 'desc']], // เรียงตามวันที่สร้าง (ใหม่สุดก่อน)
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        autoWidth: false,
        scrollX: false,
        columnDefs: [
            {
                targets: [0], // ชื่อข้อสอบ
                width: '20%',
                responsivePriority: 1
            },
            {
                targets: [1], // คอร์ส
                width: '15%',
                responsivePriority: 2
            },
            {
                targets: [2], // จำนวนข้อ
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [3], // เวลาทำ
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [4], // คะแนนผ่าน
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [5], // สถานะ
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [6], // วันที่สร้าง
                width: '15%',
                responsivePriority: 3
            },
            {
                targets: [7], // การดำเนินการ
                width: '10%',
                responsivePriority: 3,
                orderable: false,
                searchable: false
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>'
    };
    
    // ปิดการใช้งาน DataTables responsive มาตรฐาน เพื่อไม่ให้มีจุดสีน้ำเงิน
    // if (typeof $.fn.dataTable.Responsive !== 'undefined') {
    //     quizzesDataTableConfig.responsive = {
    //         details: {
    //             display: $.fn.dataTable.Responsive.display.childRowImmediate,
    //             type: 'column',
    //             target: 0
    //         }
    //     };
    // }
    
    quizzesDataTable = $('#quizzesTable').DataTable(quizzesDataTableConfig);
}

// จัดการ modal events
function setupModalEvents() {
    // จัดการการเปิด/ปิด modal
    const createQuizModal = document.getElementById('createQuizModal');
    const addContentModal = document.getElementById('addContentModal');
    
    if (createQuizModal) {
        createQuizModal.addEventListener('show.bs.modal', function() {
            // รีเซ็ตฟอร์มเมื่อเปิด modal
            document.getElementById('createQuizForm').reset();
            document.getElementById('modalQuestionsContainer').innerHTML = '';
            // แก้ไขปัญหา accessibility
            this.removeAttribute('aria-hidden');
        });
        
        createQuizModal.addEventListener('hidden.bs.modal', function() {
            // ล้างข้อมูลเมื่อปิด modal
            document.getElementById('modalQuestionsContainer').innerHTML = '';
            // แก้ไขปัญหา accessibility
            this.setAttribute('aria-hidden', 'true');
        });
    }
    
    if (addContentModal) {
        addContentModal.addEventListener('show.bs.modal', function() {
            // รีเซ็ตฟอร์มเมื่อเปิด modal
            document.getElementById('addContentForm').reset();
            // แก้ไขปัญหา accessibility
            this.removeAttribute('aria-hidden');
        });
        
        addContentModal.addEventListener('hidden.bs.modal', function() {
            // แก้ไขปัญหา accessibility
            this.setAttribute('aria-hidden', 'true');
        });
    }
    
    // จัดการ focus management สำหรับ modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                const modalInstance = bootstrap.Modal.getInstance(openModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        }
    });
}

// เพิ่ม event listeners
function addEventListeners() {

    
    // แก้ไขข้อสอบ
    const editQuizForm = document.getElementById('editQuizForm');
    if (editQuizForm) {
        editQuizForm.addEventListener('submit', handleEditQuiz);
    }
    
    // ลบข้อสอบ
    const confirmDeleteQuiz = document.getElementById('confirmDeleteQuiz');
    if (confirmDeleteQuiz) {
        confirmDeleteQuiz.addEventListener('click', handleDeleteQuiz);
    }
    
    // Event delegation สำหรับปุ่มในตาราง
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-quiz')) {
            const quizId = e.target.closest('.edit-quiz').dataset.id;
            loadQuizForEdit(quizId);
        }
        
        if (e.target.closest('.view-quiz')) {
            const quizId = e.target.closest('.view-quiz').dataset.id;
            viewQuiz(quizId);
        }
        
        if (e.target.closest('.delete-quiz')) {
            const quizId = e.target.closest('.delete-quiz').dataset.id;
            const quizTitle = e.target.closest('.delete-quiz').dataset.title;
            showDeleteConfirmation(quizId, quizTitle);
        }
    });
    
    // โหลดตัวเลือกคอร์สเมื่อเปิด modal
    const createQuizModal = document.getElementById('createQuizModal');
    if (createQuizModal) {
        createQuizModal.addEventListener('show.bs.modal', () => {
            loadCourses();
        });
    }
    
    // ตั้งค่า Modal สร้างข้อสอบ
    setupQuizCreationModal();
    
    const editQuizModal = document.getElementById('editQuizModal');
    if (editQuizModal) {
        editQuizModal.addEventListener('show.bs.modal', () => {
            loadCourses();
        });
    }
}



// โหลดข้อมูลข้อสอบสำหรับแก้ไข
async function loadQuizForEdit(quizId) {
    try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (!quizDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลข้อสอบ');
            return;
        }
        
        const quizData = quizDoc.data();
        
        // เติมข้อมูลในฟอร์ม
        document.getElementById('editQuizId').value = quizId;
        document.getElementById('editQuizTitle').value = quizData.title || '';
        document.getElementById('editQuizCourse').value = quizData.courseId || '';
        document.getElementById('editQuizTimeLimit').value = quizData.timeLimit || 0;
        document.getElementById('editQuizAttempts').value = quizData.attempts || 1;
        document.getElementById('editQuizPassingScore').value = quizData.passingScore || 60;
        document.getElementById('editQuizDescription').value = quizData.description || '';
        document.getElementById('editQuizInstructions').value = quizData.instructions || '';
        document.getElementById('editQuizDueDate').value = quizData.dueDate || '';
        document.getElementById('editQuizShuffleQuestions').checked = quizData.shuffleQuestions || false;
        document.getElementById('editQuizShowResults').checked = quizData.showResults || false;
        document.getElementById('editQuizShowCorrectAnswers').checked = quizData.showCorrectAnswers || false;
        document.getElementById('editQuizAllowReview').checked = quizData.allowReview || false;
        document.getElementById('editQuizAutoSubmit').checked = quizData.autoSubmit || false;
        document.getElementById('editQuizIsActive').checked = quizData.isActive || false;
        
        // เปิด modal
        const modal = new bootstrap.Modal(document.getElementById('editQuizModal'));
        modal.show();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ');
    }
}

// จัดการการแก้ไขข้อสอบ
async function handleEditQuiz(e) {
    e.preventDefault();
    
    try {
        const quizId = document.getElementById('editQuizId').value;
        if (!quizId) {
            showErrorMessage('ไม่พบรหัสข้อสอบ');
            return;
        }
        
        const quizData = {
            title: document.getElementById('editQuizTitle').value,
            courseId: document.getElementById('editQuizCourse').value,
            description: document.getElementById('editQuizDescription').value,
            instructions: document.getElementById('editQuizInstructions').value,
            timeLimit: parseInt(document.getElementById('editQuizTimeLimit').value) || 0,
            attempts: parseInt(document.getElementById('editQuizAttempts').value) || 1,
            passingScore: parseInt(document.getElementById('editQuizPassingScore').value) || 60,
            dueDate: document.getElementById('editQuizDueDate').value || null,
            shuffleQuestions: document.getElementById('editQuizShuffleQuestions').checked,
            showResults: document.getElementById('editQuizShowResults').checked,
            showCorrectAnswers: document.getElementById('editQuizShowCorrectAnswers').checked,
            allowReview: document.getElementById('editQuizAllowReview').checked,
            autoSubmit: document.getElementById('editQuizAutoSubmit').checked,
            isActive: document.getElementById('editQuizIsActive').checked,
            updatedAt: new Date()
        };
        
        // อัปเดตข้อมูลใน Firestore
        await updateDoc(doc(db, 'quizzes', quizId), quizData);
        
        // ปิด modal และรีเฟรชข้อมูล
        const modal = bootstrap.Modal.getInstance(document.getElementById('editQuizModal'));
        modal.hide();
        
        showSuccessMessage('อัปเดตข้อสอบสำเร็จ');
        
        // โหลดข้อมูลใหม่
        await loadQuizzes();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการแก้ไขข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการแก้ไขข้อสอบ');
    }
}

// แสดงการยืนยันการลบ
function showDeleteConfirmation(quizId, quizTitle) {
    document.getElementById('deleteQuizTitle').textContent = quizTitle;
    document.getElementById('confirmDeleteQuiz').dataset.quizId = quizId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteQuizModal'));
    modal.show();
}

// จัดการการลบข้อสอบ
async function handleDeleteQuiz() {
    try {
        const quizId = document.getElementById('confirmDeleteQuiz').dataset.quizId;
        if (!quizId) {
            showErrorMessage('ไม่พบรหัสข้อสอบ');
            return;
        }
        
        // ลบข้อมูลจาก Firestore
        await deleteDoc(doc(db, 'quizzes', quizId));
        
        // ปิด modal และรีเฟรชข้อมูล
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteQuizModal'));
        modal.hide();
        
        showSuccessMessage('ลบข้อสอบสำเร็จ');
        
        // โหลดข้อมูลใหม่
        await loadQuizzes();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการลบข้อสอบ');
    }
}

// ดูข้อสอบ
function viewQuiz(quizId) {
    // ไปยังหน้าดูข้อสอบ
    window.location.href = `quiz-edit.html?id=${quizId}`;
}

// ฟังก์ชันช่วยเหลือ
function formatDate(timestamp) {
    return formatDateTime(timestamp, true);
}

// Export functions for use in HTML
window.initializeQuizCreatePage = initializeQuizCreatePage;
window.loadQuizzes = loadQuizzes;
window.loadCourses = loadCourses;

// ===== MODAL QUIZ CREATION FUNCTIONS =====

// จัดการ Modal สร้างข้อสอบใหม่
function setupQuizCreationModal() {
    console.log('Setting up quiz creation modal');
    
    // ตรวจสอบว่าปุ่มและ Modal มีอยู่จริง
    const createQuizBtn = document.querySelector('[data-bs-target="#createQuizModal"]');
    const createQuizModal = document.getElementById('createQuizModal');
    const createQuizForm = document.getElementById('createQuizForm');
    
    if (createQuizBtn) {
        console.log('Create quiz button found');
        createQuizBtn.addEventListener('click', function() {
            console.log('Create quiz button clicked');
        });
    } else {
        console.error('Create quiz button not found');
    }
    
    if (createQuizModal) {
        console.log('Create quiz modal found');
    } else {
        console.error('Create quiz modal not found');
    }
    
    if (createQuizForm) {
        console.log('Create quiz form found');
        // จัดการการส่งฟอร์มสร้างข้อสอบ
        createQuizForm.addEventListener('submit', handleCreateQuiz);
    } else {
        console.error('Create quiz form not found');
    }
    
    // โหลดข้อมูลคอร์สสำหรับ Modal
    loadCoursesForModal();
    
    // จัดการปุ่มเพิ่มคำถามใน Modal
    const modalAddMultipleChoiceBtn = document.getElementById('modalAddMultipleChoiceBtn');
    const modalAddTrueFalseBtn = document.getElementById('modalAddTrueFalseBtn');
    const modalAddFillBlankBtn = document.getElementById('modalAddFillBlankBtn');
    
    if (modalAddMultipleChoiceBtn) {
        modalAddMultipleChoiceBtn.addEventListener('click', () => addModalQuestion('multiple-choice'));
    }
    if (modalAddTrueFalseBtn) {
        modalAddTrueFalseBtn.addEventListener('click', () => addModalQuestion('true-false'));
    }
    if (modalAddFillBlankBtn) {
        modalAddFillBlankBtn.addEventListener('click', () => addModalQuestion('fill-blank'));
    }
}

// โหลดข้อมูลคอร์สสำหรับ Modal
async function loadCoursesForModal() {
    try {
        const user = getCurrentUser();
        const coursesRef = collection(db, 'courses');
        const q = query(coursesRef, where('instructorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const courseSelect = document.getElementById('modalQuizCourse');
        courseSelect.innerHTML = '<option value="">เลือกคอร์ส</option>';
        
        querySnapshot.forEach((doc) => {
            const course = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = course.title;
            courseSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส');
    }
}

// จัดการการส่งฟอร์มสร้างข้อสอบ
async function handleCreateQuiz(e) {
    e.preventDefault();
    
    const quizData = {
        title: document.getElementById('modalQuizTitle').value,
        courseId: document.getElementById('modalQuizCourse').value,
        description: document.getElementById('modalQuizDescription').value,
        instructions: document.getElementById('modalQuizInstructions').value,
        timeLimit: parseInt(document.getElementById('modalQuizTimeLimit').value) || 0,
        attempts: parseInt(document.getElementById('modalQuizAttempts').value) || 1,
        passingScore: parseInt(document.getElementById('modalQuizPassingScore').value) || 60,
        dueDate: document.getElementById('modalQuizDueDate').value,
        shuffleQuestions: document.getElementById('modalQuizShuffleQuestions').checked,
        showResults: document.getElementById('modalQuizShowResults').checked,
        showCorrectAnswers: document.getElementById('modalQuizShowCorrectAnswers').checked,
        allowReview: document.getElementById('modalQuizAllowReview').checked,
        autoSubmit: document.getElementById('modalQuizAutoSubmit').checked,
        isActive: document.getElementById('modalQuizIsActive').checked,
        questions: getModalQuestions(),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        const user = getCurrentUser();
        quizData.instructorId = user.uid;
        
        const docRef = await addDoc(collection(db, 'quizzes'), quizData);
        
        showSuccessMessage('สร้างข้อสอบสำเร็จแล้ว!');
        
        // ปิด Modal และรีเซ็ตฟอร์ม
        const modal = bootstrap.Modal.getInstance(document.getElementById('createQuizModal'));
        modal.hide();
        e.target.reset();
        document.getElementById('modalQuestionsContainer').innerHTML = '';
        
        // รีโหลดหน้าหรือไปยังหน้าจัดการข้อสอบ
        setTimeout(() => {
            window.location.href = 'manage-quizzes.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating quiz:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการสร้างข้อสอบ');
    }
}

// เพิ่มคำถามใน Modal
function addModalQuestion(type) {
    const container = document.getElementById('modalQuestionsContainer');
    const questionId = 'modal_question_' + Date.now();
    
    let questionHTML = '';
    
    switch(type) {
        case 'multiple-choice':
            questionHTML = createMultipleChoiceQuestionHTML(questionId, true);
            break;
        case 'true-false':
            questionHTML = createTrueFalseQuestionHTML(questionId, true);
            break;
        case 'fill-blank':
            questionHTML = createFillBlankQuestionHTML(questionId, true);
            break;
    }
    
    container.insertAdjacentHTML('beforeend', questionHTML);
}

// สร้าง HTML สำหรับคำถามแบบเลือกตอบ
function createMultipleChoiceQuestionHTML(questionId, isModal = false) {
    return `
        <div class="card mb-3" id="${questionId}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามแบบเลือกตอบ</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion('${questionId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control" name="question" required placeholder="กรุณากรอกคำถาม"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">ตัวเลือก</label>
                    <div id="options_${questionId}">
                        <div class="input-group mb-2">
                            <div class="input-group-text">
                                <input class="form-check-input mt-0" type="radio" name="correct_${questionId}" value="0" required>
                            </div>
                            <input type="text" class="form-control" name="option_${questionId}_0" placeholder="ตัวเลือกที่ 1" required>
                        </div>
                        <div class="input-group mb-2">
                            <div class="input-group-text">
                                <input class="form-check-input mt-0" type="radio" name="correct_${questionId}" value="1" required>
                            </div>
                            <input type="text" class="form-control" name="option_${questionId}_1" placeholder="ตัวเลือกที่ 2" required>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addOption('${questionId}')">
                        <i class="bi bi-plus"></i> เพิ่มตัวเลือก
                    </button>
                </div>
                <div class="mb-3">
                    <label class="form-label">คำอธิบาย (ไม่บังคับ)</label>
                    <textarea class="form-control" name="explanation" placeholder="คำอธิบายคำตอบ"></textarea>
                </div>
            </div>
        </div>
    `;
}

// สร้าง HTML สำหรับคำถามแบบถูก/ผิด
function createTrueFalseQuestionHTML(questionId, isModal = false) {
    return `
        <div class="card mb-3" id="${questionId}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามแบบถูก/ผิด</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion('${questionId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control" name="question" required placeholder="กรุณากรอกคำถาม"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">คำตอบที่ถูกต้อง *</label>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="correct_${questionId}" value="true" required>
                        <label class="form-check-label">ถูก</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="correct_${questionId}" value="false" required>
                        <label class="form-check-label">ผิด</label>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">คำอธิบาย (ไม่บังคับ)</label>
                    <textarea class="form-control" name="explanation" placeholder="คำอธิบายคำตอบ"></textarea>
                </div>
            </div>
        </div>
    `;
}

// สร้าง HTML สำหรับคำถามแบบเติมคำ
function createFillBlankQuestionHTML(questionId, isModal = false) {
    return `
        <div class="card mb-3" id="${questionId}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามแบบเติมคำ</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion('${questionId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control" name="question" required placeholder="กรุณากรอกคำถาม (ใช้ ___ สำหรับช่องว่าง)"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">คำตอบที่ถูกต้อง *</label>
                    <input type="text" class="form-control" name="correct_${questionId}" required placeholder="กรุณากรอกคำตอบที่ถูกต้อง">
                </div>
                <div class="mb-3">
                    <label class="form-label">คำอธิบาย (ไม่บังคับ)</label>
                    <textarea class="form-control" name="explanation" placeholder="คำอธิบายคำตอบ"></textarea>
                </div>
            </div>
        </div>
    `;
}

// เพิ่มตัวเลือกสำหรับคำถามแบบเลือกตอบ
function addOption(questionId) {
    const optionsContainer = document.getElementById(`options_${questionId}`);
    const optionCount = optionsContainer.children.length;
    
    const optionHTML = `
        <div class="input-group mb-2">
            <div class="input-group-text">
                <input class="form-check-input mt-0" type="radio" name="correct_${questionId}" value="${optionCount}" required>
            </div>
            <input type="text" class="form-control" name="option_${questionId}_${optionCount}" placeholder="ตัวเลือกที่ ${optionCount + 1}" required>
        </div>
    `;
    
    optionsContainer.insertAdjacentHTML('beforeend', optionHTML);
}

// ลบคำถาม
function removeQuestion(questionId) {
    const questionElement = document.getElementById(questionId);
    if (questionElement) {
        questionElement.remove();
    }
}

// ดึงข้อมูลคำถามจาก Modal
function getModalQuestions() {
    const questions = [];
    const questionCards = document.querySelectorAll('#modalQuestionsContainer .card');
    
    questionCards.forEach((card, index) => {
        const questionId = card.id;
        const questionText = card.querySelector('textarea[name="question"]').value;
        const explanation = card.querySelector('textarea[name="explanation"]')?.value || '';
        
        // ตรวจสอบประเภทคำถาม
        if (card.querySelector('input[type="radio"][name^="correct_"]')) {
            const correctAnswer = card.querySelector('input[type="radio"][name^="correct_"]:checked')?.value;
            
            if (card.querySelector('.input-group-text')) {
                // คำถามแบบเลือกตอบ
                const options = [];
                const optionInputs = card.querySelectorAll('input[name^="option_"]');
                optionInputs.forEach((input, optIndex) => {
                    options.push({
                        text: input.value,
                        isCorrect: optIndex.toString() === correctAnswer
                    });
                });
                
                questions.push({
                    type: 'multiple-choice',
                    question: questionText,
                    options: options,
                    explanation: explanation,
                    order: index + 1
                });
            } else {
                // คำถามแบบถูก/ผิด
                questions.push({
                    type: 'true-false',
                    question: questionText,
                    correctAnswer: correctAnswer === 'true',
                    explanation: explanation,
                    order: index + 1
                });
            }
        } else {
            // คำถามแบบเติมคำ
            const correctAnswer = card.querySelector('input[name^="correct_"]').value;
            questions.push({
                type: 'fill-blank',
                question: questionText,
                correctAnswer: correctAnswer,
                explanation: explanation,
                order: index + 1
            });
        }
    });
    
    return questions;
}

// Export additional functions
window.setupQuizCreationModal = setupQuizCreationModal;
window.addModalQuestion = addModalQuestion;
window.addOption = addOption;
window.removeQuestion = removeQuestion;
window.getModalQuestions = getModalQuestions;
window.handleCreateQuiz = handleCreateQuiz;

// ===== CONTENT MANAGEMENT FUNCTIONS =====

// ตัวแปรสำหรับ Content DataTable
let contentDataTable;

// โหลดข้อมูลเนื้อหา
async function loadContent() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }

        const contentRef = collection(db, 'content');
        const q = query(contentRef, where('instructorId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        const contentTable = document.getElementById('contentTable');
        if (!contentTable) return;

        const tbody = contentTable.querySelector('tbody');
        tbody.innerHTML = '';

        // แปลงข้อมูลเป็น array และเรียงลำดับ
        const contentArray = [];
        querySnapshot.forEach((doc) => {
            contentArray.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // เรียงลำดับตามวันที่สร้าง (ใหม่สุดก่อน)
        contentArray.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
        });

        contentArray.forEach((content) => {
            const row = document.createElement('tr');
            
            const typeIcon = getContentTypeIcon(content.type);
            const typeText = getContentTypeText(content.type);
            const courseName = content.courseName || 'ไม่ระบุ';
            const isRequired = content.isRequired ? '<span class="badge bg-warning">ต้องศึกษา</span>' : '<span class="badge bg-secondary">ไม่บังคับ</span>';
            
            row.innerHTML = `
                <td>
                    <strong>${content.title}</strong>
                    ${isRequired}
                </td>
                <td>
                    <i class="${typeIcon} me-1"></i>
                    ${typeText}
                </td>
                <td>
                    <a href="${content.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i>เปิดลิงก์
                    </a>
                </td>
                <td>${content.description || '-'}</td>
                <td>${courseName}</td>
                <td>${formatDate(content.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary edit-content" data-id="${content.id}" data-title="${content.title}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger delete-content" data-id="${content.id}" data-title="${content.title}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        // เริ่มต้น DataTable
        if (contentDataTable) {
            contentDataTable.destroy();
        }
        
        const contentDataTableConfig = {
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/th.json'
            },
            pageLength: 10,
            order: [[5, 'desc']], // เรียงตามวันที่สร้าง
            autoWidth: false,
            scrollX: false,
            columnDefs: [
                {
                    targets: [0], // ชื่อเนื้อหา
                    width: '25%',
                    responsivePriority: 1
                },
                {
                    targets: [1], // ประเภท
                    width: '8%',
                    responsivePriority: 2
                },
                {
                    targets: [2], // ลิงก์
                    width: '10%',
                    responsivePriority: 2
                },
                {
                    targets: [3], // คำอธิบาย
                    width: '25%',
                    responsivePriority: 2
                },
                {
                    targets: [4], // คอร์สที่เกี่ยวข้อง
                    width: '15%',
                    responsivePriority: 3
                },
                {
                    targets: [5], // วันที่เพิ่ม
                    width: '12%',
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
        //     contentDataTableConfig.responsive = {
        //         details: {
        //             display: $.fn.dataTable.Responsive.display.childRowImmediate,
        //             type: 'column',
        //             target: 0
        //         }
        //     };
        // }
        
        contentDataTable = $('#contentTable').DataTable(contentDataTableConfig);

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลเนื้อหา:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลเนื้อหา');
    }
}

// ฟังก์ชันช่วยเหลือสำหรับเนื้อหา
function getContentTypeIcon(type) {
    const icons = {
        'video': 'bi bi-play-circle-fill text-danger',
        'document': 'bi bi-file-earmark-text text-primary',
        'link': 'bi bi-link-45deg text-success',
        'pdf': 'bi bi-file-earmark-pdf text-danger',
        'image': 'bi bi-image text-info'
    };
    return icons[type] || 'bi bi-file-earmark text-secondary';
}

function getContentTypeText(type) {
    const texts = {
        'video': 'วิดีโอ',
        'document': 'เอกสาร',
        'link': 'ลิงก์',
        'pdf': 'PDF',
        'image': 'รูปภาพ'
    };
    return texts[type] || 'ไม่ระบุ';
}

// จัดการการเพิ่มเนื้อหา
async function handleAddContent(e) {
    e.preventDefault();
    
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }
        
        const contentData = {
            title: document.getElementById('contentTitle').value,
            type: document.getElementById('contentType').value,
            url: document.getElementById('contentUrl').value,
            description: document.getElementById('contentDescription').value,
            courseId: document.getElementById('contentCourse').value || null,
            courseName: document.getElementById('contentCourse').selectedOptions[0]?.text || null,
            duration: parseInt(document.getElementById('contentDuration').value) || 0,
            difficulty: document.getElementById('contentDifficulty').value,
            isRequired: document.getElementById('contentIsRequired').checked,
            instructorId: currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // บันทึกข้อมูลลง Firestore
        await addDoc(collection(db, 'content'), contentData);
        
        // ปิด modal และรีเฟรชข้อมูล
        const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
        modal.hide();
        
        showSuccessMessage('เพิ่มเนื้อหาสำเร็จ');
        
        // รีเซ็ตฟอร์ม
        document.getElementById('addContentForm').reset();
        
        // โหลดข้อมูลใหม่
        await loadContent();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเพิ่มเนื้อหา:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการเพิ่มเนื้อหา');
    }
}

// โหลดข้อมูลเนื้อหาสำหรับแก้ไข
async function loadContentForEdit(contentId) {
    try {
        const contentDoc = await getDoc(doc(db, 'content', contentId));
        if (!contentDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลเนื้อหา');
            return;
        }
        
        const contentData = contentDoc.data();
        
        // เติมข้อมูลในฟอร์ม
        document.getElementById('editContentId').value = contentId;
        document.getElementById('editContentTitle').value = contentData.title || '';
        document.getElementById('editContentType').value = contentData.type || '';
        document.getElementById('editContentUrl').value = contentData.url || '';
        document.getElementById('editContentDescription').value = contentData.description || '';
        document.getElementById('editContentCourse').value = contentData.courseId || '';
        document.getElementById('editContentDuration').value = contentData.duration || 0;
        document.getElementById('editContentDifficulty').value = contentData.difficulty || 'intermediate';
        document.getElementById('editContentIsRequired').checked = contentData.isRequired || false;
        
        // เปิด modal
        const modal = new bootstrap.Modal(document.getElementById('editContentModal'));
        modal.show();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลเนื้อหา:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลเนื้อหา');
    }
}

// จัดการการแก้ไขเนื้อหา
async function handleEditContent(e) {
    e.preventDefault();
    
    try {
        const contentId = document.getElementById('editContentId').value;
        if (!contentId) {
            showErrorMessage('ไม่พบรหัสเนื้อหา');
            return;
        }
        
        const contentData = {
            title: document.getElementById('editContentTitle').value,
            type: document.getElementById('editContentType').value,
            url: document.getElementById('editContentUrl').value,
            description: document.getElementById('editContentDescription').value,
            courseId: document.getElementById('editContentCourse').value || null,
            courseName: document.getElementById('editContentCourse').selectedOptions[0]?.text || null,
            duration: parseInt(document.getElementById('editContentDuration').value) || 0,
            difficulty: document.getElementById('editContentDifficulty').value,
            isRequired: document.getElementById('editContentIsRequired').checked,
            updatedAt: new Date()
        };
        
        // อัปเดตข้อมูลใน Firestore
        await updateDoc(doc(db, 'content', contentId), contentData);
        
        // ปิด modal และรีเฟรชข้อมูล
        const modal = bootstrap.Modal.getInstance(document.getElementById('editContentModal'));
        modal.hide();
        
        showSuccessMessage('อัปเดตเนื้อหาสำเร็จ');
        
        // โหลดข้อมูลใหม่
        await loadContent();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการแก้ไขเนื้อหา:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการแก้ไขเนื้อหา');
    }
}

// แสดงการยืนยันการลบเนื้อหา
function showDeleteContentConfirmation(contentId, contentTitle) {
    document.getElementById('deleteContentTitle').textContent = contentTitle;
    document.getElementById('confirmDeleteContent').dataset.contentId = contentId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteContentModal'));
    modal.show();
}

// จัดการการลบเนื้อหา
async function handleDeleteContent() {
    try {
        const contentId = document.getElementById('confirmDeleteContent').dataset.contentId;
        if (!contentId) {
            showErrorMessage('ไม่พบรหัสเนื้อหา');
            return;
        }
        
        // ลบข้อมูลจาก Firestore
        await deleteDoc(doc(db, 'content', contentId));
        
        // ปิด modal และรีเฟรชข้อมูล
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteContentModal'));
        modal.hide();
        
        showSuccessMessage('ลบเนื้อหาสำเร็จ');
        
        // โหลดข้อมูลใหม่
        await loadContent();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบเนื้อหา:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการลบเนื้อหา');
    }
}

// เพิ่ม event listeners สำหรับเนื้อหา
function addContentEventListeners() {
    // เพิ่มเนื้อหา
    const addContentForm = document.getElementById('addContentForm');
    if (addContentForm) {
        addContentForm.addEventListener('submit', handleAddContent);
    }
    
    // แก้ไขเนื้อหา
    const editContentForm = document.getElementById('editContentForm');
    if (editContentForm) {
        editContentForm.addEventListener('submit', handleEditContent);
    }
    
    // ลบเนื้อหา
    const confirmDeleteContent = document.getElementById('confirmDeleteContent');
    if (confirmDeleteContent) {
        confirmDeleteContent.addEventListener('click', handleDeleteContent);
    }
    
    // Event delegation สำหรับปุ่มในตารางเนื้อหา
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-content')) {
            const contentId = e.target.closest('.edit-content').dataset.id;
            loadContentForEdit(contentId);
        }
        
        if (e.target.closest('.delete-content')) {
            const contentId = e.target.closest('.delete-content').dataset.id;
            const contentTitle = e.target.closest('.delete-content').dataset.title;
            showDeleteContentConfirmation(contentId, contentTitle);
        }
    });
    
    // โหลดตัวเลือกคอร์สเมื่อเปิด modal
    const addContentModal = document.getElementById('addContentModal');
    if (addContentModal) {
        addContentModal.addEventListener('show.bs.modal', () => {
            loadCourses();
        });
    }
    
    const editContentModal = document.getElementById('editContentModal');
    if (editContentModal) {
        editContentModal.addEventListener('show.bs.modal', () => {
            loadCourses();
        });
    }
}

// Export content functions
window.loadContent = loadContent;
window.handleAddContent = handleAddContent;
window.handleEditContent = handleEditContent;
window.handleDeleteContent = handleDeleteContent;
window.showDeleteContentConfirmation = showDeleteContentConfirmation;
