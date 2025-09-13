import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, displayUserInfo, showSuccessMessage, showErrorMessage, logoutUser } from './auth.js';
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('เริ่มต้น Quiz List...');
        
        // ตรวจสอบสิทธิ์การเข้าถึง
        protectPage(['admin', 'instructor', 'student']);
        checkSessionExpiry();
        
        // แสดงข้อมูลผู้ใช้
        displayUserInfo();
        
        // สร้างเมนูผู้ใช้
        createMainMenu();
        createUserMenu();
        
        // โหลดข้อมูลข้อสอบ
        loadQuizzes();
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดหน้า:', error);
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

// โหลดข้อมูลข้อสอบ
async function loadQuizzes() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (!currentUser.uid) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
        
        // ตรวจสอบว่า db พร้อมใช้งาน
        if (!db) {
            throw new Error('Firebase ยังไม่ได้เริ่มต้น');
        }
        
        // ดึงข้อมูลข้อสอบจาก Firebase
        const quizzesQuery = query(
            collection(db, 'quizzes'),
            where('isActive', '==', true)
        );
        const quizzesSnapshot = await getDocs(quizzesQuery);
        
        const quizzes = [];
        
        for (const quizDoc of quizzesSnapshot.docs) {
            const quizData = quizDoc.data();
            const quizId = quizDoc.id;
            
            // ตรวจสอบว่าผู้ใช้ทำข้อสอบนี้แล้วหรือยัง
            const resultQuery = query(
                collection(db, 'quiz_results'),
                where('quizId', '==', quizId),
                where('studentId', '==', currentUser.uid)
            );
            const resultSnapshot = await getDocs(resultQuery);
            
            let status = 'available';
            let score = null;
            let completedAt = null;
            
            if (!resultSnapshot.empty) {
                const result = resultSnapshot.docs[0].data();
                status = 'completed';
                score = result.score;
                completedAt = result.completedAt;
            }
            
            quizzes.push({
                id: quizId,
                title: quizData.title,
                course: quizData.courseTitle || 'ไม่ระบุ',
                description: quizData.description,
                questionCount: quizData.questions ? quizData.questions.length : 0,
                timeLimit: quizData.duration,
                maxScore: quizData.totalScore || 100,
                status: status,
                score: score,
                completedAt: completedAt,
                dueDate: quizData.dueDate
            });
        }
        
        displayQuizzes(quizzes);
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลข้อสอบ');
    }
}

// แสดงข้อสอบ
function displayQuizzes(quizzes) {
    const container = document.getElementById('quizzesContainer');
    const noQuizzesMessage = document.getElementById('noQuizzesMessage');
    
    if (!container) {
        console.error('ไม่พบ element quizzesContainer');
        return;
    }
    
    if (quizzes.length === 0) {
        container.innerHTML = '';
        if (noQuizzesMessage) {
            noQuizzesMessage.style.display = 'block';
        }
        return;
    }
    
    if (noQuizzesMessage) {
        noQuizzesMessage.style.display = 'none';
    }
    
    container.innerHTML = quizzes.map(quiz => {
        const statusBadge = quiz.status === 'completed' 
            ? `<span class="badge bg-success">ทำแล้ว (${quiz.score}/${quiz.maxScore})</span>`
            : `<span class="badge bg-primary">ทำได้</span>`;
        
        const actionButton = quiz.status === 'completed'
            ? `<button class="btn btn-outline-primary btn-sm" onclick="viewResult('${quiz.id}')">
                 <i class="bi bi-eye me-1"></i>ดูผล
               </button>`
            : `<button class="btn btn-primary btn-sm" onclick="startQuiz('${quiz.id}')">
                 <i class="bi bi-play-circle me-1"></i>เริ่มทำ
               </button>`;
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${quiz.title}</h6>
                            ${statusBadge}
                        </div>
                        <p class="card-text text-muted small">${quiz.description}</p>
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <small class="text-muted">จำนวนข้อ</small>
                                <div class="fw-bold">${quiz.questionCount}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">เวลา</small>
                                <div class="fw-bold">${quiz.timeLimit} นาที</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">คะแนนเต็ม</small>
                                <div class="fw-bold">${quiz.maxScore}</div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">กำหนดส่ง: ${quiz.dueDate}</small>
                            ${actionButton}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ฟังก์ชันกรองข้อสอบ (เรียกจาก HTML)
window.filterQuizzes = function(filter) {
    console.log('กรองข้อสอบ:', filter);
    // ในอนาคตจะกรองข้อมูลจาก Firebase
    loadQuizzes(); // โหลดข้อมูลใหม่
};

// ฟังก์ชันเริ่มทำข้อสอบ (เรียกจาก HTML)
window.startQuiz = function(quizId) {
    console.log('เริ่มทำข้อสอบ:', quizId);
    // เปิด modal รายละเอียดข้อสอบ
    showQuizDetail(quizId);
};

// ฟังก์ชันดูผลข้อสอบ (เรียกจาก HTML)
window.viewResult = function(quizId) {
    console.log('ดูผลข้อสอบ:', quizId);
    // ไปหน้าแสดงผลข้อสอบ
    window.location.href = `quiz-review.html?id=${quizId}`;
};

// แสดงรายละเอียดข้อสอบ
function showQuizDetail(quizId) {
    // ข้อมูลตัวอย่าง
    const quizDetail = {
        title: 'แบบทดสอบบทที่ 1 - พื้นฐานการเขียนโปรแกรม',
        course: 'การเขียนโปรแกรมพื้นฐาน',
        description: 'ทดสอบความรู้พื้นฐานเกี่ยวกับการเขียนโปรแกรม ครอบคลุมหัวข้อต่างๆ เช่น ตัวแปร, เงื่อนไข, ลูป, ฟังก์ชัน',
        instructions: [
            'อ่านคำถามให้ละเอียดก่อนตอบ',
            'มีเวลาในการทำข้อสอบ 30 นาที',
            'ไม่สามารถกลับไปแก้ไขคำตอบได้หลังจากส่งข้อสอบ',
            'ห้ามเปิดแท็บอื่นหรือออกจากหน้าข้อสอบ'
        ],
        questionCount: 20,
        timeLimit: 30,
        maxScore: 100
    };
    
    const content = document.getElementById('quizDetailContent');
    if (content) {
        content.innerHTML = `
            <h5>${quizDetail.title}</h5>
            <p class="text-muted">${quizDetail.course}</p>
            <p>${quizDetail.description}</p>
            
            <h6>คำแนะนำ:</h6>
            <ul>
                ${quizDetail.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ul>
            
            <div class="row text-center">
                <div class="col-4">
                    <div class="border rounded p-3">
                        <div class="h4 mb-0">${quizDetail.questionCount}</div>
                        <small class="text-muted">จำนวนข้อ</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-3">
                        <div class="h4 mb-0">${quizDetail.timeLimit}</div>
                        <small class="text-muted">นาที</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-3">
                        <div class="h4 mb-0">${quizDetail.maxScore}</div>
                        <small class="text-muted">คะแนนเต็ม</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ตั้งค่า event listener สำหรับปุ่มเริ่มทำข้อสอบ
    const startQuizBtn = document.getElementById('startQuizBtn');
    if (startQuizBtn) {
        startQuizBtn.onclick = function() {
            window.location.href = `quiz-take.html?id=${quizId}`;
        };
    }
    
    // เปิด modal
    const modalElement = document.getElementById('quizDetailModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

