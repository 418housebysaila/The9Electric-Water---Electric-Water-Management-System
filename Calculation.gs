/**
 * ============================================================
 * EWMS - Calculation.gs (คำนวณค่าน้ำค่าไฟ + บันทึก)
 * ============================================================
 */

/**
 * calculateAndSave(formData) - คำนวณค่าน้ำค่าไฟ + บันทึกลง Records
 */
function calculateAndSave(formData) {
  var waterBillTotal = parseFloat(formData.waterBillTotal) || 0;
  var electricBillTotal = parseFloat(formData.electricBillTotal) || 0;
  var paymentMethodId = formData.paymentMethodId;
  var membersData = formData.members;

  // ดึงข้อมูลช่องทางชำระเงินที่เลือก
  var allPaymentMethods = getPaymentMethods();
  var selectedPayment = {};
  for (var p = 0; p < allPaymentMethods.length; p++) {
    if (allPaymentMethods[p].methodId === paymentMethodId) {
      selectedPayment = allPaymentMethods[p];
      break;
    }
  }

  // 1. คำนวณค่าน้ำ
  var waterActiveCount = 0;
  for (var w = 0; w < membersData.length; w++) {
    if (membersData[w].waterActive) waterActiveCount++;
  }
  var waterPerPerson = waterActiveCount > 0 ? waterBillTotal / waterActiveCount : 0;

  // 2. คำนวณค่าไฟแต่ละห้อง
  var totalRoomElectric = 0;
  var results = [];

  for (var i = 0; i < membersData.length; i++) {
    var member = membersData[i];
    var unitsUsed = 0;
    var roomElectric = 0;
    var meterBefore = parseFloat(member.meterBefore) || 0;
    var meterAfter = parseFloat(member.meterAfter) || 0;

    if (!member.isExemptElectric && member.electricActive) {
      unitsUsed = meterAfter - meterBefore;
      if (unitsUsed < 0) unitsUsed = 0;
      roomElectric = unitsUsed * RATE_PER_UNIT;
      totalRoomElectric += roomElectric;
    }

    results.push({
      memberId: member.memberId,
      name: member.name,
      meterNo: member.meterNo || '',
      meterBefore: meterBefore,
      meterAfter: meterAfter,
      unitsUsed: unitsUsed,
      roomElectric: roomElectric,
      waterActive: member.waterActive,
      electricActive: member.electricActive,
      commonElectricActive: member.commonElectricActive,
      isExemptElectric: member.isExemptElectric,
      waterAmount: member.waterActive ? waterPerPerson : 0
    });
  }

  // 3. คำนวณค่าไฟส่วนกลาง
  var totalCommonElectric = electricBillTotal - totalRoomElectric;
  var commonActiveCount = 0;
  for (var c = 0; c < membersData.length; c++) {
    if (membersData[c].commonElectricActive && !membersData[c].isExemptElectric) commonActiveCount++;
  }
  var commonElectricPerPerson = commonActiveCount > 0 ? totalCommonElectric / commonActiveCount : 0;

  // 4. คำนวณยอดรวม
  for (var r = 0; r < results.length; r++) {
    results[r].commonElectric = (results[r].commonElectricActive && !results[r].isExemptElectric) ? commonElectricPerPerson : 0;
    results[r].totalAmount = results[r].waterAmount + results[r].roomElectric + results[r].commonElectric;
  }

  // 5. เดือนปี พ.ศ.
  var now = new Date();
  var thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  var billingMonth = thaiMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);
  var recordId = 'REC' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmmss');

  var summary = {
    recordId: recordId,
    billingMonth: billingMonth,
    createdAt: Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
    waterBillTotal: waterBillTotal,
    electricBillTotal: electricBillTotal,
    ratePerUnit: RATE_PER_UNIT,
    waterPerPerson: waterPerPerson,
    waterActiveCount: waterActiveCount,
    totalRoomElectric: totalRoomElectric,
    totalCommonElectric: totalCommonElectric,
    commonElectricPerPerson: commonElectricPerPerson,
    commonActiveCount: commonActiveCount,
    paymentMethod: selectedPayment,
    members: results
  };

  // 6. บันทึกลง Records
  saveToRecords_(summary);

  // 7. อัปเดตเลขมิเตอร์ล่าสุด
  updateLastMeterReadings_(results);

  return summary;
}

// ==================== PRIVATE HELPERS ====================

function saveToRecords_(summary) {
  var sheet = getSheet_(SHEET_RECORDS);

  for (var i = 0; i < summary.members.length; i++) {
    var m = summary.members[i];
    sheet.appendRow([
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
  }
}

function updateLastMeterReadings_(results) {
  var sheet = getSheet_(SHEET_MEMBERS);
  var data = sheet.getDataRange().getValues();

  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    if (!res.isExemptElectric && res.electricActive && res.meterAfter > 0) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === res.memberId) {
          sheet.getRange(i + 1, 8).setValue(res.meterAfter);
          break;
        }
      }
    }
  }
}
