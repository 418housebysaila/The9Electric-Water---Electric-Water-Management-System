# The9Electric&Water - Electric & Water Management System (V.1.4.8)

> **"The9Electric&Water by Saila"**
> ระบบบริหารจัดการค่าน้ำ - ค่าไฟ คณะ 9 วัดมหาธาตุฯ เขตพระนคร กรุงเทพมหานคร
> พัฒนาขึ้นเพื่อมอบประสบการณ์การใช้งานที่ลื่นไหลเหมือน Native App บนมือถือ พร้อมเทคโนโลยี AI ช่วยอ่านมิเตอร์

---

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white)

---

## 📋 ภาพรวมโครงการ (Overview)

**The9Electric&Water** เป็นระบบ Single Page Application (SPA) ที่ถูกพัฒนาขึ้นเพื่อยกระดับการจัดการสาธารณูปโภคภายในคณะ 9 วัดมหาธาตุฯ จากการจดด้วยมือสู่ระบบดิจิทัลเต็มรูปแบบ โดยเน้นความสวยงาม ประสิทธิภาพ และความปลอดภัยของข้อมูล

---

## 🌟 ฟีเจอร์เด่น (Key Features)

#### 🤖 AI-Powered OCR (New!)
- ระบบอ่านเลขมิเตอร์ไฟฟ้าอัตโนมัติจากรูปถ่าย โดยใช้ **Google Gemini API**
- รองรับการถ่ายรูปจากกล้องมือถือหรือเรียกจากคลังภาพ
- ลดความผิดพลาดในการกรอกตัวเลขและประหยัดเวลา

#### 📊 Dashboard & Trend Monitoring
- กราฟเส้นแสดงแนวโน้มยอดบิลประปาและไฟฟ้าจากหลวง (6 เดือนย้อนหลัง)
- แผนภูมิแท่งสรุปค่าไฟส่วนกลางรวมรายเดือน
- อันดับผู้ใช้ที่มีการใช้งานสูงสุดรายปี (Yearly Ranking)

#### 🔒 Security & Data Integrity
- **Auth Guard System:** ตรวจสอบสิทธิ์เข้าใช้งานผ่านอีเมล (อ้างอิงจากชีท `Admins`)
- **Double-Billing Protection:** ป้องกันการบันทึกบิลซ้ำในเดือนเดียวกัน
- **Rollback System:** สามารถย้อนกลับบิลรอบล่าสุดเพื่อแก้ไขข้อมูลได้ โดยระบบจะคืนค่ามิเตอร์เดิมให้ตามลำดับ
- **Double-Submit Protection:** กันการกดปุ่มบันทึกซ้ำซ้อน

#### 📱 Native-Like UI/UX
- ออกแบบด้วย **Tailwind CSS** ให้ความรู้สึกเหมือนแอปพลิเคชันจริง
- ระบบ **Bottom Navigation Bar** และ Smooth Transition ระหว่าง Tab
- **Draft System:** บันทึกตัวเลขที่จดไว้ลงใน Local Storage ของเครื่องชั่วคราว ป้องกันข้อมูลหายหากเน็ตหลุดหรือเครื่องรีเฟรช

### 📄 ใบแจ้งหนี้และการชำระเงิน (Invoicing & Payment)
เน้นความสะดวกของสมาชิกเป็นที่ตั้ง
- **Dynamic PromptPay QR:** สร้าง QR Code ตามยอดที่ต้องจ่ายจริงรายบุคคล ไม่ต้องกรอกตัวเลขเอง ป้องกันการโอนผิด
- **Multi-Channel Share:** ส่งใบแจ้งหนี้ให้สมาชิกได้ทันที ทั้งการบันทึกเป็นรูปภาพ, ส่งเข้ากลุ่ม LINE หรือสั่งพิมพ์
---

## 🏗️ โครงสร้างไฟล์ (Project Structure)

```
The9EWMS/
├── Code.gs             # จุดเริ่มต้นระบบ, Auth Guard, Dashboard API, Gemini OCR Bridge
├── SheetService.gs     # ชั้นจัดการข้อมูล Sheets (เพิ่ม/ลบสมาชิก, รันรหัสอัตโนมัติ)
├── Calculation.gs      # ตรรกะการคำนวณขั้นสูง และระบบป้องกันการบันทึกผิดพลาด
├── Index.html          # โครงสร้าง UI หลัก (SPA Structure)
├── Stylesheet.html     # CSS Design System (Tailwind Custom & Component CSS)
├── JavaScript.html     # Client-side Logic (OCR, Chart.js, QR Generation, Local Draft)
└── README.md           # คู่มือการใช้งาน
```

---

## 🔧 การตั้งค่าก่อนใช้งาน (Configuration)

ระบบจำเป็นต้องตั้งค่า **Script Properties** เพื่อความปลอดภัยและทำงานร่วมกับ API ภายนอก:

1. **SPREADSHEET_ID**: ID ของ Google Sheets ที่ใช้เป็น Database
2. **GEMINI_API_KEY**: API Key สำหรับใช้งานระบบอ่านมิเตอร์ด้วย AI (รับได้จาก Google AI Studio)
3. **RATE_PER_UNIT**: อัตราค่าไฟฟ้าต่อหน่วย (ตั้งค่าผ่านหน้า UI ได้ภายหลัง)

---

## 🚀 การติดตั้ง (Deployment)

1. **เตรียม Google Sheet**: สร้างไฟล์ Google Sheet ใหม่ และจำ ID ของไฟล์ไว้
2. **เพิ่มโค้ด**: คัดลอกโค้ดทั้ง 6 ไฟล์ลงใน Apps Script Project
3. **ตั้งราคาและแจ้งเตือน**: เข้า Tab ตั้งค่าเพื่อกำหนดค่าไฟต่อหน่วยและวันที่แจ้งเตือน
4. **เพิ่ม Admin**: ใส่รายการอีเมลผู้มีสิทธิ์ใช้งานลงในชีท `Admins` (ระบบจะสร้างชีทให้เมื่อรันแอปครั้งแรก)
5. **Deploy**: เลือก "Web App" -> Execute as "Me" -> Who has access "Anyone" (การเช็คสิทธิ์จะทำผ่านโค้ด `checkAuth_` แทน)

---

## 🧮 ตรรกะการคำนวณ (Calculation Logic)

ระบบใช้สูตรมาตรฐานหอพัก:
- **ค่าน้ำประปา**: ยอดรวม ÷ จำนวนสมาชิก (ที่เปิดสถานะใช้น้ำ)
- **ค่าไฟฟ้าห้อง**: (มิเตอร์ปัจจุบัน - มิเตอร์เดิม) × อัตราหน่วย
- **ค่าไฟฟ้าส่วนกลาง**: (ยอดบิลรวม - ยอดรวมทุกห้อง) ÷ จำนวนสมาชิก (ที่เปิดสถานะไฟส่วนกลาง)
- **Reconciliation**: ระบบจะตรวจสอบยอดผลรวมรายคนให้ตรงกับยอดบิลหลวงก่อนบันทึกเสมอ (หากต่างเกิน 0.50 บาท ระบบจะแจ้งเตือน)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Styling**: Tailwind CSS, Google Fonts (Noto Sans Thai)
- **AI**: Google Gemini Pro Vision / Flash
- **Charts**: Chart.js
- **Image Generation**: html2canvas
- **QR Code**: JavaScript Payload Generator + API

---

## ⚖️ สัญญาอนุญาต (License)

โปรเจกต์นี้พัฒนาขึ้นโดย **Saila** สำหรับใช้งานภายใน **คณะ 9 วัดมหาธาตุฯ** สงวนลิขสิทธิ์ในการนำไปจำหน่ายต่อหรือแอบอ้างผลงาน

---
<p align="center">
  <strong>The9Electric&Water by Saila</strong><br>
  <em>"Smart Utility Management for Modern Monastic Life"</em>
</p>
