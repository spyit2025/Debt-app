# Date Formatter Utility

ไฟล์ `date-formatter.js` ใช้สำหรับจัดรูปแบบวันที่/เวลาให้เป็นมาตรฐานเดียวกันทั่วทั้งโปรเจกต์

## รูปแบบวันที่ที่ใช้

- **รูปแบบมาตรฐาน**: วัน/เดือน/ปี (ค.ศ.) เวลา เช่น `25/08/2025 18:35`
- **รูปแบบวันที่เท่านั้น**: วัน/เดือน/ปี (ค.ศ.) เช่น `25/08/2025`
- **รูปแบบเวลาเท่านั้น**: ชั่วโมง.นาที เช่น `18.35`

## ฟังก์ชันที่ใช้ได้

### 1. `formatDateTime(dateInput, includeTime = true)`
จัดรูปแบบวันที่/เวลาแบบเต็ม
```javascript
// ตัวอย่างการใช้งาน
formatDateTime(new Date()) // "25/08/2025 18:35"
formatDateTime(firebaseTimestamp) // "25/08/2025 18:35"
formatDateTime("2025-08-25T18:35:00") // "25/08/2025 18:35"
```

### 2. `formatDate(dateInput)`
จัดรูปแบบวันที่เท่านั้น (ไม่รวมเวลา)
```javascript
// ตัวอย่างการใช้งาน
formatDate(new Date()) // "25/08/2025"
formatDate(firebaseTimestamp) // "25/08/2025"
```

### 3. `formatTime(dateInput)`
จัดรูปแบบเวลาเท่านั้น
```javascript
// ตัวอย่างการใช้งาน
formatTime(new Date()) // "18.35"
formatTime(firebaseTimestamp) // "18.35"
```

### 4. `formatRelativeDate(dateInput)`
จัดรูปแบบวันที่แบบย่อ (เช่น วันนี้, เมื่อวาน)
```javascript
// ตัวอย่างการใช้งาน
formatRelativeDate(new Date()) // "วันนี้"
formatRelativeDate(yesterday) // "เมื่อวาน"
formatRelativeDate(weekAgo) // "7 วันที่แล้ว"
```

## การใช้งานในไฟล์ HTML

เพิ่ม script tag ในส่วน head ของไฟล์ HTML:

```html
<!-- Date Formatter Utility -->
<script src="../../assets/js/utils/date-formatter.js"></script>
```

## การใช้งานในไฟล์ JavaScript

แทนที่ฟังก์ชัน formatDate เดิมด้วยฟังก์ชันใหม่:

```javascript
// เดิม
function formatDate(timestamp) {
    if (!timestamp) return 'ไม่ระบุ';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ใหม่
function formatDate(timestamp) {
    return formatDateTime(timestamp, true);
}
```

## ประเภทข้อมูลที่รองรับ

- **Firebase Timestamp**: ใช้ `.toDate()` อัตโนมัติ
- **Date Object**: ใช้โดยตรง
- **String**: แปลงเป็น Date object
- **Number**: แปลงเป็น Date object (timestamp)
- **null/undefined**: คืนค่า "ไม่ระบุ"

## ข้อดีของการใช้ฟังก์ชันนี้

1. **ความสม่ำเสมอ**: รูปแบบวันที่เหมือนกันทั่วทั้งโปรเจกต์
2. **ง่ายต่อการบำรุงรักษา**: แก้ไขที่เดียว เปลี่ยนทั้งระบบ
3. **รองรับ Firebase**: จัดการ Firebase Timestamp อัตโนมัติ
4. **Error Handling**: จัดการข้อผิดพลาดได้ดี
5. **ยืดหยุ่น**: มีหลายฟังก์ชันให้เลือกใช้ตามความเหมาะสม

