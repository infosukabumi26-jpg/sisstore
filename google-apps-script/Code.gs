/**
 * SISSTORE — Backend Google Spreadsheet & Google Drive Profesional (Tanpa Firebase)
 *
 * Fitur Spreadsheet Profesional Otomatis:
 * - Membuat 7 Tab Terstruktur: Ringkasan_Eksekutif, Katalog_Kaos, Stock_Opname,
 *   Transaksi_Penjualan, Laporan_Penjualan_Produk, Laporan_Opname, Pengaturan_Toko.
 * - Header Navy (#1E3A8A) teks putih tebal, baris 1 dibekukan (freeze), border tabel rapi,
 *   zebra striping, highlight baris TOTAL, dan format mata uang Rupiah ("Rp "#,##0).
 * - Folder Google Drive terstruktur: Produk_Kaos, Logo_Toko, QRIS_Toko.
 *
 * Cara Pasang:
 * 1. Buka Google Spreadsheet Anda (atau buat baru di sheets.new).
 * 2. Klik menu Extensions -> Apps Script.
 * 3. Hapus kode default, tempel seluruh kode ini, lalu simpan (Ctrl+S).
 * 4. Klik Deploy -> New deployment -> pilih Type: Web app.
 *    - Execute as: Me (Email pemilik Spreadsheet & Drive Anda)
 *    - Who has access: Anyone
 * 5. Klik Deploy, izinkan akses Sheets & Drive, lalu salin Web App URL (/exec)
 *    dan tempel di menu "Sheets, Drive & Akun" aplikasi Sisstore.
 */

var DEFAULT_DRIVE_FOLDER = 'Sisstore_Media_Drive';

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(parentFolder, name) {
  var it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) {
    return it.next();
  }
  return parentFolder.createFolder(name);
}

function getSisstoreRootFolder(folderName) {
  var name = folderName || DEFAULT_DRIVE_FOLDER;
  return getOrCreateFolder(DriveApp.getRootFolder(), name);
}

function getOrCreateSheet(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  return sheet;
}

function formatSheetProfessional(ss, tabName, rows, options) {
  var opts = options || {};
  var sheet = getOrCreateSheet(ss, tabName);
  sheet.clear();

  if (opts.tabColor) {
    sheet.setTabColor(opts.tabColor);
  }

  if (!rows || rows.length === 0 || !rows[0] || rows[0].length === 0) {
    return;
  }

  var numRows = rows.length;
  var numCols = rows[0].length;
  var fullRange = sheet.getRange(1, 1, numRows, numCols);
  fullRange.setValues(rows);
  fullRange
    .setFontFamily('Arial')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, '#D6D6D0', SpreadsheetApp.BorderStyle.SOLID);

  // Header styling (Navy #1E3A8A)
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setBackground('#1E3A8A')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);

  // Zebra striping for data rows
  if (numRows > 1) {
    for (var r = 2; r <= numRows; r++) {
      if (r % 2 === 1) {
        sheet.getRange(r, 1, 1, numCols).setBackground('#F8FAFC');
      } else {
        sheet.getRange(r, 1, 1, numCols).setBackground('#FFFFFF');
      }
      sheet.setRowHeight(r, 24);
    }
  }

  // Highlight TOTAL bottom row if present
  if (opts.hasTotalRow && numRows >= 2) {
    var totalRange = sheet.getRange(numRows, 1, 1, numCols);
    totalRange
      .setBackground('#E2E8F0')
      .setFontColor('#0F172A')
      .setFontWeight('bold');
    sheet.setRowHeight(numRows, 28);
  }

  // Currency IDR formatting ("Rp "#,##0)
  var currencyCols = opts.currencyCols || [];
  if (numRows > 1 && currencyCols.length > 0) {
    var startRow = opts.currencyStartRow || 2;
    if (startRow <= numRows) {
      for (var i = 0; i < currencyCols.length; i++) {
        var col = currencyCols[i];
        if (col >= 1 && col <= numCols) {
          sheet
            .getRange(startRow, col, numRows - startRow + 1, 1)
            .setNumberFormat('"Rp "#,##0');
        }
      }
    }
  }

  // Auto-resize columns with breathing room
  sheet.autoResizeColumns(1, numCols);
  for (var c = 1; c <= numCols; c++) {
    var currentW = sheet.getColumnWidth(c);
    sheet.setColumnWidth(c, Math.min(420, Math.max(95, currentW + 16)));
  }
}

function setPublicViewSharing(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err1) {
    try {
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    } catch (err2) {
      // Tetap lanjutkan jika kebijakan domain membatasi sharing publik otomatis
    }
  }
}

function readPullPayload(ss) {
  var katalogSheet = ss.getSheetByName('Katalog_Kaos');
  var settingsSheet = ss.getSheetByName('Pengaturan_Toko');
  var transaksiSheet = ss.getSheetByName('Transaksi_Penjualan');
  var laporanSheet = ss.getSheetByName('Laporan_Opname');
  return {
    spreadsheetId: ss.getId(),
    spreadsheetTitle: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    katalogRows: katalogSheet ? katalogSheet.getDataRange().getValues() : [],
    settingsRows: settingsSheet ? settingsSheet.getDataRange().getValues() : [],
    transaksiRows: transaksiSheet ? transaksiSheet.getDataRange().getValues() : [],
    laporanRows: laporanSheet ? laporanSheet.getDataRange().getValues() : []
  };
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var folderName = (e && e.parameter && e.parameter.folderName) ? e.parameter.folderName : DEFAULT_DRIVE_FOLDER;

    if (action === 'ping') {
      var folder = getSisstoreRootFolder(folderName);
      return jsonResponse({
        ok: true,
        spreadsheetId: ss.getId(),
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        driveFolderName: folder.getName(),
        driveFolderUrl: folder.getUrl()
      });
    }

    if (action === 'pullAll') {
      var pulled = readPullPayload(ss);
      pulled.ok = true;
      return jsonResponse(pulled);
    }

    return jsonResponse({ ok: false, error: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
    var action = payload.action || 'ping';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var folderName = payload.folderName || DEFAULT_DRIVE_FOLDER;

    if (action === 'uploadImage' || action === 'syncAll') {
      hasLock = lock.tryLock(15000);
    }

    if (action === 'ping') {
      var rootFolder = getSisstoreRootFolder(folderName);
      return jsonResponse({
        ok: true,
        spreadsheetId: ss.getId(),
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        driveFolderName: rootFolder.getName(),
        driveFolderUrl: rootFolder.getUrl()
      });
    }

    if (action === 'uploadImage') {
      if (!payload.base64) {
        return jsonResponse({ ok: false, error: 'Payload gambar base64 kosong.' });
      }
      var root = getSisstoreRootFolder(folderName);
      var subMap = { produk: 'Produk_Kaos', logo: 'Logo_Toko', qris: 'QRIS_Toko' };
      var subName = subMap[payload.category] || 'Lainnya';
      var subFolder = getOrCreateFolder(root, subName);

      var bytes = Utilities.base64Decode(payload.base64);
      var blob = Utilities.newBlob(bytes, payload.mimeType || 'image/jpeg', payload.fileName || ('sisstore-' + Date.now() + '.jpg'));
      var file = subFolder.createFile(blob);
      setPublicViewSharing(file);

      var fileId = file.getId();
      var directUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
      var lh3Url = 'https://lh3.googleusercontent.com/d/' + fileId;

      return jsonResponse({
        ok: true,
        fileId: fileId,
        directUrl: directUrl,
        lh3Url: lh3Url,
        webViewLink: file.getUrl(),
        driveFolderUrl: root.getUrl()
      });
    }

    if (action === 'syncAll') {
      if (payload.ringkasanRows) {
        formatSheetProfessional(ss, 'Ringkasan_Eksekutif', payload.ringkasanRows, {
          tabColor: '#1E3A8A',
          currencyCols: [2],
          currencyStartRow: 8
        });
      }
      if (payload.katalogRows) {
        formatSheetProfessional(ss, 'Katalog_Kaos', payload.katalogRows, {
          tabColor: '#141413',
          currencyCols: [7, 8, 17]
        });
      }
      if (payload.opnameRows) {
        formatSheetProfessional(ss, 'Stock_Opname', payload.opnameRows, {
          tabColor: '#1E3A8A',
          hasTotalRow: true,
          currencyCols: [5, 6, 7, 15, 16, 17, 18, 19]
        });
      }
      if (payload.transaksiRows) {
        formatSheetProfessional(ss, 'Transaksi_Penjualan', payload.transaksiRows, {
          tabColor: '#15803D',
          currencyCols: [7, 8, 9, 10, 13, 14]
        });
      }
      if (payload.penjualanProdukRows) {
        formatSheetProfessional(ss, 'Laporan_Penjualan_Produk', payload.penjualanProdukRows, {
          tabColor: '#0F766E',
          hasTotalRow: true,
          currencyCols: [6, 7, 9, 10, 11]
        });
      }
      if (payload.laporanRows) {
        formatSheetProfessional(ss, 'Laporan_Opname', payload.laporanRows, {
          tabColor: '#B45309',
          currencyCols: [7, 8, 9, 10, 11, 12, 13, 14]
        });
      }
      if (payload.settingsRows) {
        formatSheetProfessional(ss, 'Pengaturan_Toko', payload.settingsRows, {
          tabColor: '#52524E'
        });
      }

      var driveRoot = getSisstoreRootFolder(folderName);
      return jsonResponse({
        ok: true,
        spreadsheetId: ss.getId(),
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        driveFolderName: driveRoot.getName(),
        driveFolderUrl: driveRoot.getUrl(),
        syncedAt: new Date().toISOString()
      });
    }

    if (action === 'pullAll') {
      var pulledPost = readPullPayload(ss);
      pulledPost.ok = true;
      return jsonResponse(pulledPost);
    }

    return jsonResponse({ ok: false, error: 'Action tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err && err.message ? err.message : String(err) });
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {}
    }
  }
}
