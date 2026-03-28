/**
 * ============================================================
 * EWMS - Code.gs (Main Entry Point)
 * ระบบบริหารจัดการค่าน้ำ - ค่าไฟ คณะ 9
 * วัดมหาธาตุฯ เขตพระนคร กรุงเทพมหานคร
 * ============================================================
 * The9Electric&Water by Saila
 * ============================================================
 */

// ==================== CONFIG ====================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← ใส่ Spreadsheet ID ของคุณที่นี่
const RATE_PER_UNIT = 5; // ค่าไฟต่อหน่วย (บาท)

// ชื่อชีทใน Spreadsheet
const SHEET_MEMBERS = 'Members';
const SHEET_RECORDS = 'Records';
const SHEET_PAYMENT = 'Payment_methods';

// ==================== WEB APP ====================

/**
 * doGet() - จุดเริ่มต้นของ Web App
 * ใช้ createTemplateFromFile เพื่อ include ไฟล์ CSS/JS แยก
 */
function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('EWMS - ระบบค่าน้ำค่าไฟ คณะ 9')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * include() - สำหรับ include ไฟล์ HTML/CSS/JS แยก
 * ใช้ใน Index.html แบบ <?!= include('Stylesheet') ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * testConnection() - ทดสอบการเชื่อมต่อ (สำหรับ debug)
 */
function testConnection() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_MEMBERS);
    if (!sheet) {
      return { success: false, error: 'ไม่พบชีท: ' + SHEET_MEMBERS, sheets: ss.getSheets().map(function(s) { return s.getName(); }) };
    }
    var rowCount = sheet.getLastRow();
    return { success: true, sheetName: sheet.getName(), rowCount: rowCount };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
