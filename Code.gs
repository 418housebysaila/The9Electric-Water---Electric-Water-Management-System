/**
 * ============================================================
 * EWMS - Code.gs (Main Entry Point)
 * ระบบบริหารจัดการค่าน้ำ - ค่าไฟ คณะ 9
 * วัดมหาธาตุฯ เขตพระนคร กรุงเทพมหานคร
 * ============================================================
 * The9Electric&Water by Saila
 * ============================================================
 */

// ==================== CONFIG & SETTINGS ====================
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
if (!SPREADSHEET_ID) {
  throw new Error('❌ ยังไม่ได้ตั้งค่า SPREADSHEET_ID ใน Script Properties');
}

/**
 * getSettings() - ดึงค่าการตั้งค่าจาก PropertiesService
 */
function getSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    ratePerUnit: parseFloat(props.getProperty('RATE_PER_UNIT')) || 5,
    notifyDay: parseInt(props.getProperty('NOTIFY_DAY')) || 25,
    waterBillGlobal: parseFloat(props.getProperty('LAST_WATER_BILL')) || 0,
    electricBillGlobal: parseFloat(props.getProperty('LAST_ELEC_BILL')) || 0
  };
}

/**
 * updateSettings(settings) - บันทึกการตั้งค่า
 */
function updateSettings(settings) {
  if (!checkAuth_()) throw new Error('❌ ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้');

  var props = PropertiesService.getScriptProperties();
  
  if (settings.ratePerUnit !== undefined && settings.ratePerUnit !== '') {
    if (parseFloat(settings.ratePerUnit) <= 0) throw new Error('❌ ค่าไฟต่อหน่วยต้องมากกว่า 0');
    props.setProperty('RATE_PER_UNIT', settings.ratePerUnit.toString());
  }
  
  if (settings.notifyDay !== undefined && settings.notifyDay !== '') {
    var day = parseInt(settings.notifyDay);
    if (day < 1 || day > 31) throw new Error('❌ วันที่แจ้งเตือนต้องอยู่ระหว่าง 1-31');
    props.setProperty('NOTIFY_DAY', settings.notifyDay.toString());
  }

  if (settings.waterBillGlobal !== undefined) props.setProperty('LAST_WATER_BILL', settings.waterBillGlobal.toString());
  if (settings.electricBillGlobal !== undefined) props.setProperty('LAST_ELEC_BILL', settings.electricBillGlobal.toString());
  
  writeLog_('ตั้งค่าระบบ', `บันทึกตั้งค่า: ค่าไฟ ${settings.ratePerUnit || '-'} บาท/หน่วย, เตือนวันที่ ${settings.notifyDay || '-'}`);
  return { success: true };
}

// ชื่อชีทใน Spreadsheet
const SHEET_MEMBERS = 'Members';
const SHEET_RECORDS = 'Records';
const SHEET_PAYMENT = 'Payment_methods';
const SHEET_LOGS = 'Logs'; // 📝 5.1 Audit Log

/**
 * ฟังก์ชันบันทึกประวัติการกระทำลงในชีท Logs (5.1)
 * @param {string} actionType - ตัวอย่างเช่น: 'ออกบิล', 'ย้อนกลับบิล', 'เพิ่มสมาชิก'
 * @param {string} details - รายละเอียด
 */
function writeLog_(actionType, details) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_LOGS);
    
    // ถ้าไม่มีชีท Logs ให้สร้างใหม่ พร้อมใส่หัวตาราง
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_LOGS);
      sheet.appendRow(['เวลา (Timestamp)', 'ผู้ใช้งาน (User)', 'หมวดหมู่ (Action)', 'รายละเอียด (Details)']);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f3f4f6");
    }
    
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    var userEmail = Session.getActiveUser().getEmail() || 'Unknown/Anonymous';
    
    sheet.appendRow([timestamp, userEmail, actionType, details]);
  } catch (e) {
    Logger.log('❌ ไม่สามารถเขียน Log ได้: ' + e.message);
  }
}

// ==================== AUTH GUARD (1.3) ====================
const SHEET_ADMINS = 'Admins'; // 🔒 ชีทสำหรับเก็บรายชื่อผู้มีสิทธิ์ใช้งานระบบ

/**
 * ตรวจสอบสิทธิ์การเข้าถึงจากอีเมล (ตรวจสอบจาก Google Sheets)
 */
function checkAuth_() {
  var userEmail = Session.getActiveUser().getEmail();
  if (!userEmail) return false;
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var adminSheet = ss.getSheetByName(SHEET_ADMINS);
    
    // ถ้ายังไม่มีชีท Admins ให้สร้างอัตโนมัติ พร้อมใส่ 2 คนแรกให้เลย
    if (!adminSheet) {
      adminSheet = ss.insertSheet(SHEET_ADMINS);
      adminSheet.appendRow(['อีเมลผู้มีสิทธิ์เข้าใช้งานระบบ (Email)', 'ชื่อ/หมายเหตุ']);
      adminSheet.getRange("A1:B1").setFontWeight("bold").setBackground("#fecaca"); // หัวตารางสีแดงอ่อน
      
      // ใส่ค่าเริ่มต้นที่คุณให้มา
      adminSheet.appendRow(['418housebysaila@gmail.com', 'Admin หลัก']);
      adminSheet.appendRow(['pmpanyavajiro@gmail.com', 'PmSomchai']);
      // adminSheet.appendRow(['', 'PmAnuwat (รอก่อน)']);
      
      // ล็อคความกว้างคอลัมน์ให้ดูง่าย
      adminSheet.setColumnWidth(1, 250);
      adminSheet.setColumnWidth(2, 200);
    }
    
    // ดึงรายชื่ออีเมลผู้มีสิทธิ์จากคอลัมน์ A ทั้งหมด
    // กรองเอาเฉพาะเซลล์ที่มีอักษร (ลบช่องว่างทิ้ง) แล้วทำให้เป็นตัวพิมพ์เล็ก
    var lastRow = adminSheet.getLastRow();
    if (lastRow < 2) return false; // ไม่มี admin ใน sheet
    var data = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var allowedList = data.map(function(row) {
      return String(row[0]).toLowerCase().trim();
    }).filter(function(email) {
      return email !== '';
    });
    
    // ตรวจสอบว่าแอดมินคนนี้อยู่ในลิสต์หรือเปล่า?
    return allowedList.indexOf(userEmail.toLowerCase().trim()) > -1;
    
  } catch (e) {
    Logger.log('Auth check error: ' + e.message);
    // ถ้าเกิดข้อผิดพลาดในการดึงชีท (เช่น ID ผิด) ให้ยึด 2 อีเมลนี้เป็นตัวช่วยฉุกเฉิน
    var fallbackAdmins = ['418housebysaila@gmail.com', 'pmpanyavajiro@gmail.com'];
    return fallbackAdmins.indexOf(userEmail.toLowerCase().trim()) > -1;
  }
}

// ==================== WEB APP ====================

/**
 * doGet() - จุดเริ่มต้นของ Web App
 */
function doGet() {
  // 🔒 ระบบตรวจสอบสิทธิ์ก่อนเปิดหน้าเว็บ (1.3)
  if (!checkAuth_()) {
    var email = Session.getActiveUser().getEmail() || 'ไม่มีบัญชี (กรุณาล็อกอินด้วย Google)';
    var errorHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; margin-top: 20vh; padding: 20px; background-color: #f8fafc; min-height: 100vh;">
        <div style="background-color: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; margin: 0 auto;">
          <h1 style="color: #ef4444; font-size: 64px; margin: 0 0 20px 0;">🔒</h1>
          <h2 style="color: #334155; margin: 0 0 10px 0; font-size: 24px;">ปฏิเสธการเข้าถึง</h2>
          <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">บัญชีอีเมล <b>${email}</b> ไม่มีสิทธิ์เข้าใช้งานระบบนี้</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; font-size: 14px; color: #475569;">
            กรุณาติดต่อผู้ดูแลระบบ (418housebysaila) เพื่อขอเพิ่มสิทธิ์การเข้าถึง
          </div>
        </div>
      </div>
    `;
    return HtmlService.createHtmlOutput(errorHtml).setTitle('🔒 Access Denied').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // ✅ ถ้าผ่าน โหลดแอปปกติ
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('The9Electric&Water')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

/**
 * include() - สำหรับ include ไฟล์ HTML/CSS/JS แยก
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * testConnection() - ทดสอบการเชื่อมต่อ
 */
function testConnection() {
  if (!checkAuth_()) return { success: false, error: '❌ ปฏิเสธการเข้าถึง' };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_MEMBERS);
    if (!sheet) return { success: false, error: 'ไม่พบชีท: ' + SHEET_MEMBERS };
    return { success: true, sheetName: sheet.getName(), rowCount: sheet.getLastRow() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ==================== DASHBOARD DATA ====================

/**
 * getDashboardStats() - ดึงข้อมูลสรุปสำหรับ Dashboard
 */
function getDashboardStats() {
  if (!checkAuth_()) return { history: [], yearly: { water: 0, electric: 0, topUsers: [] }, error: '❌ ปฏิเสธการเข้าถึง' };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_RECORDS);
    
    if (!sheet) {
      return { 
        history: [], 
        yearly: { water: 0, electric: 0, topUsers: [] },
        message: "ยังไม่มีข้อมูล"
      };
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { 
        history: [], 
        yearly: { water: 0, electric: 0, topUsers: [] },
        message: "ยังไม่มีข้อมูล"
      };
    }

    // ---- Column Index (ตรงกับ Header จริง) ----
    // 0:record_id, 1:billing_month, 2:created_at
    // 3:water_bill_total, 4:electric_bill_total, 5:rate_per_unit
    // 6:payment_method, 7:member_id, 8:member_name
    // 9:water_amount, 10:meter_before, 11:meter_after, 12:units_used
    // 13:room_electric, 14:common_electric, 15:total_amount
    // 16:water_active, 17:electric_active, 18:common_active

    var currentYear = new Date().getFullYear() + 543; // พ.ศ.
    var months = {};
    var yearlyWater = 0;
    var yearlyElec = 0;
    var userUsage = {};

    // ใช้ record_id เพื่อ group bill-level data (ไม่ซ้ำซ้อน)
    var processedRecords = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var month = row[1] ? row[1].toString().trim() : '';
      if (!month) continue;

      var recordId   = row[0] ? row[0].toString().trim() : '';
      var waterAuth  = parseFloat(row[3]) || 0;
      var elecAuth   = parseFloat(row[4]) || 0;
      var waterMember    = parseFloat(row[9])  || 0;
      var roomElecMember = parseFloat(row[13]) || 0;
      var commonElecMember = parseFloat(row[14]) || 0;
      var totalMember    = parseFloat(row[15]) || 0;
      var name = row[8] ? row[8].toString().trim() : '';

      // --- Trend Graph: Group by month ---
      // ใช้ waterAuth/elecAuth จาก record แรกของ record_id นั้น (ค่าเท่ากันทุก row)
      if (!months[month]) {
        months[month] = {
          month: month,
          water: 0,
          electric: 0,
          commonTotal: 0
        };
      }

      // บวก water_bill_total และ electric_bill_total แค่ครั้งเดียวต่อ record_id
      if (recordId && !processedRecords[recordId]) {
        processedRecords[recordId] = true;
        months[month].water    = waterAuth;   // ค่าคงที่ทั้ง record
        months[month].electric = elecAuth;
      }

      // commonTotal บวกทุก row (แต่ละสมาชิก)
      months[month].commonTotal += commonElecMember;

      // --- Yearly Stats ---
      if (month.indexOf(currentYear.toString()) > -1) {
        yearlyWater += waterMember;
        yearlyElec  += (roomElecMember + commonElecMember);

        if (name) {
          if (!userUsage[name]) userUsage[name] = 0;
          userUsage[name] += totalMember;
        }
      }
    }

    // เรียง month ตามลำดับที่ปรากฏใน Sheet แล้วเอา 6 เดือนล่าสุด
    var historyArray = Object.keys(months)
      .map(k => months[k])
      .slice(-6);

    var topUsers = Object.keys(userUsage)
      .map(name => ({ name: name, total: userUsage[name] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Log เพื่อ debug (ดูใน Apps Script > Logs)
    Logger.log('Months found: ' + JSON.stringify(Object.keys(months)));
    Logger.log('currentYear: ' + currentYear);
    Logger.log('historyArray length: ' + historyArray.length);
    Logger.log('topUsers: ' + JSON.stringify(topUsers));

    return {
      history: historyArray,
      yearly: {
        water: yearlyWater,
        electric: yearlyElec,
        topUsers: topUsers
      }
    };

  } catch (e) {
    Logger.log("getDashboardStats Error: " + e.toString());
    Logger.log("Stack: " + e.stack);
    return { 
      history: [], 
      yearly: { water: 0, electric: 0, topUsers: [] },
      error: e.toString()
    };
  }
}

// ==================== LAST BILL RECOVERY ====================

/**
 * getLastBillingSummary() - ดึงบิลรอบล่าสุดจาก Records เพื่อแสดงใบแจ้งหนี้ซ้ำ
 * โครงสร้าง return เหมือนกับ calculateAndSave() เพื่อใช้ renderInvoices() ตัวเดิมได้เลย
 */
function getLastBillingSummary() {
  if (!checkAuth_()) return { error: '❌ ปฏิเสธการเข้าถึง' };
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_RECORDS);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { error: 'ยังไม่มีข้อมูลบิลในระบบ' };
    }
    
    var data = sheet.getDataRange().getValues();
    // Column Index: 0:record_id, 1:billing_month, 2:created_at,
    // 3:water_bill_total, 4:electric_bill_total, 5:rate_per_unit,
    // 6:payment_method, 7:member_id, 8:member_name,
    // 9:water_amount, 10:meter_before, 11:meter_after, 12:units_used,
    // 13:room_electric, 14:common_electric, 15:total_amount,
    // 16:water_active, 17:electric_active, 18:common_active

    // หา record_id ล่าสุด (row สุดท้ายในชีท)
    var lastRecordId = data[data.length - 1][0].toString().trim();
    
    // กรองเฉพาะ row ที่มี record_id เดียวกัน (ทุก member ในรอบเดียวกัน)
    var lastRows = [];
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0].toString().trim() === lastRecordId) {
        lastRows.unshift(data[i]); // เพิ่มหน้าสุดเพื่อรักษาลำดับ
      } else {
        break; // หยุดเมื่อเจอ record_id อื่นแล้ว (ข้อมูลเรียงตามเวลา)
      }
    }
    
    if (lastRows.length === 0) {
      return { error: 'ไม่พบข้อมูลบิลล่าสุด' };
    }
    
    // ดึงข้อมูลหลักจาก row แรก (ค่าเดียวกันทุก row ใน record เดียวกัน)
    var firstRow = lastRows[0];
    var billingMonth = firstRow[1].toString().trim();
    var waterBillTotal = parseFloat(firstRow[3]) || 0;
    var electricBillTotal = parseFloat(firstRow[4]) || 0;
    var ratePerUnit = parseFloat(firstRow[5]) || 0;
    var paymentMethodName = firstRow[6].toString().trim();
    
    // ดึงข้อมูลช่องทางชำระเงินปัจจุบัน
    var allPaymentMethods = getPaymentMethods();
    var selectedPayment = {};
    for (var p = 0; p < allPaymentMethods.length; p++) {
      if (allPaymentMethods[p].methodName === paymentMethodName) {
        selectedPayment = allPaymentMethods[p];
        break;
      }
    }
    // ถ้าหาไม่เจอจากชื่อ ให้ใช้ตัวแรก (Fallback)
    if (!selectedPayment.methodId && allPaymentMethods.length > 0) {
      selectedPayment = allPaymentMethods[0];
    }
    
    // สร้าง members array จากทุก row
    var members = [];
    var waterActiveCount = 0;
    var commonActiveCount = 0;
    
    for (var r = 0; r < lastRows.length; r++) {
      var row = lastRows[r];
      var waterActive = (row[16] === true || String(row[16]).toUpperCase() === 'TRUE');
      var electricActive = (row[17] === true || String(row[17]).toUpperCase() === 'TRUE');
      var commonElectricActive = (row[18] === true || String(row[18]).toUpperCase() === 'TRUE');
      
      if (waterActive) waterActiveCount++;
      if (commonElectricActive) commonActiveCount++;
      
      members.push({
        memberId: row[7].toString().trim(),
        name: row[8].toString().trim(),
        meterNo: '',
        meterBefore: parseFloat(row[10]) || 0,
        meterAfter: parseFloat(row[11]) || 0,
        unitsUsed: parseFloat(row[12]) || 0,
        waterAmount: parseFloat(row[9]) || 0,
        roomElectric: parseFloat(row[13]) || 0,
        commonElectric: parseFloat(row[14]) || 0,
        totalAmount: parseFloat(row[15]) || 0,
        waterActive: waterActive,
        electricActive: electricActive,
        commonElectricActive: commonElectricActive
      });
    }
    
    return {
      recordId: lastRecordId,
      billingMonth: billingMonth,
      waterBillTotal: waterBillTotal,
      electricBillTotal: electricBillTotal,
      ratePerUnit: ratePerUnit,
      waterActiveCount: waterActiveCount,
      commonActiveCount: commonActiveCount,
      paymentMethod: selectedPayment,
      members: members
    };
    
  } catch (e) {
    Logger.log("getLastBillingSummary Error: " + e.toString());
    return { error: e.toString() };
  }
}

// ==================== OCR AI ====================

function readElecMeterFromBase64(base64Data) {
  if (!checkAuth_()) return { success: false, error: '❌ ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้' };
  try {
    var imageData = base64Data;
    var mimeType  = "image/jpeg";

    if (base64Data.indexOf(',') > -1) {
      var parts = base64Data.split(',');
      imageData = parts[1];
      var header = parts[0]; 
      var mMatch = header.match(/data:([^;]+);/);
      if (mMatch) { mimeType = mMatch[1]; }
    }

    // ดึง API Key จาก PropertiesService (ตัวล่าสุดที่คุณรัน setupApiKey)
    var props = PropertiesService.getScriptProperties();
    var GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return { success: false, error: 'API Key ยังไม่ได้ตั้งค่า กรุณารัน setupApiKey() ก่อน' };
    }

    // ใช้ gemini-2.5-flash ตามตัวทดสอบที่ทำงานได้ดี
    var model = "gemini-2.5-flash";
    var url   = "https://generativelanguage.googleapis.com/v1beta/models/" 
              + model + ":generateContent?key=" + GEMINI_API_KEY;

    var prompt =
      "This is a Thai electricity meter (drum/dial type). " +
      "Find the row of digit wheels (odometer-style counter). " +
      "Read ONLY the digits inside WHITE or BLACK frames, from left to right. " +
      "IGNORE the last digit(s) that are inside a RED frame or box. " +
      "IGNORE any digit after a decimal point. " +
      "IGNORE digits that are only half-visible or between two numbers. " +
      "The result should be 4-5 digits only. " +
      "Reply with ONLY the digits, no spaces, no decimals, no other text. " +
      "Example: 02565";

    var requestBody = {
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: imageData } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 30,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    };
    // ✅ หน่วง 3 วินาที ป้องกันติด rate limit โดยไม่รู้สึกรอนาน
    Utilities.sleep(3000);

    var response = UrlFetchApp.fetch(url, options);
    var httpCode = response.getResponseCode();
    var body     = response.getContentText();

    Logger.log("HTTP: " + httpCode);
    Logger.log("Body: " + body.substring(0, 500));

    if (httpCode !== 200) {
      return { success: false, error: "HTTP " + httpCode, raw: body };
    }

    var json = JSON.parse(body);

    if (json.error) {
      return { success: false, error: json.error.message, raw: body };
    }

    if (!json.candidates || json.candidates.length === 0) {
      return { success: false, error: "AI ไม่ส่งผลลัพธ์กลับมา", raw: body };
    }

    var candidate = json.candidates[0];

    if (candidate.finishReason === "SAFETY") {
      return { success: false, error: "ถูกบล็อกโดยระบบความปลอดภัย", raw: JSON.stringify(candidate) };
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return { success: false, error: "AI ส่งข้อมูลว่างกลับมา", raw: JSON.stringify(candidate) };
    }

    var text    = candidate.content.parts[0].text.trim();

    // ✅ ตัดทศนิยมและอักขระที่ไม่ใช่ตัวเลขออก
    var cleaned = text.split('.')[0].split(',')[0];
    var digits  = cleaned.replace(/[^0-9]/g, "");

    // ✅ มิเตอร์บางตัวอาจ 0 นำหน้าหายไป → เติมให้ครบ 5 หลัก
      if (digits.length >= 3 && digits.length <= 6) {
        var padded = digits.padStart(5, '0');
        return { success: true, reading: padded, raw: text };
      }

    // ✅ มิเตอร์ไทยควรได้ 4-6 หลัก
    /*if (digits.length >= 4 && digits.length <= 6) {
      return { success: true, reading: digits, raw: text };
      }*/

    return { success: false, error: "อ่านได้ " + digits.length + " หลัก ผิดปกติ: " + text, raw: text };

  } catch (e) {
    return { success: false, error: "Exception: " + e.message, raw: "" };
  }
}

