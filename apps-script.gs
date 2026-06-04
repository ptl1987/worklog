/**
 * บันทึกงาน — Backend สำหรับ Google Apps Script
 * ============================================================
 * วิธีใช้:
 *   1) สร้าง Google Sheet ใหม่ ตั้งหัวคอลัมน์ใน Sheet1 (แถวที่ 1):
 *        id | name | date | status | createdAt | assigned | workType
 *   2) เปิด Extensions → Apps Script
 *   3) วางไฟล์นี้แทนของเดิม
 *   4) แก้ค่า SHEET_ID ด้านล่างให้ตรงกับของคุณ
 *      (เอามาจาก URL ของ Sheet ระหว่าง /d/<ID นี้>/edit)
 *   5) กด Deploy → New deployment → Web app
 *        - Execute as: Me
 *        - Who has access: Anyone   (จำเป็น เพราะหน้าเว็บไม่ได้ login)
 *   6) คัดลอก Web app URL ไปใส่ในแอบบันทึกงาน
 * ============================================================
 */

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SHEET_NAME = 'Sheet1';
const HEADERS = ['id', 'name', 'date', 'status', 'createdAt', 'assigned', 'workType'];

function _sheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function _readAll() {
  const sh = _sheet();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift();
  return values
    .filter(r => r[0])
    .map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = r[i]; });
      // normalise date back to ISO if Sheets parsed it as Date
      if (o.date instanceof Date) {
        o.date = Utilities.formatDate(o.date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      if (typeof o.createdAt === 'string') o.createdAt = Number(o.createdAt) || o.createdAt;
      return o;
    });
}

function _findRow(id) {
  const sh = _sheet();
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // 1-indexed + header row
  }
  return -1;
}

function _toRow(o) {
  return [o.id, o.name, o.date, o.status, o.createdAt, o.assigned === true ? 'yes' : 'no', o.workType || ''];
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- GET: คืน entries ทั้งหมด ----
function doGet(e) {
  try {
    return _json({ ok: true, entries: _readAll() });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ---- POST: รับ action create / update / delete ----
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sh = _sheet();

    if (body.action === 'create') {
      sh.appendRow(_toRow(body));
      return _json({ ok: true });
    }

    if (body.action === 'update') {
      const row = _findRow(body.id);
      if (row < 0) return _json({ ok: false, error: 'not_found' });
      sh.getRange(row, 1, 1, HEADERS.length).setValues([_toRow(body)]);
      return _json({ ok: true });
    }

    if (body.action === 'delete') {
      const row = _findRow(body.id);
      if (row < 0) return _json({ ok: false, error: 'not_found' });
      sh.deleteRow(row);
      return _json({ ok: true });
    }

    return _json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
