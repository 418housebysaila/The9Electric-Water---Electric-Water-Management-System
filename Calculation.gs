/**
 * ============================================================
 * EWMS - Calculation.gs (คำนวณค่าน้ำค่าไฟ + บันทึก)
 * ============================================================
 */

/**
 * calculateAndSave(formData) - คำนวณค่าน้ำค่าไฟ + บันทึกลง Records
 */
function calculateAndSave(formData) {
  if (!checkAuth_()) throw new Error('❌ ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้');

  var settings = getSettings();
  var ratePerUnit = settings.ratePerUnit;
  var waterBillTotal = parseFloat(formData.waterBillTotal) || 0;
  var electricBillTotal = parseFloat(formData.electricBillTotal) || 0;
  var paymentMethodId = formData.paymentMethodId;
  var membersData = formData.members;

  // === VALIDATION: ตรวจสอบข้อมูลพื้นฐาน ===
  if (waterBillTotal <= 0 || electricBillTotal <= 0) {
    throw new Error('❌ ยอดบิลน้ำและไฟต้องมากกว่า 0');
  }
  if (membersData.length === 0) {
    throw new Error('❌ ไม่มีข้อมูลสมาชิก');
  }

  // ดึงข้อมูลช่องทางชำระเงินที่เลือก
  var allPaymentMethods = getPaymentMethods();
  var selectedPayment = {};
  for (var p = 0; p < allPaymentMethods.length; p++) {
    if (allPaymentMethods[p].methodId === paymentMethodId) {
      selectedPayment = allPaymentMethods[p];
      break;
    }
  }

  // 1. ดึงสมาชิกทั้งหมดจาก Sheet เพื่อใช้ข้อมูลพื้นฐาน (มิเตอร์ครั้งก่อน)
  var membersInSheet = getMembers();
  
  // 2. คำนวณจำนวนคนที่หารค่าน้ำ (ใช้ข้อมูล Dynamic จากหน้าจอ)
  var waterActiveCount = 0;
  membersData.forEach(function(m) {
    if (getEffectiveFlags(m).waterActive) waterActiveCount++;
  });
  var waterPerPerson = waterActiveCount > 0 ? waterBillTotal / waterActiveCount : 0;

  // 3. คำนวณค่าไฟแต่ละห้อง (รอบที่ 1: หาผลรวมเพื่อไปลบออกจากบิลหลวง)
  var totalRoomElectric = 0;
  var preliminaryResults = [];

  for (var i = 0; i < membersData.length; i++) {
    var inputMember = membersData[i];
    var memberInfo = membersInSheet.find(function(f) { return f.memberId === inputMember.memberId; });
    if (!memberInfo) continue;

    var flags = getEffectiveFlags(inputMember);
    var meterBefore = parseFloat(memberInfo.lastMeterReading) || 0;
    var meterAfter = parseFloat(inputMember.meterAfter) || 0;

    // === VALIDATION: ตรวจสอบเลขมิเตอร์ไม่ลดลง (เฉพาะคนที่มีการคิดค่าไฟห้อง) ===
    if (flags.electricActive && meterAfter < meterBefore) {
      throw new Error(`❌ ${memberInfo.name} (${memberInfo.memberId}): เลขมิเตอร์ไม่ถูกต้อง! ครั้งก่อน ${meterBefore} ครั้งนี้ ${meterAfter} (ลดลง)`);
    }

    var unitsUsed = Math.max(0, meterAfter - meterBefore);
    var roomElectric = 0;

    // คิดค่าไฟห้องเฉพาะคนที่เปิด Toggle
    if (flags.electricActive) {
      roomElectric = unitsUsed * ratePerUnit;
      totalRoomElectric += roomElectric;
    }

    preliminaryResults.push({
      memberId: inputMember.memberId,
      name: inputMember.name,
      meterNo: inputMember.meterNo || '',
      meterBefore: meterBefore,
      meterAfter: meterAfter,
      unitsUsed: unitsUsed,
      roomElectric: roomElectric,
      waterActive: flags.waterActive,
      electricActive: flags.electricActive,
      commonElectricActive: flags.commonElectricActive,
      isExemptElectric: (inputMember.memberId === 'EW9001' || inputMember.isExemptElectric),
      waterAmount: flags.waterActive ? waterPerPerson : 0
    });
  }

  // 4. คำนวณค่าไฟส่วนกลาง (ส่วนต่างไฟหอ - ไฟห้องทัังหมด)
  var totalCommonElectricTotal = Math.max(0, electricBillTotal - totalRoomElectric);
  var commonActiveCount = preliminaryResults.filter(function(r) { return r.commonElectricActive; }).length;
  var commonElectricPerPerson = commonActiveCount > 0 ? totalCommonElectricTotal / commonActiveCount : 0;

  // 5. คำนวณยอดรวมรายคน และเตรียมผลลัพธ์สุดท้าย
  var results = [];
  var totalWaterCalculated = 0;
  var totalElectricCalculated = 0;
  
  for (var r = 0; r < preliminaryResults.length; r++) {
    var m = preliminaryResults[r];
    m.commonElectric = m.commonElectricActive ? commonElectricPerPerson : 0;
    m.totalAmount = m.waterAmount + m.roomElectric + m.commonElectric;
    
    // รวมเพื่อใช้ verify ความสมดุล (Reconciliation)
    totalWaterCalculated += m.waterAmount;
    totalElectricCalculated += (m.roomElectric + m.commonElectric);
    
    results.push(m);
  }

  // === RECONCILIATION: ตรวจสอบความสมดุล ===
  var waterDiff = Math.abs(totalWaterCalculated - waterBillTotal);
  var elecDiff = Math.abs(totalElectricCalculated - electricBillTotal);
  var tolerance = 0.50; // ยอมรับความต่างได้ 50 สตางค์ เพราะการปัดเศษ

  if (waterDiff > tolerance) {
    throw new Error(`❌ ความสมดุลไม่ถูกต้อง!\n\nค่าน้ำ: บิลรวม ฿${waterBillTotal.toFixed(2)} แต่หารได้ ฿${totalWaterCalculated.toFixed(2)}\nต่างกัน ฿${waterDiff.toFixed(2)}\n\nกรุณาตรวจสอบ:\n- จำนวนคนที่หารน้ำถูกต้องหรือไม่\n- ยอดบิลถูกต้องหรือไม่`);
  }

  if (elecDiff > tolerance) {
    throw new Error(`❌ ความสมดุลไม่ถูกต้อง!\n\nค่าไฟ: บิลรวม ฿${electricBillTotal.toFixed(2)} แต่หารได้ ฿${totalElectricCalculated.toFixed(2)}\nต่างกัน ฿${elecDiff.toFixed(2)}\n\nกรุณาตรวจสอบ:\n- เลขมิเตอร์ถูกต้องหรือไม่\n- ยอดบิลถูกต้องหรือไม่`);
  }

  // 6. เตรียมข้อมูลสรุป
  var now = new Date();
  var thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  var billingMonth = thaiMonths[now.getMonth()] + " " + (now.getFullYear() + 543);
  
  // 🔒 ตรวจสอบว่าเดือนนี้บันทึกไปแล้วหรือยัง (2.2)
  if (checkDuplicateBilling_(billingMonth)) {
    throw new Error('⚠️ เดือน ' + billingMonth + ' มีการบันทึกบิลไปแล้ว!\n\nหากต้องการบันทึกซ้ำ กรุณาย้อนกลับบิลเดิมก่อน');
  }

  var summary = {
    recordId: 'REC' + now.getTime(),
    billingMonth: billingMonth,
    createdAt: Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss"),
    waterBillTotal: waterBillTotal,
    electricBillTotal: electricBillTotal,
    ratePerUnit: ratePerUnit,
    waterActiveCount: waterActiveCount,
    commonActiveCount: commonActiveCount,
    paymentMethod: selectedPayment,
    members: results
  };

  // 6. บันทึกข้อมูลแบบ Batch เพื่อประสิทธิภาพสูงสุด
  // 🔒 ระบบ Try-Catch ป้องกันบันทึกข้อพูลพังครึ่งเดียว (3.1)
  try {
    saveToRecords_(summary);
    updateLastMeterReadings_(results);
  } catch (e) {
    Logger.log('❌ Save failed after calculation: ' + e.toString());
    throw new Error('❌ บันทึกข้อมูลล้มเหลว: ' + e.message);
  }

  console.log('Calculation complete for ' + results.length + ' members');
  writeLog_('ออกใบแจ้งหนี้', `คำนวณและบันทึกบิลเดือน ${billingMonth} สำหรับสมาชิก ${results.length} ราย (ยอดน้ำ ${waterBillTotal}, ไฟ ${electricBillTotal})`);
  return summary;
}

// ==================== PRIVATE HELPERS ====================

/**
 * saveToRecords_(summary) - บันทึกข้อมูลลงในชีท Records (Batch Write)
 */
function saveToRecords_(summary) {
  var sheet = getSheet_(SHEET_RECORDS);
  var rows = [];
  
  summary.members.forEach(function(m) {
    rows.push([
      summary.recordId,
      summary.billingMonth,
      summary.createdAt,
      summary.waterBillTotal,
      summary.electricBillTotal,
      summary.ratePerUnit,
      summary.paymentMethod.methodName || '',
      m.memberId,
      m.name,
      Math.round(m.waterAmount * 100) / 100,
      m.meterBefore,
      m.meterAfter,
      m.unitsUsed,
      Math.round(m.roomElectric * 100) / 100,
      Math.round(m.commonElectric * 100) / 100,
      Math.round(m.totalAmount * 100) / 100,
      m.waterActive,
      m.electricActive,
      m.commonElectricActive
    ]);
  });
  
  if (rows.length > 0) {
    var lastRow = sheet.getLastRow();
    // Batch Insert ทั่งก้อน
    sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * updateLastMeterReadings_(results) - อัปเดตเลขมิเตอร์ล่าสุดในชีท Members (Batch Update)
 */
function updateLastMeterReadings_(results) {
  var sheet = getSheet_(SHEET_MEMBERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var headers = data[0];
  var memberIdCol = findColumn_(headers, ['member_id', 'รหัสสมาชิก', 'รหัส']);
  var lastMeterCol = findColumn_(headers, ['last_meter_reading', 'เลขครั้งก่อน', 'มิเตอร์ครั้งก่อน']);
  
  if (memberIdCol === -1 || lastMeterCol === -1) return;

  // ปรับปรุงข้อมูลในหน่วยความจำ (Memory Update)
  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    // อัปเดตเฉพาะคนที่มีการจดเลขใหม่เข้ามาจริง
    if (res.meterAfter > 0) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][memberIdCol]) === res.memberId) {
          data[i][lastMeterCol] = res.meterAfter;
          break;
        }
      }
    }
  }
  
  // Batch Write กลับลงไปทีเดียวทั้งคอลัมน์/ตาราง
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

/**
 * getEffectiveFlags(inputMember) - ตรวจสอบสถานะ Toggle อย่างละเอียด
 * รองรับทั้งแบบ Boolean และ String (เผื่อกรณีส่งมาจากหน้าเว็บแล้วถูกแปลง)
 */
function getEffectiveFlags(inputMember) {
  var isMember1 = (inputMember.memberId === 'EW9001');
  
  // 1. ตรวจสอบ Toggle Master (เช็คทั้ง true และ "true")
  var masterOn = (inputMember.toggleMaster === true || inputMember.toggleMaster === 'true');
  
  // ถ้า Master ปิด -> ทุกอย่างปิดหมด
  if (!masterOn) {
    return { waterActive: false, electricActive: false, commonElectricActive: false };
  }
  
  // 2. ถ้า Master เปิด -> อ่านค่า Toggle รายตัว (รองรับ Boolean/String)
  var water = (inputMember.waterActive === true || inputMember.waterActive === 'true');
  var elec = (inputMember.electricActive === true || inputMember.electricActive === 'true');
  var common = (inputMember.commonElectricActive === true || inputMember.commonElectricActive === 'true');
  
  // 3. กฎพิเศษ: Member 1 (เจ้าคณะ) ยกเว้นค่าไฟเสมอ
  if (isMember1) {
    elec = false;
    common = false;
  }
  
  return {
    waterActive: water,
    electricActive: elec,
    commonElectricActive: common
  };
}

// ==================== DOUBLE BILLING PROTECTION ====================
/**
 * ตรวจสอบว่าเดือนนี้เคยบันทึกบิลไปแล้วหรือไม่
 */
function checkDuplicateBilling_(billingMonth) {
  try {
    var sheet = getSheet_(SHEET_RECORDS);
    var data = sheet.getDataRange().getValues();
    // วนจากล่างขึ้นบนเพื่อความเร็ว เพราะข้อมูลใหม่อยู่ล่างสุด
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]).trim() === billingMonth) { // Index 1 คือคอลัมน์ billing_month
        return true; // เจอว่าเคยบันทึกแล้ว
      }
    }
  } catch (e) {
    // ถ้าร้องขอ sheet ไม่สำเร็จ ถือว่าปล่อยผ่านไปก่อน
  }
  return false;
}
