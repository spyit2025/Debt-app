import { protectPage, displayUserInfo, createUserMenu, logoutUser, checkSessionExpiry, showErrorMessage, showSuccessMessage, getCurrentUser } from './auth.js';
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    deleteDoc,
    query, 
    orderBy,
    serverTimestamp,
    addDoc,
    updateDoc,
    where,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // ตรวจสอบสิทธิ์การเข้าถึงหน้า (แอดมินและผู้สอน)
        protectPage(['admin', 'instructor']);
        
        // ตรวจสอบ session expiry
        checkSessionExpiry();
        
        // แสดงข้อมูลผู้ใช้
        displayUserInfo();
        
        // สร้างเมนูผู้ใช้
        createUserMenu();
        
        // ตรวจสอบว่า Bootstrap ถูกโหลดแล้วหรือไม่
        if (typeof bootstrap === 'undefined') {
            // รอให้ Bootstrap โหลดเสร็จ
            await new Promise(resolve => {
                const checkBootstrap = () => {
                    if (typeof bootstrap !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkBootstrap, 100);
                    }
                };
                checkBootstrap();
            });
        }
        
        // รอให้ DataTables โหลดเสร็จก่อนเริ่มต้น
        if (window.waitForDataTables) {
            await window.waitForDataTables();
        }
        
        // เริ่มต้น DataTable
        initializeDataTable();
        
        // โหลดข้อมูลข้อสอบ
        loadQuizzes();
        
        // โหลดข้อมูลเนื้อหา (สำหรับ admin)
        loadContent();
        
        // ตั้งค่า Event Listeners
        setupEventListeners();
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดหน้า');
    }
});

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

// ตัวแปรสำหรับสร้างข้อสอบ
let questionCounter = 0;

// ฟังก์ชันคำนวณคะแนนรวม
function calculateTotalScore() {
    const questionScores = document.querySelectorAll('.question-score');
    let total = 0;
    
    questionScores.forEach(scoreInput => {
        const score = parseFloat(scoreInput.value) || 0;
        total += score;
    });
    
    // อัปเดตการแสดงผลคะแนนรวม
    const totalScoreElement = document.getElementById('totalScore');
    if (totalScoreElement) {
        totalScoreElement.textContent = total;
        
        // เปลี่ยนสีและข้อความตามคะแนนรวม
        if (total === 100) {
            totalScoreElement.className = 'badge bg-success ms-2';
            totalScoreElement.title = '✅ คะแนนรวมถูกต้อง (100 คะแนน)';
        } else if (total > 100) {
            totalScoreElement.className = 'badge bg-danger ms-2';
            totalScoreElement.title = `⚠️ คะแนนรวมเกิน 100 (${total} คะแนน)`;
        } else {
            totalScoreElement.className = 'badge bg-warning ms-2';
            totalScoreElement.title = `⚠️ คะแนนรวมน้อยกว่า 100 (${total} คะแนน)`;
        }
    }
    
    // อัปเดตข้อความคำแนะนำ
    const adviceElement = document.querySelector('#totalScore').closest('.alert').querySelector('.text-muted small');
    if (adviceElement) {
        if (total === 100) {
            adviceElement.innerHTML = `
                <i class="bi bi-check-circle text-success me-1"></i>
                <strong class="text-success">คะแนนรวมถูกต้องแล้ว!</strong> พร้อมบันทึกข้อสอบ
            `;
        } else if (total > 100) {
            adviceElement.innerHTML = `
                <i class="bi bi-exclamation-triangle text-danger me-1"></i>
                <strong class="text-danger">คะแนนรวมเกิน 100 คะแนน</strong> กรุณาลดคะแนนบางข้อ
            `;
        } else {
            adviceElement.innerHTML = `
                <i class="bi bi-lightbulb me-1"></i>
                กำหนดคะแนนแต่ละข้อให้รวมเป็น 100 คะแนน (ขาด ${100 - total} คะแนน)
            `;
        }
    }
    
    // อัปเดตสถานะปุ่มบันทึก
    const saveBtn = document.getElementById('saveQuizBtn');
    if (saveBtn) {
        if (total === 100) {
            saveBtn.disabled = false;
            saveBtn.className = 'btn btn-primary';
            saveBtn.title = 'บันทึกข้อสอบ';
        } else {
            saveBtn.disabled = true;
            saveBtn.className = 'btn btn-secondary';
            saveBtn.title = 'กรุณากำหนดคะแนนรวมให้เป็น 100 คะแนน';
        }
    }
    
    return total;
}

// ฟังก์ชันคำนวณคะแนนรวมสำหรับฟอร์มแก้ไข
function calculateTotalScoreForEdit() {
    const questionScores = document.querySelectorAll('#editQuestionsContainer .question-score');
    let total = 0;
    
    questionScores.forEach(scoreInput => {
        const score = parseFloat(scoreInput.value) || 0;
        total += score;
    });
    
    // อัปเดตการแสดงผลคะแนนรวมในฟอร์มแก้ไข (ถ้ามี)
    const totalScoreElement = document.getElementById('editTotalScore');
    if (totalScoreElement) {
        totalScoreElement.textContent = total;
        
        // เปลี่ยนสีและข้อความตามคะแนนรวม
        if (total === 100) {
            totalScoreElement.className = 'badge bg-success ms-2';
            totalScoreElement.title = '✅ คะแนนรวมถูกต้อง (100 คะแนน)';
        } else if (total > 100) {
            totalScoreElement.className = 'badge bg-danger ms-2';
            totalScoreElement.title = `⚠️ คะแนนรวมเกิน 100 (${total} คะแนน)`;
        } else {
            totalScoreElement.className = 'badge bg-warning ms-2';
            totalScoreElement.title = `⚠️ คะแนนรวมน้อยกว่า 100 (${total} คะแนน)`;
        }
    }
    
    // อัปเดตข้อความคำแนะนำในฟอร์มแก้ไข
    if (totalScoreElement) {
        const editAdviceElement = totalScoreElement.closest('.alert').querySelector('.text-muted small');
        if (editAdviceElement) {
            if (total === 100) {
                editAdviceElement.innerHTML = `
                    <i class="bi bi-check-circle text-success me-1"></i>
                    <strong class="text-success">คะแนนรวมถูกต้องแล้ว!</strong> พร้อมบันทึกข้อสอบ
                `;
            } else if (total > 100) {
                editAdviceElement.innerHTML = `
                    <i class="bi bi-exclamation-triangle text-danger me-1"></i>
                    <strong class="text-danger">คะแนนรวมเกิน 100 คะแนน</strong> กรุณาลดคะแนนบางข้อ
                `;
            } else {
                editAdviceElement.innerHTML = `
                    <i class="bi bi-lightbulb me-1"></i>
                    กำหนดคะแนนแต่ละข้อให้รวมเป็น 100 คะแนน (ขาด ${100 - total} คะแนน)
                `;
            }
        }
    }
    
    // อัปเดตสถานะปุ่มบันทึกในฟอร์มแก้ไข
    const saveEditBtn = document.getElementById('saveEditQuizBtn');
    if (saveEditBtn) {
        if (total === 100) {
            saveEditBtn.disabled = false;
            saveEditBtn.className = 'btn btn-primary';
            saveEditBtn.title = 'บันทึกการแก้ไขข้อสอบ';
        } else {
            saveEditBtn.disabled = true;
            saveEditBtn.className = 'btn btn-secondary';
            saveEditBtn.title = 'กรุณากำหนดคะแนนรวมให้เป็น 100 คะแนน';
        }
    }
    
    return total;
}

// ฟังก์ชันตรวจสอบสถานะคะแนนของแต่ละข้อ
function updateQuestionScoreStatus(questionItem) {
    const scoreInput = questionItem.querySelector('.question-score');
    const statusElement = questionItem.querySelector('#question-score-status');
    
    if (!scoreInput || !statusElement) return;
    
    const score = parseFloat(scoreInput.value) || 0;
    const totalScore = calculateTotalScore();
    
    if (score <= 0) {
        statusElement.textContent = '⚠️ กรุณากำหนดคะแนน';
        statusElement.className = 'badge bg-danger';
    } else if (totalScore > 100) {
        statusElement.textContent = '⚠️ คะแนนรวมเกิน 100';
        statusElement.className = 'badge bg-warning';
    } else if (totalScore === 100) {
        statusElement.textContent = '✓ คะแนนเหมาะสม';
        statusElement.className = 'badge bg-success';
    } else {
        statusElement.textContent = `✓ ${totalScore}/100 คะแนน`;
        statusElement.className = 'badge bg-info';
    }
}

// ตั้งค่า Event Listeners ทั้งหมด
function setupEventListeners() {
    // ตรวจสอบว่า Bootstrap ถูกโหลดแล้วหรือไม่
    if (typeof bootstrap === 'undefined') {
        return;
    }
    
    // ฟอร์มสร้างข้อสอบใหม่
    const createQuizForm = document.getElementById('createQuizForm');
    if (createQuizForm) {
        createQuizForm.addEventListener('submit', handleCreateQuiz);
    }
    
    // ปุ่มเพิ่มคำถาม (ใช้สำหรับ fallback หากมีปุ่มเก่า)
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', () => addQuestion('multiple-choice'));
    }
    
    // ปุ่มดูตัวอย่าง
    const previewQuizBtn = document.getElementById('previewQuizBtn');
    if (previewQuizBtn) {
        previewQuizBtn.addEventListener('click', previewQuiz);
    }
    
    // Event delegation สำหรับปุ่มลบคำถามและตัวเลือก
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-question')) {
            removeQuestion(e.target.closest('.question-item'));
        }
        
        if (e.target.classList.contains('remove-option') || e.target.closest('.remove-option')) {
            // หาปุ่มลบตัวเลือก
            let removeButton;
            if (e.target.classList.contains('remove-option')) {
                removeButton = e.target;
            } else if (e.target.closest('.remove-option')) {
                removeButton = e.target.closest('.remove-option');
            } else {
                return;
            }
            
            // หา input-group ที่เป็น parent
            let optionElement = removeButton.closest('.input-group');
            if (!optionElement) {
                // ลองหา parent element ที่มี class input-group
                optionElement = removeButton.parentElement;
                while (optionElement && !optionElement.classList.contains('input-group')) {
                    optionElement = optionElement.parentElement;
                }
            }
            
            if (optionElement && optionElement.classList.contains('input-group')) {
                removeOption(optionElement);
            }
        }
        
        if (e.target.classList.contains('add-option')) {
            const questionItem = e.target.closest('.question-item');
            if (questionItem) {
                const optionsContainer = questionItem.querySelector('.options-container');
                if (optionsContainer) {
                    addOption(optionsContainer);
                }
            }
        }
    });
    
    // Event delegation สำหรับการเปลี่ยนแปลงคะแนน
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('question-score')) {
            const questionItem = e.target.closest('.question-item');
            if (questionItem) {
                updateQuestionScoreStatus(questionItem);
            }
            
            // ตรวจสอบว่าเป็นฟอร์มสร้างใหม่หรือฟอร์มแก้ไข
            if (e.target.closest('#questionsContainer')) {
                calculateTotalScore();
            } else if (e.target.closest('#editQuestionsContainer')) {
                calculateTotalScoreForEdit();
            }
        }
    });
    
    // อัปเดตคะแนนรวมเมื่อมีการเปลี่ยนแปลงในฟอร์ม
    document.addEventListener('DOMContentLoaded', function() {
        const questionsContainer = document.getElementById('questionsContainer');
        if (questionsContainer) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        calculateTotalScore();
                    }
                });
            });
            
            observer.observe(questionsContainer, {
                childList: true,
                subtree: true
            });
        }
        
        // อัปเดตคะแนนรวมเมื่อมีการเปลี่ยนแปลงในฟอร์มแก้ไข
        const editQuestionsContainer = document.getElementById('editQuestionsContainer');
        if (editQuestionsContainer) {
            const editObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        calculateTotalScoreForEdit();
                    }
                });
            });
            
            editObserver.observe(editQuestionsContainer, {
                childList: true,
                subtree: true
            });
        }
    });
    
    // จัดการ modal สร้างข้อสอบ
    const createQuizModal = document.getElementById('createQuizModal');
    if (createQuizModal) {
        createQuizModal.addEventListener('shown.bs.modal', function() {
            // เริ่มต้นฟอร์มเมื่อ modal เปิด
            initializeQuizForm();
            // โหลดข้อมูลคอร์สเมื่อ modal เปิด
            loadCoursesForQuiz();
            
            // ตรวจสอบ input fields
            const quizTitle = document.getElementById('quizTitle');
            const quizDescription = document.getElementById('quizDescription');
            const quizDuration = document.getElementById('quizDuration');
            const passingScore = document.getElementById('passingScore');
            const autoSubmit = document.getElementById('autoSubmit');
            const requireAllAnswers = document.getElementById('requireAllAnswers');
            

        });
        
        createQuizModal.addEventListener('hidden.bs.modal', function() {
            // รีเซ็ตฟอร์มเมื่อ modal ปิด
            resetQuizForm();
        });
    }
    
    // จัดการ modal เพิ่มเนื้อหา
    const addContentModal = document.getElementById('addContentModal');
    if (addContentModal) {
        addContentModal.addEventListener('shown.bs.modal', function() {
            // โหลดข้อมูลคอร์สเมื่อ modal เปิด
            loadCoursesForContent();
        });
        
        addContentModal.addEventListener('hidden.bs.modal', function() {
            // รีเซ็ตฟอร์มเมื่อ modal ปิด
            document.getElementById('addContentForm').reset();
        });
    }
    
    // จัดการ modal แก้ไขเนื้อหา
    const editContentModal = document.getElementById('editContentModal');
    if (editContentModal) {
        editContentModal.addEventListener('shown.bs.modal', function() {
            // โหลดข้อมูลคอร์สเมื่อ modal เปิด
            loadCoursesForContent();
        });
        
        editContentModal.addEventListener('hidden.bs.modal', function() {
            // รีเซ็ตฟอร์มเมื่อ modal ปิด
            document.getElementById('editContentForm').reset();
        });
    }
    
    // จัดการ modal แก้ไขข้อสอบ
    const editQuizModal = document.getElementById('editQuizModal');
    if (editQuizModal) {
        editQuizModal.addEventListener('shown.bs.modal', function() {
            // คำนวณคะแนนรวมเมื่อ modal เปิด
            setTimeout(() => {
                calculateTotalScoreForEdit();
            }, 200);
        });
        
        editQuizModal.addEventListener('hidden.bs.modal', function() {
            // รีเซ็ตสถานะตัวแปร
            isEditModalOpen = false;
            
            // รีเซ็ตสถานะปุ่มบันทึก
            const saveEditBtn = document.getElementById('saveEditQuizBtn');
            if (saveEditBtn) {
                saveEditBtn.disabled = false;
                saveEditBtn.className = 'btn btn-primary';
                saveEditBtn.title = 'บันทึกการแก้ไขข้อสอบ';
            }
        });
    }
    
    // Event listener สำหรับปุ่มบันทึกในฟอร์มแก้ไขข้อสอบ
    const saveEditQuizBtn = document.getElementById('saveEditQuizBtn');
    if (saveEditQuizBtn) {
        saveEditQuizBtn.addEventListener('click', async function() {
            // ป้องกันการคลิกซ้ำ
            if (saveEditQuizBtn.disabled) {
                return;
            }
            
            const editQuizModal = document.getElementById('editQuizModal');
            const quizId = editQuizModal ? editQuizModal.getAttribute('data-quiz-id') : null;
            
            if (quizId) {
                try {
                    await handleEditQuizSave(quizId);
                } catch (error) {
                    showErrorMessage('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
                    
                    // พยายามปิด modal แม้ว่าจะเกิด error
                    setTimeout(() => {
                        closeEditQuizModal();
                        
                        // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                        setTimeout(() => {
                            closeEditQuizModal();
                            
                            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                            setTimeout(() => {
                                closeEditQuizModal();
                                
                                // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                                setTimeout(() => {
                                    closeEditQuizModal();
                                    
                                    // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                                    setTimeout(() => {
                                        closeEditQuizModal();
                                    }, 1000);
                                }, 1000);
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }
            } else {
                showErrorMessage('ไม่พบ ID ของข้อสอบที่ต้องการแก้ไข');
            }
        });
    }
    
    // Event listeners สำหรับฟอร์มเนื้อหา
    const addContentForm = document.getElementById('addContentForm');
    if (addContentForm) {
        addContentForm.addEventListener('submit', handleAddContent);
    }
    
    const editContentForm = document.getElementById('editContentForm');
    if (editContentForm) {
        editContentForm.addEventListener('submit', handleEditContent);
    }
    
    // Event delegation สำหรับปุ่มแก้ไขและลบเนื้อหา
    document.addEventListener('click', function(e) {
        // จัดการปุ่มแก้ไขเนื้อหา (คลิกที่ปุ่มหรือไอคอน)
        if (e.target.closest('.edit-content')) {
            const button = e.target.closest('.edit-content');
            const contentId = button.dataset.id;
            editContent(contentId);
            return;
        }
        
        // จัดการปุ่มลบเนื้อหา (คลิกที่ปุ่มหรือไอคอน)
        if (e.target.closest('.delete-content')) {
            const button = e.target.closest('.delete-content');
            const contentId = button.dataset.id;
            const contentTitle = button.dataset.title;
            deleteContent(contentId, contentTitle);
            return;
        }
    });
}

// เริ่มต้น DataTable
function initializeDataTable() {
    // ตรวจสอบและทำลาย DataTable เก่าถ้ามี
    if (window.quizzesDataTable) {
        window.quizzesDataTable.destroy();
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
        order: [[5, 'desc']], // เรียงตามวันที่สร้าง
        columnDefs: [
            {
                targets: [1, 2, 3, 4], // คอร์ส, จำนวนข้อ, เวลาทำ, สถานะ
                responsivePriority: 2
            },
            {
                targets: [5], // วันที่สร้าง
                responsivePriority: 1
            },
            {
                targets: [6], // การดำเนินการ
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
    
    // เริ่มต้น DataTable และเก็บ reference
    window.quizzesDataTable = $('#quizzesTable').DataTable(dataTableConfig);
}

// โหลดข้อมูลข้อสอบ
async function loadQuizzes() {
    try {
        showLoading('กำลังโหลดข้อมูลข้อสอบ...');
        
        // ดึงข้อมูลข้อสอบจาก Firebase
        const quizzesQuery = query(
            collection(db, 'quizzes'),
            orderBy('createdAt', 'desc')
        );
        
        const quizzesSnapshot = await getDocs(quizzesQuery);
        const quizzes = [];
        
        quizzesSnapshot.forEach((doc) => {
            const quizData = doc.data();
            
            // ตรวจสอบเวลาทำข้อสอบ (อาจเป็น timeLimit หรือ duration)
            const timeLimit = quizData.timeLimit || quizData.duration || 0;
            
            quizzes.push({
                id: doc.id,
                title: quizData.title || 'ไม่ระบุชื่อ',
                course: quizData.courseName || quizData.course || 'ไม่ระบุคอร์ส',
                questionCount: quizData.questions ? quizData.questions.length : 0,
                timeLimit: timeLimit,
                status: quizData.isActive !== false ? 'active' : 'inactive',
                createdAt: quizData.createdAt ? formatDateTime(quizData.createdAt, false) : 'ไม่ระบุ'
            });
        });
        
        const tbody = document.querySelector('#quizzesTable tbody');
        if (tbody) {
            if (quizzes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                            ไม่มีข้อมูลข้อสอบ
                            <br>
                            <small>เริ่มต้นสร้างข้อสอบใหม่เพื่อเพิ่มข้อมูล</small>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = quizzes.map(quiz => `
                    <tr>
                        <td>${quiz.title}</td>
                        <td>${quiz.course}</td>
                        <td>${quiz.questionCount} ข้อ</td>
                        <td>${quiz.timeLimit > 0 ? quiz.timeLimit + ' นาที' : 'ไม่จำกัด'}</td>
                        <td><span class="badge ${quiz.status === 'active' ? 'bg-success' : 'bg-secondary'}">${quiz.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span></td>
                        <td>${quiz.createdAt}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="editQuiz('${quiz.id}')" title="แก้ไขข้อสอบ">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="deleteQuiz('${quiz.id}', '${quiz.title}')" title="ลบข้อสอบ">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ: ' + error.message);
    }
}

// ฟังก์ชันแก้ไขข้อสอบ
// ตัวแปรเพื่อป้องกันการเปิด modal ซ้ำ
let isEditModalOpen = false;
let lastSaveTime = 0;

window.editQuiz = async function(quizId) {
    // ตรวจสอบว่าบันทึกเสร็จใหม่ๆ หรือไม่ (ภายใน 3 วินาที)
    const now = Date.now();
    if (now - lastSaveTime < 3000) {
        return;
    }
    
    // ตรวจสอบว่า modal กำลังเปิดอยู่หรือไม่
    if (isEditModalOpen) {
        return;
    }
    
    try {
        isEditModalOpen = true;
        
        // ดึงข้อมูลข้อสอบจาก Firebase
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        
        if (!quizDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลข้อสอบ');
            isEditModalOpen = false;
            return;
        }
        
        const quizData = quizDoc.data();
        
        // เติมข้อมูลในฟอร์มแก้ไข
        populateEditQuizForm(quizData, quizId);
        
        // เปิด modal แก้ไขข้อสอบ
        const modal = new bootstrap.Modal(document.getElementById('editQuizModal'));
        modal.show();
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ: ' + error.message);
        isEditModalOpen = false;
    }
};

// ฟังก์ชันเติมข้อมูลในฟอร์มแก้ไขข้อสอบ
async function populateEditQuizForm(quizData, quizId) {
    
    try {
        // เก็บ quizId สำหรับการอัปเดต
        document.getElementById('editQuizModal').setAttribute('data-quiz-id', quizId);
        
        // เติมข้อมูลพื้นฐาน
        const editQuizTitle = document.getElementById('editQuizTitle');
        const editQuizDescription = document.getElementById('editQuizDescription');
        const editQuizDuration = document.getElementById('editQuizDuration');
        const editCourseId = document.getElementById('editCourseId');
        const editMaxAttempts = document.getElementById('editMaxAttempts');
        const editPassingScore = document.getElementById('editPassingScore');
        const editAutoSubmit = document.getElementById('editAutoSubmit');
        const editRequireAllAnswers = document.getElementById('editRequireAllAnswers');
        const editQuizStatus = document.getElementById('editQuizStatus');
        
        if (editQuizTitle) editQuizTitle.value = quizData.title || '';
        if (editQuizDescription) editQuizDescription.value = quizData.description || '';
        if (editQuizDuration) editQuizDuration.value = quizData.duration || 30;
        if (editMaxAttempts) editMaxAttempts.value = quizData.maxAttempts || 1;
        if (editPassingScore) editPassingScore.value = quizData.passingScore || 70;
        if (editAutoSubmit) editAutoSubmit.checked = quizData.autoSubmit || false;
        if (editRequireAllAnswers) editRequireAllAnswers.checked = quizData.requireAllAnswers || false;
        
        // ตั้งค่าสถานะ
        if (editQuizStatus) {
            const isActive = quizData.isActive !== false; // ถ้า isActive เป็น undefined หรือ true = เปิดใช้งาน
            editQuizStatus.value = isActive ? 'active' : 'inactive';
        }
        
        // โหลดข้อมูลคอร์สสำหรับ dropdown
        await loadCoursesForEditForm();
        
        // ตั้งค่าคอร์สหลังจากโหลดข้อมูล
        if (editCourseId) {
            editCourseId.value = quizData.courseId || '';
        }
        
        // โหลดคำถาม (ถ้ามี)
        if (quizData.questions && quizData.questions.length > 0) {
            await loadQuestionsForEditForm(quizData.questions);
            // คำนวณคะแนนรวมหลังจากโหลดคำถาม
            setTimeout(() => {
                calculateTotalScoreForEdit();
            }, 100);
        } else {
        }
        
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการเติมข้อมูลฟอร์ม');
    }
}

// ฟังก์ชันโหลดข้อมูลคอร์สสำหรับฟอร์มแก้ไข
async function loadCoursesForEditForm() {
    
    try {
        const editCourseId = document.getElementById('editCourseId');
        if (!editCourseId) {
            return;
        }
        
        // ดึงข้อมูลคอร์สจาก Firebase
        const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const coursesSnapshot = await getDocs(coursesQuery);
        
        // ล้างตัวเลือกเดิม (ยกเว้นตัวเลือกแรก)
        editCourseId.innerHTML = '<option value="">เลือกคอร์ส</option>';
        
        if (coursesSnapshot.empty) {
            editCourseId.innerHTML += '<option value="" disabled>ไม่มีคอร์สในระบบ</option>';
        } else {
            coursesSnapshot.forEach((doc) => {
                const course = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = course.title;
                editCourseId.appendChild(option);
            });
        }
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์ส');
    }
}

// ฟังก์ชันโหลดคำถามสำหรับฟอร์มแก้ไข
async function loadQuestionsForEditForm(questions) {
    
    try {
        // หา container สำหรับคำถามในฟอร์มแก้ไข
        const editQuestionsContainer = document.getElementById('editQuestionsContainer');
        if (!editQuestionsContainer) {
            return;
        }
        
        // ล้างคำถามเดิม
        editQuestionsContainer.innerHTML = '';
        
        // เพิ่มคำถามแต่ละข้อ
        questions.forEach((question, index) => {
            
            if (question.type === 'multiple-choice') {
                addQuestionToEditForm('multiple-choice', question, index + 1);
            } else if (question.type === 'true-false') {
                addQuestionToEditForm('true-false', question, index + 1);
            }
        });
        
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดคำถาม');
    }
}

// ฟังก์ชันเพิ่มคำถามในฟอร์มแก้ไข
function addQuestionToEditForm(type, questionData, questionNumber) {
    
    try {
        const editQuestionsContainer = document.getElementById('editQuestionsContainer');
        if (!editQuestionsContainer) {
            return;
        }
        
        // สร้าง element สำหรับคำถาม
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item card mb-3';
        questionDiv.dataset.questionType = type;
        questionDiv.dataset.questionNumber = questionNumber;
        
        // สร้าง HTML สำหรับคำถาม
        let questionHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามที่ ${questionNumber} - ${type === 'multiple-choice' ? 'แบบตัวเลือก' : 'แบบถูก/ผิด'}</h6>
                <div class="btn-group">
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-plus me-1"></i>เพิ่มคำถาม
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item" href="#" onclick="addQuestionToEdit('multiple-choice')">
                                    <i class="bi bi-list-check me-2"></i>แบบตัวเลือก
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" onclick="addQuestionToEdit('true-false')">
                                    <i class="bi bi-check-square me-2"></i>แบบถูก/ผิด
                                </a>
                            </li>
                        </ul>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-question">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control question-text" rows="2" required>${questionData.text || ''}</textarea>
                </div>
        `;
        
        if (type === 'multiple-choice') {
            questionHTML += `
                <div class="mb-3">
                    <label class="form-label">ตัวเลือก</label>
                    <div class="options-container">
            `;
            
            questionData.options.forEach((option, optionIndex) => {
                const isCorrect = questionData.correctAnswer === optionIndex;
                
                // ตรวจสอบว่า option เป็น string หรือ object
                let optionText = '';
                if (typeof option === 'string') {
                    optionText = option;
                } else if (typeof option === 'object' && option !== null) {
                    optionText = option.text || option.option || option.toString() || '';
                } else {
                    optionText = String(option) || '';
                }
                
                
                questionHTML += `
                    <div class="input-group mb-2">
                        <div class="input-group-text">
                            <input class="form-check-input mt-0 correct-answer" type="radio" name="correct_${questionNumber}" value="${optionIndex}" ${isCorrect ? 'checked' : ''}>
                        </div>
                        <input type="text" class="form-control option-text" value="${optionText}" required>
                        <button type="button" class="btn btn-outline-danger remove-option">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                `;
            });
            
            questionHTML += `
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary add-option">
                        <i class="bi bi-plus me-1"></i>เพิ่มตัวเลือก
                    </button>
                </div>
            `;
        } else if (type === 'true-false') {
            questionHTML += `
                <div class="mb-3">
                    <label class="form-label">เฉลย *</label>
                    <div class="options-container">
                        <div class="form-check">
                            <input class="form-check-input correct-answer" type="radio" name="correct_${questionNumber}" value="true" ${questionData.correctAnswer === 'true' || questionData.correctAnswer === true || questionData.correctAnswer === 0 ? 'checked' : ''}>
                            <label class="form-check-label">
                                <i class="bi bi-check-circle text-success me-1"></i>ถูก (True)
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input correct-answer" type="radio" name="correct_${questionNumber}" value="false" ${questionData.correctAnswer === 'false' || questionData.correctAnswer === false || questionData.correctAnswer === 1 ? 'checked' : ''}>
                            <label class="form-check-label">
                                <i class="bi bi-x-circle text-danger me-1"></i>ผิด (False)
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }
        
        questionHTML += `
                <div class="mb-3">
                    <label class="form-label">คำอธิบายเฉลย</label>
                    <textarea class="form-control explanation" rows="2">${questionData.explanation || ''}</textarea>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">คะแนน *</label>
                        <div class="input-group">
                            <input type="number" class="form-control question-score" value="${questionData.score || 10}" min="1" max="100" step="1" required>
                            <span class="input-group-text">คะแนน</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        questionDiv.innerHTML = questionHTML;
        editQuestionsContainer.appendChild(questionDiv);
        
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการเพิ่มคำถาม');
    }
}

// ฟังก์ชันเพิ่มคำถามใหม่ในฟอร์มแก้ไข (global function)
window.addQuestionToEdit = function(type) {
    
    try {
        const editQuestionsContainer = document.getElementById('editQuestionsContainer');
        if (!editQuestionsContainer) {
            return;
        }
        
        // นับจำนวนคำถามที่มีอยู่
        const existingQuestions = editQuestionsContainer.querySelectorAll('.question-item');
        const questionNumber = existingQuestions.length + 1;
        
        // สร้างคำถามเปล่า
        const emptyQuestion = {
            text: '',
            type: type,
            options: type === 'multiple-choice' ? ['', ''] : [],
            correctAnswer: type === 'multiple-choice' ? 0 : 'true',
            explanation: '',
            score: 10
        };
        
        addQuestionToEditForm(type, emptyQuestion, questionNumber);
        
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการเพิ่มคำถามใหม่');
    }
};

// ฟังก์ชันช่วยปิด modal
function closeEditQuizModal() {
    const editQuizModal = document.getElementById('editQuizModal');
    if (!editQuizModal) {
        return false;
    }
    
    // ตรวจสอบว่า Bootstrap ถูกโหลดแล้วหรือไม่
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
        // ลองปิด modal ด้วยวิธีอื่น
        try {
            editQuizModal.classList.remove('show');
            editQuizModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // ลบ event listeners ที่อาจติดค้าง
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
                modalBackdrop.remove();
            }
            
            isEditModalOpen = false;
            return true;
        } catch (fallbackError) {
            isEditModalOpen = false;
            return false;
        }
    }
    
    try {
        const modal = bootstrap.Modal.getInstance(editQuizModal);
        if (modal) {
            modal.hide();
            isEditModalOpen = false;
            return true;
        } else {
            // ถ้าไม่พบ modal instance ให้ใช้วิธีอื่น
            const bsModal = new bootstrap.Modal(editQuizModal);
            bsModal.hide();
            isEditModalOpen = false;
            return true;
        }
    } catch (error) {
        // ลองปิด modal ด้วยวิธีอื่น
        try {
            editQuizModal.classList.remove('show');
            editQuizModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // ลบ event listeners ที่อาจติดค้าง
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
                modalBackdrop.remove();
            }
            
            isEditModalOpen = false;
            return true;
        } catch (fallbackError) {
            isEditModalOpen = false;
            return false;
        }
    }
    
    // ตรวจสอบว่าปิด modal สำเร็จหรือไม่
    setTimeout(() => {
        if (editQuizModal.classList.contains('show')) {
            // ลองปิด modal อีกครั้ง
            try {
                editQuizModal.classList.remove('show');
                editQuizModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                isEditModalOpen = false;
            } catch (finalError) {
                isEditModalOpen = false;
            }
        } else {
        }
    }, 100);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 500);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 1000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 2000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 3000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 4000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 5000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 6000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 7000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 8000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 9000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 10000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 11000);
    
    // ตรวจสอบอีกครั้งหลังจากรอสักครู่
    setTimeout(() => {
        
        // ถ้า modal ยังเปิดอยู่ ให้รีเซ็ต isEditModalOpen
        if (editQuizModal.classList.contains('show')) {
            isEditModalOpen = false;
        }
    }, 12000);
}

// ฟังก์ชันจัดการการบันทึกข้อมูลแก้ไขข้อสอบ
async function handleEditQuizSave(quizId) {
    
    // ตรวจสอบ quizId
    if (!quizId) {
        showErrorMessage('เกิดข้อผิดพลาด: ไม่พบ ID ของข้อสอบ');
        return;
    }
    
    try {
        // รวบรวมข้อมูลจากฟอร์ม
        const editedData = {
            title: document.getElementById('editQuizTitle').value.trim(),
            description: document.getElementById('editQuizDescription').value.trim(),
            duration: parseInt(document.getElementById('editQuizDuration').value),
            courseId: document.getElementById('editCourseId').value,
            maxAttempts: parseInt(document.getElementById('editMaxAttempts').value),
            passingScore: parseInt(document.getElementById('editPassingScore').value),
            autoSubmit: document.getElementById('editAutoSubmit').checked,
            requireAllAnswers: document.getElementById('editRequireAllAnswers').checked,
            isActive: document.getElementById('editQuizStatus').value === 'active',
            updatedAt: serverTimestamp()
        };
        
        // รวบรวมคำถาม
        const questions = collectQuestionsFromEditForm();
        if (questions.length === 0) {
            showErrorMessage('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
            return;
        }
        
        editedData.questions = questions;
        editedData.totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
        
        
        // ตรวจสอบคะแนนรวม
        if (editedData.totalScore !== 100) {
            if (editedData.totalScore > 100) {
                showErrorMessage(`คะแนนรวมเกิน 100 คะแนน (ปัจจุบัน: ${editedData.totalScore} คะแนน) กรุณาลดคะแนนบางข้อ`);
            } else {
                showErrorMessage(`คะแนนรวมน้อยกว่า 100 คะแนน (ปัจจุบัน: ${editedData.totalScore} คะแนน) กรุณาเพิ่มคะแนนให้ครบ 100 คะแนน`);
            }
            return;
        }
        
        // ตรวจสอบข้อมูลคำถาม
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            if (!question.text || question.text.trim() === '') {
                showErrorMessage(`กรุณากรอกคำถามที่ ${i + 1}`);
                return;
            }
            
            if (question.score <= 0) {
                showErrorMessage(`กรุณากำหนดคะแนนสำหรับคำถามที่ ${i + 1}`);
                return;
            }
            
            if (question.type === 'multiple-choice') {
                if (!question.options || question.options.length < 2) {
                    showErrorMessage(`คำถามที่ ${i + 1} ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก`);
                    return;
                }
                
                let hasValidOptions = false;
                question.options.forEach(option => {
                    if (option.text && option.text.trim()) {
                        hasValidOptions = true;
                    }
                });
                
                if (!hasValidOptions) {
                    showErrorMessage(`กรุณากรอกตัวเลือกสำหรับคำถามที่ ${i + 1}`);
                    return;
                }
                
                if (question.correctAnswer === undefined || question.correctAnswer === null) {
                    showErrorMessage(`กรุณาเลือกคำตอบที่ถูกต้องสำหรับคำถามที่ ${i + 1}`);
                    return;
                }
            } else if (question.type === 'true-false') {
                if (question.correctAnswer === undefined || question.correctAnswer === null) {
                    showErrorMessage(`กรุณาเลือกเฉลย (ถูก/ผิด) สำหรับคำถามที่ ${i + 1}`);
                    return;
                }
            }
        }
        
        // ตรวจสอบข้อมูลพื้นฐาน
        if (!editedData.title) {
            showErrorMessage('กรุณากรอกชื่อข้อสอบ');
            return;
        }
        
        // คำอธิบายข้อสอบไม่บังคับให้กรอก
        // if (!editedData.description) {
        //     showErrorMessage('กรุณากรอกคำอธิบายข้อสอบ');
        //     return;
        // }
        
        if (editedData.duration < 1 || editedData.maxAttempts < 1) {
            showErrorMessage('เวลาทำข้อสอบและจำนวนครั้งที่ทำได้ต้องมากกว่า 0');
            return;
        }
        
        if (editedData.passingScore < 0 || editedData.passingScore > 100) {
            showErrorMessage('คะแนนผ่านต้องอยู่ระหว่าง 0-100');
            return;
        }
        
        
        // แสดงข้อความยืนยันเมื่อคะแนนรวมถูกต้อง
        showSuccessMessage(`✅ คะแนนรวมถูกต้อง (${editedData.totalScore} คะแนน) กำลังบันทึกข้อสอบ...`);
        
        // แสดงสถานะกำลังบันทึก
        const saveBtn = document.getElementById('saveEditQuizBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>กำลังบันทึก...';
        saveBtn.disabled = true;
        
        // ตรวจสอบ db object
        if (!db) {
            throw new Error('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
        }
        
        // อัปเดตข้อมูลใน Firebase
        
        try {
            await updateDoc(doc(db, 'quizzes', quizId), editedData);
        } catch (firebaseError) {
            throw new Error(`เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ${firebaseError.message}`);
        }
        
        // บันทึกเวลาที่บันทึกสำเร็จ
        lastSaveTime = Date.now();
        
        // ปิด modal
        const modalClosed = closeEditQuizModal();
        if (!modalClosed) {
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                closeEditQuizModal();
            }, 500);
        }
        
        showSuccessMessage('บันทึกการแก้ไขข้อสอบสำเร็จ');
        
        // รอสักครู่แล้วโหลดข้อมูลใหม่
        setTimeout(() => {
            loadQuizzes();
            
            // ตรวจสอบอีกครั้งว่า modal ปิดแล้วหรือไม่
            const editQuizModal = document.getElementById('editQuizModal');
            if (editQuizModal && editQuizModal.classList.contains('show')) {
                closeEditQuizModal();
                
                // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                setTimeout(() => {
                    if (editQuizModal.classList.contains('show')) {
                        closeEditQuizModal();
                    }
                }, 1000);
            }
        }, 500);
        
        // ตรวจสอบอีกครั้งหลังจากรอสักครู่
        setTimeout(() => {
            const editQuizModal = document.getElementById('editQuizModal');
            if (editQuizModal && editQuizModal.classList.contains('show')) {
                closeEditQuizModal();
                
                // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                setTimeout(() => {
                    if (editQuizModal.classList.contains('show')) {
                        closeEditQuizModal();
                    }
                }, 1000);
            }
        }, 3000);
        
        // ตรวจสอบอีกครั้งหลังจากรอสักครู่
        setTimeout(() => {
            const editQuizModal = document.getElementById('editQuizModal');
            if (editQuizModal && editQuizModal.classList.contains('show')) {
                closeEditQuizModal();
                
                // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                setTimeout(() => {
                    if (editQuizModal.classList.contains('show')) {
                        closeEditQuizModal();
                    }
                }, 1000);
                
                // ลองปิด modal อีกครั้งหลังจากรอสักครู่
                setTimeout(() => {
                    if (editQuizModal.classList.contains('show')) {
                        closeEditQuizModal();
                    }
                }, 2000);
            }
        }, 5000);
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกการแก้ไข: ' + error.message);
    } finally {
        // รีเซ็ตสถานะตัวแปร
        isEditModalOpen = false;
        
        // รีเซ็ตสถานะปุ่ม
        const saveBtn = document.getElementById('saveEditQuizBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>บันทึกการแก้ไข';
            saveBtn.disabled = false;
        }
        
        // ตรวจสอบและปิด modal ถ้ายังเปิดอยู่
        const editQuizModal = document.getElementById('editQuizModal');
        if (editQuizModal && editQuizModal.classList.contains('show')) {
            closeEditQuizModal();
            
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                if (editQuizModal.classList.contains('show')) {
                    closeEditQuizModal();
                }
            }, 1000);
            
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                if (editQuizModal.classList.contains('show')) {
                    closeEditQuizModal();
                }
            }, 2000);
            
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                if (editQuizModal.classList.contains('show')) {
                    closeEditQuizModal();
                }
            }, 3000);
            
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                if (editQuizModal.classList.contains('show')) {
                    closeEditQuizModal();
                }
            }, 4000);
            
            // ลองปิด modal อีกครั้งหลังจากรอสักครู่
            setTimeout(() => {
                if (editQuizModal.classList.contains('show')) {
                    closeEditQuizModal();
                }
            }, 5000);
        }
    }
}

// ฟังก์ชันรวบรวมคำถามจากฟอร์มแก้ไข
function collectQuestionsFromEditForm() {
    
    const questions = [];
    const editQuestionsContainer = document.getElementById('editQuestionsContainer');
    
    if (!editQuestionsContainer) {
        return questions;
    }
    
    const questionItems = editQuestionsContainer.querySelectorAll('.question-item');
    
    questionItems.forEach((questionItem, index) => {
        try {
            const questionType = questionItem.dataset.questionType;
            const questionText = questionItem.querySelector('.question-text').value.trim();
            const explanation = questionItem.querySelector('.explanation').value.trim();
            const scoreInput = questionItem.querySelector('.question-score');
            const score = parseInt(scoreInput.value) || 0;
            
                type: questionType,
                text: questionText,
                score: score,
                scoreInputValue: scoreInput.value
            });
            
            if (!questionText) {
                return;
            }
            
            const question = {
                text: questionText,
                type: questionType,
                explanation: explanation,
                score: score
            };
            
            if (questionType === 'multiple-choice') {
                const options = [];
                const optionInputs = questionItem.querySelectorAll('.option-text');
                const correctAnswer = questionItem.querySelector('.correct-answer:checked');
                
                optionInputs.forEach((input, optionIndex) => {
                    const optionText = input.value.trim();
                    if (optionText) {
                        options.push(optionText);
                    }
                });
                
                if (options.length >= 2 && correctAnswer) {
                    question.options = options;
                    question.correctAnswer = parseInt(correctAnswer.value);
                    questions.push(question);
                } else {
                }
                
            } else if (questionType === 'true-false') {
                const correctAnswer = questionItem.querySelector('.correct-answer:checked');
                
                if (correctAnswer) {
                    question.correctAnswer = correctAnswer.value;
                    questions.push(question);
                } else {
                }
            }
            
        } catch (error) {
        }
    });
    
    return questions;
}

// ฟังก์ชันลบข้อสอบ
window.deleteQuiz = function(quizId, quizTitle) {
    
    // ตรวจสอบว่ามี modal หรือไม่
    const deleteModal = document.getElementById('deleteQuizModal');
    if (!deleteModal) {
        showErrorMessage('ไม่พบ modal สำหรับยืนยันการลบ');
        return;
    }
    
    // เติมข้อมูลใน modal ยืนยันการลบ
    const modalBody = document.querySelector('#deleteQuizModal .modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <p>คุณแน่ใจหรือไม่ที่จะลบข้อสอบ <strong>"${quizTitle}"</strong>?</p>
            <p class="text-danger small">
                <i class="bi bi-info-circle me-1"></i>
                การดำเนินการนี้ไม่สามารถยกเลิกได้ และจะลบข้อมูลที่เกี่ยวข้องทั้งหมด
            </p>
        `;
    }
    
    // เปิด modal ยืนยันการลบ
    const modal = new bootstrap.Modal(deleteModal);
    modal.show();
    
    // ตั้งค่า event listener สำหรับปุ่มยืนยันการลบ
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async function() {
            
            try {
                // แสดงสถานะกำลังลบ
                confirmDeleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>กำลังลบ...';
                confirmDeleteBtn.disabled = true;
                
                // ลบข้อสอบจาก Firebase
                await deleteDoc(doc(db, 'quizzes', quizId));
                
                modal.hide();
                showSuccessMessage('ลบข้อสอบสำเร็จ');
                loadQuizzes(); // โหลดข้อมูลใหม่
                
            } catch (error) {
                showErrorMessage('เกิดข้อผิดพลาดในการลบข้อสอบ: ' + error.message);
            } finally {
                // รีเซ็ตสถานะปุ่ม
                confirmDeleteBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>ยืนยันการลบ';
                confirmDeleteBtn.disabled = false;
            }
        };
    } else {
        showErrorMessage('ไม่พบปุ่มยืนยันการลบ');
    }
};

// ฟังก์ชัน Export ข้อสอบ
window.exportQuizzes = function() {
    // สร้างข้อมูลสำหรับ export
    const data = {
        timestamp: new Date().toISOString(),
        quizzes: 'รายการข้อสอบทั้งหมด'
    };
    
    // สร้างไฟล์ JSON และดาวน์โหลด
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizzes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessMessage('ส่งออกข้อมูลสำเร็จ');
};

// ฟังก์ชัน showSuccessMessage และ showErrorMessage ถูก import มาจาก auth.js แล้ว

// ฟังก์ชันรีเฟรชข้อมูล
async function refreshData() {
    try {
        // รีเฟรชข้อมูลข้อสอบ
        await loadQuizzes();
        
        // รีเฟรชข้อมูลเนื้อหา (สำหรับ admin)
        await loadContent();
        
        showSuccessMessage('รีเฟรชข้อมูลสำเร็จ');
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
    }
}

// เพิ่มฟังก์ชัน refreshData ให้กับ window object
window.refreshData = refreshData;

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

// ฟังก์ชันเริ่มต้นฟอร์มสร้างข้อสอบ
function initializeQuizForm() {
    
    // ตรวจสอบ elements ที่จำเป็น
    const questionsContainer = document.getElementById('questionsContainer');
    const multipleChoiceTemplate = document.getElementById('multipleChoiceTemplate');
    const trueFalseTemplate = document.getElementById('trueFalseTemplate');
    
        questionsContainer: !!questionsContainer,
        multipleChoiceTemplate: !!multipleChoiceTemplate,
        trueFalseTemplate: !!trueFalseTemplate
    });
    
    // เพิ่มคำถามแรก
    addQuestion('multiple-choice');
    
    // ตั้งค่าเริ่มต้น
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle) {
        quizTitle.focus();
    }
    
    // ตั้งค่าสถานะเริ่มต้นเป็นเปิดใช้งาน
    const quizStatus = document.getElementById('quizStatus');
    if (quizStatus) {
        quizStatus.value = 'active';
    }
    
    // เริ่มต้นการคำนวณคะแนนรวม
    calculateTotalScore();
    
}

// ฟังก์ชันรีเซ็ตฟอร์มสร้างข้อสอบ
function resetQuizForm() {
    const form = document.getElementById('createQuizForm');
    if (form) {
        form.reset();
    }
    
    // ลบคำถามทั้งหมด
    const questionsContainer = document.getElementById('questionsContainer');
    if (questionsContainer) {
        questionsContainer.innerHTML = '';
    }
    
    // รีเซ็ตตัวแปร
    questionCounter = 0;
    
    // รีเซ็ตคะแนนรวม
    calculateTotalScore();
}

// เพิ่มคำถามใหม่ (Global function สำหรับ onclick)
window.addQuestion = function(type) {
    
    const questionsContainer = document.getElementById('questionsContainer');
    let template;
    
    // เลือกเทมเพลตตามประเภทคำถาม
    if (type === 'true-false') {
        template = document.getElementById('trueFalseTemplate');
    } else {
        template = document.getElementById('multipleChoiceTemplate');
    }
    
    if (!template) {
        showErrorMessage(`ไม่พบเทมเพลตสำหรับคำถามประเภท: ${type}`);
        return;
    }
    
    if (!questionsContainer) {
        showErrorMessage('ไม่พบ container สำหรับคำถาม');
        return;
    }
    
    if (template && questionsContainer) {
        const clone = template.content.cloneNode(true);
        const questionItem = clone.querySelector('.question-item');
        
        // กำหนด ID ให้กับคำถาม
        questionCounter++;
        const questionId = questionCounter;
        questionItem.dataset.questionId = questionId;
        questionItem.dataset.questionType = type;
        
        // อัปเดต ID ของ options-container เพื่อไม่ให้ซ้ำ
        const optionsContainer = questionItem.querySelector('.options-container');
        if (optionsContainer) {
            optionsContainer.id = `options-container-${questionId}`;
        }
        
        // อัปเดต name ของ radio buttons
        const radioButtons = questionItem.querySelectorAll('.correct-answer');
        radioButtons.forEach((radio, index) => {
            radio.name = `correct_${questionId}`;
            
            // สำหรับคำถามแบบถูก/ผิด ให้ใช้ค่า true/false
            if (type === 'true-false') {
                radio.value = radio.value; // คงค่าเดิม (true/false)
            } else {
                radio.value = index; // สำหรับ multiple choice ใช้ index
            }
        });
        
        // อัปเดต ID ของ elements เพื่อป้องกันการซ้ำ
        const elementsWithId = questionItem.querySelectorAll('[id]');
        elementsWithId.forEach(element => {
            const originalId = element.id;
            element.id = `${originalId}_${questionCounter}`;
            
            // อัปเดต for attribute ของ label ที่เกี่ยวข้อง
            const associatedLabel = questionItem.querySelector(`label[for="${originalId}"]`);
            if (associatedLabel) {
                associatedLabel.setAttribute('for', `${originalId}_${questionCounter}`);
            }
        });
        
        questionsContainer.appendChild(clone);
        
        // เริ่มต้นการจัดการคะแนนสำหรับคำถามใหม่
        const newQuestionItem = questionsContainer.lastElementChild;
        if (newQuestionItem) {
            updateQuestionScoreStatus(newQuestionItem);
            calculateTotalScore();
        }
        
    } else {
    }
};

// ลบคำถาม
function removeQuestion(questionElement) {
    if (document.querySelectorAll('.question-item').length > 1) {
        questionElement.remove();
        // อัปเดตคะแนนรวมหลังจากลบคำถาม
        calculateTotalScore();
    } else {
        showErrorMessage('ต้องมีคำถามอย่างน้อย 1 ข้อ');
    }
}

// เพิ่มตัวเลือก
function addOption(optionsContainer) {
    
    if (!optionsContainer) {
        return;
    }
    
    const questionItem = optionsContainer.closest('.question-item');
    if (!questionItem) {
        return;
    }
    
    const questionId = questionItem.dataset.questionId;
    const questionType = questionItem.dataset.questionType;
    
    // ตรวจสอบว่าเป็นคำถามแบบตัวเลือกหรือไม่
    if (questionType === 'true-false') {
        showErrorMessage('คำถามแบบถูก/ผิด ไม่สามารถเพิ่มตัวเลือกได้');
        return;
    }
    
    const optionCount = optionsContainer.children.length;
    
    const newOption = document.createElement('div');
    newOption.className = 'input-group mb-2';
    newOption.innerHTML = `
        <div class="input-group-text">
            <input class="form-check-input mt-0 correct-answer" type="radio" name="correct_${questionId}" value="${optionCount}">
        </div>
        <input type="text" class="form-control option-text" placeholder="ตัวเลือกที่ ${optionCount + 1}" required>
        <button type="button" class="btn btn-outline-danger remove-option">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    optionsContainer.appendChild(newOption);
}

// ลบตัวเลือก
function removeOption(optionElement) {
    
    if (!optionElement) {
        return;
    }
    
    const optionsContainer = optionElement.parentElement;
    if (!optionsContainer) {
        return;
    }
    
    const questionItem = optionsContainer.closest('.question-item');
    if (!questionItem) {
        return;
    }
    
    const questionType = questionItem.dataset.questionType;
    
    // ตรวจสอบว่าเป็นคำถามแบบตัวเลือกหรือไม่
    if (questionType === 'true-false') {
        showErrorMessage('คำถามแบบถูก/ผิด ไม่สามารถลบตัวเลือกได้');
        return;
    }
    
    if (optionsContainer.children.length > 2) {
        optionElement.remove();
        // อัปเดตค่า value ของ radio buttons
        const radioButtons = optionsContainer.querySelectorAll('.correct-answer');
        radioButtons.forEach((radio, index) => {
            radio.value = index;
        });
    } else {
        showErrorMessage('ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก');
    }
}

// จัดการการสร้างข้อสอบ
async function handleCreateQuiz(e) {
    e.preventDefault();
    
    
    try {
        // ตรวจสอบความถูกต้องของข้อมูล
        if (!validateQuizForm()) {
            return;
        }
        
        
        // แสดงสถานะกำลังโหลด
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>กำลังบันทึก...';
        submitBtn.disabled = true;
        
        // รวบรวมข้อมูลข้อสอบ
        const quizData = collectQuizData();
        
        // บันทึกข้อมูลลง Firestore
        const quizRef = await addDoc(collection(db, 'quizzes'), {
            ...quizData,
            instructorId: getCurrentUser().uid,
            instructorName: getCurrentUser().name,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
            totalAttempts: 0,
            averageScore: 0
        });
        
        showSuccessMessage('บันทึกข้อสอบสำเร็จ!');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createQuizModal'));
        modal.hide();
        
        // โหลดข้อมูลใหม่
        loadQuizzes();
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อสอบ: ' + error.message);
    } finally {
        // รีเซ็ตสถานะปุ่ม
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>บันทึกข้อสอบ';
        submitBtn.disabled = false;
    }
}

// ตรวจสอบความถูกต้องของฟอร์ม
function validateQuizForm() {
    
    const title = document.getElementById('quizTitle').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const duration = document.getElementById('quizDuration').value;
    const questions = document.querySelectorAll('.question-item');
    
        title: title,
        description: description,
        duration: duration,
        questionCount: questions.length
    });
    
    if (!title) {
        showErrorMessage('กรุณากรอกชื่อข้อสอบ');
        document.getElementById('quizTitle').focus();
        return false;
    }
    
    // คำอธิบายข้อสอบไม่บังคับให้กรอก
    // if (!description) {
    //     showErrorMessage('กรุณากรอกคำอธิบายข้อสอบ');
    //     document.getElementById('quizDescription').focus();
    //     return false;
    // }
    
    if (!duration || duration <= 0) {
        showErrorMessage('กรุณากำหนดเวลาทำข้อสอบ');
        document.getElementById('quizDuration').focus();
        return false;
    }
    
    if (questions.length === 0) {
        showErrorMessage('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
        return false;
    }
    
    // ตรวจสอบแต่ละคำถาม
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionType = question.dataset.questionType;
        const questionText = question.querySelector('.question-text').value.trim();
        const correctAnswer = question.querySelector('.correct-answer:checked');
        
        if (!questionText) {
            showErrorMessage(`กรุณากรอกคำถามที่ ${i + 1}`);
            question.querySelector('.question-text').focus();
            return false;
        }
        
        // ตรวจสอบตามประเภทคำถาม
        if (questionType === 'true-false') {
            // สำหรับคำถามแบบถูก/ผิด
            if (!correctAnswer) {
                showErrorMessage(`กรุณาเลือกเฉลย (ถูก/ผิด) สำหรับคำถามที่ ${i + 1}`);
                return false;
            }
        } else {
            // สำหรับคำถามแบบตัวเลือก
            const options = question.querySelectorAll('.option-text');
            
            if (options.length < 2) {
                showErrorMessage(`คำถามที่ ${i + 1} ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก`);
                return false;
            }
            
            let hasValidOptions = false;
            options.forEach(option => {
                if (option.value.trim()) {
                    hasValidOptions = true;
                }
            });
            
            if (!hasValidOptions) {
                showErrorMessage(`กรุณากรอกตัวเลือกสำหรับคำถามที่ ${i + 1}`);
                return false;
            }
            
            if (!correctAnswer) {
                showErrorMessage(`กรุณาเลือกคำตอบที่ถูกต้องสำหรับคำถามที่ ${i + 1}`);
                return false;
            }
        }
        
        // ตรวจสอบคะแนนของแต่ละข้อ
        const score = parseFloat(question.querySelector('.question-score').value) || 0;
        if (score <= 0) {
            showErrorMessage(`กรุณากำหนดคะแนนสำหรับคำถามที่ ${i + 1}`);
            question.querySelector('.question-score').focus();
            return false;
        }
    }
    
    // ตรวจสอบคะแนนรวม
    const totalScore = calculateTotalScore();
    if (totalScore !== 100) {
        if (totalScore > 100) {
            showErrorMessage(`คะแนนรวมเกิน 100 คะแนน (ปัจจุบัน: ${totalScore} คะแนน) กรุณาลดคะแนนบางข้อ`);
        } else {
            showErrorMessage(`คะแนนรวมน้อยกว่า 100 คะแนน (ปัจจุบัน: ${totalScore} คะแนน) กรุณาเพิ่มคะแนนให้ครบ 100 คะแนน`);
        }
        return false;
    }
    
    return true;
}

// รวบรวมข้อมูลข้อสอบ
function collectQuizData() {
    
    const title = document.getElementById('quizTitle').value.trim();
    const description = document.getElementById('quizDescription').value.trim();
    const duration = parseInt(document.getElementById('quizDuration').value);
    const courseId = document.getElementById('courseId').value;
    const courseSelect = document.getElementById('courseId');
    const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || 'ไม่ระบุ';
    const maxAttempts = parseInt(document.getElementById('maxAttempts').value) || 1;
    const passingScore = parseInt(document.getElementById('passingScore').value) || 70;
    const autoSubmit = document.getElementById('autoSubmit').checked;
    const requireAllAnswers = document.getElementById('requireAllAnswers').checked;
    const quizStatus = document.getElementById('quizStatus').value;
    
        title: title,
        description: description,
        duration: duration,
        courseId: courseId,
        courseName: courseName,
        maxAttempts: maxAttempts,
        passingScore: passingScore,
        autoSubmit: autoSubmit,
        requireAllAnswers: requireAllAnswers
    });
    
    const questions = [];
    document.querySelectorAll('.question-item').forEach((questionElement, index) => {
        const questionType = questionElement.dataset.questionType || 'multiple-choice';
        const questionText = questionElement.querySelector('.question-text').value.trim();
        const explanation = questionElement.querySelector('.explanation').value.trim();
        const score = parseFloat(questionElement.querySelector('.question-score').value) || 1;
        
        let options = [];
        let correctAnswer;
        
        if (questionType === 'true-false') {
            // สำหรับคำถามแบบถูก/ผิด
            options = [
                { id: 0, text: 'ถูก (True)' },
                { id: 1, text: 'ผิด (False)' }
            ];
            
            const checkedAnswer = questionElement.querySelector('.correct-answer:checked');
            correctAnswer = checkedAnswer.value === 'true' ? 0 : 1;
        } else {
            // สำหรับคำถามแบบตัวเลือก
            questionElement.querySelectorAll('.option-text').forEach((optionInput, optionIndex) => {
                options.push({
                    id: optionIndex,
                    text: optionInput.value.trim()
                });
            });
            
            correctAnswer = parseInt(questionElement.querySelector('.correct-answer:checked').value);
        }
        
        questions.push({
            id: index + 1,
            type: questionType,
            text: questionText,
            options: options,
            correctAnswer: correctAnswer,
            explanation: explanation,
            score: score
        });
    });
    
    return {
        title: title,
        description: description,
        duration: duration,
        courseId: courseId,
        courseName: courseName,
        maxAttempts: maxAttempts,
        passingScore: passingScore,
        autoSubmit: autoSubmit,
        requireAllAnswers: requireAllAnswers,
        isActive: quizStatus === 'active',
        questions: questions,
        totalQuestions: questions.length,
        totalScore: questions.reduce((sum, q) => sum + q.score, 0)
    };
}

// ดูตัวอย่างข้อสอบ
function previewQuiz() {
    
    if (!validateQuizForm()) {
        return;
    }
    
    
    const quizData = collectQuizData();
    
    // แสดงข้อมูลใน modal
    showQuizPreview(quizData);
}

// แสดงตัวอย่างข้อสอบ
function showQuizPreview(quizData) {
    
    const modalElement = document.getElementById('quizPreviewModal');
    const modalBody = document.getElementById('quizPreviewModalBody');
    
    if (!modalElement) {
        showErrorMessage('ไม่พบ modal แสดงตัวอย่างข้อสอบ');
        return;
    }
    
    if (!modalBody) {
        showErrorMessage('ไม่พบ modal body สำหรับแสดงตัวอย่างข้อสอบ');
        return;
    }
    
    
    const modal = new bootstrap.Modal(modalElement);
    
    modalBody.innerHTML = `
            <div class="mb-3">
                <h6>ชื่อข้อสอบ:</h6>
                <p>${quizData.title}</p>
            </div>
            <div class="mb-3">
                <h6>คำอธิบาย:</h6>
                <p>${quizData.description}</p>
            </div>
            <div class="mb-3">
                <h6>คอร์สที่เกี่ยวข้อง:</h6>
                <p>${quizData.courseName}</p>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <h6>จำนวนคำถาม:</h6>
                    <p>${quizData.totalQuestions} ข้อ</p>
                </div>
                <div class="col-md-4">
                    <h6>เวลาทำ:</h6>
                    <p>${quizData.duration} นาที</p>
                </div>
                <div class="col-md-4">
                    <h6>คะแนนรวม:</h6>
                    <p><span class="badge bg-success">${quizData.totalScore} คะแนน</span></p>
                </div>
            </div>
            
            <hr>
            
            <div class="mb-3">
                <h6>รายละเอียดคำถาม:</h6>
                ${quizData.questions.map((question, index) => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="mb-0">ข้อที่ ${index + 1}</h6>
                                    <small class="text-muted">
                                        ${question.type === 'true-false' ? 
                                            '<i class="bi bi-check-square me-1"></i>แบบถูก/ผิด' : 
                                            '<i class="bi bi-list-check me-1"></i>แบบตัวเลือก'
                                        }
                                    </small>
                                </div>
                                <span class="badge bg-primary">${question.score} คะแนน</span>
                            </div>
                            <p class="mb-2">${question.text}</p>
                            <div class="ms-3">
                                ${question.options.map((option, optionIndex) => `
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" disabled ${optionIndex === question.correctAnswer ? 'checked' : ''}>
                                        <label class="form-check-label ${optionIndex === question.correctAnswer ? 'text-success fw-bold' : ''}">
                                            ${question.type === 'true-false' && optionIndex === 0 ? 
                                                '<i class="bi bi-check-circle text-success me-1"></i>' : 
                                                question.type === 'true-false' && optionIndex === 1 ? 
                                                '<i class="bi bi-x-circle text-danger me-1"></i>' : ''
                                            }
                                            ${option.text}
                                            ${optionIndex === question.correctAnswer ? ' <i class="bi bi-check-circle text-success"></i>' : ''}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                            ${question.explanation ? `<small class="text-muted"><i class="bi bi-lightbulb me-1"></i>${question.explanation}</small>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    
    modal.show();
}

// ==================== ฟังก์ชันจัดการเนื้อหา ====================

// โหลดข้อมูลเนื้อหา
async function loadContent() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }

        const contentRef = collection(db, 'content');
        let q;
        
        // ถ้าเป็น admin ให้ดูเนื้อหาทั้งหมด ถ้าเป็น instructor ให้ดูเฉพาะของตัวเอง
        if (currentUser.role === 'admin') {
            q = query(contentRef, orderBy('createdAt', 'desc'));
        } else {
            // ใช้ where clause ก่อน แล้วค่อยเรียงลำดับใน JavaScript
            q = query(contentRef, where('instructorId', '==', currentUser.uid));
        }
        
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
        
        // เรียงลำดับตามวันที่สร้าง (ใหม่ไปเก่า)
        contentArray.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
        });

        // โหลดข้อมูลคอร์สเพื่อแสดงชื่อ
        const coursesRef = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesRef);
        const coursesMap = {};
        coursesSnapshot.forEach((doc) => {
            coursesMap[doc.id] = doc.data().title;
        });

        contentArray.forEach((content) => {
            
            const row = document.createElement('tr');
            row.setAttribute('data-content-id', content.id);
            
            const typeIcon = getContentTypeIcon(content.type);
            const typeText = getContentTypeText(content.type);
            const courseName = content.courseName || coursesMap[content.courseId] || 'ไม่ระบุ';
            const isRequired = content.isRequired ? '<span class="badge bg-warning">ต้องศึกษา</span>' : '<span class="badge bg-secondary">ไม่บังคับ</span>';
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="bg-primary rounded p-2 me-3">
                            <i class="${typeIcon} text-white"></i>
                        </div>
                        <div>
                            <h6 class="mb-0">${content.title}</h6>
                            ${isRequired}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${typeText}</span>
                </td>
                <td>
                    <a href="${content.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i>เปิดลิงก์
                    </a>
                </td>
                <td class="table-cell-truncate" title="${content.description || '-'}">${truncateText(content.description || '-', 50)}</td>
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

        // เริ่มต้น DataTable สำหรับ content
        if (window.contentDataTable) {
            window.contentDataTable.destroy();
        }
        
        window.contentDataTable = $('#contentTable').DataTable({
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/th.json'
            },
            pageLength: 10,
            order: [[5, 'desc']], // เรียงตามวันที่สร้าง
            responsive: false // ปิดการใช้งาน DataTables responsive มาตรฐาน
        });

    } catch (error) {
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
        'link': 'ลิงก์เว็บไซต์',
        'pdf': 'ไฟล์ PDF',
        'image': 'รูปภาพ'
    };
    return texts[type] || 'ไม่ระบุ';
}

// โหลดข้อมูลคอร์สสำหรับ dropdown
async function loadCoursesForContent() {
    try {
        const coursesRef = collection(db, 'courses');
        const querySnapshot = await getDocs(coursesRef);
        
        const courseSelects = ['contentCourse', 'editContentCourse'];
        
        courseSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // รักษาตัวเลือกแรก
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }
                
                querySnapshot.forEach((doc) => {
                    const course = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = course.title;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
    }
}

// โหลดข้อมูลคอร์สสำหรับ dropdown ใน modal สร้างข้อสอบ
async function loadCoursesForQuiz() {
    try {
        
        const coursesRef = collection(db, 'courses');
        const querySnapshot = await getDocs(coursesRef);
        
        
        if (querySnapshot.size === 0) {
        }
        
        const courseSelect = document.getElementById('courseId');
        if (courseSelect) {
            
            // รักษาตัวเลือกแรก
            const firstOption = courseSelect.querySelector('option');
            courseSelect.innerHTML = '';
            if (firstOption) {
                courseSelect.appendChild(firstOption);
            }
            
            let courseCount = 0;
            querySnapshot.forEach((doc) => {
                const course = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = course.title;
                courseSelect.appendChild(option);
                courseCount++;
            });
            
            
            if (courseCount === 0) {
                // เพิ่มตัวเลือก "ไม่มีคอร์ส" ถ้าไม่มีคอร์สในฐานข้อมูล
                const noCourseOption = document.createElement('option');
                noCourseOption.value = '';
                noCourseOption.textContent = 'ไม่มีคอร์สในระบบ';
                noCourseOption.disabled = true;
                courseSelect.appendChild(noCourseOption);
            }
        } else {
        }
    } catch (error) {
    }
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

        const courseId = document.getElementById('contentCourse').value;
        const courseSelect = document.getElementById('contentCourse');
        const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || 'ไม่ระบุ';

        const formData = {
            title: document.getElementById('contentTitle').value.trim(),
            type: document.getElementById('contentType').value,
            url: document.getElementById('contentUrl').value.trim(),
            description: document.getElementById('contentDescription').value.trim(),
            courseId: courseId,
            courseName: courseName,
            duration: parseInt(document.getElementById('contentDuration').value) || 0,
            difficulty: document.getElementById('contentDifficulty').value,
            isRequired: document.getElementById('contentIsRequired').checked,
            instructorId: currentUser.uid,
            instructorName: currentUser.displayName || currentUser.email,
            createdAt: serverTimestamp()
        };

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!formData.title || !formData.type || !formData.url) {
            showErrorMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }


        // เพิ่มข้อมูลลง Firestore
        const contentRef = collection(db, 'content');
        const docRef = await addDoc(contentRef, formData);


        // เพิ่มเนื้อหาลงในตารางทันที
        addContentToTable(docRef.id, formData);

        showSuccessMessage('เพิ่มเนื้อหาเรียบร้อยแล้ว');
        
        // ปิด modal และรีเซ็ตฟอร์ม
        const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
        modal.hide();
        document.getElementById('addContentForm').reset();
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการเพิ่มเนื้อหา');
    }
}

// จัดการการแก้ไขเนื้อหา
async function handleEditContent(e) {
    e.preventDefault();
    
    try {
        const contentId = document.getElementById('editContentId').value;
        if (!contentId) {
            showErrorMessage('ไม่พบข้อมูลเนื้อหาที่ต้องการแก้ไข');
            return;
        }

        const courseId = document.getElementById('editContentCourse').value;
        const courseSelect = document.getElementById('editContentCourse');
        const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || 'ไม่ระบุ';

        const formData = {
            title: document.getElementById('editContentTitle').value.trim(),
            type: document.getElementById('editContentType').value,
            url: document.getElementById('editContentUrl').value.trim(),
            description: document.getElementById('editContentDescription').value.trim(),
            courseId: courseId,
            courseName: courseName,
            duration: parseInt(document.getElementById('editContentDuration').value) || 0,
            difficulty: document.getElementById('editContentDifficulty').value,
            isRequired: document.getElementById('editContentIsRequired').checked,
            updatedAt: serverTimestamp()
        };

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!formData.title || !formData.type || !formData.url) {
            showErrorMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }


        // อัปเดตข้อมูลใน Firestore
        const contentRef = doc(db, 'content', contentId);
        await updateDoc(contentRef, formData);


        // อัปเดตข้อมูลในตารางทันที
        updateContentInTable(contentId, formData);

        showSuccessMessage('แก้ไขเนื้อหาเรียบร้อยแล้ว');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editContentModal'));
        modal.hide();
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการแก้ไขเนื้อหา');
    }
}

// แก้ไขเนื้อหา
async function editContent(contentId) {
    try {
        
        const contentRef = doc(db, 'content', contentId);
        const contentDoc = await getDoc(contentRef);
        
        if (!contentDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลเนื้อหา');
            return;
        }

        const content = contentDoc.data();
        
        // กรอกข้อมูลในฟอร์มแก้ไข
        document.getElementById('editContentId').value = contentId;
        document.getElementById('editContentTitle').value = content.title;
        document.getElementById('editContentType').value = content.type;
        document.getElementById('editContentUrl').value = content.url;
        document.getElementById('editContentDescription').value = content.description || '';
        document.getElementById('editContentCourse').value = content.courseId || '';
        document.getElementById('editContentDuration').value = content.duration || 0;
        document.getElementById('editContentDifficulty').value = content.difficulty || 'intermediate';
        document.getElementById('editContentIsRequired').checked = content.isRequired || false;
        
        
        // เปิด modal แก้ไข
        const modal = new bootstrap.Modal(document.getElementById('editContentModal'));
        modal.show();
        
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลเนื้อหา');
    }
}

// ลบเนื้อหา
async function deleteContent(contentId, contentTitle) {
    try {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบเนื้อหา "${contentTitle}"?`)) {
            return;
        }


        const contentRef = doc(db, 'content', contentId);
        await deleteDoc(contentRef);

        // ลบเนื้อหาออกจากตารางทันที
        removeContentFromTable(contentId);

        showSuccessMessage('ลบเนื้อหาเรียบร้อยแล้ว');
        
    } catch (error) {
        showErrorMessage('เกิดข้อผิดพลาดในการลบเนื้อหา');
    }
}

// ฟังก์ชันเพิ่มเนื้อหาใหม่ลงในตารางทันที
function addContentToTable(contentId, contentData) {
    
    const tableBody = document.querySelector('#contentTable tbody');
    
    if (!tableBody) {
        return;
    }
    
    // สร้างแถวใหม่
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-content-id', contentId);
    
    // เตรียมข้อมูลสำหรับแสดงผล
    const typeText = getContentTypeText(contentData.type);
    const difficultyText = getDifficultyText(contentData.difficulty);
    const requiredBadge = contentData.isRequired ? 
        '<span class="badge bg-warning">จำเป็น</span>' : 
        '<span class="badge bg-secondary">ไม่จำเป็น</span>';
    
            const createdAt = formatDateTime(new Date(), false);
    
    // สร้าง HTML สำหรับแถวใหม่
    newRow.innerHTML = `
        <td>
            <div class="d-flex align-items-center">
                <div class="bg-primary rounded p-2 me-3">
                    <i class="bi bi-file-earmark-text text-white"></i>
                </div>
                <div>
                    <h6 class="mb-0">${contentData.title}</h6>
                    <small class="text-muted">${truncateText(contentData.description, 50)}</small>
                </div>
            </div>
        </td>
        <td>
            <span class="badge bg-secondary">${typeText}</span>
        </td>
        <td>
            <a href="${contentData.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-box-arrow-up-right me-1"></i>เปิดลิงก์
            </a>
        </td>
        <td class="table-cell-truncate" title="${contentData.description || '-'}">${truncateText(contentData.description || '-', 50)}</td>
        <td>${contentData.courseName || 'ไม่ระบุ'}</td>
        <td>${createdAt}</td>
        <td>
            <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-primary edit-content" data-id="${contentId}" data-title="${contentData.title}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-outline-danger delete-content" data-id="${contentId}" data-title="${contentData.title}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    // เพิ่มแถวใหม่ไว้ที่ต้นตาราง
    if (tableBody.firstChild) {
        tableBody.insertBefore(newRow, tableBody.firstChild);
    } else {
        tableBody.appendChild(newRow);
    }
    
}

// ฟังก์ชันอัปเดตเนื้อหาในตารางทันที
function updateContentInTable(contentId, contentData) {
    
    // หาแถวในตารางที่ต้องการอัปเดต
    const tableRow = document.querySelector(`tr[data-content-id="${contentId}"]`);
    
    if (tableRow) {
        // อัปเดตข้อมูลในแต่ละคอลัมน์
        const cells = tableRow.querySelectorAll('td');
        
        if (cells.length >= 7) {
            // ชื่อเนื้อหา
            cells[0].innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-primary rounded p-2 me-3">
                        <i class="bi bi-file-earmark-text text-white"></i>
                    </div>
                    <div>
                        <h6 class="mb-0">${contentData.title}</h6>
                        <small class="text-muted">${truncateText(contentData.description, 50)}</small>
                    </div>
                </div>
            `;
            
            // ประเภท
            cells[1].innerHTML = `<span class="badge bg-secondary">${getContentTypeText(contentData.type)}</span>`;
            
            // ลิงก์
            cells[2].innerHTML = `
                <a href="${contentData.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-box-arrow-up-right me-1"></i>เปิดลิงก์
                </a>
            `;
            
            // คำอธิบาย
            cells[3].innerHTML = `<span class="table-cell-truncate" title="${contentData.description || '-'}">${truncateText(contentData.description || '-', 50)}</span>`;
            
            // คอร์สที่เกี่ยวข้อง
            cells[4].textContent = contentData.courseName || 'ไม่ระบุ';
            
            // วันที่สร้าง (คงเดิม)
            // cells[5] ไม่เปลี่ยนแปลง
            
            // การจัดการ (คงเดิม)
            // cells[6] ไม่เปลี่ยนแปลง
        }
        
    } else {
    }
}

// ฟังก์ชันช่วยเหลือสำหรับการจัดรูปแบบวันที่
function formatDate(timestamp) {
    return formatDateTime(timestamp, true);
}

// ฟังก์ชันลบเนื้อหาออกจากตารางทันที
function removeContentFromTable(contentId) {
    
    const tableRow = document.querySelector(`tr[data-content-id="${contentId}"]`);
    
    if (tableRow) {
        tableRow.remove();
    } else {
    }
}

// ฟังก์ชันช่วยเหลือสำหรับระดับความยาก
function getDifficultyText(difficulty) {
    const difficulties = {
        'beginner': 'เริ่มต้น',
        'intermediate': 'ปานกลาง',
        'advanced': 'ขั้นสูง'
    };
    return difficulties[difficulty] || difficulty;
}

// ฟังก์ชันตัดข้อความให้สั้นลง
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}
