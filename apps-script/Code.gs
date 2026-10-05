const SPREADSHEET_ID = "1zaqUc03nV4ur8gEPVMlIdJ_Ao2y9DugFrKAhYRpktrA";
const HOUSE_ORDER = ["Biru", "Kuning", "Ungu", "Merah"];
const AUTH_SHEET = "Pengguna";
const AUDIT_SHEET = "Log Aktiviti";
const SESSION_HOURS = 8;
const HASH_ROUNDS = 2500;
const AUTH_BASE_HEADERS = ["ID Guru", "Nama Guru", "Rumah", "Peranan", "Aktif"];
const AUTH_STORAGE_HEADERS = ["Hash Kata Laluan", "Garam", "Wajib Tukar", "Kemaskini Terakhir"];

function doGet(e) {
  try {
    const scope = String((e && e.parameter && e.parameter.scope) || "public");
    if (scope === "session") return jsonResponse(sessionInfo_(String(e.parameter.token || "")));
    return jsonResponse(buildPublicData());
  } catch (error) {
    return jsonResponse({ error: true, message: error.message });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || "");
    if (action === "login") return jsonResponse(login_(body));
    if (action === "changePassword") return jsonResponse(changePassword_(body));
    if (action === "logout") return jsonResponse(logout_(body));
    if (action === "teacherData") return jsonResponse(teacherData_(body));
    if (action === "resetPassword") return jsonResponse(resetPassword_(body));
    throw new Error("Tindakan API tidak dikenali.");
  } catch (error) {
    return jsonResponse({ error: true, message: error.message });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function parseBody_(e) {
  const params = (e && e.parameter) || {};
  if (Object.keys(params).length) return params;
  const text = e && e.postData && e.postData.contents;
  if (!text) return {};
  try { return JSON.parse(text); } catch (_) { return {}; }
}

function spreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function rowsFrom(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(value => String(value).trim() !== ""))
    .map((row, index) => Object.assign({ __row: index + 2 }, Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]))));
}

function emptyHouse(officialName) {
  return {
    officialName: officialName || "",
    teacher: "",
    motto: "",
    slogan: "",
    captain: "",
    bannerBearer: "",
    flagBearer: "",
    memberCount: 0,
    participantCount: 0
  };
}

function ensureYear(data, year) {
  year = String(year || "2026").trim();
  if (!data.years[year]) {
    data.years[year] = { houses: {}, events: [], schedule: [], results: [], committee: [] };
    HOUSE_ORDER.forEach(name => data.years[year].houses[name] = emptyHouse(""));
  }
  return data.years[year];
}

function parseTeacherBlock(value) {
  const lines = String(value || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const officialName = lines.shift() || "";
  const teachers = lines.map(x => x.replace(/^\d+\.\s*/, "")).filter(Boolean);
  return { officialName, teacher: teachers.join("; ") };
}

/** Paparan awam: tiada kata laluan, e-mel, ID guru atau senarai nama murid. */
function buildPublicData() {
  const output = { years: {} };
  const pupils = rowsFrom("Murid");
  const pupilById = Object.fromEntries(pupils.map(row => [String(row["ID Murid"] || "").trim(), row]));
  const events = rowsFrom("Acara");
  const eventById = Object.fromEntries(events.map(row => [String(row["ID Acara"] || "").trim(), row]));
  ["2026", "2027", "2028", "2029", "2030"].forEach(year => ensureYear(output, year));

  rowsFrom("Rumah").forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    const name = String(row["Rumah"] || "").trim();
    if (!HOUSE_ORDER.includes(name)) return;
    const parsed = parseTeacherBlock(row["Guru Rumah"]);
    yearData.houses[name] = {
      ...emptyHouse(parsed.officialName),
      teacher: parsed.teacher,
      motto: row["Moto"] || "",
      slogan: row["Slogan"] || "",
      captain: row["Ketua Rumah"] || "",
      bannerBearer: row["Pemegang Sepanduk"] || "",
      flagBearer: row["Pemegang Bendera"] || ""
    };
  });

  pupils.forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    const house = String(row["Rumah"] || "").trim();
    if (yearData.houses[house]) yearData.houses[house].memberCount++;
  });

  events.forEach(row => {
    if (!row["ID Acara"] || !row["Nama Acara"]) return;
    const yearData = ensureYear(output, row["Tahun"]);
    yearData.events.push({
      id: row["ID Acara"] || "",
      name: row["Nama Acara"] || "",
      discipline: row["Kategori"] || "",
      stage: row["Peringkat"] || "",
      categoryCode: row["Kod Kategori"] || "",
      cohort: row["Kumpulan Tahun"] || "",
      gender: row["Jantina"] || "",
      entryType: row["Jenis Acara"] || "",
      note: row["Catatan"] || ""
    });
  });

  rowsFrom("Penyertaan").forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    const house = String(row["Rumah"] || "").trim();
    if (yearData.houses[house]) yearData.houses[house].participantCount++;
  });

  rowsFrom("Atur Cara").forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    if (!row["Acara"]) return;
    yearData.schedule.push({
      championshipDay: row["Hari Kejohanan"] || "",
      date: row["Tarikh"] || "",
      weekday: row["Hari"] || "",
      time: row["Masa"] || "",
      event: row["Acara"] || "",
      category: row["Kategori"] || "",
      venue: row["Tempat"] || "",
      status: row["Status"] || "",
      note: row["Catatan"] || ""
    });
  });

  rowsFrom("Keputusan").forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    if (!row["Nama Murid"] || !row["Acara"]) return;
    const eventId = String(row["Acara"] || "").trim();
    const athleteId = String(row["ID Murid"] || "").trim();
    const eventInfo = eventById[eventId] || {};
    const pupilInfo = pupilById[athleteId] || {};
    yearData.results.push({
      eventId,
      event: eventInfo["Nama Acara"] || row["Acara"] || "",
      category: eventInfo["Kategori"] || row["Kategori"] || "",
      stage: eventInfo["Peringkat"] || "",
      categoryCode: eventInfo["Kod Kategori"] || "",
      cohort: eventInfo["Kumpulan Tahun"] || "",
      eventGender: eventInfo["Jantina"] || "",
      entryType: eventInfo["Jenis Acara"] || "",
      place: Number(row["Kedudukan"]) || 0,
      athleteId,
      athlete: row["Nama Murid"] || pupilInfo["Nama Murid"] || "",
      gender: pupilInfo["Jantina"] || "",
      house: row["Rumah"] || pupilInfo["Rumah"] || "",
      mark: row["Catatan"] || ""
    });
  });

  rowsFrom("Jawatankuasa").forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    if (!row["Jawatan"]) return;
    yearData.committee.push({
      id: row["ID AJK"] || "",
      order: Number(row["Susunan"]) || 999,
      level: row["Peringkat"] || "Pelaksana",
      position: row["Jawatan"] || "",
      name: row["Nama"] || "",
      photo: row["Foto"] || "",
      duty: row["Tugasan"] || "",
      active: row["Aktif"] || "YA"
    });
  });
  return output;
}

function authSheet_() {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(AUTH_SHEET);
  if (!sheet) sheet = ss.insertSheet(AUTH_SHEET);
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String);
  const normalized = existing.filter(Boolean);
  if (!normalized.length) AUTH_BASE_HEADERS.forEach(header => normalized.push(header));
  AUTH_STORAGE_HEADERS.forEach(header => { if (!normalized.includes(header)) normalized.push(header); });
  sheet.getRange(1, 1, 1, normalized.length).setValues([normalized]);
  return { sheet, headers: normalized };
}

function headerIndex_(headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index >= 0) return index;
  }
  return -1;
}

function users_() {
  const { sheet, headers } = authSheet_();
  if (sheet.getLastRow() < 2) return { sheet, headers, users: [] };
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
  const index = {
    id: headerIndex_(headers, ["ID Guru", "ID Pengguna", "ID"]),
    name: headerIndex_(headers, ["Nama Guru", "Nama Pengguna", "Nama"]),
    house: headerIndex_(headers, ["Rumah", "Rumah Sukan"]),
    role: headerIndex_(headers, ["Peranan", "Role"]),
    active: headerIndex_(headers, ["Aktif", "Status"]),
    hash: headers.indexOf("Hash Kata Laluan"),
    salt: headers.indexOf("Garam"),
    mustChange: headers.indexOf("Wajib Tukar"),
    updated: headers.indexOf("Kemaskini Terakhir")
  };
  const users = values.map((row, i) => ({
    row: i + 2,
    raw: row,
    id: index.id >= 0 ? String(row[index.id] || "").trim() : "",
    name: index.name >= 0 ? String(row[index.name] || "").trim() : "",
    house: index.house >= 0 ? String(row[index.house] || "").trim() : "",
    role: index.role >= 0 ? String(row[index.role] || "Guru").trim() : "Guru",
    active: index.active < 0 || !/^(tidak|no|false|0|nonaktif)$/i.test(String(row[index.active] || "")),
    hash: index.hash >= 0 ? String(row[index.hash] || "") : "",
    salt: index.salt >= 0 ? String(row[index.salt] || "") : "",
    mustChange: index.mustChange < 0 || !/^(tidak|no|false|0)$/i.test(String(row[index.mustChange] || ""))
  })).filter(user => user.id);
  return { sheet, headers, users, index };
}

function updateAuth_(context, user, values) {
  Object.keys(values).forEach(key => {
    const column = context.index[key];
    if (column >= 0) context.sheet.getRange(user.row, column + 1).setValue(values[key]);
  });
}

function login_(body) {
  const id = String(body.id || "").trim().toUpperCase();
  const password = String(body.password || "");
  if (!id || !password) throw new Error("Masukkan ID Guru dan kata laluan.");
  enforceRateLimit_(id);
  const context = users_();
  const user = context.users.find(item => item.id.toUpperCase() === id);
  if (!user || !user.active) return failedLogin_(id);
  let valid = false;
  let mustChange = user.mustChange;
  if (!user.hash || !user.salt) {
    valid = password === temporaryPassword_();
    mustChange = true;
  } else {
    valid = secureEqual_(user.hash, passwordHash_(password, user.salt));
  }
  if (!valid) return failedLogin_(id);
  clearRateLimit_(id);
  const token = createSession_(user, mustChange);
  audit_(user, "LOG MASUK", "Portal Guru", "Log masuk berjaya");
  return { ok: true, token, mustChange, user: publicUser_(user) };
}

function changePassword_(body) {
  const session = requireSession_(body.token);
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 8) throw new Error("Kata laluan baharu mesti sekurang-kurangnya 8 aksara.");
  if (newPassword === temporaryPassword_()) throw new Error("Pilih kata laluan baharu yang berbeza daripada kata laluan sementara.");
  const context = users_();
  const user = context.users.find(item => item.id === session.id);
  if (!user) throw new Error("Akaun tidak dijumpai.");
  const currentValid = (!user.hash || !user.salt) ? currentPassword === temporaryPassword_() : secureEqual_(user.hash, passwordHash_(currentPassword, user.salt));
  if (!currentValid) throw new Error("Kata laluan semasa tidak tepat.");
  const salt = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  updateAuth_(context, user, { hash: passwordHash_(newPassword, salt), salt, mustChange: "TIDAK", updated: new Date() });
  const properties = PropertiesService.getScriptProperties();
  const sessionKey = sessionKey_(String(body.token || ""));
  properties.setProperty(sessionKey, JSON.stringify({ ...session, mustChange: false }));
  audit_(user, "TUKAR KATA LALUAN", "Portal Guru", "Kata laluan berjaya ditukar");
  return { ok: true };
}

function resetPassword_(body) {
  const session = requireSession_(body.token);
  if (!/^admin/i.test(session.role)) throw new Error("Hanya admin boleh menetapkan semula kata laluan.");
  const targetId = String(body.id || "").trim().toUpperCase();
  const context = users_();
  const target = context.users.find(item => item.id.toUpperCase() === targetId);
  if (!target) throw new Error("ID Guru tidak dijumpai.");
  updateAuth_(context, target, { hash: "", salt: "", mustChange: "YA", updated: new Date() });
  audit_(session, "RESET KATA LALUAN", target.id, "Ditetapkan semula kepada kata laluan sementara");
  return { ok: true };
}

function teacherData_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum membuka data rumah sukan.");
  const year = String(body.year || "2026");
  const requestedHouse = String(body.house || session.house || "");
  const isAdmin = /^admin/i.test(session.role);
  if (!isAdmin && requestedHouse !== session.house) throw new Error("Akses hanya dibenarkan untuk rumah sukan sendiri.");
  const publicData = buildPublicData();
  const yearData = publicData.years[year] || { houses: {} };
  const pupils = rowsFrom("Murid").filter(row => String(row["Tahun"] || "") === year && (isAdmin ? (!requestedHouse || row["Rumah"] === requestedHouse) : row["Rumah"] === session.house));
  const entries = rowsFrom("Penyertaan").filter(row => String(row["Tahun"] || "") === year && (isAdmin ? (!requestedHouse || row["Rumah"] === requestedHouse) : row["Rumah"] === session.house));
  return {
    ok: true,
    user: session,
    house: requestedHouse,
    profile: yearData.houses[requestedHouse] || {},
    pupils: pupils.map(row => ({ id: row["ID Murid"] || "", name: row["Nama Murid"] || "", class: row["Kelas"] || row["Tahun/Kelas"] || "", gender: row["Jantina"] || "", house: row["Rumah"] || "" })),
    entries: entries.map(row => ({ id: row["ID Penyertaan"] || "", pupilId: row["ID Murid"] || "", name: row["Nama Murid"] || "", event: row["Acara"] || "", category: row["Kategori"] || "", status: row["Status"] || "" }))
  };
}

function sessionInfo_(token) {
  try { return { ok: true, user: requireSession_(token) }; }
  catch (_) { return { ok: false }; }
}

function logout_(body) {
  const token = String(body.token || "");
  if (token) PropertiesService.getScriptProperties().deleteProperty(sessionKey_(token));
  return { ok: true };
}

function publicUser_(user) {
  return { id: user.id, name: user.name, house: user.house, role: user.role };
}

function createSession_(user, mustChange) {
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const data = { ...publicUser_(user), mustChange: Boolean(mustChange), expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000 };
  PropertiesService.getScriptProperties().setProperty(sessionKey_(token), JSON.stringify(data));
  return token;
}

function requireSession_(token) {
  token = String(token || "");
  if (!token) throw new Error("Sesi log masuk diperlukan.");
  const properties = PropertiesService.getScriptProperties();
  const key = sessionKey_(token);
  const raw = properties.getProperty(key);
  if (!raw) throw new Error("Sesi telah tamat. Sila log masuk semula.");
  const session = JSON.parse(raw);
  if (Number(session.expires) < Date.now()) {
    properties.deleteProperty(key);
    throw new Error("Sesi telah tamat. Sila log masuk semula.");
  }
  return session;
}

function sessionKey_(token) {
  return "session_" + digest_(token).slice(0, 40);
}

function temporaryPassword_() {
  const value = PropertiesService.getScriptProperties().getProperty("TEMP_PASSWORD");
  if (!value) throw new Error("Kata laluan sementara belum ditetapkan oleh pentadbir.");
  return value;
}

function passwordHash_(password, salt) {
  let value = String(salt) + ":" + String(password);
  for (let i = 0; i < HASH_ROUNDS; i++) value = digest_(value + ":" + salt);
  return value;
}

function digest_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0")).join("");
}

function secureEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function failedLogin_(id) {
  recordFailedAttempt_(id);
  return { error: true, message: "ID Guru atau kata laluan tidak tepat." };
}

function rateKey_(id) { return "rate_" + digest_(id).slice(0, 24); }
function enforceRateLimit_(id) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(rateKey_(id)) || 0);
  if (count >= 8) throw new Error("Terlalu banyak percubaan. Cuba semula selepas 15 minit.");
}
function recordFailedAttempt_(id) {
  const cache = CacheService.getScriptCache();
  const key = rateKey_(id);
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 900);
}
function clearRateLimit_(id) { CacheService.getScriptCache().remove(rateKey_(id)); }

function audit_(user, action, target, detail) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(AUDIT_SHEET);
  if (!sheet) sheet = ss.insertSheet(AUDIT_SHEET);
  if (sheet.getLastRow() === 0) sheet.appendRow(["Tarikh Masa", "ID Guru", "Nama Guru", "Rumah", "Tindakan", "Sasaran", "Butiran"]);
  sheet.appendRow([new Date(), user.id || "", user.name || "", user.house || "", action, target, detail]);
}
