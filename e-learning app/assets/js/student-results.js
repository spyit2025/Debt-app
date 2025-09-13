import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';
import { protectPage, checkSessionExpiry, createMainMenu, createUserMenu, showSuccessMessage, showErrorMessage, getCurrentUser } from './auth.js';

// เริ่มต้นหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('เริ่มต้น Student Results...');
    
    // ตรวจสอบสิทธิ์การเข้าถึง
    protectPage(['admin', 'instructor', 'student']);
    checkSessionExpiry();
    createMainMenu();
    createUserMenu();
    
            // โหลดข้อมูลผลการเรียน
        loadResults();
    
    // โหลดตัวกรอง
    loadFilters();
    
    // อัปเดตสถิติ
    updateStatistics();
    
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
        order: [[7, 'desc']], // เรียงตามวันที่ทำ
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
        autoWidth: false,
        scrollX: false,
        columnDefs: [
            {
                targets: [0], // รหัสนักเรียน
                width: '10%',
                responsivePriority: 1
            },
            {
                targets: [1], // ชื่อนักเรียน
                width: '15%',
                responsivePriority: 1
            },
            {
                targets: [2], // ชื่อคอร์ส
                width: '20%',
                responsivePriority: 2
            },
            {
                targets: [3], // ชื่อข้อสอบ
                width: '15%',
                responsivePriority: 2
            },
            {
                targets: [4], // คะแนน
                width: '10%',
                responsivePriority: 2
            },
            {
                targets: [5], // เวลาที่ใช้
                width: '10%',
                responsivePriority: 3
            },
            {
                targets: [6], // สถานะ
                width: '10%',
                responsivePriority: 3
            },
            {
                targets: [7], // วันที่ทำ
                width: '10%',
                responsivePriority: 3
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
    
    $('#resultsTable').DataTable(dataTableConfig);
}

// โหลดข้อมูลผลการเรียน
async function loadResults() {
    try {
        console.log('กำลังโหลดข้อมูลผลการเรียน...');
        
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showErrorMessage('ไม่พบข้อมูลผู้ใช้');
            return;
        }

        // ดึงข้อมูลผลการเรียนจาก Firestore
        let resultsSnapshot;
        
        // ตรวจสอบสิทธิ์ผู้ใช้
        if (currentUser.userType === 'student') {
            // สำหรับผู้เรียน: แสดงเฉพาะผลการเรียนของตัวเอง
            resultsSnapshot = await getDocs(
                query(
                    collection(db, 'quiz_results'),
                    where('studentId', '==', currentUser.uid)
                )
            );
        } else {
            // สำหรับ admin และ instructor: แสดงผลการเรียนทั้งหมด
            resultsSnapshot = await getDocs(collection(db, 'quiz_results'));
        }
        
        if (resultsSnapshot.empty) {
            displayResults([]);
            console.log('ไม่พบข้อมูลผลการเรียน');
            return;
        }

        const results = [];
        
        for (const resultDoc of resultsSnapshot.docs) {
            const resultData = resultDoc.data();
            
            // ดึงข้อมูลนักเรียน
            let studentName = 'ไม่ระบุ';
            let studentId = 'ไม่ระบุ';
            if (resultData.studentId) {
                try {
                    const studentDoc = await getDoc(doc(db, 'users', resultData.studentId));
                    const studentData = studentDoc.data();
                    studentName = studentData?.name || 'ไม่ระบุ';
                    studentId = studentData?.studentId || 'ไม่ระบุ';
                } catch (error) {
                    console.error('ไม่สามารถดึงข้อมูลนักเรียนได้:', error);
                }
            }
            
            // ดึงข้อมูลคอร์ส
            let courseName = 'ไม่ระบุ';
            if (resultData.courseId) {
                try {
                    const courseDoc = await getDoc(doc(db, 'courses', resultData.courseId));
                    const courseData = courseDoc.data();
                    courseName = courseData?.title || 'ไม่ระบุ';
                } catch (error) {
                    console.error('ไม่สามารถดึงข้อมูลคอร์สได้:', error);
                }
            }
            
            // ดึงข้อมูลข้อสอบ
            let quizName = 'ไม่ระบุ';
            if (resultData.quizId) {
                try {
                    const quizDoc = await getDoc(doc(db, 'quizzes', resultData.quizId));
                    const quizData = quizDoc.data();
                    quizName = quizData?.title || 'ไม่ระบุ';
                } catch (error) {
                    console.error('ไม่สามารถดึงข้อมูลข้อสอบได้:', error);
                }
            }
            
            // คำนวณเปอร์เซ็นต์
            const percentage = resultData.totalQuestions > 0 ? 
                Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100) : 0;
            
            // กำหนดสถานะ
            const status = percentage >= 60 ? 'passed' : 'failed';
            
            results.push({
                id: resultDoc.id,
                studentId: studentId,
                studentName: studentName,
                course: courseName,
                quiz: quizName,
                score: resultData.correctAnswers || 0,
                totalQuestions: resultData.totalQuestions || 0,
                percentage: percentage,
                status: status,
                date: resultData.completedAt || resultData.createdAt
            });
        }
        
        displayResults(results);
        console.log('โหลดข้อมูลผลการเรียนสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผลการเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลผลการเรียน');
    }
}

// แสดงข้อมูลผลการเรียนในตาราง
function displayResults(results) {
    // ตรวจสอบว่า DataTable ถูก initialize แล้วหรือยัง
    let table = $('#resultsTable').DataTable();
    
    // ถ้ายังไม่ได้ initialize ให้ initialize ใหม่
    if (!table) {
        table = $('#resultsTable').DataTable({
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
            responsive: true,
            order: [[7, 'desc']], // เรียงตามวันที่ทำ
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]]
        });
    } else {
        table.clear();
    }
    
    results.forEach(result => {
        const statusBadge = getStatusBadge(result.status);
        const actions = `
            <div class="btn-group" role="group">
                <button class="btn btn-sm btn-outline-info" onclick="viewResult('${result.id}')" title="ดูรายละเอียด">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="printResult('${result.id}')" title="พิมพ์">
                    <i class="bi bi-printer"></i>
                </button>
            </div>
        `;
        
        table.row.add([
            result.course,
            result.quiz,
            result.score,
            `${result.percentage}%`,
            statusBadge,
            formatDate(result.date),
            actions
        ]);
    });
    
    table.draw();
}

// สร้าง badge สำหรับสถานะ
function getStatusBadge(status) {
    const statusMap = {
        'passed': '<span class="badge bg-success">ผ่าน</span>',
        'failed': '<span class="badge bg-danger">ไม่ผ่าน</span>',
        'pending': '<span class="badge bg-warning">รอตรวจ</span>'
    };
    return statusMap[status] || '<span class="badge bg-secondary">ไม่ทราบ</span>';
}

// จัดรูปแบบวันที่
function formatDate(dateString) {
    return formatDateTime(dateString, false);
}

// โหลดตัวกรอง
async function loadFilters() {
    try {
        // โหลดตัวเลือกคอร์สจาก database
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const courseFilter = document.getElementById('courseFilter');
        
        coursesSnapshot.forEach(courseDoc => {
            const courseData = courseDoc.data();
            const option = document.createElement('option');
            option.value = courseData.title;
            option.textContent = courseData.title;
            courseFilter.appendChild(option);
        });
        
        // โหลดตัวเลือกนักเรียนจาก database
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const studentFilter = document.getElementById('studentFilter');
        
        if (studentFilter) {
            usersSnapshot.forEach(userDoc => {
                const userData = userDoc.data();
                if (userData.userType === 'student') {
                    const option = document.createElement('option');
                    option.value = userData.name;
                    option.textContent = userData.name;
                    studentFilter.appendChild(option);
                }
            });
        }
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดตัวกรอง:', error);
    }
}

// อัปเดตสถิติสำหรับผู้เรียน
async function updateStatistics() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        // ดึงข้อมูลผลการเรียนของผู้เรียนที่เข้าสู่ระบบ
        const resultsSnapshot = await getDocs(
            query(
                collection(db, 'quiz_results'),
                where('studentId', '==', currentUser.uid)
            )
        );
        
        let totalQuizzes = 0;
        let passedQuizzes = 0;
        let failedQuizzes = 0;
        let totalScore = 0;
        let scoreCount = 0;
        
        resultsSnapshot.forEach(resultDoc => {
            const resultData = resultDoc.data();
            totalQuizzes++;
            
            const percentage = resultData.totalQuestions > 0 ? 
                Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100) : 0;
            
            if (percentage >= 60) {
                passedQuizzes++;
            } else {
                failedQuizzes++;
            }
            
            totalScore += percentage;
            scoreCount++;
        });
        
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        
        // อัปเดตสถิติ
        const totalQuizzesElement = document.getElementById('totalQuizzes');
        const passedQuizzesElement = document.getElementById('passedQuizzes');
        const failedQuizzesElement = document.getElementById('failedQuizzes');
        const avgScoreElement = document.getElementById('avgScore');
        
        if (totalQuizzesElement) totalQuizzesElement.textContent = totalQuizzes;
        if (passedQuizzesElement) passedQuizzesElement.textContent = passedQuizzes;
        if (failedQuizzesElement) failedQuizzesElement.textContent = failedQuizzes;
        if (avgScoreElement) avgScoreElement.textContent = avgScore + '%';
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตสถิติ:', error);
    }
}

// เพิ่ม event listeners
function addEventListeners() {
    // ปุ่มส่งออกผลการเรียน
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', function() {
            exportResults();
        });
    }
    
    // ตัวกรอง
    const courseFilter = document.getElementById('courseFilter');
    if (courseFilter) {
        courseFilter.addEventListener('change', function() {
            filterResults();
        });
    }
    
    const studentFilter = document.getElementById('studentFilter');
    if (studentFilter) {
        studentFilter.addEventListener('change', function() {
            filterResults();
        });
    }
    
    const dateFromFilter = document.getElementById('dateFromFilter');
    if (dateFromFilter) {
        dateFromFilter.addEventListener('change', function() {
            filterResults();
        });
    }
    
    const dateToFilter = document.getElementById('dateToFilter');
    if (dateToFilter) {
        dateToFilter.addEventListener('change', function() {
            filterResults();
        });
    }
    
    // ปุ่มพิมพ์ใน modal
    const printResultBtn = document.getElementById('printResultBtn');
    if (printResultBtn) {
        printResultBtn.addEventListener('click', function() {
            printCurrentResult();
        });
    }
}

// กรองผลการเรียน
function filterResults() {
    const courseFilter = document.getElementById('courseFilter').value;
    const studentFilter = document.getElementById('studentFilter').value;
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    
    console.log('กรองผลการเรียน:', { courseFilter, studentFilter, dateFrom, dateTo });
    
    // ในอนาคตจะกรองข้อมูลจริงจาก Firebase
    // ตอนนี้จะโหลดข้อมูลใหม่
    loadResults();
}

// ส่งออกผลการเรียน
function exportResults() {
    try {
        console.log('ส่งออกผลการเรียน...');
        
        // จำลองการส่งออก (ในอนาคตจะสร้างไฟล์ Excel หรือ CSV)
        showSuccessMessage('ส่งออกผลการเรียนสำเร็จ');
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งออกผลการเรียน:', error);
        showErrorMessage('เกิดข้อผิดพลาดในการส่งออกผลการเรียน');
    }
}

// ฟังก์ชันสำหรับดูรายละเอียดผลการเรียน (เรียกจาก HTML)
window.viewResult = function(resultId) {
    console.log('ดูรายละเอียดผลการเรียน:', resultId);
    
    // จำลองการโหลดข้อมูลผลการเรียน
    const resultData = {
        id: resultId,
        studentId: '6400000001',
        studentName: 'สมชาย ใจดี',
        course: 'การเขียนโปรแกรมพื้นฐาน',
        quiz: 'ข้อสอบกลางภาค',
        score: 85,
        percentage: 85,
        status: 'passed',
        date: '2024-02-15',
        details: [
            { question: 'คำถามที่ 1', answer: 'คำตอบที่ถูกต้อง', score: 10 },
            { question: 'คำถามที่ 2', answer: 'คำตอบที่ถูกต้อง', score: 10 },
            { question: 'คำถามที่ 3', answer: 'คำตอบที่ผิด', score: 0 }
        ]
    };
    
    // แสดงรายละเอียดใน modal
    displayResultDetails(resultData);
    $('#viewResultModal').modal('show');
};

// แสดงรายละเอียดผลการเรียน
function displayResultDetails(resultData) {
    const container = document.getElementById('resultDetails');
    
    const detailsHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>ข้อมูลนักเรียน</h6>
                <p><strong>รหัสนักเรียน:</strong> ${resultData.studentId}</p>
                <p><strong>ชื่อ-นามสกุล:</strong> ${resultData.studentName}</p>
                <p><strong>คอร์ส:</strong> ${resultData.course}</p>
                <p><strong>ข้อสอบ:</strong> ${resultData.quiz}</p>
            </div>
            <div class="col-md-6">
                <h6>ผลการเรียน</h6>
                <p><strong>คะแนน:</strong> ${resultData.score}/100</p>
                <p><strong>เปอร์เซ็นต์:</strong> ${resultData.percentage}%</p>
                <p><strong>สถานะ:</strong> ${getStatusDisplayName(resultData.status)}</p>
                <p><strong>วันที่ทำ:</strong> ${formatDate(resultData.date)}</p>
            </div>
        </div>
        <hr>
        <h6>รายละเอียดคำตอบ</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>คำถาม</th>
                        <th>คำตอบ</th>
                        <th>คะแนน</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultData.details.map(detail => `
                        <tr>
                            <td>${detail.question}</td>
                            <td>${detail.answer}</td>
                            <td>${detail.score}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = detailsHTML;
}

// ฟังก์ชันสำหรับพิมพ์ผลการเรียน (เรียกจาก HTML)
window.printResult = function(resultId) {
    console.log('พิมพ์ผลการเรียน:', resultId);
    
    // จำลองการพิมพ์
    showSuccessMessage('กำลังพิมพ์ผลการเรียน...');
};

// พิมพ์ผลการเรียนปัจจุบัน
function printCurrentResult() {
    console.log('พิมพ์ผลการเรียนปัจจุบัน');
    
    // จำลองการพิมพ์
    showSuccessMessage('กำลังพิมพ์ผลการเรียน...');
    $('#viewResultModal').modal('hide');
}

// Helper functions
function getStatusDisplayName(status) {
    const statusMap = {
        'passed': 'ผ่าน',
        'failed': 'ไม่ผ่าน',
        'pending': 'รอตรวจ'
    };
    return statusMap[status] || 'ไม่ทราบ';
}

