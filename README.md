# ⚡💧 EWMS - Electric & Water Management System

> ระบบบริหารจัดการค่าน้ำ - ค่าไฟ คณะ 9 วัดมหาธาตุฯ เขตพระนคร กรุงเทพมหานคร

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 📋 Overview

**EWMS (Electric & Water Management System)** คือ Web Application สำหรับบริหารจัดการค่าน้ำประปาและค่าไฟฟ้าของคณะ 9 วัดมหาธาตุฯ พัฒนาด้วย **Google Apps Script** ร่วมกับ **Google Sheets** เป็น Backend ใช้งานผ่านเบราว์เซอร์ทั้งบน PC และมือถือ รองรับการติดตั้งเป็นแอปบนหน้าจอหลัก (PWA-like)

## ✨ Features

### 🧮 การคำนวณอัตโนมัติ
- คำนวณค่าน้ำแบบ **หารเฉลี่ย** ตามจำนวนสมาชิกที่เข้าร่วม
- คำนวณค่าไฟฟ้ารายห้องจาก **เลขมิเตอร์ × อัตราต่อหน่วย**
- คำนวณค่าไฟฟ้าส่วนกลางแบบ **หารเฉลี่ย** อัตโนมัติ
- รองรับ **ยกเว้นการคิดค่าไฟ** สำหรับสมาชิกบางราย

### 📄 ใบแจ้งหนี้ (Invoice)
- สร้างใบแจ้งหนี้ **รายบุคคล** พร้อมรายละเอียดครบถ้วน
- **บันทึกเป็นรูปภาพ** (PNG) ด้วย html2canvas
- **พิมพ์** ใบแจ้งหนี้ผ่านเบราว์เซอร์
- **แชร์ผ่าน LINE** รองรับทั้งส่งรูปภาพ (Web Share API) และข้อความ

### 💳 ช่องทางการชำระเงิน
- จัดการช่องทางชำระเงินหลายรายการ
- แสดงข้อมูลบัญชีในใบแจ้งหนี้อัตโนมัติ

### 📱 Mobile Friendly
- Responsive Design รองรับทุกขนาดหน้าจอ
- PWA-like: ติดตั้งเป็นแอปบนหน้าจอหลักได้ทั้ง iOS และ Android
- คำแนะนำการติดตั้งแอปอัตโนมัติ

### 📊 Google Sheets Backend
- ข้อมูลสมาชิก, บันทึกการเก็บเงิน, ช่องทางชำระเงินเก็บใน Google Sheets
- ดูและแก้ไขข้อมูลดิบได้โดยตรงผ่าน Spreadsheet

---

## 🏗️ Project Structure

```
EWMS by Saila/
├── Code.gs             # Main entry point, Web App config, global constants
├── SheetService.gs     # Google Sheets data access layer (CRUD)
├── Calculation.gs      # Billing calculation logic & record saving
├── Index.html          # Main HTML template (UI structure)
├── Stylesheet.html     # CSS styles (embedded via include)
├── JavaScript.html     # Client-side JavaScript (embedded via include)
└── README.md           # This file
```

### File Descriptions

| File | Description |
|------|-------------|
| `Code.gs` | จุดเริ่มต้นของ Web App — `doGet()`, `include()`, ค่าคงที่ต่าง ๆ |
| `SheetService.gs` | ฟังก์ชันดึงข้อมูลจาก Google Sheets (`getMembers`, `getPaymentMethods`) |
| `Calculation.gs` | คำนวณค่าน้ำ-ค่าไฟ, บันทึกลง Records, อัปเดตมิเตอร์ล่าสุด |
| `Index.html` | โครงสร้าง HTML — ฟอร์มกรอกข้อมูล, Modal ใบแจ้งหนี้, Loading, Toast |
| `Stylesheet.html` | CSS ทั้งหมด — Design System, Responsive, Components |
| `JavaScript.html` | Client-side logic — Init, Render, Calculate, Invoice actions |

---

## 🔧 Google Sheets Structure

ระบบใช้ Google Sheets เป็นฐานข้อมูล โดยมี 3 ชีท:

### `Members` — ข้อมูลสมาชิก
| Column | Field | Description |
|--------|-------|-------------|
| A | `member_id` | รหัสสมาชิก |
| B | `meter_no` | เลขมิเตอร์ |
| C | `name` | ชื่อ |
| D | `water_active` | เข้าร่วมค่าน้ำ (TRUE/FALSE) |
| E | `electric_active` | เข้าร่วมค่าไฟ (TRUE/FALSE) |
| F | `common_electric_active` | เข้าร่วมไฟส่วนกลาง (TRUE/FALSE) |
| G | `is_exempt_electric` | ยกเว้นค่าไฟ (TRUE/FALSE) |
| H | `last_meter_reading` | เลขมิเตอร์ล่าสุด |

### `Records` — บันทึกการเก็บเงิน
สร้างอัตโนมัติเมื่อกดคำนวณ เก็บประวัติการเรียกเก็บทุกรอบ

### `Payment_methods` — ช่องทางชำระเงิน
| Column | Field | Description |
|--------|-------|-------------|
| A | `method_id` | รหัสช่องทาง |
| B | `method_name` | ชื่อช่องทาง (เช่น ธนาคาร) |
| C | `account_name` | ชื่อบัญชี |
| D | `account_number` | เลขที่บัญชี |
| E | `is_active` | เปิดใช้งาน (TRUE/FALSE) |

---

## 🚀 Deployment

### Prerequisites
- บัญชี Google ที่มีสิทธิ์สร้าง Google Apps Script
- Google Sheets สำหรับเก็บข้อมูล

### Steps

1. **สร้าง Google Sheets** — สร้าง Spreadsheet ใหม่ พร้อมชีท `Members` ตามโครงสร้างด้านบน

2. **สร้าง Apps Script Project**
   - ไปที่ [script.google.com](https://script.google.com) → สร้างโปรเจกต์ใหม่
   - หรือเปิดจาก Spreadsheet → Extensions → Apps Script

3. **คัดลอกไฟล์** — สร้างไฟล์ตามโครงสร้างโปรเจกต์ แล้วคัดลอกโค้ดลงไป

4. **ตั้งค่า `SPREADSHEET_ID`** — แก้ไขค่าใน `Code.gs` ให้ตรงกับ Spreadsheet ID ของคุณ:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```

5. **Deploy เป็น Web App**
   - กด **Deploy** → **New deployment**
   - เลือก Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (หรือตามต้องการ)
   - กด **Deploy**

6. **เข้าใช้งาน** — เปิด URL ที่ได้จากการ Deploy

---

## 📝 Usage

1. **กรอกค่าน้ำจากการประปา** — ยอดรวมค่าน้ำของเดือนนั้น
2. **กรอกค่าไฟจากการไฟฟ้า** — ยอดรวมค่าไฟของเดือนนั้น
3. **จดเลขมิเตอร์** — กรอกเลขมิเตอร์ปัจจุบันของแต่ละห้อง (เลขเดิมจะแสดงอัตโนมัติ)
4. **เลือกช่องทางชำระเงิน** — เลือกบัญชีที่จะแสดงในใบแจ้งหนี้
5. **กดคำนวณ** — ระบบจะคำนวณและสร้างใบแจ้งหนี้ทุกคน
6. **ส่งใบแจ้งหนี้** — บันทึกรูป / พิมพ์ / ส่ง LINE ได้ทันที

---

## 🧮 Calculation Logic

```
ค่าน้ำ (ต่อคน)       = ค่าน้ำรวม ÷ จำนวนสมาชิกที่เข้าร่วม
ค่าไฟห้อง (ต่อห้อง)   = (มิเตอร์หลัง - มิเตอร์ก่อน) × อัตราต่อหน่วย (5 บาท)
ค่าไฟส่วนกลาง        = (ค่าไฟรวม - ค่าไฟทุกห้องรวมกัน) ÷ จำนวนสมาชิกที่เข้าร่วม
รวมทั้งสิ้น            = ค่าน้ำ + ค่าไฟห้อง + ค่าไฟส่วนกลาง
```

---

## 🛠️ Tech Stack

- **Runtime**: [Google Apps Script](https://developers.google.com/apps-script)
- **Database**: [Google Sheets](https://www.google.com/sheets/about/)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Font**: [Noto Sans Thai](https://fonts.google.com/noto/specimen/Noto+Sans+Thai)
- **Image Export**: [html2canvas](https://html2canvas.hertzen.com/)
- **Sharing**: [LINE Share API](https://developers.line.biz/), [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

---

## 📄 License

This project is developed for internal use at **คณะ 9 วัดมหาธาตุฯ เขตพระนคร กรุงเทพมหานคร**.

---

<p align="center">
  Made with ❤️ by <strong>Saila</strong><br>
  <em>The9Electric&Water by Saila</em>
</p>
