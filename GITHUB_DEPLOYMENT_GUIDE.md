# 🚀 คู่มือการ Deploy ไป GitHub Pages

## 📋 **ขั้นตอนการ Deploy**

### **1. สร้าง GitHub Repository**

1. ไปที่ [GitHub.com](https://github.com)
2. คลิก **"New repository"**
3. ตั้งชื่อ repository: `debt-app`
4. เลือก **"Public"** (จำเป็นสำหรับ GitHub Pages ฟรี)
5. คลิก **"Create repository"**

### **2. อัปโหลดไฟล์ไป GitHub**

#### **วิธีที่ 1: ใช้ GitHub Desktop**
1. ดาวน์โหลด [GitHub Desktop](https://desktop.github.com/)
2. Clone repository ที่สร้างไว้
3. Copy ไฟล์ทั้งหมดในโฟลเดอร์ `Debt app 6-09-2025` ไปในโฟลเดอร์ repository
4. Commit และ Push ไป GitHub

#### **วิธีที่ 2: ใช้ Git Command Line**
```bash
# เปิด Command Prompt หรือ PowerShell
cd "C:\Users\kangk\OneDrive\Desktop\Debt app 6-09-2025"

# เริ่มต้น Git repository
git init

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit ครั้งแรก
git commit -m "Initial commit: Debt App"

# เชื่อมต่อกับ GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/debt-app.git

# Push ไป GitHub
git push -u origin main
```

#### **วิธีที่ 3: อัปโหลดผ่านเว็บ**
1. ไปที่ repository ที่สร้างไว้
2. คลิก **"uploading an existing file"**
3. ลากไฟล์ทั้งหมดจากโฟลเดอร์ `Debt app 6-09-2025` ไปในหน้าเว็บ
4. Commit changes

### **3. เปิดใช้งาน GitHub Pages**

1. ไปที่ repository บน GitHub
2. คลิก **"Settings"** tab
3. เลื่อนลงไปหา **"Pages"** ในเมนูซ้าย
4. ใน **"Source"** เลือก **"Deploy from a branch"**
5. เลือก **"main"** branch และ **"/ (root)"** folder
6. คลิก **"Save"**

### **4. รอการ Deploy**

- GitHub จะใช้เวลา 2-10 นาทีในการ deploy
- URL ของเว็บไซต์จะเป็น: `https://YOUR_USERNAME.github.io/debt-app`

## 🔧 **การตั้งค่าเพิ่มเติม**

### **อัปเดต Firebase Configuration**

หากต้องการเปลี่ยน domain ให้อัปเดตไฟล์ `firebase.json`:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### **อัปเดต Service Worker**

อัปเดตไฟล์ `sw.js` เพื่อให้ทำงานกับ GitHub Pages:

```javascript
const CACHE_NAME = 'debt-app-v1.0.0';
const STATIC_CACHE = 'debt-app-static-v1.0.0';
const DYNAMIC_CACHE = 'debt-app-dynamic-v1.0.0';
```

## 🌐 **URL ของเว็บไซต์**

หลังจาก deploy เสร็จ เว็บไซต์จะอยู่ที่:
- **URL:** `https://YOUR_USERNAME.github.io/debt-app`
- **ตัวอย่าง:** `https://kangkaj.github.io/debt-app`

## 🔄 **การอัปเดตเว็บไซต์**

เมื่อต้องการอัปเดตเว็บไซต์:

1. แก้ไขไฟล์ในโปรเจค
2. Commit และ Push ไป GitHub
3. GitHub Pages จะอัปเดตอัตโนมัติ

## ❗ **ข้อควรระวัง**

1. **Repository ต้องเป็น Public** เพื่อใช้ GitHub Pages ฟรี
2. **ไฟล์ต้องอยู่ใน root directory** ของ repository
3. **ไฟล์ `index.html` ต้องอยู่ที่ root** ของ repository
4. **GitHub Pages รองรับ HTTPS เท่านั้น**

## 🆘 **การแก้ไขปัญหา**

### **เว็บไซต์ไม่แสดงผล**
- ตรวจสอบว่าไฟล์ `index.html` อยู่ที่ root ของ repository
- ตรวจสอบว่า repository เป็น Public
- รอ 5-10 นาทีหลังจาก push

### **ไฟล์ไม่อัปเดต**
- ตรวจสอบ cache ของ browser
- ใช้ Ctrl+F5 เพื่อ hard refresh
- ตรวจสอบว่าไฟล์ถูก push ไป GitHub แล้ว

### **Firebase ไม่ทำงาน**
- ตรวจสอบ Firebase configuration
- ตรวจสอบว่า domain ถูกต้องใน Firebase Console
- ตรวจสอบ CORS settings

## 📞 **การติดต่อ**

หากมีปัญหาการ deploy กรุณาติดต่อ:
- GitHub Support: [support.github.com](https://support.github.com)
- GitHub Pages Documentation: [docs.github.com/en/pages](https://docs.github.com/en/pages)
