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
 * findColumn_(headers, keys) - ค้นหาตำแหน่งคอลัมน์จากรายการชื่อที่เป็นไปได้
 */
function findColumn_(headers, keys) {
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().replace(/_/g, '').replace(/\s/g, '').trim();
    for (var k = 0; k < keys.length; k++) {
      var searchKey = String(keys[k]).toLowerCase().replace(/_/g, '').replace(/\s/g, '').trim();
      if (h === searchKey) return i;
    }
  }
  return -1;
}

/**
 * getMembers() - ดึงข้อมูลสมาชิก
 */
function getMembers() {
  if (!checkAuth_()) return [];
  var sheet = getSheet_(SHEET_MEMBERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var idx = {
    id: findColumn_(headers, ['member_id', 'รหัสสมาชิก', 'รหัส']),
    meterNo: findColumn_(headers, ['meter_no', 'เลขมิเตอร์', 'มิเตอร์']),
    name: findColumn_(headers, ['name', 'ชื่อ', 'ชื่อ-นามสกุล']),
    water: findColumn_(headers, ['water_active', 'ค่าน้ำ', 'ใช้น้ำ']),
    elec: findColumn_(headers, ['electric_active', 'ค่าไฟ', 'ใช้ไฟ']),
    common: findColumn_(headers, ['common_electric_active', 'ค่าไฟส่วนกลาง']),
    exempt: findColumn_(headers, ['is_exempt_electric', 'ยกเว้นค่าไฟ']),
    lastMeter: findColumn_(headers, ['last_meter_reading', 'เลขครั้งก่อน', 'มิเตอร์ครั้งก่อน'])
  };

  var members = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (idx.id === -1 || !row[idx.id]) continue;

    members.push({
      memberId: String(row[idx.id]),
      meterNo: idx.meterNo > -1 ? String(row[idx.meterNo]) : '',
      name: idx.name > -1 ? String(row[idx.name]) : '',
      waterActive: idx.water > -1 ? (row[idx.water] === true || String(row[idx.water]).toUpperCase() === 'TRUE') : false,
      electricActive: idx.elec > -1 ? (row[idx.elec] === true || String(row[idx.elec]).toUpperCase() === 'TRUE') : false,
      commonElectricActive: idx.common > -1 ? (row[idx.common] === true || String(row[idx.common]).toUpperCase() === 'TRUE') : false,
      isExemptElectric: idx.exempt > -1 ? (row[idx.exempt] === true || String(row[idx.exempt]).toUpperCase() === 'TRUE') : false,
      lastMeterReading: idx.lastMeter > -1 ? (Number(row[idx.lastMeter]) || 0) : 0
    });
  }

  return members;
}

/**
 * getPaymentMethods() - ดึงช่องทางชำระเงิน
 */
function getPaymentMethods() {
  if (!checkAuth_()) return [];
  var sheet = getSheet_(SHEET_PAYMENT);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var idx = {
    id: findColumn_(headers, ['method_id', 'รหัสประเภท']),
    name: findColumn_(headers, ['method_name', 'ชื่อธนาคาร', 'ประเภท']),
    accName: findColumn_(headers, ['account_name', 'ชื่อบัญชี']),
    accNum: findColumn_(headers, ['account_number', 'เลขบัญชี']),
    active: findColumn_(headers, ['is_active', 'ใช้งาน']),
    pp: findColumn_(headers, ['promptpay', 'พร้อมเพย์'])
  };

  var methods = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (idx.id === -1 || !row[idx.id]) continue;
    
    var activeVal = idx.active > -1 ? row[idx.active] : true;
    var isActive = (activeVal === true || String(activeVal).toUpperCase() === 'TRUE');
    if (!isActive) continue;

    methods.push({
      methodId: String(row[idx.id]),
      methodName: idx.name > -1 ? String(row[idx.name]) : '',
      accountName: idx.accName > -1 ? String(row[idx.accName]) : '',
      accountNumber: idx.accNum > -1 ? String(row[idx.accNum]) : '',
      promptpayId: idx.pp > -1 ? String(row[idx.pp]) : '',
      isActive: true
    });
  }

  return methods;
}

// ==================== MEMBER MANAGEMENT ====================

/**
 * getNextMemberInfo() - สร้างรหัสสมาชิกและเลขมิเตอร์ถัดไปอัตโนมัติ
 * member_id: EW9007 → EW9008
 * meter_no: 900797 → 900898 (รูปแบบ: 4หลักสุดท้ายของ member_id + "9" + ลำดับที่)
 */
function getNextMemberInfo() {
  if (!checkAuth_()) return { success: false, error: '❌ ปฏิเสธการเข้าถึง' };
  try {
    var sheet = getSheet_(SHEET_MEMBERS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      // ยังไม่มีสมาชิก → เริ่มต้นที่ EW9001
      return { success: true, memberId: 'EW9001', meterNo: '900191' };
    }
    
    var headers = data[0];
    var idCol = findColumn_(headers, ['member_id', 'รหัสสมาชิก', 'รหัส']);
    
    if (idCol === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์ member_id' };
    }
    
    // หา member_id ที่มีลำดับสูงสุด (ไม่ใช่ row สุดท้ายเสมอ กันกรณีลบแล้วเพิ่มใหม่)
    var maxSeq = 0;
    for (var i = 1; i < data.length; i++) {
      var mid = String(data[i][idCol]).trim();
      // ดึงตัวเลขจาก member_id เช่น EW9007 → 9007
      var numPart = mid.replace(/[^0-9]/g, '');
      var seq = parseInt(numPart) || 0;
      if (seq > maxSeq) maxSeq = seq;
    }
    
    // สร้างลำดับถัดไป
    var nextSeq = maxSeq + 1;
    var nextMemberId = 'EW' + String(nextSeq).padStart(4, '0');
    
    // สร้าง meter_no: 4 หลักสุดท้ายของ member_id + "9" + ลำดับที่
    var last4 = String(nextSeq).padStart(4, '0');       // เช่น 9008
    var seqDigit = String(nextSeq).slice(-1);            // เช่น 8
    var nextMeterNo = last4 + '9' + seqDigit;            // เช่น 900898
    
    return { 
      success: true, 
      memberId: nextMemberId, 
      meterNo: nextMeterNo 
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * addMember(member) - เพิ่มสมาชิกใหม่
 */
function addMember(m) {
  if (!checkAuth_()) return { success: false, error: 'ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้' };
  try {
    var sheet = getSheet_(SHEET_MEMBERS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

    // ตรวจสอบ ID ซ้ำ
    var idColIdx = findColumn_(data[0], ['member_id', 'รหัสสมาชิก', 'รหัส']);
    if (idColIdx > -1) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idColIdx]).trim() === String(m.memberId).trim()) {
          return { success: false, error: 'รหัสสมาชิก ' + m.memberId + ' มีอยู่แล้วระบบไม่สามารถบันทึกซ้ำได้' };
        }
      }
    }
    
    var nextRow = sheet.getLastRow() + 1;
    
    // ฟังก์ชันช่วยวางข้อมูลตามหัวข้อ
    var setVal = function(headerName, value) {
      var colIdx = headers.indexOf(headerName.toLowerCase().trim());
      if (colIdx > -1) {
        sheet.getRange(nextRow, colIdx + 1).setValue(value);
      }
    };

    setVal('member_id', m.memberId);
    setVal('meter_no', m.meterNo);
    setVal('name', m.name);
    setVal('water_active', m.waterActive);
    setVal('electric_active', m.electricActive);
    setVal('common_electric_active', m.commonActive);
    setVal('is_exempt_electric', m.isExempt);
    setVal('last_meter_reading', 0);

    writeLog_('เพิ่มสมาชิก', `รหัส ${m.memberId} (${m.name}) มิเตอร์: ${m.meterNo}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * deleteMember(memberId) - ลบสมาชิก
 */
function deleteMember(memberId) {
  if (!checkAuth_()) return { success: false, error: 'ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้' };
  try {
    var sheet = getSheet_(SHEET_MEMBERS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var memberIdCol = findColumn_(headers, ['member_id', 'รหัสสมาชิก', 'รหัส']);
    var nameCol = findColumn_(headers, ['name', 'ชื่อ', 'ชื่อ-นามสกุล']);
    
    if (memberIdCol === -1) {
      return { success: false, error: 'ไม่พบคอลัมน์รหัสสมาชิก' };
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][memberIdCol]) === memberId) {
        var memberName = (nameCol > -1) ? data[i][nameCol] : '';
        sheet.deleteRow(i + 1);
        writeLog_('ลบสมาชิก', `ลบรหัส ${memberId} (${memberName}) ออกจากระบบ`);
        return { success: true };
      }
    }
    return { success: false, error: 'ไม่พบรหัสสมาชิก: ' + memberId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ==================== ROLLBACK ====================

/**
 * rollbackLastBill() - ลบบิลรอบล่าสุดและคืนค่ามิเตอร์เดิม
 * 1. หา record_id ล่าสุดจาก Records
 * 2. ดึง meter_before ของแต่ละสมาชิกในรอบนั้น
 * 3. คืนค่า last_meter_reading ใน Members กลับเป็น meter_before
 * 4. ลบทุก row ที่มี record_id นั้นออกจาก Records
 */
function rollbackLastBill() {
  if (!checkAuth_()) return { success: false, error: 'ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้' };
  try {
    var recSheet = getSheet_(SHEET_RECORDS);
    var recData = recSheet.getDataRange().getValues();
    
    if (recData.length <= 1) {
      return { success: false, error: 'ไม่มีข้อมูลบิลในระบบ' };
    }
    
    // Column Index: 0:record_id, 7:member_id, 10:meter_before, 1:billing_month
    var lastRecordId = String(recData[recData.length - 1][0]).trim();
    var billingMonth = String(recData[recData.length - 1][1]).trim();
    
    // รวบรวม row ที่ต้องลบ + ข้อมูล meter_before ของแต่ละสมาชิก
    var rowsToDelete = []; // เก็บ row index (1-indexed)
    var meterRestoreMap = {}; // { memberId: meterBefore }
    
    for (var i = recData.length - 1; i >= 1; i--) {
      if (String(recData[i][0]).trim() === lastRecordId) {
        rowsToDelete.push(i + 1); // Sheet row = data index + 1
        var memberId = String(recData[i][7]).trim();
        var meterBefore = parseFloat(recData[i][10]) || 0;
        meterRestoreMap[memberId] = meterBefore;
      } else {
        break; // หยุดเมื่อเจอ record_id อื่น
      }
    }
    
    if (rowsToDelete.length === 0) {
      return { success: false, error: 'ไม่พบข้อมูลบิลล่าสุด' };
    }
    
    // 1. คืนค่า last_meter_reading ใน Members
    var memSheet = getSheet_(SHEET_MEMBERS);
    var memData = memSheet.getDataRange().getValues();
    var memHeaders = memData[0];
    var memberIdCol = findColumn_(memHeaders, ['member_id', 'รหัสสมาชิก', 'รหัส']);
    var lastMeterCol = findColumn_(memHeaders, ['last_meter_reading', 'เลขครั้งก่อน', 'มิเตอร์ครั้งก่อน']);
    
    if (memberIdCol > -1 && lastMeterCol > -1) {
      for (var r = 1; r < memData.length; r++) {
        var mid = String(memData[r][memberIdCol]).trim();
        if (meterRestoreMap.hasOwnProperty(mid)) {
          memData[r][lastMeterCol] = meterRestoreMap[mid];
        }
      }
      memSheet.getRange(1, 1, memData.length, memData[0].length).setValues(memData);
    }
    
    // 2. ลบ row จาก Records (ลบจากล่างขึ้นบนเพื่อไม่ให้ index เลื่อน)
    rowsToDelete.sort(function(a, b) { return b - a; }); // เรียงจากมากไปน้อย
    for (var d = 0; d < rowsToDelete.length; d++) {
      recSheet.deleteRow(rowsToDelete[d]);
    }
    
    writeLog_('ย้อนกลับบิล', `ลบบิลเดือน ${billingMonth} จำนวน ${rowsToDelete.length} รายการ และคืนค่าเลขมิเตอร์เดิม`);
    
    return { 
      success: true, 
      message: 'ลบบิลเดือน ' + billingMonth + ' สำเร็จ (' + rowsToDelete.length + ' รายการ)',
      billingMonth: billingMonth,
      deletedCount: rowsToDelete.length
    };
  } catch (e) {
    Logger.log('rollbackLastBill Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}
