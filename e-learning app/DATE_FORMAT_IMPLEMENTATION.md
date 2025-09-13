# ระบบจัดการรูปแบบวันที่ - E-Learning Platform

## ภาพรวม

ระบบจัดการรูปแบบวันที่ถูกออกแบบมาเพื่อให้การแสดงผลวันที่ในทุกหน้าของแพลตฟอร์มเป็นรูปแบบมาตรฐานเดียวกัน คือ **วัน/เดือน/ปี เวลา** เช่น `25/08/2025 18.35`

## ไฟล์ที่เกี่ยวข้อง

### 1. `assets/js/utils/date-formatter.js`
ไฟล์หลักที่ประกอบด้วยฟังก์ชันสำหรับจัดรูปแบบวันที่:

- `formatDateTime(dateInput, includeTime)` - จัดรูปแบบวันที่และเวลา
- `formatDate(dateInput)` - จัดรูปแบบวันที่เท่านั้น
- `formatTime(dateInput)` - จัดรูปแบบเวลาเท่านั้น
- `formatTableDate(dateInput)` - สำหรับแสดงในตาราง
- `formatDisplayDate(dateInput)` - สำหรับแสดงในหน้าเว็บ

### 2. `assets/js/date-format-implementation.js`
ไฟล์สำหรับจัดการรูปแบบวันที่ในทุกหน้า:

- `formatTableDates()` - จัดรูปแบบวันที่ในตาราง
- `formatPageDates()` - จัดรูปแบบวันที่ในหน้าเว็บ
- `formatFirebaseDates()` - จัดรูปแบบวันที่จาก Firebase
- `updateAllPageDates()` - อัปเดตรูปแบบวันที่ทั้งหมด

## การใช้งาน

### 1. การแสดงวันที่ใน HTML

```html
<!-- ใช้ data-date attribute -->
<span data-date="2025-08-25T18:35:00Z">25/08/2025 18.35</span>

<!-- ใช้ class สำหรับคอลัมน์วันที่ในตาราง -->
<td class="date-column" data-date="2025-08-25T18:35:00Z">25/08/2025 18.35</td>
```

### 2. การใช้งานใน JavaScript

```javascript
// ฟังก์ชันจะถูกโหลดเป็น global functions
// จัดรูปแบบวันที่
const formattedDate = formatDisplayDate('2025-08-25T18:35:00Z');
console.log(formattedDate); // "25/08/2025 18.35"

// จัดรูปแบบวันที่จาก Firebase Timestamp
const firebaseTimestamp = firebase.firestore.Timestamp.now();
const formattedDate = formatDisplayDate(firebaseTimestamp);
```

### 3. การใช้งานในตาราง

```javascript
// จัดรูปแบบวันที่ในตารางทั้งหมด
const table = document.querySelector('#coursesTable');
formatTableDates(table, '.date-column');
```

## รูปแบบวันที่ที่รองรับ

### Input Formats
- Date Object: `new Date()`
- ISO String: `"2025-08-25T18:35:00Z"`
- Timestamp: `1640995200000`
- Firebase Timestamp: `firebase.firestore.Timestamp`
- String: `"2025-08-25"`

### Output Format
- **รูปแบบมาตรฐาน**: `25/08/2025 18.35`
- **เฉพาะวันที่**: `25/08/2025`
- **เฉพาะเวลา**: `18.35`

## การตั้งค่าในหน้าเว็บ

### 1. เพิ่ม Script ใน HTML

```html
<head>
    <!-- Date Formatter Utility -->
    <script src="../../assets/js/utils/date-formatter-legacy.js"></script>
    <script src="../../assets/js/date-format-implementation.js"></script>
</head>
```

### 2. ใช้ data-date Attribute

```html
<!-- วันที่จะถูกจัดรูปแบบอัตโนมัติ -->
<span data-date="2025-08-25T18:35:00Z"></span>
```

### 3. ใช้ Class สำหรับตาราง

```html
<!-- คอลัมน์วันที่ในตาราง -->
<td class="date-column" data-date="2025-08-25T18:35:00Z"></td>
```

## การจัดการกับ Firebase

### 1. Firebase Timestamp

```javascript
// จัดการกับ Firebase Timestamp อัตโนมัติ
const firebaseData = {
    createdAt: firebase.firestore.Timestamp.now(),
    updatedAt: firebase.firestore.Timestamp.now()
};

const formattedData = formatFirebaseDates(firebaseData);
```

### 2. การบันทึกข้อมูล

```javascript
// บันทึกข้อมูลพร้อมวันที่
const courseData = {
    title: 'คอร์สใหม่',
    description: 'คำอธิบายคอร์ส',
    createdAt: firebase.firestore.Timestamp.now(),
    updatedAt: firebase.firestore.Timestamp.now()
};

await addDoc(collection(db, 'courses'), courseData);
```

## การปรับแต่ง

### 1. เปลี่ยนรูปแบบวันที่

แก้ไขใน `assets/js/utils/date-formatter.js`:

```javascript
// เปลี่ยนรูปแบบเวลา
const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
```

### 2. เพิ่มฟิลด์วันที่ใหม่

แก้ไขใน `assets/js/date-format-implementation.js`:

```javascript
const dateFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'date', 'newDateField'];
```

## ตัวอย่างการใช้งาน

### 1. หน้า manage-courses.html

```html
<!-- ตารางคอร์ส -->
<table id="coursesTable">
    <thead>
        <tr>
            <th>ชื่อคอร์ส</th>
            <th>วันที่สร้าง</th>
            <th>วันที่อัปเดต</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>คอร์ส JavaScript</td>
            <td class="date-column" data-date="2025-08-25T18:35:00Z"></td>
            <td class="date-column" data-date="2025-08-26T10:15:00Z"></td>
        </tr>
    </tbody>
</table>
```

### 2. การแสดงผลใน JavaScript

```javascript
// สร้าง HTML สำหรับแสดงวันที่
const dateHTML = createDateHTML('2025-08-25T18:35:00Z', 'course-date');
document.getElementById('dateContainer').innerHTML = dateHTML;
```

## การแก้ไขปัญหา

### 1. วันที่ไม่แสดงผล

ตรวจสอบ:
- ไฟล์ script ถูกโหลดหรือไม่
- data-date attribute มีค่าถูกต้องหรือไม่
- Console มี error หรือไม่

### 2. รูปแบบวันที่ไม่ถูกต้อง

ตรวจสอบ:
- ฟังก์ชัน formatDateTime ทำงานถูกต้องหรือไม่
- Input format ถูกต้องหรือไม่

### 3. Firebase Timestamp ไม่แสดง

ตรวจสอบ:
- ใช้ฟังก์ชัน formatFirebaseDates หรือไม่
- Firebase Timestamp ถูกต้องหรือไม่

## การทดสอบ

### 1. ทดสอบรูปแบบวันที่

```javascript
// ทดสอบรูปแบบต่างๆ
console.log(formatDisplayDate(new Date())); // วันที่ปัจจุบัน
console.log(formatDisplayDate('2025-08-25T18:35:00Z')); // ISO string
console.log(formatDisplayDate(1640995200000)); // Timestamp
```

### 2. ทดสอบในหน้าเว็บ

1. เปิดหน้าเว็บที่มีตารางข้อมูล
2. ตรวจสอบว่าวันที่แสดงในรูปแบบ `25/08/2025 18.35`
3. ตรวจสอบ Console ไม่มี error

## การบำรุงรักษา

### 1. อัปเดตฟังก์ชัน

เมื่อต้องการเปลี่ยนรูปแบบวันที่:
1. แก้ไขใน `assets/js/utils/date-formatter.js`
2. ทดสอบในทุกหน้าที่เกี่ยวข้อง
3. อัปเดตเอกสารนี้

### 2. เพิ่มฟีเจอร์ใหม่

เมื่อต้องการเพิ่มฟีเจอร์ใหม่:
1. เพิ่มฟังก์ชันใน `assets/js/utils/date-formatter.js`
2. อัปเดต `assets/js/date-format-implementation.js`
3. ทดสอบและอัปเดตเอกสาร

## สรุป

ระบบจัดการรูปแบบวันที่ช่วยให้การแสดงผลวันที่ในแพลตฟอร์มเป็นมาตรฐานเดียวกัน และง่ายต่อการบำรุงรักษา โดยใช้รูปแบบ **วัน/เดือน/ปี เวลา** ที่เข้าใจง่ายสำหรับผู้ใช้ชาวไทย
