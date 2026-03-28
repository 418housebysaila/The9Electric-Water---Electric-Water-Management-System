/**
 * ============================================================
 * EWMS - SheetService.gs (ฟังก์ชันจัดการข้อมูล Sheets)
 * ============================================================
 */

// ==================== HELPERS ====================

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    if (name === SHEET_RECORDS) {
      sheet = ss.insertSheet(SHEET_RECORDS);
      sheet.appendRow([
        'record_id', 'billing_month', 'created_at', 'water_bill_total',
        'electric_bill_total', 'rate_per_unit', 'payment_method',
        'member_id', 'member_name', 'water_amount',
        'meter_before', 'meter_after', 'units_used',
        'room_electric', 'common_electric', 'total_amount',
        'water_active', 'electric_active', 'common_active'
      ]);
    } else if (name === SHEET_PAYMENT) {
      sheet = ss.insertSheet(SHEET_PAYMENT);
      sheet.appendRow(['method_id', 'method_name', 'account_name', 'account_number', 'is_active']);
      sheet.appendRow(['PM001', 'ตัวอย่าง - กรุณาแก้ไขข้อมูล', 'ชื่อบัญชี', '000-0-00000-0', true]);
    } else {
      throw new Error('ไม่พบชีท: ' + name);
    }
  }
  return sheet;
}

// ==================== GET DATA ====================

/**
 * getMembers() - ดึงข้อมูลสมาชิก
 * คอลัมน์: A:member_id, B:meter_no, C:name,
 * D:water_active, E:electric_active, F:common_electric_active,
 * G:is_exempt_electric, H:last_meter_reading
 */
function getMembers() {
  var sheet = getSheet_(SHEET_MEMBERS);
  var data = sheet.getDataRange().getValues();
  var members = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] || data[i][0] === '') continue;

    var waterActive = (data[i][3] === true || data[i][3] === 'TRUE' || data[i][3] === true);
    var electricActive = (data[i][4] === true || data[i][4] === 'TRUE');
    var commonActive = (data[i][5] === true || data[i][5] === 'TRUE');
    var isExempt = (data[i][6] === true || data[i][6] === 'TRUE');

    members.push({
      memberId: String(data[i][0]),
      meterNo: String(data[i][1]),
      name: String(data[i][2]),
      waterActive: waterActive,
      electricActive: electricActive,
      commonElectricActive: commonActive,
      isExemptElectric: isExempt,
      lastMeterReading: Number(data[i][7]) || 0
    });
  }

  return members;
}

/**
 * getPaymentMethods() - ดึงช่องทางชำระเงิน
 * คอลัมน์: A:method_id, B:method_name, C:account_name, D:account_number, E:is_active
 */
function getPaymentMethods() {
  var sheet = getSheet_(SHEET_PAYMENT);
  var data = sheet.getDataRange().getValues();
  var methods = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] || data[i][0] === '') continue;
    var isActive = (data[i][4] === true || data[i][4] === 'TRUE');
    if (!isActive) continue;

    methods.push({
      methodId: String(data[i][0]),
      methodName: String(data[i][1]),
      accountName: String(data[i][2]),
      accountNumber: String(data[i][3]),
      isActive: true
    });
  }

  return methods;
}
