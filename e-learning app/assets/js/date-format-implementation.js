/**
 * ไฟล์สำหรับจัดการรูปแบบวันที่ในทุกหน้า
 * ใช้ฟังก์ชันจาก date-formatter.js เพื่อจัดรูปแบบวันที่ให้เป็นมาตรฐานเดียวกัน
 */

// ใช้ global functions จาก date-formatter-legacy.js
// ฟังก์ชันเหล่านี้จะถูกโหลดโดย date-formatter-legacy.js และทำให้เป็น global

/**
 * ฟังก์ชันสำหรับจัดรูปแบบวันที่ในตาราง
 * @param {HTMLElement} tableElement - Element ของตาราง
 * @param {string} dateColumnSelector - CSS selector สำหรับคอลัมน์วันที่
 */
function formatTableDates(tableElement, dateColumnSelector = '.date-column') {
    const dateCells = tableElement.querySelectorAll(dateColumnSelector);
    
    dateCells.forEach(cell => {
        const dateValue = cell.getAttribute('data-date') || cell.textContent;
        if (dateValue && dateValue !== 'ไม่ระบุ') {
            const formattedDate = window.formatTableDate(dateValue);
            cell.textContent = formattedDate;
        }
    });
}

/**
 * ฟังก์ชันสำหรับจัดรูปแบบวันที่ในหน้าเว็บ
 * @param {string} selector - CSS selector สำหรับ element ที่มีวันที่
 */
function formatPageDates(selector = '[data-date]') {
    const dateElements = document.querySelectorAll(selector);
    
    dateElements.forEach(element => {
        const dateValue = element.getAttribute('data-date');
        if (dateValue && dateValue !== 'ไม่ระบุ') {
            const formattedDate = window.formatDisplayDate(dateValue);
            element.textContent = formattedDate;
        }
    });
}

/**
 * ฟังก์ชันสำหรับจัดรูปแบบวันที่ในฟอร์ม
 * @param {string} inputSelector - CSS selector สำหรับ input ที่มีวันที่
 */
function formatFormDates(inputSelector = 'input[type="datetime-local"], input[data-date]') {
    const dateInputs = document.querySelectorAll(inputSelector);
    
    dateInputs.forEach(input => {
        const dateValue = input.value || input.getAttribute('data-date');
        if (dateValue && dateValue !== 'ไม่ระบุ') {
            // แปลงเป็นรูปแบบที่ input datetime-local ต้องการ
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                const isoString = date.toISOString().slice(0, 16);
                input.value = isoString;
            }
        }
    });
}

/**
 * ฟังก์ชันสำหรับจัดรูปแบบวันที่ในข้อมูล JSON
 * @param {Object} data - ข้อมูล JSON ที่มีวันที่
 * @param {Array} dateFields - รายชื่อ field ที่เป็นวันที่
 * @returns {Object} ข้อมูลที่มีวันที่ถูกจัดรูปแบบแล้ว
 */
function formatJsonDates(data, dateFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'date']) {
    const formattedData = { ...data };
    
    dateFields.forEach(field => {
        if (formattedData[field]) {
            formattedData[field] = window.formatDisplayDate(formattedData[field]);
        }
    });
    
    return formattedData;
}

/**
 * ฟังก์ชันสำหรับจัดรูปแบบวันที่ใน Firebase data
 * @param {Object} firebaseData - ข้อมูลจาก Firebase
 * @param {Array} dateFields - รายชื่อ field ที่เป็นวันที่
 * @returns {Object} ข้อมูลที่มีวันที่ถูกจัดรูปแบบแล้ว
 */
function formatFirebaseDates(firebaseData, dateFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'date']) {
    const formattedData = { ...firebaseData };
    
    dateFields.forEach(field => {
        if (formattedData[field]) {
            // จัดการกับ Firebase Timestamp
            if (formattedData[field].toDate) {
                formattedData[field] = window.formatDisplayDate(formattedData[field].toDate());
            } else {
                formattedData[field] = window.formatDisplayDate(formattedData[field]);
            }
        }
    });
    
    return formattedData;
}

/**
 * ฟังก์ชันสำหรับสร้าง HTML สำหรับแสดงวันที่
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการแสดง
 * @param {string} className - CSS class สำหรับ styling
 * @returns {string} HTML string สำหรับแสดงวันที่
 */
function createDateHTML(dateInput, className = 'date-display') {
    const formattedDate = window.formatDisplayDate(dateInput);
    return `<span class="${className}" data-date="${dateInput}">${formattedDate}</span>`;
}

/**
 * ฟังก์ชันสำหรับอัปเดตรูปแบบวันที่ในหน้าเว็บทั้งหมด
 */
function updateAllPageDates() {
    // จัดรูปแบบวันที่ในตาราง
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        formatTableDates(table);
    });
    
    // จัดรูปแบบวันที่ในหน้าเว็บ
    formatPageDates();
    
    // จัดรูปแบบวันที่ในฟอร์ม
    formatFormDates();
}

/**
 * ฟังก์ชันสำหรับตั้งค่า observer เพื่อติดตามการเปลี่ยนแปลง DOM
 */
function setupDateObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // ตรวจสอบและจัดรูปแบบวันที่ใน element ใหม่
                        const dateElements = node.querySelectorAll('[data-date]');
                        dateElements.forEach(element => {
                            const dateValue = element.getAttribute('data-date');
                            if (dateValue && dateValue !== 'ไม่ระบุ') {
                                const formattedDate = window.formatDisplayDate(dateValue);
                                element.textContent = formattedDate;
                            }
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// เริ่มต้นเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    // อัปเดตรูปแบบวันที่ในหน้าเว็บทั้งหมด
    updateAllPageDates();
    
    // ตั้งค่า observer สำหรับการเปลี่ยนแปลง DOM
    setupDateObserver();
});

// ทำให้ฟังก์ชันใช้งานได้แบบ global
window.formatTableDates = formatTableDates;
window.formatPageDates = formatPageDates;
window.formatFormDates = formatFormDates;
window.formatJsonDates = formatJsonDates;
window.formatFirebaseDates = formatFirebaseDates;
window.createDateHTML = createDateHTML;
window.updateAllPageDates = updateAllPageDates;
window.setupDateObserver = setupDateObserver;
