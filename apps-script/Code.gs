const SPREADSHEET_ID = "1zaqUc03nV4ur8gEPVMlIdJ_Ao2y9DugFrKAhYRpktrA";
const HOUSE_ORDER = ["Biru", "Kuning", "Ungu", "Merah"];
const AUTH_SHEET = "Pengguna";
const AUDIT_SHEET = "Log Aktiviti";
const JUDGE_SHEET = "Akses Pengadil";
const SESSION_HOURS = 8;
const HASH_ROUNDS = 2500;
const AUTH_BASE_HEADERS = ["ID Guru", "Nama Guru", "Rumah", "Peranan", "Aktif", "No. Kad Pengenalan"];
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
    if (action === "adminLogin") return jsonResponse(adminLogin_(body));
    if (action === "judgeLogin") return jsonResponse(judgeLogin_(body));
    if (action === "lookupTeacher") return jsonResponse(lookupTeacher_(body));
    if (action === "changePassword") return jsonResponse(changePassword_(body));
    if (action === "logout") return jsonResponse(logout_(body));
    if (action === "teacherData") return jsonResponse(teacherData_(body));
    if (action === "judgeData") return jsonResponse(judgeData_(body));
    if (action === "resetPassword") return jsonResponse(resetPassword_(body));
    if (action === "savePupil") return jsonResponse(savePupil_(body));
    if (action === "saveEntry") return jsonResponse(saveEntry_(body));
    if (action === "deleteEntry") return jsonResponse(deleteEntry_(body));
    if (action === "saveHouseProfile") return jsonResponse(saveHouseProfile_(body));
    if (action === "saveHouseLogo") return jsonResponse(saveHouseLogo_(body));
    if (action === "saveHouseMedia") return jsonResponse(saveHouseMedia_(body));
    if (action === "saveResult") return jsonResponse(saveResult_(body));
    if (action === "deleteResult") return jsonResponse(deleteResult_(body));
    if (action === "saveAthletePhoto") return jsonResponse(saveAthletePhoto_(body));
    if (action === "adminUsers") return jsonResponse(adminUsers_(body));
    if (action === "saveUser") return jsonResponse(saveUser_(body));
    if (action === "saveSettings") return jsonResponse(saveSettings_(body));
    if (action === "saveJudgeAccess") return jsonResponse(saveJudgeAccess_(body));
    if (action === "seedJudgeAccess") return jsonResponse(seedJudgeAccess_(body));
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
    logo: "",
    memberImage: "",
    marchingImage: "",
    participantImage: "",
    memberCount: 0,
    participantCount: 0,
    pendingParticipantCount: 0
  };
}

function ensureYear(data, year) {
  year = String(year || "2026").trim();
  if (!data.years[year]) {
    data.years[year] = { houses: {}, events: [], schedule: [], results: [], athletePhotos: {}, committee: [] };
    HOUSE_ORDER.forEach(name => data.years[year].houses[name] = emptyHouse(""));
  }
  return data.years[year];
}

function parseTeacherBlock(value) {
  const lines = String(value || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const firstLine = lines.shift() || "";
  const officialName = /^Rumah\s+/i.test(firstLine) ? firstLine : "";
  const teachers = lines.map(x => x.replace(/^\d+\.\s*/, "")).filter(Boolean);
  return { officialName, teacher: teachers.join("; ") };
}

/** Paparan awam: tiada kata laluan, e-mel, ID guru atau senarai nama murid. */
function buildPublicData() {
  const output = { years: {}, settings: settings_() };
  const pupils = rowsFrom("Murid");
  const pupilById = Object.fromEntries(pupils.map(row => [String(row["ID Murid"] || "").trim(), row]));
  const events = rowsFrom("Acara");
  const eventById = Object.fromEntries(events.map(row => [String(row["ID Acara"] || "").trim(), row]));
  const entries = rowsFrom("Penyertaan").filter(row => !/batal/i.test(String(row["Status"] || "")));
  const schedules = rowsFrom("Atur Cara");
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
      flagBearer: row["Pemegang Bendera"] || "",
      logo: row["Logo Rumah"] || "",
      memberImage: row["Gambar Ahli"] || "",
      marchingImage: row["Gambar Kawad"] || "",
      participantImage: row["Gambar Peserta"] || ""
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

  entries.forEach(row => {
    const yearData = ensureYear(output, row["Tahun"]);
    const house = String(row["Rumah"] || "").trim();
    const eventId = String(row["Acara"] || "").trim();
    const status = String(row["Status"] || "").trim();
    const complete = Boolean(eventId && eventById[eventId]) && !/perlu|draf|pending/i.test(status);
    if (yearData.houses[house]) {
      if (complete) yearData.houses[house].participantCount++;
      else yearData.houses[house].pendingParticipantCount++;
    }
  });

  schedules.forEach(row => {
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

  const publishedByYear = {};
  schedules.forEach(row => {
    const year = String(row["Tahun"] || "2026");
    if (!row["Tarikh"] || !row["Masa"] || !row["Acara"]) return;
    if (!publishedByYear[year]) publishedByYear[year] = new Set();
    publishedByYear[year].add(String(row["Acara"] || "").trim());
  });
  entries.forEach(row => {
    const year = String(row["Tahun"] || "2026");
    const eventId = String(row["Acara"] || "").trim();
    const eventInfo = eventById[eventId] || {};
    const eventName = String(eventInfo["Nama Acara"] || eventId).trim();
    const published = publishedByYear[year] || new Set();
    if (!published.has(eventId) && !published.has(eventName)) return;
    const pupil = pupilById[String(row["ID Murid"] || "").trim()] || {};
    ensureYear(output, year).publishedEntries = ensureYear(output, year).publishedEntries || [];
    ensureYear(output, year).publishedEntries.push({
      eventId,
      event: eventName,
      name: row["Nama Murid"] || pupil["Nama Murid"] || "",
      house: row["Rumah"] || pupil["Rumah"] || "",
      lane: row["Lorong"] || "",
      status: row["Status"] || "Disahkan"
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
      mark: row["Catatan"] || "",
      value: Number(String(row["Nilai"] || "").replace(",", ".")) || 0,
      unit: row["Unit"] || "",
      status: row["Status"] || "Rasmi"
    });
  });

  const photoRows = rowsFrom("Foto Atlet");
  Object.keys(output.years).forEach(year => {
    const yearData = output.years[year];
    const leaders = awardLeaders_(yearData.results || []);
    [leaders.Lelaki, leaders.Perempuan].filter(Boolean).forEach(leader => {
      const photo = photoRows.find(row => String(row["Tahun"] || "") === year && String(row["ID Murid"] || "") === leader.athleteId);
      if (photo && photo["Foto"]) yearData.athletePhotos[leader.athleteId] = photo["Foto"];
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

function settings_() {
  const values = {};
  rowsFrom("Tetapan").forEach(row => {
    const key = String(row["Kunci"] || row["Tetapan"] || "").trim();
    if (key) values[key] = row["Nilai"] || "";
  });
  return {
    bannerUrl: values["Banner URL"] || "",
    tickerText: values["News Ticker"] || "",
    tickerActive: String(values["News Ticker Aktif"] || "TIDAK").toUpperCase() === "YA"
  };
}

function authSheet_() {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(AUTH_SHEET);
  if (!sheet) sheet = ss.insertSheet(AUTH_SHEET);
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String);
  const normalized = existing.filter(Boolean);
  if (!normalized.length) AUTH_BASE_HEADERS.forEach(header => normalized.push(header));
  if (!normalized.includes("No. Kad Pengenalan")) normalized.push("No. Kad Pengenalan");
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
    ic: headerIndex_(headers, ["No. Kad Pengenalan", "No Kad Pengenalan", "Kad Pengenalan"]),
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
    ic: index.ic >= 0 ? normalizeIc_(row[index.ic]) : "",
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
  const ic = normalizeIc_(body.ic);
  const password = String(body.password || "");
  if (ic.length !== 12 || !password) throw new Error("Masukkan nombor kad pengenalan 12 digit dan kata laluan.");
  enforceRateLimit_(ic);
  const context = users_();
  const matches = context.users.filter(item => item.ic === ic);
  const user = matches.find(item => item.active && HOUSE_ORDER.includes(item.house)) || matches.find(item => item.active);
  if (!user || !user.active) return failedLogin_(ic);
  let valid = false;
  let mustChange = user.mustChange;
  if (!user.hash || !user.salt) {
    valid = password === temporaryPassword_();
    mustChange = true;
  } else {
    valid = secureEqual_(user.hash, passwordHash_(password, user.salt));
  }
  if (!valid) return failedLogin_(ic);
  clearRateLimit_(ic);
  const token = createSession_(user, mustChange, false);
  audit_(user, "LOG MASUK", "Portal Guru", "Log masuk berjaya");
  return { ok: true, token, mustChange, user: publicUser_(user, false) };
}

function adminLogin_(body) {
  const code = String(body.code || "");
  if (!code) throw new Error("Masukkan kod akses Admin Sistem.");
  enforceRateLimit_("admin-system");
  const configured = PropertiesService.getScriptProperties().getProperty("ADMIN_ACCESS_CODE");
  if (!configured) throw new Error("Kod akses Admin Sistem belum ditetapkan.");
  if (!secureEqual_(digest_(code), digest_(configured))) {
    recordFailedAttempt_("admin-system");
    return { error: true, message: "Kod akses Admin Sistem tidak tepat." };
  }
  clearRateLimit_("admin-system");
  const user = { id: "SYS-ADMIN", name: "Admin Sistem", house: "", role: "Admin Sistem" };
  const token = createSession_(user, false, true);
  audit_(user, "LOG MASUK", "Admin Sistem", "Akses khas Admin Sistem berjaya");
  return { ok: true, token, mustChange: false, user: publicUser_(user, true) };
}

function judgeAccessContext_() {
  const headers = ["ID Pengadil", "Nama Pengadil", "Peranan", "Skop Acara", "Kod Akses", "Aktif", "Kemaskini Terakhir"];
  return dataSheet_(JUDGE_SHEET, headers);
}

function judgeAccessRows_() {
  judgeAccessContext_();
  return rowsFrom(JUDGE_SHEET).map(row => ({
    row: row.__row,
    id: String(row["ID Pengadil"] || "").trim(),
    name: String(row["Nama Pengadil"] || "").trim(),
    role: String(row["Peranan"] || "Pengadil").trim(),
    scope: String(row["Skop Acara"] || "SEMUA").trim(),
    code: String(row["Kod Akses"] || "").trim(),
    active: !/^(TIDAK|NO|FALSE|0)$/i.test(String(row["Aktif"] || "YA"))
  })).filter(row => row.id && row.code);
}

function judgeCode_() {
  const used = new Set(judgeAccessRows_().map(row => row.code));
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!used.has(code)) return code;
  }
  throw new Error("Kod empat angka tidak dapat dijana. Cuba sekali lagi.");
}

function judgeLogin_(body) {
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) throw new Error("Masukkan kod akses pengadil.");
  enforceRateLimit_("judge-" + code);
  const judge = judgeAccessRows_().find(row => row.active && secureEqual_(row.code.toUpperCase(), code));
  if (!judge) { recordFailedAttempt_("judge-" + code); return { error: true, message: "Kod akses pengadil tidak sah atau telah dinyahaktifkan." }; }
  let actor = { id: "AWAM", name: "PETUGAS AWAM", house: "", schoolRole: "Petugas Awam" };
  let identityType = "AWAM";
  const teacherToken = String(body.teacherToken || "").trim();
  if (teacherToken) {
    try {
      const staffSession = requireSession_(teacherToken);
      if (!staffSession.isSystemAdmin && staffSession.id && staffSession.name) {
        actor = { id: staffSession.id, name: staffSession.name, house: staffSession.house || "", schoolRole: staffSession.role || "Warga Sekolah" };
        identityType = "WARGA";
      }
    } catch (_) {
      // Sesi guru yang tamat tidak menghalang tugas pengadil; petugas direkodkan sebagai awam.
    }
  }
  clearRateLimit_("judge-" + code);
  const user = { id: actor.id, name: actor.name, house: actor.house, role: judge.role, schoolRole: actor.schoolRole, identityType, judgeLabel: judge.name, judgeAccessId: judge.id, isJudge: true, judgeScope: judge.scope };
  const token = createSession_(user, false, false);
  audit_(user, "LOG MASUK PENGADIL", judge.scope, judge.name + " • " + actor.schoolRole + " • " + identityType);
  return { ok: true, token, user: publicUser_(user, false) };
}

function eventAllowedForJudge_(session, event) {
  if (isSystemAdmin_(session)) return true;
  if (!session || !session.isJudge) return false;
  const scope = String(session.judgeScope || "SEMUA").trim().toUpperCase();
  if (!scope || scope === "SEMUA") return true;
  const id = String(event["ID Acara"] || "").toUpperCase();
  const name = String(event["Nama Acara"] || "").toUpperCase();
  const discipline = String(event["Kategori"] || "").toUpperCase();
  const kind = eventKind_(event["Jenis Acara"] || name).toUpperCase();
  return scope.split(/[,;|]/).map(x => x.trim()).filter(Boolean).some(item => {
    if (item === "RELAY") return kind === "BERKUMPULAN" || /4\s*[×X]/.test(name);
    if (item === "BALAPAN") return resultMode_(event) === "lower";
    if (item === "PADANG") return resultMode_(event) === "higher";
    return id === item || name.includes(item) || discipline.includes(item);
  });
}

function judgeData_(body) {
  const session = requireSession_(body.token);
  requireJudge_(session);
  const year = String(body.year || "2026");
  const eventRows = rowsFrom("Acara").filter(row => String(row["Tahun"] || "") === year && row["ID Acara"] && eventAllowedForJudge_(session, row));
  const eventById = Object.fromEntries(eventRows.map(row => [String(row["ID Acara"]), row]));
  const allowedIds = new Set(Object.keys(eventById));
  const entries = rowsFrom("Penyertaan").filter(row => String(row["Tahun"] || "") === year && allowedIds.has(String(row["Acara"] || "")) && !/batal/i.test(String(row["Status"] || "")));
  return {
    ok: true,
    user: session,
    year,
    events: eventRows.map(row => ({ id: row["ID Acara"] || "", name: row["Nama Acara"] || "", discipline: row["Kategori"] || "", cohort: row["Kumpulan Tahun"] || "", gender: row["Jantina"] || "", type: row["Jenis Acara"] || "", unit: suggestedUnit_(row), mode: resultMode_(row) })),
    entries: entries.map(row => ({ id: row["ID Penyertaan"] || "", pupilId: row["ID Murid"] || "", name: row["Nama Murid"] || "", house: row["Rumah"] || "", eventId: row["Acara"] || "" })),
    results: resultRows_(year, eventById).filter(row => allowedIds.has(row.eventId))
  };
}

function normalizeIc_(value) { return String(value || "").replace(/\D/g, ""); }

function lookupTeacher_(body) {
  const ic = normalizeIc_(body.ic);
  if (ic.length !== 12) throw new Error("Masukkan nombor kad pengenalan 12 digit.");
  enforceRateLimit_(ic);
  const matches = users_().users.filter(item => item.ic === ic && item.active);
  const user = matches.find(item => HOUSE_ORDER.includes(item.house)) || matches[0];
  if (!user) return failedLogin_(ic);
  return { ok: true, name: user.name, house: user.house };
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
  requireAdmin_(session);
  const targetId = String(body.id || "").trim().toUpperCase();
  const targetIc = normalizeIc_(body.ic);
  const context = users_();
  const target = context.users.find(item => targetIc ? item.ic === targetIc : item.id.toUpperCase() === targetId);
  if (!target) throw new Error("Akaun guru tidak dijumpai.");
  updateAuth_(context, target, { hash: "", salt: "", mustChange: "YA", updated: new Date() });
  audit_(session, "RESET KATA LALUAN", target.id, "Ditetapkan semula kepada kata laluan sementara");
  return { ok: true };
}

function teacherData_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum membuka data rumah sukan.");
  const year = String(body.year || "2026");
  const requestedHouse = String(body.house || session.house || "");
  const isAdmin = isSystemAdmin_(session);
  if (!isAdmin && requestedHouse !== session.house) throw new Error("Akses hanya dibenarkan untuk rumah sukan sendiri.");
  const publicData = buildPublicData();
  const yearData = publicData.years[year] || { houses: {} };
  const pupils = rowsFrom("Murid").filter(row => String(row["Tahun"] || "") === year && (isAdmin ? (!requestedHouse || row["Rumah"] === requestedHouse) : row["Rumah"] === session.house));
  const eventRows = rowsFrom("Acara").filter(row => String(row["Tahun"] || "") === year && row["ID Acara"]);
  const eventById = Object.fromEntries(eventRows.map(row => [String(row["ID Acara"]), row]));
  const activeEntries = rowsFrom("Penyertaan").filter(row => String(row["Tahun"] || "") === year && !/batal/i.test(String(row["Status"] || "")));
  const entries = activeEntries.filter(row => isAdmin ? (!requestedHouse || row["Rumah"] === requestedHouse) : row["Rumah"] === session.house);
  const visiblePendingEntries = (isAdmin ? activeEntries : entries).filter(row => {
    const eventId = String(row["Acara"] || "").trim();
    return !eventId || !eventById[eventId] || /perlu|draf|pending/i.test(String(row["Status"] || ""));
  });
  const houseUsers = users_().users.filter(user => user.house === requestedHouse);
  const canJudge = canJudge_(session);
  const allEntries = canJudge ? activeEntries : [];
  const allResults = canJudge ? resultRows_(year, eventById) : [];
  return {
    ok: true,
    user: session,
    house: requestedHouse,
    isAdmin,
    canJudge,
    houses: HOUSE_ORDER,
    settings: publicData.settings || {},
    profile: yearData.houses[requestedHouse] || {},
    pupils: pupils.map(row => ({ id: row["ID Murid"] || "", name: row["Nama Murid"] || "", class: row["Kelas"] || row["Tahun/Kelas"] || "", gender: row["Jantina"] || "", house: row["Rumah"] || "" })),
    entries: entries.map(row => {
      const event = eventById[String(row["Acara"] || "")] || {};
      const status = row["Status"] || "Aktif", eventId = String(row["Acara"] || "").trim();
      return { id: row["ID Penyertaan"] || "", pupilId: row["ID Murid"] || "", name: row["Nama Murid"] || "", house: row["Rumah"] || "", eventId, event: event["Nama Acara"] || row["Acara"] || "", category: event["Kumpulan Tahun"] || row["Kategori"] || "", type: event["Jenis Acara"] || "", status, isIncomplete: !eventId || !event["ID Acara"] || /perlu|draf|pending/i.test(String(status)) };
    }),
    incompleteEntries: visiblePendingEntries.map(row => ({ id: row["ID Penyertaan"] || "", pupilId: row["ID Murid"] || "", name: row["Nama Murid"] || "", house: row["Rumah"] || "", eventId: row["Acara"] || "", status: row["Status"] || "Perlu dilengkapkan" })),
    users: houseUsers.map(user => ({
      id: user.id,
      name: user.name,
      house: user.house,
      role: user.role,
      active: user.active,
      mustChange: user.mustChange,
      maskedIc: maskIc_(user.ic),
      ic: isAdmin ? user.ic : ""
    })),
    events: eventRows.map(row => ({ id: row["ID Acara"] || "", name: row["Nama Acara"] || "", discipline: row["Kategori"] || "", stage: row["Peringkat"] || "", categoryCode: row["Kod Kategori"] || "", cohort: row["Kumpulan Tahun"] || "", gender: row["Jantina"] || "", type: row["Jenis Acara"] || "", note: row["Catatan"] || "" })),
    judgeEntries: allEntries.map(row => ({ id: row["ID Penyertaan"] || "", pupilId: row["ID Murid"] || "", name: row["Nama Murid"] || "", house: row["Rumah"] || "", eventId: row["Acara"] || "" })),
    officialResults: allResults,
    awardLeaders: awardLeaders_(allResults),
    judgeAccess: isAdmin ? judgeAccessRows_().map(row => ({ id: row.id, name: row.name, role: row.role, scope: row.scope, code: row.code, active: row.active })) : [],
    auditLogs: isAdmin ? auditRows_(250) : [],
    rules: { individualPerPupil: 2, groupPerPupil: 1, individualPerHouseEvent: 2, relayRunnersPerHouseEvent: 4 }
  };
}

function auditRows_(limit) {
  const rows = rowsFrom(AUDIT_SHEET).slice(-Math.max(1, Number(limit) || 250)).reverse();
  return rows.map(row => ({
    date: row["Tarikh Masa"] || "",
    teacherId: row["ID Guru"] || "",
    teacher: row["Nama Guru"] || "",
    house: row["Rumah"] || "",
    action: row["Tindakan"] || "",
    target: row["Sasaran"] || "",
    detail: row["Butiran"] || ""
  }));
}

function canJudge_(session) {
  return isSystemAdmin_(session) || Boolean(session && session.isJudge) || /pengadil|juri|teknikal/i.test(String(session && session.role || ""));
}

function requireJudge_(session) {
  if (!canJudge_(session)) throw new Error("Hanya pengadil, petugas teknikal atau Admin Sistem boleh merekod keputusan.");
}

function resultRows_(year, eventById) {
  const pupils = rowsFrom("Murid");
  const pupilById = Object.fromEntries(pupils.map(row => [String(row["ID Murid"] || ""), row]));
  return rowsFrom("Keputusan").filter(row => String(row["Tahun"] || "") === String(year)).map(row => {
    const eventId = String(row["Acara"] || ""), athleteId = String(row["ID Murid"] || "");
    const event = eventById[eventId] || {}, pupil = pupilById[athleteId] || {};
    return {
      id: row["ID Keputusan"] || "",
      eventId,
      event: event["Nama Acara"] || eventId,
      discipline: event["Kategori"] || "",
      type: eventKind_(event["Jenis Acara"] || event["Nama Acara"]),
      category: event["Kumpulan Tahun"] || row["Kategori"] || "",
      gender: normalizeGender_(event["Jantina"] || pupil["Jantina"]),
      athleteId,
      athlete: row["Nama Murid"] || pupil["Nama Murid"] || "",
      house: row["Rumah"] || pupil["Rumah"] || "",
      value: Number(String(row["Nilai"] || "").replace(",", ".")) || 0,
      unit: row["Unit"] || "",
      mark: row["Catatan"] || "",
      place: Number(row["Kedudukan"]) || 0,
      status: row["Status"] || "Rasmi",
      recordedBy: row["Dicatat Oleh"] || ""
    };
  });
}

function resultPoints_(place) {
  return ({ 1: 7, 2: 5, 3: 3, 4: 1 })[Number(place)] || 0;
}

function awardLeaders_(results) {
  const grouped = {};
  (results || []).filter(row => row.athleteId && eventKind_(row.type || row.event) === "Individu" && [1, 2, 3, 4].includes(Number(row.place))).forEach(row => {
    const gender = normalizeGender_(row.gender || row.eventGender);
    if (!gender) return;
    const key = gender + "|" + row.athleteId;
    if (!grouped[key]) grouped[key] = { athleteId: row.athleteId, name: row.athlete || "", house: row.house || "", gender, gold: 0, silver: 0, bronze: 0, fourth: 0, points: 0 };
    const item = grouped[key], place = Number(row.place);
    if (place === 1) item.gold++;
    if (place === 2) item.silver++;
    if (place === 3) item.bronze++;
    if (place === 4) item.fourth++;
    item.points += resultPoints_(place);
  });
  const output = { Lelaki: null, Perempuan: null };
  Object.keys(output).forEach(gender => {
    output[gender] = Object.values(grouped).filter(item => item.gender === gender).sort((a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name))[0] || null;
  });
  return output;
}

function maskIc_(value) {
  const ic = normalizeIc_(value);
  return ic.length === 12 ? ic.slice(0, 2) + "••••••" + ic.slice(-4) : "—";
}

function dataSheet_(name, requiredHeaders) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const width = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String).filter(Boolean);
  if (!headers.length) headers = requiredHeaders.slice();
  requiredHeaders.forEach(header => { if (!headers.includes(header)) headers.push(header); });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return { sheet, headers };
}

function writeRecord_(context, rowNumber, values) {
  const current = rowNumber ? context.sheet.getRange(rowNumber, 1, 1, context.headers.length).getValues()[0] : Array(context.headers.length).fill("");
  Object.keys(values).forEach(key => {
    const index = context.headers.indexOf(key);
    if (index >= 0) current[index] = values[key];
  });
  if (rowNumber) context.sheet.getRange(rowNumber, 1, 1, current.length).setValues([current]);
  else context.sheet.appendRow(current);
}

function requireAdmin_(session) {
  if (!isSystemAdmin_(session)) throw new Error("Tindakan ini hanya dibenarkan untuk Admin Sistem.");
}

function isSystemAdmin_(session) {
  return Boolean(session && session.isSystemAdmin === true);
}

function authorizeHouse_(session, house) {
  house = String(house || "").trim();
  if (!HOUSE_ORDER.includes(house)) throw new Error("Pilih rumah sukan yang sah.");
  if (!isSystemAdmin_(session) && house !== session.house) throw new Error("Akses hanya dibenarkan untuk rumah sukan sendiri.");
  return house;
}

function nextId_(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function savePupil_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mengubah data.");
  const year = String(body.year || "2026").trim();
  const house = authorizeHouse_(session, body.house || session.house);
  const id = String(body.id || "").trim() || nextId_("M" + year.slice(-2));
  const name = String(body.name || "").trim().toUpperCase();
  const pupilClass = String(body.class || "").trim().toUpperCase();
  const gender = normalizeGender_(body.gender);
  if (!name || !pupilClass || !gender) throw new Error("Nama, kelas/tahun dan jantina murid wajib diisi.");
  const rows = rowsFrom("Murid");
  const existing = rows.find(row => String(row["ID Murid"] || "") === id);
  if (existing) authorizeHouse_(session, existing["Rumah"]);
  const context = dataSheet_("Murid", ["ID Murid", "Tahun", "Nama Murid", "Kelas", "Jantina", "Rumah"]);
  writeRecord_(context, existing && existing.__row, { "ID Murid": id, "Tahun": year, "Nama Murid": name, "Kelas": pupilClass, "Jantina": gender, "Rumah": house });
  audit_(session, existing ? "KEMAS KINI MURID" : "TAMBAH MURID", id, name + " • Rumah " + house);
  return { ok: true, id, message: "Maklumat murid berjaya disimpan." };
}

function normalizeGender_(value) {
  const text = String(value || "").trim().toUpperCase();
  if (/^(L|LELAKI|M|MALE)$/.test(text)) return "Lelaki";
  if (/^(P|PEREMPUAN|F|FEMALE)$/.test(text)) return "Perempuan";
  return "";
}

function classYear_(value) {
  const text = String(value || "").toUpperCase();
  if (/PRA/.test(text)) return 0;
  const match = text.match(/(?:TAHUN\s*)?([1-6])/);
  return match ? Number(match[1]) : -1;
}

function cohortAllows_(cohort, pupilClass) {
  const year = classYear_(pupilClass), text = String(cohort || "").toUpperCase();
  if (/PRA/.test(text)) return year === 0;
  const allowed = (text.match(/[1-6]/g) || []).map(Number);
  return allowed.includes(year);
}

function eventKind_(value) {
  return /BERKUMPUL|RELAY|4\s*[×X]/i.test(String(value || "")) ? "Berkumpulan" : "Individu";
}

function saveEntry_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mendaftarkan peserta.");
  const year = String(body.year || "2026").trim();
  const house = authorizeHouse_(session, body.house || session.house);
  const pupilId = String(body.pupilId || "").trim();
  const eventId = String(body.eventId || "").trim();
  const pupil = rowsFrom("Murid").find(row => String(row["ID Murid"] || "") === pupilId && String(row["Tahun"] || "") === year);
  if (!pupil || String(pupil["Rumah"] || "") !== house) throw new Error("Murid tidak ditemui dalam rumah sukan ini.");
  const event = rowsFrom("Acara").find(row => String(row["ID Acara"] || "") === eventId && String(row["Tahun"] || "") === year);
  if (!event) throw new Error("Acara tidak dijumpai untuk tahun yang dipilih.");
  const pupilGender = normalizeGender_(pupil["Jantina"]), eventGender = normalizeGender_(event["Jantina"]);
  if (eventGender && pupilGender !== eventGender) throw new Error("Jantina murid tidak sepadan dengan kategori acara.");
  if (!cohortAllows_(event["Kumpulan Tahun"], pupil["Kelas"] || pupil["Tahun/Kelas"])) throw new Error("Kelas/tahun murid tidak layak untuk kategori acara ini.");
  const type = eventKind_(event["Jenis Acara"] || event["Nama Acara"]);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const eventMap = Object.fromEntries(rowsFrom("Acara").map(row => [String(row["ID Acara"] || ""), row]));
    const entries = rowsFrom("Penyertaan").filter(row => {
      const registeredEvent = String(row["Acara"] || "").trim(), status = String(row["Status"] || "");
      return String(row["Tahun"] || "") === year && !/batal|perlu|draf|pending/i.test(status) && Boolean(registeredEvent && eventMap[registeredEvent]);
    });
    if (entries.some(row => String(row["ID Murid"] || "") === pupilId && String(row["Acara"] || "") === eventId)) throw new Error("Pendaftaran ditolak: murid ini sudah didaftarkan dalam acara yang sama.");
    const pupilEntries = entries.filter(row => String(row["ID Murid"] || "") === pupilId);
    const individualCount = pupilEntries.filter(row => eventKind_((eventMap[String(row["Acara"] || "")] || {})["Jenis Acara"] || row["Acara"]) === "Individu").length;
    const groupCount = pupilEntries.filter(row => eventKind_((eventMap[String(row["Acara"] || "")] || {})["Jenis Acara"] || row["Acara"]) === "Berkumpulan").length;
    if (type === "Individu" && individualCount >= 2) throw new Error("Pendaftaran ditolak: murid sudah mencapai maksimum 2 acara individu.");
    if (type === "Berkumpulan" && groupCount >= 1) throw new Error("Pendaftaran ditolak: murid sudah menyertai 1 acara berkumpulan.");
    const sameHouseEvent = entries.filter(row => String(row["Rumah"] || "") === house && String(row["Acara"] || "") === eventId);
    const quota = type === "Individu" ? 2 : 4;
    if (sameHouseEvent.length >= quota) throw new Error(type === "Individu" ? "Pendaftaran ditolak: kuota 2 peserta rumah bagi acara individu sudah penuh." : "Pendaftaran ditolak: satu pasukan relay (4 pelari) bagi rumah ini sudah lengkap.");
    const id = nextId_("P" + year.slice(-2));
    const context = dataSheet_("Penyertaan", ["ID Penyertaan", "Tahun", "Acara", "Kategori", "ID Murid", "Nama Murid", "Rumah", "Status", "Catatan"]);
    writeRecord_(context, null, { "ID Penyertaan": id, "Tahun": year, "Acara": eventId, "Kategori": event["Kumpulan Tahun"] || "", "ID Murid": pupilId, "Nama Murid": pupil["Nama Murid"] || "", "Rumah": house, "Status": "Aktif", "Catatan": "Didaftar melalui Portal Guru" });
    audit_(session, "DAFTAR PENYERTAAN", id, (pupil["Nama Murid"] || pupilId) + " • " + (event["Nama Acara"] || eventId));
    return { ok: true, id, message: "Penyertaan berjaya didaftarkan." };
  } finally {
    lock.releaseLock();
  }
}

function deleteEntry_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mengubah data.");
  requireAdmin_(session);
  const id = String(body.id || "").trim();
  const reason = String(body.reason || "").trim();
  const note = String(body.note || "").trim().slice(0, 250);
  const allowedReasons = ["Pertukaran peserta", "Kesilapan pendaftaran", "Peserta menarik diri", "Tidak hadir / tidak sihat", "Tidak memenuhi syarat", "Permintaan rumah sukan", "Lain-lain"];
  if (!allowedReasons.includes(reason)) throw new Error("Pilih sebab pembatalan yang sah.");
  if (reason === "Lain-lain" && !note) throw new Error("Nyatakan catatan bagi sebab Lain-lain.");
  const entry = rowsFrom("Penyertaan").find(row => String(row["ID Penyertaan"] || "") === id);
  if (!entry) throw new Error("Rekod penyertaan tidak dijumpai.");
  if (/batal/i.test(String(entry["Status"] || ""))) throw new Error("Penyertaan ini sudah dibatalkan.");
  const hasResult = rowsFrom("Keputusan").some(row =>
    String(row["Tahun"] || "") === String(entry["Tahun"] || "") &&
    String(row["Acara"] || "") === String(entry["Acara"] || "") &&
    (String(row["ID Murid"] || "") === String(entry["ID Murid"] || "") ||
      (!row["ID Murid"] && String(row["Rumah"] || "") === String(entry["Rumah"] || "")))
  );
  if (hasResult) throw new Error("Penyertaan tidak boleh dibatalkan kerana keputusan rasmi sudah direkodkan. Padam keputusan tersebut dahulu.");
  const context = dataSheet_("Penyertaan", ["ID Penyertaan", "Tahun", "Acara", "Kategori", "ID Murid", "Nama Murid", "Rumah", "Status", "Catatan", "Sebab Pembatalan", "Dibatalkan Oleh", "Tarikh Pembatalan"]);
  const cancelledAt = new Date();
  const cancelledBy = session.name || session.id || "Admin Sistem";
  const detail = reason + (note ? " — " + note : "");
  writeRecord_(context, entry.__row, { "Status": "Dibatalkan", "Catatan": detail, "Sebab Pembatalan": reason, "Dibatalkan Oleh": cancelledBy, "Tarikh Pembatalan": cancelledAt });
  audit_(session, "BATAL PENYERTAAN", id, String(entry["Nama Murid"] || entry["ID Murid"] || "") + " • " + String(entry["Acara"] || "") + " • Rumah " + String(entry["Rumah"] || "") + " • Sebab: " + detail);
  return { ok: true, message: "Penyertaan atlet ini telah dibatalkan. Kuota acara kini tersedia semula." };
}

function resultMode_(event) {
  const text = [event["Kategori"], event["Nama Acara"], event["Catatan"]].join(" ");
  return /lompat|lontar|baling|rejam|padang/i.test(text) ? "higher" : "lower";
}

function suggestedUnit_(event) {
  return resultMode_(event) === "higher" ? "meter" : "saat";
}

function formatMark_(value, unit) {
  const number = Number(value);
  const digits = unit === "saat" ? 2 : 2;
  const label = unit === "saat" ? "s" : unit === "sentimeter" ? "cm" : "m";
  return number.toFixed(digits) + " " + label;
}

function rankResultRows_(rows, mode) {
  const direction = mode === "higher" ? -1 : 1;
  const sorted = rows.slice().sort((a, b) => direction * (Number(a.value) - Number(b.value)));
  let lastValue = null, rank = 0;
  return sorted.map((row, index) => {
    const value = Number(row.value);
    if (lastValue === null || value !== lastValue) rank = index + 1;
    lastValue = value;
    return { ...row, rank };
  });
}

function rerankEvent_(year, eventId, event) {
  const context = dataSheet_("Keputusan", ["ID Keputusan", "Tahun", "Acara", "Kategori", "Kedudukan", "ID Murid", "Nama Murid", "Rumah", "Catatan", "Nilai", "Unit", "Status", "Dicatat Oleh", "Tarikh Catat"]);
  const rows = rowsFrom("Keputusan").filter(row => String(row["Tahun"] || "") === year && String(row["Acara"] || "") === eventId && Number(String(row["Nilai"] || "").replace(",", ".")) > 0);
  rankResultRows_(rows.map(row => ({ row, value: Number(String(row["Nilai"]).replace(",", ".")) })), resultMode_(event)).forEach(item => {
    writeRecord_(context, item.row.__row, { "Kedudukan": item.rank, "Catatan": formatMark_(item.value, item.row["Unit"] || suggestedUnit_(event)) });
  });
}

function saveResult_(body) {
  const session = requireSession_(body.token); requireJudge_(session);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum merekod keputusan.");
  const year = String(body.year || "2026").trim(), eventId = String(body.eventId || "").trim();
  const value = Number(String(body.value || "").replace(",", "."));
  const unit = String(body.unit || "").trim().toLowerCase();
  if (!eventId || !(value > 0)) throw new Error("Pilih acara dan masukkan catatan angka yang sah.");
  if (!["saat", "meter", "sentimeter"].includes(unit)) throw new Error("Unit catatan tidak sah.");
  const event = rowsFrom("Acara").find(row => String(row["Tahun"] || "") === year && String(row["ID Acara"] || "") === eventId);
  if (!event) throw new Error("Acara tidak dijumpai untuk tahun ini.");
  if (!eventAllowedForJudge_(session, event)) throw new Error("Kod akses ini tidak dibenarkan merekod acara tersebut.");
  const mode = resultMode_(event);
  if (mode === "lower" && unit !== "saat") throw new Error("Acara balapan mesti direkodkan dalam unit saat.");
  if (mode === "higher" && !["meter", "sentimeter"].includes(unit)) throw new Error("Acara padang mesti direkodkan dalam meter atau sentimeter.");
  const normalizedValue = unit === "sentimeter" ? value / 100 : value;
  const normalizedUnit = unit === "sentimeter" ? "meter" : unit;
  const kind = eventKind_(event["Jenis Acara"] || event["Nama Acara"]), entries = rowsFrom("Penyertaan").filter(row => String(row["Tahun"] || "") === year && String(row["Acara"] || "") === eventId && !/batal/i.test(String(row["Status"] || "")));
  let athleteId = String(body.athleteId || "").trim(), athlete = "", house = String(body.house || "").trim();
  if (kind === "Berkumpulan") {
    if (!HOUSE_ORDER.includes(house) || !entries.some(row => String(row["Rumah"] || "") === house)) throw new Error("Pilih pasukan rumah yang berdaftar untuk acara relay ini.");
    athleteId = ""; athlete = "Pasukan Rumah " + house;
  } else {
    const entry = entries.find(row => String(row["ID Murid"] || "") === athleteId);
    if (!entry) throw new Error("Peserta tidak didaftarkan untuk acara ini.");
    athlete = entry["Nama Murid"] || ""; house = entry["Rumah"] || "";
  }
  const rows = rowsFrom("Keputusan");
  const existing = rows.find(row => String(row["Tahun"] || "") === year && String(row["Acara"] || "") === eventId && (kind === "Berkumpulan" ? String(row["Rumah"] || "") === house : String(row["ID Murid"] || "") === athleteId));
  const id = existing ? String(existing["ID Keputusan"] || "") : nextId_("K" + year.slice(-2));
  const context = dataSheet_("Keputusan", ["ID Keputusan", "Tahun", "Acara", "Kategori", "Kedudukan", "ID Murid", "Nama Murid", "Rumah", "Catatan", "Nilai", "Unit", "Status", "Dicatat Oleh", "Tarikh Catat"]);
  writeRecord_(context, existing && existing.__row, { "ID Keputusan": id, "Tahun": year, "Acara": eventId, "Kategori": event["Kumpulan Tahun"] || "", "ID Murid": athleteId, "Nama Murid": athlete, "Rumah": house, "Catatan": formatMark_(normalizedValue, normalizedUnit), "Nilai": normalizedValue, "Unit": normalizedUnit, "Status": "Rasmi", "Dicatat Oleh": session.name || session.id, "Tarikh Catat": new Date() });
  rerankEvent_(year, eventId, event);
  audit_(session, existing ? "KEMAS KINI KEPUTUSAN" : "CATAT KEPUTUSAN", id, (event["Nama Acara"] || eventId) + " • " + athlete + " • " + formatMark_(normalizedValue, normalizedUnit));
  return { ok: true, id, message: "Catatan disimpan. Kedudukan dan mata telah dikira semula secara automatik." };
}

function deleteResult_(body) {
  const session = requireSession_(body.token); requireJudge_(session);
  const id = String(body.id || "").trim(), row = rowsFrom("Keputusan").find(item => String(item["ID Keputusan"] || "") === id);
  if (!row) throw new Error("Rekod keputusan tidak dijumpai.");
  const year = String(row["Tahun"] || ""), eventId = String(row["Acara"] || "");
  const event = rowsFrom("Acara").find(item => String(item["Tahun"] || "") === year && String(item["ID Acara"] || "") === eventId) || {};
  if (!eventAllowedForJudge_(session, event)) throw new Error("Kod akses ini tidak dibenarkan mengubah acara tersebut.");
  spreadsheet_().getSheetByName("Keputusan").deleteRow(row.__row);
  rerankEvent_(year, eventId, event);
  audit_(session, "PADAM KEPUTUSAN", id, String(row["Nama Murid"] || row["Rumah"] || ""));
  return { ok: true, message: "Keputusan dipadam dan kedudukan dikira semula." };
}

function saveAthletePhoto_(body) {
  const session = requireSession_(body.token); requireJudge_(session);
  if (String(body.consent || "").toUpperCase() !== "YA") throw new Error("Sahkan kebenaran paparan foto murid sebelum memuat naik.");
  const year = String(body.year || "2026"), athleteId = String(body.athleteId || "").trim();
  const photo = String(body.photo || "");
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(photo)) throw new Error("Pilih fail gambar JPG, PNG atau WebP yang sah.");
  if (photo.length > 48000) throw new Error("Saiz gambar masih terlalu besar. Pilih gambar lain.");
  const pupil = rowsFrom("Murid").find(row => String(row["Tahun"] || "") === year && String(row["ID Murid"] || "") === athleteId);
  if (!pupil) throw new Error("Rekod atlet tidak dijumpai.");
  const context = dataSheet_("Foto Atlet", ["Tahun", "ID Murid", "Nama Murid", "Rumah", "Foto", "Dikemaskini Oleh", "Tarikh Kemaskini"]);
  const existing = rowsFrom("Foto Atlet").find(row => String(row["Tahun"] || "") === year && String(row["ID Murid"] || "") === athleteId);
  writeRecord_(context, existing && existing.__row, { "Tahun": year, "ID Murid": athleteId, "Nama Murid": pupil["Nama Murid"] || "", "Rumah": pupil["Rumah"] || "", "Foto": photo, "Dikemaskini Oleh": session.name || session.id, "Tarikh Kemaskini": new Date() });
  audit_(session, "MUAT NAIK FOTO ATLET", athleteId, String(pupil["Nama Murid"] || ""));
  return { ok: true, message: "Gambar atlet berjaya disimpan untuk paparan awam." };
}

function saveHouseProfile_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mengubah data.");
  const year = String(body.year || "2026").trim();
  const house = authorizeHouse_(session, body.house || session.house);
  const rows = rowsFrom("Rumah");
  const existing = rows.find(row => String(row["Tahun"] || "") === year && String(row["Rumah"] || "") === house);
  const context = dataSheet_("Rumah", ["Tahun", "Rumah", "Guru Rumah", "Moto", "Slogan", "Ketua Rumah", "Pemegang Sepanduk", "Pemegang Bendera"]);
  writeRecord_(context, existing && existing.__row, { "Tahun": year, "Rumah": house, "Moto": String(body.motto || "").trim(), "Slogan": String(body.slogan || "").trim(), "Ketua Rumah": String(body.captain || "").trim(), "Pemegang Sepanduk": String(body.bannerBearer || "").trim(), "Pemegang Bendera": String(body.flagBearer || "").trim() });
  audit_(session, "KEMAS KINI RUMAH", house, "Profil Rumah " + house + " tahun " + year);
  return { ok: true, message: "Maklumat rumah sukan berjaya disimpan." };
}

function saveHouseLogo_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mengubah data.");
  const year = String(body.year || "2026").trim();
  const house = authorizeHouse_(session, body.house || session.house);
  const logo = String(body.logo || "");
  if (logo && !/^data:image\/(jpeg|png|webp);base64,/i.test(logo)) throw new Error("Pilih fail logo JPG, PNG atau WebP yang sah.");
  if (logo.length > 48000) throw new Error("Saiz logo masih terlalu besar. Pilih gambar lain.");
  const rows = rowsFrom("Rumah");
  const existing = rows.find(row => String(row["Tahun"] || "") === year && String(row["Rumah"] || "") === house);
  const context = dataSheet_("Rumah", ["Tahun", "Rumah", "Guru Rumah", "Moto", "Slogan", "Ketua Rumah", "Pemegang Sepanduk", "Pemegang Bendera", "Logo Rumah"]);
  writeRecord_(context, existing && existing.__row, { "Tahun": year, "Rumah": house, "Logo Rumah": logo });
  audit_(session, logo ? "MUAT NAIK LOGO RUMAH" : "BUANG LOGO RUMAH", house, "Logo Rumah " + house + " tahun " + year);
  return { ok: true, message: logo ? "Logo Rumah " + house + " berjaya disimpan." : "Logo Rumah " + house + " berjaya dibuang." };
}

function saveHouseMedia_(body) {
  const session = requireSession_(body.token);
  if (session.mustChange) throw new Error("Tukar kata laluan sementara sebelum mengubah data.");
  const year = String(body.year || "2026").trim();
  const house = authorizeHouse_(session, body.house || session.house);
  const slot = String(body.slot || "").trim();
  const columns = { members: "Gambar Ahli", marching: "Gambar Kawad", participants: "Gambar Peserta" };
  const labels = { members: "Senarai Ahli", marching: "Barisan Kawad", participants: "Peserta dan Acara" };
  if (!columns[slot]) throw new Error("Bahagian gambar tidak sah.");
  const image = String(body.image || "");
  if (image && !/^data:image\/(jpeg|png|webp);base64,/i.test(image)) throw new Error("Pilih fail gambar JPG, PNG atau WebP yang sah.");
  if (image.length > 48000) throw new Error("Saiz gambar masih terlalu besar. Pilih gambar lain.");
  const rows = rowsFrom("Rumah");
  const existing = rows.find(row => String(row["Tahun"] || "") === year && String(row["Rumah"] || "") === house);
  const context = dataSheet_("Rumah", ["Tahun", "Rumah", "Guru Rumah", "Moto", "Slogan", "Ketua Rumah", "Pemegang Sepanduk", "Pemegang Bendera", "Logo Rumah", "Gambar Ahli", "Gambar Kawad", "Gambar Peserta"]);
  const values = { "Tahun": year, "Rumah": house }; values[columns[slot]] = image;
  writeRecord_(context, existing && existing.__row, values);
  audit_(session, image ? "MUAT NAIK GAMBAR RUMAH" : "BUANG GAMBAR RUMAH", house, labels[slot] + " • tahun " + year);
  return { ok: true, message: image ? "Gambar " + labels[slot] + " berjaya disimpan." : "Gambar " + labels[slot] + " berjaya dibuang." };
}

function adminUsers_(body) {
  const session = requireSession_(body.token); requireAdmin_(session);
  const users = users_().users.map(user => ({ id: user.id, ic: user.ic, name: user.name, house: user.house, role: user.role, active: user.active, mustChange: user.mustChange }));
  return { ok: true, users, houses: HOUSE_ORDER };
}

function saveUser_(body) {
  const session = requireSession_(body.token); requireAdmin_(session);
  const id = String(body.id || "").trim().toUpperCase();
  const ic = normalizeIc_(body.ic);
  const name = String(body.name || "").trim().toUpperCase();
  const house = String(body.house || "").trim();
  const role = String(body.role || "Guru").trim();
  const active = String(body.active || "YA").toUpperCase() === "TIDAK" ? "TIDAK" : "YA";
  if (!id || !name || ic.length !== 12) throw new Error("ID guru, nama dan nombor kad pengenalan 12 digit wajib diisi.");
  if (house && !HOUSE_ORDER.includes(house)) throw new Error("Rumah sukan tidak sah.");
  const context = users_();
  const existing = context.users.find(user => user.id.toUpperCase() === id);
  const sameIc = context.users.find(user => user.ic === ic && user.id.toUpperCase() !== id);
  if (sameIc) throw new Error("Nombor kad pengenalan sudah digunakan oleh akaun lain.");
  if (existing) {
    const values = { id, ic, name, house, role, active: active === "YA" };
    const updates = {};
    Object.keys(values).forEach(key => { if (context.index[key] >= 0) updates[key] = key === "active" ? active : values[key]; });
    updateAuth_(context, existing, updates);
  } else {
    const row = Array(context.headers.length).fill("");
    const put = (header, value) => { const index = context.headers.indexOf(header); if (index >= 0) row[index] = value; };
    put("ID Guru", id); put("Nama Guru", name); put("Rumah", house); put("Peranan", role); put("Aktif", active); put("No. Kad Pengenalan", ic); put("Wajib Tukar", "YA"); put("Kemaskini Terakhir", new Date());
    context.sheet.appendRow(row);
  }
  audit_(session, existing ? "KEMAS KINI AKAUN" : "TAMBAH AKAUN", id, name + " • " + (house ? "Rumah " + house : role));
  return { ok: true, message: "Tetapan guru berjaya disimpan." };
}

function saveSettings_(body) {
  const session = requireSession_(body.token); requireAdmin_(session);
  const bannerUrl = String(body.bannerUrl || "").trim();
  const tickerText = String(body.tickerText || "").trim().slice(0, 500);
  const tickerActive = String(body.tickerActive || "TIDAK").toUpperCase() === "YA" ? "YA" : "TIDAK";
  if (bannerUrl && !/^https:\/\//i.test(bannerUrl)) throw new Error("Gunakan pautan gambar HTTPS yang sah.");
  const context = dataSheet_("Tetapan", ["Kunci", "Nilai"]);
  const rows = rowsFrom("Tetapan");
  upsertSetting_(context, rows, "Banner URL", bannerUrl);
  upsertSetting_(context, rows, "News Ticker", tickerText);
  upsertSetting_(context, rows, "News Ticker Aktif", tickerActive);
  audit_(session, "KEMAS KINI TETAPAN", "Paparan Sistem", "Banner dan news ticker dikemas kini");
  return { ok: true, message: "Tetapan paparan berjaya disimpan." };
}

function saveJudgeAccess_(body) {
  const session = requireSession_(body.token); requireAdmin_(session);
  const id = String(body.id || "").trim().toUpperCase() || nextId_("J26");
  const name = String(body.name || "").trim().toUpperCase();
  const role = String(body.role || "Pengadil").trim();
  const scope = String(body.scope || "SEMUA").trim().toUpperCase();
  const active = String(body.active || "YA").toUpperCase() === "TIDAK" ? "TIDAK" : "YA";
  if (!name || !scope) throw new Error("Nama pengadil dan skop acara wajib diisi.");
  const context = judgeAccessContext_();
  const existing = judgeAccessRows_().find(row => row.id === id);
  const requestedCode = String(body.code || "").replace(/\D/g, "");
  if (requestedCode && !/^\d{4}$/.test(requestedCode)) throw new Error("Kod akses pengadil mesti empat angka.");
  if (requestedCode && judgeAccessRows_().some(row => row.id !== id && row.code === requestedCode)) throw new Error("Kod empat angka ini sudah digunakan oleh pengadil lain.");
  const code = requestedCode || ((!existing || String(body.reset || "").toUpperCase() === "YA") ? judgeCode_() : existing.code);
  writeRecord_(context, existing && existing.row, { "ID Pengadil": id, "Nama Pengadil": name, "Peranan": role, "Skop Acara": scope, "Kod Akses": code, "Aktif": active, "Kemaskini Terakhir": new Date() });
  audit_(session, existing ? "KEMAS KINI AKSES PENGADIL" : "TAMBAH AKSES PENGADIL", id, name + " • " + scope);
  return { ok: true, id, code, message: existing ? "Akses pengadil berjaya dikemas kini." : "Kod akses pengadil berjaya dijana." };
}

function seedJudgeAccess_(body) {
  const session = requireSession_(body.token); requireAdmin_(session);
  if (judgeAccessRows_().length) return { ok: true, judges: judgeAccessRows_(), message: "Kod pengadil sudah tersedia." };
  const presets = [
    ["J26-BAL-01", "PENGADIL BALAPAN 1", "Pengadil Balapan", "BALAPAN"],
    ["J26-REL-01", "PENGADIL RELAY 1", "Pengadil Relay", "RELAY"],
    ["J26-LJ-01", "PENGADIL LOMPAT JAUH", "Pengadil Padang", "LOMPAT JAUH"],
    ["J26-LT-01", "PENGADIL LOMPAT TINGGI", "Pengadil Padang", "LOMPAT TINGGI"],
    ["J26-LP-01", "PENGADIL LONTAR PELURU", "Pengadil Padang", "LONTAR PELURU"]
  ];
  const context = judgeAccessContext_();
  presets.forEach(item => writeRecord_(context, null, { "ID Pengadil": item[0], "Nama Pengadil": item[1], "Peranan": item[2], "Skop Acara": item[3], "Kod Akses": judgeCode_(), "Aktif": "YA", "Kemaskini Terakhir": new Date() }));
  audit_(session, "JANA KOD PENGADIL", "Portal Pengadil", presets.length + " kod permulaan dijana");
  return { ok: true, judges: judgeAccessRows_(), message: "Lima kod pengadil permulaan berjaya dijana." };
}

function upsertSetting_(context, rows, key, value) {
  const current = rows.find(row => String(row["Kunci"] || row["Tetapan"] || "") === key);
  writeRecord_(context, current && current.__row, { "Kunci": key, "Nilai": value });
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

function publicUser_(user, isSystemAdmin) {
  const role = isSystemAdmin ? "Admin Sistem" : (/^admin/i.test(String(user.role || "")) ? "Guru Rumah" : user.role);
  return { id: user.id, name: user.name, house: user.house, role, schoolRole: String(user.schoolRole || ""), identityType: String(user.identityType || ""), judgeLabel: String(user.judgeLabel || ""), judgeAccessId: String(user.judgeAccessId || ""), isSystemAdmin: Boolean(isSystemAdmin), isJudge: Boolean(user.isJudge), judgeScope: String(user.judgeScope || "") };
}

function createSession_(user, mustChange, isSystemAdmin) {
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const data = { ...publicUser_(user, isSystemAdmin), mustChange: Boolean(mustChange), expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000 };
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
  if (!value) throw new Error("Kata laluan sementara belum ditetapkan oleh Admin Sistem.");
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
  return { error: true, message: "Nombor kad pengenalan atau kata laluan tidak tepat." };
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
