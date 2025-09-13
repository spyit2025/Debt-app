/**
 * ไฟล์ wrapper สำหรับ backward compatibility
 * ทำให้ไฟล์ HTML ที่ใช้ script tag ปกติยังใช้งานได้
 */

// ฟังก์ชันสำหรับจัดรูปแบบวันที่/เวลาให้เป็นมาตรฐานเดียวกัน
// รูปแบบ: วัน/เดือน/ปี (ค.ศ.) เวลา เช่น 25/08/2025 18.35

/**
 * จัดรูปแบบวันที่/เวลาให้เป็นรูปแบบมาตรฐาน
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @param {boolean} includeTime - ต้องการแสดงเวลาหรือไม่ (default: true)
 * @returns {string} วันที่ในรูปแบบ วัน/เดือน/ปี เวลา
 */
function formatDateTime(dateInput, includeTime = true) {
    try {
        let date;
        
        // จัดการกับ Firebase Timestamp
        if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
            date = dateInput.toDate();
        }
        // จัดการกับ Date object
        else if (dateInput instanceof Date) {
            date = dateInput;
        }
        // จัดการกับ string หรือ number
        else if (dateInput) {
            date = new Date(dateInput);
        }
        else {
            return 'ไม่ระบุ';
        }
        
        // ตรวจสอบว่า date ถูกต้องหรือไม่
        if (isNaN(date.getTime())) {
            return 'ไม่ระบุ';
        }
        
        // จัดรูปแบบวันที่
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        let formattedDate = `${day}/${month}/${year}`;
        
        // เพิ่มเวลาหากต้องการ
        if (includeTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedDate += ` ${hours}.${minutes}`;
        }
        
        return formattedDate;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'ไม่ระบุ';
    }
}

/**
 * จัดรูปแบบวันที่เท่านั้น (ไม่รวมเวลา)
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} วันที่ในรูปแบบ วัน/เดือน/ปี
 */
function formatDate(dateInput) {
    return formatDateTime(dateInput, false);
}

/**
 * จัดรูปแบบเวลาที่เท่านั้น
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} เวลาในรูปแบบ HH.MM
 */
function formatTime(dateInput) {
    try {
        let date;
        
        // จัดการกับ Firebase Timestamp
        if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
            date = dateInput.toDate();
        }
        // จัดการกับ Date object
        else if (dateInput instanceof Date) {
            date = dateInput;
        }
        // จัดการกับ string หรือ number
        else if (dateInput) {
            date = new Date(dateInput);
        }
        else {
            return 'ไม่ระบุ';
        }
        
        // ตรวจสอบว่า date ถูกต้องหรือไม่
        if (isNaN(date.getTime())) {
            return 'ไม่ระบุ';
        }
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}.${minutes}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'ไม่ระบุ';
    }
}

/**
 * จัดรูปแบบวันที่แบบย่อ (เช่น วันนี้, เมื่อวาน, 2 วันที่แล้ว)
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} วันที่แบบย่อ
 */
function formatRelativeDate(dateInput) {
    try {
        let date;
        
        // จัดการกับ Firebase Timestamp
        if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
            date = dateInput.toDate();
        }
        // จัดการกับ Date object
        else if (dateInput instanceof Date) {
            date = dateInput;
        }
        // จัดการกับ string หรือ number
        else if (dateInput) {
            date = new Date(dateInput);
        }
        else {
            return 'ไม่ระบุ';
        }
        
        // ตรวจสอบว่า date ถูกต้องหรือไม่
        if (isNaN(date.getTime())) {
            return 'ไม่ระบุ';
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'วันนี้';
        } else if (diffDays === 1) {
            return 'เมื่อวาน';
        } else if (diffDays <= 7) {
            return `${diffDays} วันที่แล้ว`;
        } else {
            return formatDate(dateInput);
        }
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return 'ไม่ระบุ';
    }
}

/**
 * จัดรูปแบบวันที่สำหรับตาราง (แสดงทั้งวันที่และเวลา)
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} วันที่ในรูปแบบ วัน/เดือน/ปี เวลา
 */
function formatTableDate(dateInput) {
    return formatDateTime(dateInput, true);
}

/**
 * จัดรูปแบบวันที่สำหรับการแสดงผลในหน้าเว็บ
 * @param {Date|string|number|FirebaseTimestamp} dateInput - วันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} วันที่ในรูปแบบ วัน/เดือน/ปี เวลา
 */
function formatDisplayDate(dateInput) {
    return formatDateTime(dateInput, true);
}

// ทำให้ฟังก์ชันใช้งานได้แบบ global
window.formatDateTime = formatDateTime;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatRelativeDate = formatRelativeDate;
window.formatTableDate = formatTableDate;
window.formatDisplayDate = formatDisplayDate;

// สำหรับ CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDateTime,
        formatDate,
        formatTime,
        formatRelativeDate,
        formatTableDate,
        formatDisplayDate
    };
}
