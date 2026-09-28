/**
 * Booking form backend.
 *
 * Saves each booking as a row in the spreadsheet this script is bound to,
 * and saves the payment receipt to a Google Drive folder.
 *
 * Setup:
 *  1. Create a Google Sheet, then Extensions > Apps Script.
 *  2. Replace the contents of Code.gs with this file and save.
 *  3. Deploy > New deployment > type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *  4. Authorise when asked, then copy the Web app URL (ends in /exec)
 *     into APPS_SCRIPT_URL in script.js.
 *
 * After editing this file, use Deploy > Manage deployments > Edit > Version: New version
 * so the same /exec URL picks up the change.
 */

const SHEET_NAME = "Tempahan";
const RECEIPT_FOLDER_NAME = "Resit Pembayaran Tempahan";
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];
const HEADERS = ["Tarikh", "Nama", "Email", "No. Telefon", "Resit"];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const name = clean_(data.name);
    const email = clean_(data.email);
    const phone = clean_(data.phone);
    const receipt = data.receipt || {};

    if (!name || !email || !phone || !receipt.data) {
      return json_({ ok: false, error: "missing_fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: "invalid_email" });
    }
    if (ALLOWED_TYPES.indexOf(receipt.type) === -1) {
      return json_({ ok: false, error: "invalid_file_type" });
    }

    const bytes = Utilities.base64Decode(receipt.data);
    if (bytes.length > MAX_RECEIPT_BYTES) {
      return json_({ ok: false, error: "file_too_large" });
    }

    const timestamp = new Date();
    const fileName = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") +
      " - " + name + " - " + clean_(receipt.name || "resit");
    const file = getReceiptFolder_().createFile(Utilities.newBlob(bytes, receipt.type, fileName));

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Prefix with ' so values like "=..." or "+60..." are stored as plain text.
      getSheet_().appendRow([timestamp, "'" + name, "'" + email, "'" + phone, file.getUrl()]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "server_error" });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getReceiptFolder_() {
  const folders = DriveApp.getFoldersByName(RECEIPT_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(RECEIPT_FOLDER_NAME);
}

function clean_(value) {
  return String(value || "").trim().slice(0, 200);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
