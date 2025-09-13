# GitHub Pages Deployment Guide

## 🚀 การ Deploy ไปยัง GitHub Pages

### ขั้นตอนที่ 1: ตั้งค่า GitHub Pages

1. ไปที่ repository: https://github.com/spyit2025/Debt-app
2. คลิกที่แท็บ **Settings**
3. เลื่อนลงไปที่ส่วน **Pages** (ในเมนูด้านซ้าย)
4. ในส่วน **Source**:
   - เลือก **GitHub Actions** (ไม่ใช่ Deploy from a branch)
5. บันทึกการตั้งค่า

### ขั้นตอนที่ 2: ตรวจสอบ GitHub Actions

1. ไปที่แท็บ **Actions** ใน repository
2. ตรวจสอบว่า workflow "Deploy to GitHub Pages" ทำงานสำเร็จ
3. หากมี error ให้ตรวจสอบ logs

### ขั้นตอนที่ 3: เข้าถึงเว็บไซต์

หลังจาก deployment สำเร็จ เว็บไซต์จะพร้อมใช้งานที่:
- **URL**: https://debt-app.spyit2025.github.io
- **Custom Domain**: debt-app.spyit2025.github.io

### 🔧 การแก้ไขปัญหา

#### หาก GitHub Actions ล้มเหลว:
1. ตรวจสอบไฟล์ `.github/workflows/deploy.yml`
2. ตรวจสอบว่าไฟล์ `package.json` มี dependencies ที่ถูกต้อง
3. ตรวจสอบ logs ใน GitHub Actions

#### หากเว็บไซต์ไม่ทำงาน:
1. ตรวจสอบ Firebase configuration
2. ตรวจสอบ CORS settings
3. ตรวจสอบ console errors ใน browser

### 📝 หมายเหตุสำคัญ

- เว็บไซต์จะอัปเดตอัตโนมัติทุกครั้งที่ push code ไปยัง branch `main`
- Firebase configuration จะทำงานได้ปกติบน GitHub Pages
- หากต้องการใช้ custom domain ให้อัปเดตไฟล์ `CNAME`

### 🔗 Links

- **Repository**: https://github.com/spyit2025/Debt-app
- **Live Site**: https://debt-app.spyit2025.github.io
- **GitHub Actions**: https://github.com/spyit2025/Debt-app/actions