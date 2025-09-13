import { 
    collection, 
    query, 
    where, 
    getDocs, 
    getDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';

let currentResultId = null;
let currentQuizId = null;

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    initializeQuizResults();
});

// เริ่มต้นหน้าแสดงผลข้อสอบ
async function initializeQuizResults() {
    try {
        // ดึง result ID จาก URL
        const urlParams = new URLSearchParams(window.location.search);
        currentResultId = urlParams.get('resultId');
        currentQuizId = urlParams.get('quizId');
        
        if (!currentResultId || !currentQuizId) {
            showErrorMessage('ไม่พบข้อมูลผลการทำข้อสอบ');
            return;
        }

        // โหลดข้อมูลผลการทำข้อสอบ
        await loadQuizResult();

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้นหน้า:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// โหลดข้อมูลผลการทำข้อสอบ
async function loadQuizResult() {
    try {
        // ดึงข้อมูลผลการทำข้อสอบ
        const resultDoc = await getDoc(doc(db, 'quizResults', currentResultId));
        
        if (!resultDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลผลการทำข้อสอบ');
            return;
        }
        
        const resultData = resultDoc.data();
        
        // ดึงข้อมูลข้อสอบ
        const quizDoc = await getDoc(doc(db, 'quizzes', currentQuizId));
        
        if (!quizDoc.exists()) {
            showErrorMessage('ไม่พบข้อมูลข้อสอบ');
            return;
        }
        
        const quizData = quizDoc.data();
        
        // แสดงข้อมูลข้อสอบ
        displayQuizInfo(quizData);
        
        // แสดงสรุปผล
        displayResultSummary(resultData, quizData);
        
        // แสดงรายละเอียดคำตอบ
        displayAnswersDetail(resultData, quizData);

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผลการทำข้อสอบ:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลผลการทำข้อสอบ');
    }
}

// แสดงข้อมูลข้อสอบ
function displayQuizInfo(quizData) {
    const quizInfoContainer = document.getElementById('quizInfo');
    
    if (quizInfoContainer) {
        quizInfoContainer.innerHTML = `
            <div class="mb-3">
                <h6>ชื่อข้อสอบ:</h6>
                <p class="mb-2">${quizData.title}</p>
            </div>
            <div class="mb-3">
                <h6>คำอธิบาย:</h6>
                <p class="mb-2">${quizData.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
            <div class="row">
                <div class="col-6">
                    <h6>จำนวนคำถาม:</h6>
                    <p class="mb-2">${quizData.totalQuestions || 0} ข้อ</p>
                </div>
                <div class="col-6">
                    <h6>เวลาทำ:</h6>
                    <p class="mb-2">${quizData.duration > 0 ? quizData.duration + ' นาที' : 'ไม่จำกัด'}</p>
                </div>
            </div>
        `;
    }
}

// แสดงสรุปผล
function displayResultSummary(resultData, quizData) {
    const resultSummaryContainer = document.getElementById('resultSummary');
    
    if (resultSummaryContainer) {
        const score = resultData.score || 0;
        const totalScore = quizData.totalScore || 100;
        const percentage = Math.round((score / totalScore) * 100);
        const isPassed = percentage >= (quizData.passingScore || 60);
        
        const scoreBadge = isPassed ? 'bg-success' : 'bg-danger';
        const statusBadge = isPassed ? 'bg-success' : 'bg-danger';
        const statusText = isPassed ? 'ผ่าน' : 'ไม่ผ่าน';
        
        resultSummaryContainer.innerHTML = `
            <div class="text-center mb-3">
                <div class="display-4 ${scoreBadge} text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                    ${percentage}%
                </div>
            </div>
            <div class="mb-3">
                <h6>คะแนนที่ได้:</h6>
                <p class="mb-2">${score}/${totalScore} คะแนน</p>
            </div>
            <div class="mb-3">
                <h6>สถานะ:</h6>
                <span class="badge ${statusBadge} fs-6">${statusText}</span>
            </div>
            <div class="mb-3">
                <h6>เวลาที่ใช้:</h6>
                <p class="mb-2">${formatTime(resultData.timeSpent || 0)}</p>
            </div>
            <div class="mb-3">
                <h6>วันที่ทำ:</h6>
                <p class="mb-2">${formatDate(resultData.completedAt)}</p>
            </div>
        `;
    }
}

// แสดงรายละเอียดคำตอบ
function displayAnswersDetail(resultData, quizData) {
    const answersDetailContainer = document.getElementById('answersDetail');
    
    if (answersDetailContainer) {
        const answers = resultData.answers || [];
        const questions = quizData.questions || [];
        
        if (answers.length === 0) {
            answersDetailContainer.innerHTML = '<p class="text-muted">ไม่มีข้อมูลคำตอบ</p>';
            return;
        }
        
        let answersHtml = '';
        
        answers.forEach((answer, index) => {
            const question = questions[index];
            if (!question) return;
            
            const isCorrect = answer.isCorrect;
            const correctBadge = isCorrect ? 'bg-success' : 'bg-danger';
            const correctText = isCorrect ? 'ถูก' : 'ผิด';
            
            let answerHtml = `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">คำถามที่ ${index + 1}</h6>
                        <span class="badge ${correctBadge}">${correctText}</span>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6>คำถาม:</h6>
                            <p>${question.text}</p>
                        </div>
            `;
            
            if (question.type === 'multiple-choice' || question.type === 'true-false') {
                answerHtml += `
                    <div class="mb-3">
                        <h6>คำตอบของคุณ:</h6>
                        <p class="text-primary">${getAnswerText(question, answer.studentAnswer)}</p>
                    </div>
                    <div class="mb-3">
                        <h6>คำตอบที่ถูกต้อง:</h6>
                        <p class="text-success">${getAnswerText(question, question.correctAnswer)}</p>
                    </div>
                `;
            } else if (question.type === 'fill-blank') {
                answerHtml += `
                    <div class="mb-3">
                        <h6>คำตอบของคุณ:</h6>
                        <p class="text-primary">${answer.studentAnswer || 'ไม่ได้ตอบ'}</p>
                    </div>
                    <div class="mb-3">
                        <h6>คำตอบที่ถูกต้อง:</h6>
                        <p class="text-success">${question.correctAnswer}</p>
                    </div>
                `;
            }
            
            if (question.explanation) {
                answerHtml += `
                    <div class="mb-3">
                        <h6>คำอธิบาย:</h6>
                        <p class="text-muted">${question.explanation}</p>
                    </div>
                `;
            }
            
            answerHtml += `
                        <div class="mb-3">
                            <h6>คะแนน:</h6>
                            <p>${answer.score || 0}/${question.score || 1} คะแนน</p>
                        </div>
                    </div>
                </div>
            `;
            
            answersHtml += answerHtml;
        });
        
        answersDetailContainer.innerHTML = answersHtml;
    }
}

// แปลงคำตอบเป็นข้อความ
function getAnswerText(question, answerIndex) {
    if (question.type === 'multiple-choice' || question.type === 'true-false') {
        const options = question.options || [];
        const option = options[answerIndex];
        return option ? option.text : 'ไม่ระบุ';
    }
    return answerIndex;
}

// แปลงเวลาเป็นรูปแบบที่อ่านได้
function formatTime(seconds) {
    if (!seconds) return '0 วินาที';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes} นาที ${remainingSeconds} วินาที`;
    } else {
        return `${remainingSeconds} วินาที`;
    }
}

// แปลงวันที่เป็นรูปแบบที่อ่านได้
function formatDate(timestamp) {
    return formatDateTime(timestamp, true);
}

// พิมพ์ผลการทำข้อสอบ
window.printResults = function() {
    window.print();
};

// ส่งออกผลการทำข้อสอบ
window.exportResults = function() {
    // สร้างข้อมูลสำหรับ export
    const data = {
        timestamp: new Date().toISOString(),
        quizTitle: document.querySelector('#quizInfo h6:first-child + p')?.textContent || 'ไม่ระบุ',
        score: document.querySelector('#resultSummary h6:first-child + p')?.textContent || 'ไม่ระบุ',
        status: document.querySelector('#resultSummary .badge')?.textContent || 'ไม่ระบุ'
    };
    
    // สร้างไฟล์ JSON และดาวน์โหลด
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-result-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessMessage('ส่งออกข้อมูลสำเร็จ');
};

// ทำข้อสอบใหม่
window.retakeQuiz = function() {
    if (confirm('คุณต้องการทำข้อสอบนี้ใหม่หรือไม่?')) {
        window.location.href = `quiz-take.html?id=${currentQuizId}`;
    }
};

// ดูคอร์ส
window.viewCourse = function() {
    // ดึง courseId จาก quiz data
    // ในที่นี้จะใช้การเดา หรือเก็บไว้ใน result data
    window.location.href = '../courses/course-detail.html';
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
