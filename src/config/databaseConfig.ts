import {
  isValidAppsScriptUrl,
  normalizeDriveFolderName,
} from '../services/googleSheets';

/**
 * Konfigurasi permanen Google Apps Script & Google Drive (di belakang layar).
 *
 * Nilai dibaca otomatis dari Environment Variables (VITE_APPS_SCRIPT_URL &
 * VITE_DRIVE_FOLDER_NAME) saat build/deploy sehingga seluruh perangkat (PC, tablet,
 * HP) dan browser apa pun langsung terhubung ke Google Sheets & Google Drive tanpa
 * pengaturan ulang di halaman Administrator dan tanpa localStorage browser.
 *
 * Jika ingin menanamkan URL secara langsung di repositori, isi konstanta fallback
 * PERMANENT_APPS_SCRIPT_URL dan PERMANENT_DRIVE_FOLDER_NAME di bawah ini.
 */
const PERMANENT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxd03j9tTYgpAKNnw7tJTAfvuyZSVJZUB2Utdgeta8Jy32eDD3K_oKBn2BWcns7wz-g6Q/exec';
const PERMANENT_DRIVE_FOLDER_NAME = 'Sisstore_Media_Drive';

export interface PermanentDatabaseConfig {
  appsScriptUrl: string;
  driveFolderName: string;
}

export function getPermanentDatabaseConfig(
  envOverride?: Record<string, unknown>
): PermanentDatabaseConfig {
  const envObj =
    envOverride ??
    ((import.meta as unknown as { env?: Record<string, unknown> }).env || {});

  const rawUrl = String(
    envObj.VITE_APPS_SCRIPT_URL ||
      envObj.VITE_DEFAULT_APPS_SCRIPT_URL ||
      PERMANENT_APPS_SCRIPT_URL ||
      ''
  ).trim();

  const rawFolder = String(
    envObj.VITE_DRIVE_FOLDER_NAME ||
      envObj.VITE_DEFAULT_DRIVE_FOLDER ||
      PERMANENT_DRIVE_FOLDER_NAME ||
      ''
  ).trim();

  return {
    appsScriptUrl: isValidAppsScriptUrl(rawUrl) ? rawUrl : '',
    driveFolderName: normalizeDriveFolderName(rawFolder),
  };
}
