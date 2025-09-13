# E-Learning Platform

แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทันสมัย พัฒนาด้วย Firebase และ JavaScript

## 🚀 คุณสมบัติหลัก

- **ระบบ Authentication** - เข้าสู่ระบบด้วย Firebase Auth
- **จัดการผู้ใช้** - รองรับ 3 ประเภท: นักเรียน, ผู้สอน, แอดมิน
- **ระบบคอร์ส** - สร้างและจัดการคอร์สออนไลน์
- **ระบบข้อสอบ** - สร้างและทำข้อสอบออนไลน์
- **ติดตามความคืบหน้า** - ดูสถิติการเรียนและผลการสอบ
- **ระบบรายงาน** - รายงานสถิติต่างๆ ของระบบ

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **UI Framework**: Bootstrap 5
- **Icons**: Bootstrap Icons
- **Firebase SDK**: CDN (v10.7.0)

## 📦 การติดตั้ง

### 1. Clone โปรเจค
```bash
git clone <repository-url>
cd e-learning-app
```

### 2. รันโปรเจค
```bash
npm start
```

หรือเปิดไฟล์ `index.html` ในเบราว์เซอร์โดยตรง

## 🔧 การตั้งค่า Firebase

### 1. สร้างโปรเจค Firebase
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก "Add project"
3. ตั้งชื่อโปรเจค: `e-learning-app2-127d0`
4. เลือกการตั้งค่า Google Analytics (ไม่บังคับ)

### 2. เพิ่ม Web App
1. คลิกไอคอนเว็บ (</>) ในหน้าโปรเจค
2. ตั้งชื่อแอป: `E-Learning Platform`
3. คัดลอก Firebase Config
4. แก้ไขไฟล์ `assets/js/firebase-config.js`

### 3. เปิดใช้งาน Authentication
1. ไปที่ "Authentication" ในเมนูด้านซ้าย
2. คลิก "Get started"
3. เปิดใช้งาน "Email/Password" provider

### 4. สร้าง Firestore Database
1. ไปที่ "Firestore Database" ในเมนูด้านซ้าย
2. คลิก "Create database"
3. เลือก "Start in test mode" (สำหรับการพัฒนา)
4. เลือก location ที่ใกล้ที่สุด

### 5. ตั้งค่า Firestore Rules
1. ไปที่ "Firestore Database" > "Rules"
2. คัดลอกเนื้อหาจากไฟล์ `firestore.rules`
3. คลิก "Publish"

## 👥 บัญชีทดสอบ

คุณสามารถสร้างบัญชีทดสอบได้โดยการสมัครสมาชิกใหม่:

| ประเภท | อีเมล | รหัสผ่าน |
|--------|-------|----------|
| นักเรียน | student@test.com | password123 |
| ผู้สอน | instructor@test.com | password123 |
| แอดมิน | admin@test.com | password123 |

## 📁 โครงสร้างโปรเจค

```
e-learning-app/
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── firebase-config.js
│       ├── auth.js
│       ├── register.js
│       └── ...
├── pages/
│   ├── auth/
│   │   ├── login.html
│   │   └── register.html
│   ├── dashboard/
│   │   ├── student-dashboard.html
│   │   ├── instructor-dashboard.html
│   │   └── admin-dashboard.html
│   └── ...
├── index.html

└── package.json
```

## 🔧 การพัฒนา

### การเพิ่มฟีเจอร์ใหม่
1. สร้างไฟล์ HTML ในโฟลเดอร์ที่เหมาะสม
2. สร้างไฟล์ JavaScript สำหรับฟังก์ชันการทำงาน
3. อัปเดต Firebase Security Rules หากจำเป็น

### การปรับแต่ง UI
- แก้ไขไฟล์ `assets/css/style.css`
- ใช้ Bootstrap classes สำหรับ responsive design

## 🔐 ความปลอดภัย

- ใช้ Firebase Authentication สำหรับการยืนยันตัวตน
- Firestore Security Rules ป้องกันการเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต
- รหัสผ่านถูกเข้ารหัสด้วย Firebase Auth

## 📊 การใช้งาน Firebase

### Authentication
```javascript
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { auth } from './firebase-config.js';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
```

### Firestore
```javascript
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// อ่านข้อมูล
const userDoc = await getDoc(doc(db, 'users', userId));

// เขียนข้อมูล
await setDoc(doc(db, 'users', userId), userData);
```

## 🚀 การ Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### GitHub Pages
1. Push โค้ดไปยัง GitHub
2. เปิดใช้งาน GitHub Pages ใน repository settings
3. ตั้งค่า custom domain (ถ้าต้องการ)

## 📝 License

MIT License - ดูรายละเอียดในไฟล์ [LICENSE](LICENSE)

## 🤝 การสนับสนุน

หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาสร้าง Issue ใน GitHub repository

---

**พัฒนาโดย** [ชื่อของคุณ]  
**เวอร์ชัน** 1.0.0
