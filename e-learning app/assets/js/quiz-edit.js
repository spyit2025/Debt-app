import { 
    collection, 
    query, 
    where, 
    getDocs, 
    getDoc,
    doc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';

let currentQuizId = null;
let questionCounter = 0;

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    initializeQuizEdit();
});

// เริ่มต้นหน้าแก้ไขข้อสอบ
async function initializeQuizEdit() {
    try {
        // ดึง quiz ID จาก URL
        const urlParams = new URLSearchParams(window.location.search);
        currentQuizId = urlParams.get('id');
        
        if (!currentQuizId) {
            showErrorMessage('ไม่พบ ID ข้อสอบ');
            return;
        }

        // โหลดข้อมูลคอร์ส
        await loadCourses();
        
        // โหลดข้อมูลข้อสอบ
        await loadQuizData();
        
        // ตั้งค่า Event Listeners
        setupEventListeners();

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้นหน้า:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// โหลดข้อมูลคอร์ส
async function loadCourses() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            if (!userData.uid) {
                throw new Error('ไม่พบข้อมูลผู้ใช้');
            }
        }

        const userId = currentUser ? currentUser.uid : JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}').uid;
        
        const coursesQuery = query(
            collection(db, 'courses'),
            where('instructorId', '==', userId)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        
        const courseSelect = document.getElementById('quizCourse');
        courseSelect.innerHTML = '<option value="">เลือกคอร์ส</option>';
        
        coursesSnapshot.forEach(doc => {
            const course = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = course.title;
            courseSelect.appendChild(option);
        });

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดคอร์ส:', error);
    }
}

// โหลดข้อมูลข้อสอบ
async function loadQuizData() {
    try {
        const quizDoc = await getDoc(doc(db, 'quizzes', currentQuizId));
        
        if (!quizDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลข้อสอบ');
            return;
        }
        
        const quizData = quizDoc.data();
        
        // กรอกข้อมูลในฟอร์ม
        document.getElementById('quizTitle').value = quizData.title || '';
        document.getElementById('quizCourse').value = quizData.courseId || '';
        document.getElementById('quizDescription').value = quizData.description || '';
        document.getElementById('quizInstructions').value = quizData.instructions || '';
        document.getElementById('quizTimeLimit').value = quizData.duration || '';
        document.getElementById('quizAttempts').value = quizData.maxAttempts || 1;
        document.getElementById('quizPassingScore').value = quizData.passingScore || 60;
        document.getElementById('autoSubmit').checked = quizData.autoSubmit !== false;
        document.getElementById('requireAllAnswers').checked = quizData.requireAllAnswers || false;
        
        if (quizData.dueDate) {
            const dueDate = new Date(quizData.dueDate.toDate());
            document.getElementById('quizDueDate').value = dueDate.toISOString().slice(0, 16);
        }
        
        // โหลดคำถาม
        if (quizData.questions && quizData.questions.length > 0) {
            quizData.questions.forEach(question => {
                addQuestionToContainer(question);
            });
        }

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ');
    }
}

// ตั้งค่า Event Listeners
function setupEventListeners() {
    // ปุ่มเพิ่มคำถาม
    document.getElementById('addMultipleChoiceBtn').addEventListener('click', () => addMultipleChoiceQuestion());
    document.getElementById('addTrueFalseBtn').addEventListener('click', () => addTrueFalseQuestion());
    document.getElementById('addFillBlankBtn').addEventListener('click', () => addFillBlankQuestion());
    
    // ฟอร์ม
    document.getElementById('editQuizForm').addEventListener('submit', handleSubmit);
}

// เพิ่มคำถามแบบเลือกตอบ
function addMultipleChoiceQuestion() {
    const question = {
        id: ++questionCounter,
        type: 'multiple-choice',
        text: '',
        options: [
            { id: 0, text: '' },
            { id: 1, text: '' },
            { id: 2, text: '' },
            { id: 3, text: '' }
        ],
        correctAnswer: 0,
        explanation: '',
        score: 1
    };
    
    addQuestionToContainer(question);
}

// เพิ่มคำถามแบบถูก/ผิด
function addTrueFalseQuestion() {
    const question = {
        id: ++questionCounter,
        type: 'true-false',
        text: '',
        options: [
            { id: 0, text: 'ถูก' },
            { id: 1, text: 'ผิด' }
        ],
        correctAnswer: 0,
        explanation: '',
        score: 1
    };
    
    addQuestionToContainer(question);
}

// เพิ่มคำถามแบบเติมคำ
function addFillBlankQuestion() {
    const question = {
        id: ++questionCounter,
        type: 'fill-blank',
        text: '',
        correctAnswer: '',
        explanation: '',
        score: 1
    };
    
    addQuestionToContainer(question);
}

// เพิ่มคำถามลงใน container
function addQuestionToContainer(question) {
    const container = document.getElementById('questionsContainer');
    
    let questionHtml = '';
    
    if (question.type === 'multiple-choice') {
        questionHtml = createMultipleChoiceQuestionHTML(question);
    } else if (question.type === 'true-false') {
        questionHtml = createTrueFalseQuestionHTML(question);
    } else if (question.type === 'fill-blank') {
        questionHtml = createFillBlankQuestionHTML(question);
    }
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    
    // ตั้งค่า Event Listeners สำหรับคำถามใหม่
    const questionElement = container.lastElementChild;
    setupQuestionEventListeners(questionElement, question);
}

// สร้าง HTML สำหรับคำถามแบบเลือกตอบ
function createMultipleChoiceQuestionHTML(question) {
    return `
        <div class="question-item card mb-3" data-question-id="${question.id}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามที่ ${question.id}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion(${question.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control question-text" rows="2" required>${question.text}</textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ตัวเลือก</label>
                    <div class="options-container">
                        ${question.options.map((option, index) => `
                            <div class="input-group mb-2">
                                <div class="input-group-text">
                                    <input class="form-check-input mt-0 correct-answer" type="radio" name="correct_${question.id}" value="${index}" ${question.correctAnswer === index ? 'checked' : ''}>
                                </div>
                                <input type="text" class="form-control option-text" value="${option.text}" placeholder="ตัวเลือก ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">คำอธิบาย</label>
                        <textarea class="form-control explanation" rows="2">${question.explanation}</textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">คะแนน</label>
                        <input type="number" class="form-control question-score" value="${question.score}" min="0" step="0.5">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// สร้าง HTML สำหรับคำถามแบบถูก/ผิด
function createTrueFalseQuestionHTML(question) {
    return `
        <div class="question-item card mb-3" data-question-id="${question.id}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามที่ ${question.id} (ถูก/ผิด)</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion(${question.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control question-text" rows="2" required>${question.text}</textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">คำตอบที่ถูกต้อง</label>
                    <div class="form-check">
                        <input class="form-check-input correct-answer" type="radio" name="correct_${question.id}" value="0" ${question.correctAnswer === 0 ? 'checked' : ''}>
                        <label class="form-check-label">ถูก</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input correct-answer" type="radio" name="correct_${question.id}" value="1" ${question.correctAnswer === 1 ? 'checked' : ''}>
                        <label class="form-check-label">ผิด</label>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">คำอธิบาย</label>
                        <textarea class="form-control explanation" rows="2">${question.explanation}</textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">คะแนน</label>
                        <input type="number" class="form-control question-score" value="${question.score}" min="0" step="0.5">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// สร้าง HTML สำหรับคำถามแบบเติมคำ
function createFillBlankQuestionHTML(question) {
    return `
        <div class="question-item card mb-3" data-question-id="${question.id}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">คำถามที่ ${question.id} (เติมคำ)</h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeQuestion(${question.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">คำถาม *</label>
                    <textarea class="form-control question-text" rows="2" required>${question.text}</textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">คำตอบที่ถูกต้อง *</label>
                    <input type="text" class="form-control correct-answer-text" value="${question.correctAnswer}" required>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">คำอธิบาย</label>
                        <textarea class="form-control explanation" rows="2">${question.explanation}</textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">คะแนน</label>
                        <input type="number" class="form-control question-score" value="${question.score}" min="0" step="0.5">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ตั้งค่า Event Listeners สำหรับคำถาม
function setupQuestionEventListeners(questionElement, question) {
    // Event listeners จะถูกตั้งค่าตามความต้องการ
}

// ลบคำถาม
window.removeQuestion = function(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionElement) {
        questionElement.remove();
    }
};

// จัดการการส่งฟอร์ม
async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        if (!validateForm()) {
            return;
        }
        
        const quizData = collectQuizData();
        
        // อัปเดตข้อมูลใน Firebase
        await updateDoc(doc(db, 'quizzes', currentQuizId), {
            ...quizData,
            updatedAt: serverTimestamp()
        });
        
        showSuccessMessage('บันทึกข้อสอบสำเร็จ');
        
        // กลับไปหน้าก่อนหน้า
        setTimeout(() => {
            window.history.back();
        }, 1500);
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึก:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อสอบ');
    }
}

// ตรวจสอบความถูกต้องของฟอร์ม
function validateForm() {
    const form = document.getElementById('editQuizForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }
    
    const questions = document.querySelectorAll('.question-item');
    if (questions.length === 0) {
        showErrorMessage('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
        return false;
    }
    
    return true;
}

// รวบรวมข้อมูลจากฟอร์ม
function collectQuizData() {
    const title = document.getElementById('quizTitle').value.trim();
    const courseId = document.getElementById('quizCourse').value;
    const description = document.getElementById('quizDescription').value.trim();
    const instructions = document.getElementById('quizInstructions').value.trim();
    const duration = parseInt(document.getElementById('quizTimeLimit').value) || 0;
    const maxAttempts = parseInt(document.getElementById('quizAttempts').value) || 1;
    const passingScore = parseInt(document.getElementById('quizPassingScore').value) || 60;
    const autoSubmit = document.getElementById('autoSubmit').checked;
    const requireAllAnswers = document.getElementById('requireAllAnswers').checked;
    const dueDate = document.getElementById('quizDueDate').value ? new Date(document.getElementById('quizDueDate').value) : null;
    
    const questions = [];
    document.querySelectorAll('.question-item').forEach((questionElement, index) => {
        const questionData = collectQuestionData(questionElement, index + 1);
        questions.push(questionData);
    });
    
    return {
        title,
        courseId,
        description,
        instructions,
        duration,
        maxAttempts,
        passingScore,
        autoSubmit,
        requireAllAnswers,
        dueDate,
        questions,
        totalQuestions: questions.length,
        totalScore: questions.reduce((sum, q) => sum + q.score, 0)
    };
}

// รวบรวมข้อมูลคำถาม
function collectQuestionData(questionElement, questionNumber) {
    const questionText = questionElement.querySelector('.question-text').value.trim();
    const explanation = questionElement.querySelector('.explanation').value.trim();
    const score = parseFloat(questionElement.querySelector('.question-score').value) || 1;
    
    const questionType = questionElement.querySelector('.question-item').dataset.questionType || 'multiple-choice';
    
    if (questionType === 'fill-blank') {
        const correctAnswer = questionElement.querySelector('.correct-answer-text').value.trim();
        return {
            id: questionNumber,
            type: 'fill-blank',
            text: questionText,
            correctAnswer,
            explanation,
            score
        };
    } else {
        const options = [];
        questionElement.querySelectorAll('.option-text').forEach((optionInput, optionIndex) => {
            options.push({
                id: optionIndex,
                text: optionInput.value.trim()
            });
        });
        
        const correctAnswer = parseInt(questionElement.querySelector('.correct-answer:checked').value);
        
        return {
            id: questionNumber,
            type: questionType,
            text: questionText,
            options,
            correctAnswer,
            explanation,
            score
        };
    }
}

// ดูตัวอย่างข้อสอบ
window.previewQuiz = function() {
    if (!validateForm()) {
        return;
    }
    
    const quizData = collectQuizData();
    showQuizPreview(quizData);
};

// แสดงตัวอย่างข้อสอบ
function showQuizPreview(quizData) {
    const modal = new bootstrap.Modal(document.getElementById('quizPreviewModal'));
    const modalBody = document.getElementById('quizPreviewModalBody');
    
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="mb-3">
                <h6>ชื่อข้อสอบ:</h6>
                <p>${quizData.title}</p>
            </div>
            <div class="mb-3">
                <h6>คำอธิบาย:</h6>
                <p>${quizData.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <h6>จำนวนคำถาม:</h6>
                    <p>${quizData.totalQuestions} ข้อ</p>
                </div>
                <div class="col-md-6">
                    <h6>เวลาทำ:</h6>
                    <p>${quizData.duration > 0 ? quizData.duration + ' นาที' : 'ไม่จำกัด'}</p>
                </div>
            </div>
        `;
    }
    
    modal.show();
};

// บันทึกฉบับร่าง
window.saveAsDraft = async function() {
    try {
        const quizData = collectQuizData();
        quizData.isDraft = true;
        
        await updateDoc(doc(db, 'quizzes', currentQuizId), {
            ...quizData,
            updatedAt: serverTimestamp()
        });
        
        showSuccessMessage('บันทึกฉบับร่างสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
    }
};

// กลับไปหน้าก่อนหน้า
window.goBack = function() {
    window.history.back();
};

// แสดงข้อความสำเร็จ
function showSuccessMessage(message) {
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

// แสดงข้อความ error
function showErrorMessage(message) {
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
