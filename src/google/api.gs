// ==========================================
// Google Apps Script - Rock SFA Backend API
// ==========================================
// Admin Sheet (auth, master data):
//   https://docs.google.com/spreadsheets/d/1Efx94MHnij8ZvTcJlZJD0ciighfOOHxOueBPhW6x62Y
// Customer_Master Sheet (registrations):
//   https://docs.google.com/spreadsheets/d/1FlAtsR85aCVUfCukQvw7CAj9xRNJmu92HD3uJksjEyc
// Visit Master Data Sheet (visits):
//   https://docs.google.com/spreadsheets/d/1D26HcB3xCZQUx2HmnnUElZBjGRfGEhdOQaI_oC3bq-c
// ==========================================

var ADMIN_SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
var CUSTOMER_SHEET_ID = "1FlAtsR85aCVUfCukQvw7CAj9xRNJmu92HD3uJksjEyc";
var VISIT_SHEET_ID = "1D26HcB3xCZQUx2HmnnUElZBjGRfGEhdOQaI_oC3bq-c";
var ORDERS_SHEET_ID = "1GayuEL4PtXWUib2Nccrp5WpeHtQ5Aff9wBBbltFCSjY";

// ---------- POST Handler ----------

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "login") {
      return handleLogin(data);
    } else if (action === "registerCustomer") {
      return handleRegisterCustomer(data);
    } else if (action === "clockIn") {
      return handleAttendance(data, "Clock In");
    } else if (action === "clockOut") {
      return handleAttendance(data, "Clock Out");
    } else if (action === "submitVisit") {
      return handleSubmitVisit(data);
    } else if (action === "submitOrder") {
      return handleSubmitOrder(data);
    } else if (action === "getDashboardData") {
      return getDashboardData(data);
    } else if (action === "getReportData") {
      return getReportData(data);
    } else if (action === "getMasterData") {
      return getMasterData();
    } else if (action === "getCustomers") {
      return getCustomers();
    } else if (action === "getProducts") {
      return getProducts();
    } else if (action === "getSubDBs") {
      return getSubDBs();
    }

    return createResponse({ success: false, message: "Unknown action" }, 400);
  } catch (error) {
    return createResponse({ success: false, message: error.toString() }, 500);
  }
}

// ---------- GET Handler ----------

function doGet(e) {
  try {
    var action = e.parameter.action;

    if (action === "getMasterData") {
      return getMasterData();
    } else if (action === "getCustomers") {
      return getCustomers();
    } else if (action === "getProducts") {
      return getProducts();
    } else if (action === "getSubDBs") {
      return getSubDBs();
    }

    return createResponse({ success: false, message: "Unknown action" }, 400);
  } catch (error) {
    return createResponse({ success: false, message: error.toString() }, 500);
  }
}

// ==========================================
// AUTH
// ==========================================

function handleLogin(data) {
  var sheet = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName("EMP");
  if (!sheet) {
    return createResponse({ success: false, message: "EMP sheet tab not found" }, 404);
  }

  // Fetch both display values (formatted text as visible in UI) and raw values
  var displayValues = sheet.getDataRange().getDisplayValues();
  var rawValues = sheet.getDataRange().getValues();
  if (!displayValues || displayValues.length < 2) {
    return createResponse({ success: false, message: "No employee data found in sheet" }, 404);
  }

  var headers = displayValues[0];

  // Build normalized header lookup map (lowercased, stripped of NBSP \u00A0 and extra spaces)
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    var cleanHeader = String(headers[h] || "").replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();
    if (cleanHeader) colMap[cleanHeader] = h;
  }

  // Flexible column finder by alias list
  function findCol(aliases) {
    for (var a = 0; a < aliases.length; a++) {
      var key = aliases[a].toLowerCase();
      if (colMap[key] !== undefined) return colMap[key];
    }
    return -1;
  }

  var emailCol = findCol(["email", "email address", "e-mail", "mail", "user email"]);
  var passCol = findCol(["password hash", "password", "passwordhash", "pass", "pwd"]);
  var statusCol = findCol(["active status", "status", "activestatus", "active", "user status"]);
  var userIdCol = findCol(["user id", "userid", "user id ", "id"]);
  var empCodeCol = findCol(["employee code", "emp code", "employeecode", "code"]);
  var lastLoginCol = findCol(["last login", "lastlogin"]);
  var loginCountCol = findCol(["login count", "logincount"]);

  if (emailCol === -1) {
    return createResponse({ success: false, message: "Email column header not found in sheet" }, 500);
  }

  // Clean and normalize input email and password
  var inputEmail = String(data.email || data.userId || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
  var inputPass = String(data.password || "").replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");

  if (!inputEmail || !inputPass) {
    return createResponse({ success: false, message: "Email and password are required" }, 400);
  }

  for (var i = 1; i < displayValues.length; i++) {
    var dRow = displayValues[i];
    var rRow = rawValues[i];

    // Read cell email (try display value first, fallback to raw value) and clean hidden spaces/NBSP
    var rawCellEmail = dRow[emailCol] !== "" ? dRow[emailCol] : String(rRow[emailCol] || "");
    var cellEmail = String(rawCellEmail).replace(/[\s\u00A0]+/g, "").toLowerCase();

    // Strictly match by Email
    if (cellEmail && cellEmail === inputEmail) {
      // Check Active Status
      var rawStatus = statusCol !== -1 ? (dRow[statusCol] !== "" ? dRow[statusCol] : String(rRow[statusCol] || "")) : "";
      var cellStatus = String(rawStatus).replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();

      var isActive = (statusCol === -1) ||
                     cellStatus === "" ||
                     cellStatus === "active" ||
                     cellStatus === "true" ||
                     cellStatus === "yes" ||
                     cellStatus === "1" ||
                     cellStatus === "enabled";

      if (!isActive) {
        return createResponse({ success: false, message: "User account is inactive or disabled" }, 401);
      }

      // Check Password against both display value and raw value (handles numeric password cells e.g. 123456)
      var cellPassDisplay = String(dRow[passCol] !== undefined ? dRow[passCol] : "").replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
      var cellPassRaw = String(rRow[passCol] !== undefined ? rRow[passCol] : "").replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");

      if (cellPassDisplay === inputPass || cellPassRaw === inputPass) {
        // Safely update Last Login & Login Count if columns exist
        try {
          if (lastLoginCol !== -1) {
            sheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
          }
          if (loginCountCol !== -1) {
            var currentCount = Number(rRow[loginCountCol]) || 0;
            sheet.getRange(i + 1, loginCountCol + 1).setValue(currentCount + 1);
          }
        } catch (err) {
          // Ignore non-critical write errors
        }

        // Helper to get string value for profile fields
        function getFieldValue(colIdx) {
          if (colIdx === -1) return "";
          var val = dRow[colIdx] !== "" ? dRow[colIdx] : String(rRow[colIdx] || "");
          return String(val).replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
        }

        return createResponse({
          success: true,
          user: {
            userId: getFieldValue(userIdCol) || cellEmail,
            email: getFieldValue(emailCol) || inputEmail,
            employeeName: getFieldValue(findCol(["employee name", "name", "emp name", "full name"])),
            employeeCode: getFieldValue(empCodeCol),
            position: getFieldValue(findCol(["position", "designation", "role"])),
            department: getFieldValue(findCol(["department", "dept"])),
            territory: getFieldValue(findCol(["territory"])),
            area: getFieldValue(findCol(["area"])),
            district: getFieldValue(findCol(["district", "city"])),
            phone: getFieldValue(findCol(["phone", "mobile", "contact", "phone number"])),
            reportingManager: getFieldValue(findCol(["reporting manager", "manager"])),
            activeStatus: getFieldValue(statusCol) || "Active",
            profilePhotoUrl: getFieldValue(findCol(["profile photo url", "photo", "image", "photo url"]))
          }
        });
      }
    }
  }

  return createResponse({ success: false, message: "Invalid credentials or inactive user" }, 401);
}

// ==========================================
// MASTER DATA (districts, areas, territories, employees)
// ==========================================

function getMasterData() {
  var ss = SpreadsheetApp.openById(ADMIN_SHEET_ID);

  // Territory tab → District / Area / Territory mapping
  var tSheet = ss.getSheetByName("Territory");
  if (tSheet) {
    var tData = tSheet.getDataRange().getValues();
    var tHeaders = tData[0] || [];
    var tCol = toMap(tHeaders);
    var districts = [];
    var seenDistricts = {};
    var areas = [];
    var territories = [];

    for (var i = 1; i < tData.length; i++) {
      var r = tData[i];
      var dist = String(r[tCol["District"]] || "").trim();
      var ar = String(r[tCol["Area"]] || "").trim();
      var terr = String(r[tCol["Territory"]] || "").trim();

      if (dist && !seenDistricts[dist]) {
        seenDistricts[dist] = true;
        districts.push(dist);
      }
      if (dist && ar) {
        areas.push({ district: dist, area: ar });
      }
      if (ar && terr) {
        territories.push({ area: ar, territory: terr });
      }
    }
  }

  // Active employees for Sales Officer dropdown
  var empSheet = ss.getSheetByName("EMP");
  var empData = empSheet.getDataRange().getValues();
  var empHeaders = empData[0] || [];
  var empCol = toMap(empHeaders);
  var employees = [];
  for (var j = 1; j < empData.length; j++) {
    var er = empData[j];
    if (String(er[empCol["Active Status"]] || "").trim() === "Active") {
      employees.push({
        email: er[empCol["Email"]],
        employeeName: er[empCol["Employee Name"]],
        employeeCode: er[empCol["Employee Code"]],
        position: er[empCol["Position"]],
        territory: er[empCol["Territory"]] || ""
      });
    }
  }

  // Settings
  var settingsSheet = ss.getSheetByName("Settings");
  var settingsData = settingsSheet ? settingsSheet.getDataRange().getValues() : [];
  var settings = {};
  for (var k = 1; k < settingsData.length; k++) {
    if (settingsData[k][0]) settings[settingsData[k][0]] = settingsData[k][1];
  }

  return createResponse({
    success: true,
    data: {
      districts: districts,
      areas: areas,
      territories: territories,
      employees: employees,
      settings: settings
    }
  });
}

// ==========================================
// CUSTOMER REGISTRATION
// ==========================================

function handleRegisterCustomer(data) {
  // Validate required fields
  var required = [
    "email", "district", "area", "marketName", "shopName",
    "shopType", "fullAddress", "ownerName", "ownerContact",
    "oilBrandSelling", "totalAvgVolume"
  ];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]] || String(data[required[i]]).trim() === "") {
      return createResponse({
        success: false,
        message: "Missing required field: " + required[i]
      }, 400);
    }
  }

  // Validate phone number (11 digits)
  var phone = String(data.ownerContact || "").trim();
  if (!/^\d{11}$/.test(phone)) {
    return createResponse({
      success: false,
      message: "Owner contact must be an 11-digit Bangladesh number"
    }, 400);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var ss = SpreadsheetApp.openById(CUSTOMER_SHEET_ID);
    var sheet = ss.getSheets()[0]; // first sheet
    var allData = sheet.getDataRange().getValues();
    var headers = allData[0] || [];
    var col = toMap(headers);

    // ---- Check duplicate phone ----
    var phone = String(data.ownerContact || "").trim();
    for (var r = 1; r < allData.length; r++) {
      if (String(allData[r][col["Owner Contact Number"]] || "").trim() === phone) {
        return createResponse({ success: false, message: "Customer with this phone number already exists (ID: " + allData[r][col["Customer ID"]] + ")" }, 400);
      }
    }

    // ---- Generate Customer ID ----
    var lastId = "22000000";
    for (var r = 1; r < allData.length; r++) {
      if (allData[r][col["Customer ID"]]) {
        lastId = String(allData[r][col["Customer ID"]]);
      }
    }
    var prefix = "2200";
    var numPart = parseInt(lastId.replace(prefix, ""), 10) || 0;
    var nextId = prefix + String(numPart + 1).padStart(4, "0");

    // ---- Auto-populate territory ----
    var territory = "";
    try {
      var adminSs = SpreadsheetApp.openById(ADMIN_SHEET_ID);
      var tSheet = adminSs.getSheetByName("Territory");
      var tData = tSheet.getDataRange().getValues();
      var tCol = toMap(tData[0] || []);
      var selectedArea = String(data.area || "").trim().toLowerCase();
      for (var t = 1; t < tData.length; t++) {
        if (String(tData[t][tCol["Area"]] || "").trim().toLowerCase() === selectedArea) {
          territory = tData[t][tCol["Territory"]];
          break;
        }
      }
    } catch (e) { /* ignore */ }

    // ---- Resolve Sales Officer name ----
    var salesOfficer = data.salesOfficer || "";
    if (!salesOfficer && data.email) {
      try {
        var empSs = SpreadsheetApp.openById(ADMIN_SHEET_ID);
        var eSheet = empSs.getSheetByName("EMP");
        var eData = eSheet.getDataRange().getValues();
        var eCol = toMap(eData[0] || []);
        for (var e = 1; e < eData.length; e++) {
          if (String(eData[e][eCol["Email"]] || "").trim() === String(data.email).trim()) {
            salesOfficer = eData[e][eCol["Employee Name"]];
            break;
          }
        }
      } catch (e) { /* ignore */ }
    }

    // ---- Upload Shop Photo to Drive ----
    var shopPhotoUrl = "";
    var driveFileId = "";
    if (data.shopPhotoBase64) {
      try {
        var settings = getSettings();
        var folderId = settings.Customer_Photo_Folder_ID || settings.Attendance_Folder_ID;
        if (folderId) {
          var blob = Utilities.newBlob(
            Utilities.base64Decode(data.shopPhotoBase64.split(",")[1]),
            "image/jpeg",
            "CUST_" + nextId + "_" + new Date().getTime() + ".jpg"
          );
          var folder = DriveApp.getFolderById(folderId);
          var file = folder.createFile(blob);
          shopPhotoUrl = file.getUrl();
          driveFileId = file.getId();
        }
      } catch (e) { /* folder not configured */ }
    }

    // ---- Build row in column order ----
    var now = new Date();
    var gpsLat = String(data.lat || "");
    var gpsLng = String(data.lng || "");
    var liveMapUrl = gpsLat && gpsLng ? "https://maps.google.com/?q=" + gpsLat + "," + gpsLng : "";

    var row = headers.map(function (h, idx) {
      var h2 = String(h).trim().toLowerCase();
      if (h2 === "customer id") return nextId;
      if (h2 === "timestamp") return now;
      if (h2 === "email address") return data.email || "";
      if (h2 === "sales officer") return salesOfficer;
      if (h2 === "district") return data.district || "";
      if (h2 === "area") return data.area || "";
      if (h2 === "territory") return territory;
      if (h2 === "market name") return data.marketName || "";
      if (h2 === "shop name") return data.shopName || "";
      if (h2 === "shop type") return data.shopType || "";
      if (h2 === "full address") return data.fullAddress || "";
      if (h2 === "owner name") return data.ownerName || "";
      if (h2 === "owner contact number") return phone;
      if (h2 === "nid") return data.nid || "";
      if (h2 === "e-tin") return data.etin || "";
      if (h2 === "bin") return data.bin || "";
      if (h2 === "oil brand selling") return data.oilBrandSelling || "";
      if (h2 === "other brand") return data.otherBrand || "";
      if (h2 === "total avg volume (ltr)") return Number(data.totalAvgVolume) || 0;
      if (h2 === "avg castrol volume (ltr)") return Number(data.avgCastrolVolume) || 0;
      if (h2 === "comment") return data.comment || "";
      if (h2 === "shop photo url") return shopPhotoUrl;
      if (h2 === "drive file id") return driveFileId;
      if (h2 === "latitude") return gpsLat;
      if (h2 === "longitude") return gpsLng;
      if (h2 === "gps accuracy") return data.gpsAccuracy || "";
      if (h2 === "live map url") return liveMapUrl;
      if (h2 === "status") return "Active";
      return "";
    });

    sheet.appendRow(row);

    return createResponse({
      success: true,
      customerId: nextId,
      message: "Customer " + nextId + " registered successfully"
    });

  } catch (e) {
    return createResponse({
      success: false,
      message: "Registration failed: " + e.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// ATTENDANCE
// ==========================================

function handleAttendance(data, type) {
  var ss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
  var sheet = ss.getSheetByName("Logs");
  var settings = getSettings();

  var imageUrl = "";
  if (data.imageBase64 && settings.Attendance_Folder_ID) {
    try {
      var blob = Utilities.newBlob(
        Utilities.base64Decode(data.imageBase64.split(",")[1]),
        "image/jpeg",
        (settings.Attendance_Prefix || "ATT") + "_" + data.userId + "_" + new Date().getTime() + ".jpg"
      );
      var folder = DriveApp.getFolderById(settings.Attendance_Folder_ID);
      imageUrl = folder.createFile(blob).getUrl();
    } catch (e) { /* folder not configured */ }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "User ID", "Type", "Timestamp", "Coordinates", "Image URL", "Created At"]);
  }

  sheet.appendRow([
    "ATT" + new Date().getTime(),
    data.userId,
    type,
    new Date(),
    (data.lat || "") + ", " + (data.lng || ""),
    imageUrl,
    new Date()
  ]);

  return createResponse({ success: true, message: "Successfully " + type.toLowerCase() + "ed" });
}

// ==========================================
// CUSTOMERS LIST
// ==========================================

function getCustomers() {
  var ss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
  var sheet = ss.getSheetByName("Customers");
  if (!sheet) {
    return createResponse({ success: false, message: "Customers tab not found in Admin Sheet" }, 404);
  }
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0] || [];
  var col = toMap(headers);

  var customers = [];
  for (var i = 1; i < allData.length; i++) {
    var r = allData[i];
    customers.push({
      customerId: String(r[col["Customer Code"]] || ""),
      shopName: String(r[col["Customer Name"]] || ""),
      ownerName: "",
      ownerContact: String(r[col["Phone"]] || ""),
      marketName: "",
      district: String(r[col["City"]] || ""),
      area: String(r[col["Area"]] || ""),
      territory: "",
      shopType: String(r[col["Customer Type"]] || ""),
      fullAddress: "",
      latitude: "",
      longitude: "",
      salesOfficer: "",
      email: "",
      status: "Active",
    });
  }

  return createResponse({ success: true, data: customers });
}

// ==========================================
// VISIT SUBMISSION
// ==========================================

function handleSubmitVisit(data) {
  // Validate required fields
  var required = ["email", "customerId", "brandFocus"];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]] || String(data[required[i]]).trim() === "") {
      return createResponse({
        success: false,
        message: "Missing required field: " + required[i]
      }, 400);
    }
  }
  if (data.totalQuantity === undefined || data.totalQuantity === null || String(data.totalQuantity).trim() === "") {
    return createResponse({ success: false, message: "Missing required field: totalQuantity" }, 400);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var ss = SpreadsheetApp.openById(VISIT_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var allData = sheet.getDataRange().getValues();
    var headers = allData[0] || [];
    var col = toMap(headers);

    // ---- Generate Visit ID ----
    var lastId = "VIS100000";
    for (var r = 1; r < allData.length; r++) {
      if (allData[r][col["Visit ID"]]) {
        lastId = String(allData[r][col["Visit ID"]]);
      }
    }
    var prefix = "VIS";
    var numPart = parseInt(lastId.replace(prefix, ""), 10) || 0;
    var nextId = prefix + String(numPart + 1).padStart(6, "0");

    // ---- Upload Selfie to Drive ----
    var selfieUrl = "";
    var driveFileId = "";
    if (data.selfieBase64) {
      try {
        var settings = getSettings();
        var folderId = settings.Visit_Photo_Folder_ID || settings.Attendance_Folder_ID;
        if (folderId) {
          var blob = Utilities.newBlob(
            Utilities.base64Decode(data.selfieBase64.split(",")[1]),
            "image/jpeg",
            "VIS_" + nextId + "_" + new Date().getTime() + ".jpg"
          );
          var folder = DriveApp.getFolderById(folderId);
          var file = folder.createFile(blob);
          selfieUrl = file.getUrl();
          driveFileId = file.getId();
        }
      } catch (e) { /* folder not configured */ }
    }

    // ---- Build row ----
    var now = new Date();
    var gpsLat = String(data.lat || "");
    var gpsLng = String(data.lng || "");
    var liveMapUrl = gpsLat && gpsLng ? "https://maps.google.com/?q=" + gpsLat + "," + gpsLng : "";
    var gpsLocation = gpsLat && gpsLng ? gpsLat + ", " + gpsLng : "";
    var storeGps = data.storeLat && data.storeLng ? data.storeLat + ", " + data.storeLng : "";

    var dateStr = Utilities.formatDate(now, "Asia/Dhaka", "dd-MMM-yyyy");

    var row = headers.map(function (h, idx) {
      var h2 = String(h).trim().toLowerCase();
      if (h2 === "visit id") return nextId;
      if (h2 === "timestamp") return now;
      if (h2 === "email") return data.email || "";
      if (h2 === "sales officer") return data.salesOfficer || "";
      if (h2 === "customer code") return data.customerId || "";
      if (h2 === "customer name") return data.customerName || "";
      if (h2 === "phone") return data.customerPhone || "";
      if (h2 === "city" || h2 === "district") return data.district || "";
      if (h2 === "area") return data.area || "";
      if (h2 === "customer type") return data.customerType || "";
      if (h2 === "market name") return data.marketName || "";
      if (h2 === "total quantity") return Number(data.totalQuantity) || 0;
      if (h2 === "order delivery date") return data.orderDeliveryDate || "";
      if (h2 === "order not received details") return data.orderNotReceived || "";
      if (h2 === "other details") return data.otherDetails || "";
      if (h2 === "brand focus") return data.brandFocus || "";
      if (h2 === "other brand") return data.otherBrand || "";
      if (h2 === "castrol inventory") return data.castrolInventory || "";
      if (h2 === "comments") return data.comments || "";
      if (h2 === "latitude") return gpsLat;
      if (h2 === "longitude") return gpsLng;
      if (h2 === "gps accuracy") return data.gpsAccuracy || "";
      if (h2 === "gps location") return gpsLocation;
      if (h2 === "store gps") return storeGps;
      if (h2 === "distance from store (meter)") return Number(data.distance) || 0;
      if (h2 === "visit result") return data.visitResult || "";
      if (h2 === "selfie url") return selfieUrl;
      if (h2 === "drive file id") return driveFileId;
      if (h2 === "live map") return liveMapUrl;
      if (h2 === "date") return dateStr;
      if (h2 === "sales person name") return data.salesPersonName || "";
      if (h2 === "territory") return data.territory || "";
      if (h2 === "visit status") return data.visitStatus || "Completed";
      return "";
    });

    sheet.appendRow(row);

    return createResponse({
      success: true,
      visitId: nextId,
      message: "Visit " + nextId + " recorded successfully"
    });

  } catch (e) {
    return createResponse({
      success: false,
      message: "Visit submission failed: " + e.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// DASHBOARD DATA
// ==========================================

function getDashboardData(data) {
  var email = String(data.email || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
  if (!email) {
    return createResponse({ success: false, message: "Email is required" }, 400);
  }

  var today = Utilities.formatDate(new Date(), "Asia/Dhaka", "dd-MMM-yyyy");

  // --- Visits today for this user ---
  var visits = [];
  try {
    var vss = SpreadsheetApp.openById(VISIT_SHEET_ID);
    var vSheet = vss.getSheets()[0];
    var vData = vSheet.getDataRange().getValues();
    var vHeaders = vData[0] || [];
    var vCol = toMap(vHeaders);

    for (var i = 1; i < vData.length; i++) {
      var r = vData[i];
      var vEmail = String(r[vCol["Email"]] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
      
      var rawDate = r[vCol["Date"]];
      var vDate = "";
      if (rawDate instanceof Date) {
        vDate = Utilities.formatDate(rawDate, "Asia/Dhaka", "dd-MMM-yyyy");
      } else {
        vDate = String(rawDate || "").trim();
      }

      if (vEmail === email && vDate === today) {
        visits.push({
          visitId: String(r[vCol["Visit ID"]] || ""),
          timestamp: r[vCol["Timestamp"]] instanceof Date ? r[vCol["Timestamp"]].toISOString() : String(r[vCol["Timestamp"]] || ""),
          customerCode: String(r[vCol["Customer Code"]] || ""),
          customerName: String(r[vCol["Customer Name"]] || ""),
          area: String(r[vCol["Area"]] || ""),
          city: String(r[vCol["City"]] || r[vCol["District"]] || ""),
          latitude: String(r[vCol["Latitude"]] || ""),
          longitude: String(r[vCol["Longitude"]] || ""),
          brandFocus: String(r[vCol["Brand Focus"]] || ""),
          totalQuantity: Number(r[vCol["Total Quantity"]]) || 0,
          visitResult: String(r[vCol["Visit Result"]] || ""),
          orderNotReceived: String(r[vCol["Order Not Received Details"]] || ""),
          marketName: String(r[vCol["Market Name"]] || "")
        });
      }
    }
  } catch (e) { /* visit sheet not found */ }

  // --- Orders today for this user ---
  var orders = [];
  var totalOrderQty = 0;
  try {
    var oss = SpreadsheetApp.openById(ORDERS_SHEET_ID);
    var oSheet = oss.getSheetByName("Sec Orders");
    var oData = oSheet.getDataRange().getValues();
    var oHeaders = oData[0] || [];
    var oCol = toMap(oHeaders);

    for (var j = 1; j < oData.length; j++) {
      var or = oData[j];
      var oEmail = String(or[oCol["Email"]] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
      
      var rawCreatedAt = or[oCol["Created At"]];
      var oDateStr = "";
      var oCreatedAtIso = "";
      
      if (rawCreatedAt instanceof Date) {
        oDateStr = Utilities.formatDate(rawCreatedAt, "Asia/Dhaka", "dd-MMM-yyyy");
        oCreatedAtIso = rawCreatedAt.toISOString();
      } else {
        oCreatedAtIso = String(rawCreatedAt || "");
        oDateStr = oCreatedAtIso; // Fallback string matching
      }

      var isTodayOrder = (oDateStr === today) || (oCreatedAtIso.indexOf(today) !== -1);

      if (oEmail === email && isTodayOrder) {
        var qty = Number(or[oCol["Quantity"]]) || 0;
        totalOrderQty += qty;
        orders.push({
          invoiceId: String(or[oCol["Invoice ID"]] || ""),
          customerName: String(or[oCol["Customer Name"]] || ""),
          productName: String(or[oCol["Product Name"]] || ""),
          quantity: qty,
          createdAt: oCreatedAtIso
        });
      }
    }
  } catch (e) { /* orders sheet not found */ }

  // --- Attendance today ---
  var clockIn = "";
  var clockOut = "";
  try {
    var lss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
    var lSheet = lss.getSheetByName("Logs");
    if (lSheet) {
      var lData = lSheet.getDataRange().getValues();
      for (var k = 1; k < lData.length; k++) {
        var lr = lData[k];
        var lUserId = String(lr[1] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
        var lType = String(lr[2] || "").trim();
        var lTs = lr[3];
        var lDateStr = "";
        
        if (lTs instanceof Date) {
          lDateStr = Utilities.formatDate(lTs, "Asia/Dhaka", "dd-MMM-yyyy");
        } else {
          lDateStr = String(lTs || "").trim();
        }
        
        if (lUserId === email && lDateStr === today) {
          if (lType === "Clock In" && !clockIn) clockIn = lTs instanceof Date ? lTs.toISOString() : String(lTs);
          if (lType === "Clock Out") clockOut = lTs instanceof Date ? lTs.toISOString() : String(lTs);
        }
      }
    }
  } catch (e) { /* logs not found */ }

  // --- Calculate total distance between visit points ---
  var totalDistanceKm = 0;
  var validCoords = [];
  for (var v = 0; v < visits.length; v++) {
    var lat = parseFloat(visits[v].latitude);
    var lng = parseFloat(visits[v].longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      validCoords.push({ lat: lat, lng: lng, name: visits[v].customerName, time: visits[v].timestamp, area: visits[v].area });
    }
  }

  for (var c = 1; c < validCoords.length; c++) {
    var prev = validCoords[c - 1];
    var curr = validCoords[c];
    totalDistanceKm += haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
  }

  // --- Unique areas visited ---
  var areasSeen = {};
  for (var a = 0; a < visits.length; a++) {
    if (visits[a].area) areasSeen[visits[a].area] = true;
  }

  return createResponse({
    success: true,
    data: {
      today: today,
      visits: visits,
      visitCount: visits.length,
      orders: orders.slice(0, 50),
      orderCount: orders.length,
      totalOrderQty: totalOrderQty,
      clockIn: clockIn,
      clockOut: clockOut,
      route: validCoords,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      areasVisited: Object.keys(areasSeen)
    }
  });
}

// ==========================================
// REPORT DATA (date-range based, for 3-month filter)
// ==========================================

function getReportData(data) {
  var email = String(data.email || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
  if (!email) {
    return createResponse({ success: false, message: "Email is required" }, 400);
  }

  // Parse date range (defaults to last 3 months if not provided)
  var now = new Date();
  var endDate = data.endDate ? new Date(data.endDate) : now;
  var startDate = data.startDate ? new Date(data.startDate) : new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Normalize to start/end of day
  var startStr = Utilities.formatDate(startDate, "Asia/Dhaka", "dd-MMM-yyyy");
  var endStr = Utilities.formatDate(endDate, "Asia/Dhaka", "dd-MMM-yyyy");

  // Build a set of date strings within range (dd-MMM-yyyy format used in sheets)
  var dateSet = {};
  var cursor = new Date(startDate);
  while (cursor <= endDate) {
    dateSet[Utilities.formatDate(cursor, "Asia/Dhaka", "dd-MMM-yyyy")] = true;
    cursor.setDate(cursor.getDate() + 1);
  }

  // --- Visits in range ---
  var visits = [];
  var visitByDate = {};
  var visitByArea = {};
  var visitByBrand = {};
  var routeCoords = [];
  var totalDistanceKm = 0;

  try {
    var vss = SpreadsheetApp.openById(VISIT_SHEET_ID);
    var vSheet = vss.getSheets()[0];
    var vData = vSheet.getDataRange().getValues();
    var vHeaders = vData[0] || [];
    var vCol = toMap(vHeaders);

    for (var i = 1; i < vData.length; i++) {
      var r = vData[i];
      var vEmail = String(r[vCol["Email"]] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
      if (vEmail !== email) continue;

      var rawDate = r[vCol["Date"]];
      var vDate = "";
      if (rawDate instanceof Date) {
        vDate = Utilities.formatDate(rawDate, "Asia/Dhaka", "dd-MMM-yyyy");
      } else {
        vDate = String(rawDate || "").trim();
      }

      if (!vDate) {
        // Fallback: derive from Timestamp column
        var ts = r[vCol["Timestamp"]];
        if (ts instanceof Date) vDate = Utilities.formatDate(ts, "Asia/Dhaka", "dd-MMM-yyyy");
      }

      if (!dateSet[vDate]) continue;

      var lat = parseFloat(r[vCol["Latitude"]]);
      var lng = parseFloat(r[vCol["Longitude"]]);
      var hasGps = !isNaN(lat) && !isNaN(lng);

      var visitObj = {
        visitId: String(r[vCol["Visit ID"]] || ""),
        timestamp: r[vCol["Timestamp"]] instanceof Date ? r[vCol["Timestamp"]].toISOString() : String(r[vCol["Timestamp"]] || ""),
        date: vDate,
        customerCode: String(r[vCol["Customer Code"]] || ""),
        customerName: String(r[vCol["Customer Name"]] || ""),
        area: String(r[vCol["Area"]] || ""),
        city: String(r[vCol["City"]] || r[vCol["District"]] || ""),
        latitude: hasGps ? String(lat) : "",
        longitude: hasGps ? String(lng) : "",
        brandFocus: String(r[vCol["Brand Focus"]] || ""),
        totalQuantity: Number(r[vCol["Total Quantity"]]) || 0,
        visitResult: String(r[vCol["Visit Result"]] || ""),
        orderNotReceived: String(r[vCol["Order Not Received Details"]] || ""),
        marketName: String(r[vCol["Market Name"]] || ""),
        territory: String(r[vCol["Territory"]] || ""),
        visitStatus: String(r[vCol["Visit Status"]] || "Completed")
      };

      visits.push(visitObj);

      // Aggregate by date
      if (!visitByDate[vDate]) visitByDate[vDate] = { date: vDate, visits: 0, orders: 0, qty: 0 };
      visitByDate[vDate].visits++;

      // Aggregate by area
      if (visitObj.area) {
        if (!visitByArea[visitObj.area]) visitByArea[visitObj.area] = 0;
        visitByArea[visitObj.area]++;
      }

      // Aggregate by brand
      if (visitObj.brandFocus) {
        var brands = visitObj.brandFocus.split(",");
        for (var b = 0; b < brands.length; b++) {
          var br = brands[b].trim();
          if (br) {
            if (!visitByBrand[br]) visitByBrand[br] = 0;
            visitByBrand[br]++;
          }
        }
      }

      // Route coords
      if (hasGps) {
        routeCoords.push({ lat: lat, lng: lng, name: visitObj.customerName, time: visitObj.timestamp, area: visitObj.area, date: vDate });
      }
    }
  } catch (e) { /* visit sheet error */ }

  // Calculate total distance
  for (var c = 1; c < routeCoords.length; c++) {
    totalDistanceKm += haversineKm(routeCoords[c - 1].lat, routeCoords[c - 1].lng, routeCoords[c].lat, routeCoords[c].lng);
  }

  // --- Orders in range ---
  var orders = [];
  var totalOrderQty = 0;
  var orderByDate = {};
  var orderByProduct = {};
  var orderByCustomer = {};

  try {
    var oss = SpreadsheetApp.openById(ORDERS_SHEET_ID);
    var oSheet = oss.getSheetByName("Sec Orders");
    var oData = oSheet.getDataRange().getValues();
    var oHeaders = oData[0] || [];
    var oCol = toMap(oHeaders);

    for (var j = 1; j < oData.length; j++) {
      var or = oData[j];
      var oEmail = String(or[oCol["Email"]] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
      if (oEmail !== email) continue;

      var oTs = or[oCol["Created At"]] || or[oCol["Timestamp"]];
      var oDateStr = "";
      if (oTs instanceof Date) {
        oDateStr = Utilities.formatDate(oTs, "Asia/Dhaka", "dd-MMM-yyyy");
      } else {
        oDateStr = String(oTs || "");
      }

      if (!dateSet[oDateStr]) continue;

      var qty = Number(or[oCol["Quantity"]]) || 0;
      totalOrderQty += qty;

      var orderObj = {
        invoiceId: String(or[oCol["Invoice ID"]] || ""),
        customerName: String(or[oCol["Customer Name"]] || ""),
        customerId: String(or[oCol["Customer ID"]] || ""),
        productName: String(or[oCol["Product Name"]] || ""),
        productId: String(or[oCol["Product ID"]] || ""),
        quantity: qty,
        createdAt: oTs instanceof Date ? oTs.toISOString() : String(oTs || ""),
        date: oDateStr,
        orderStatus: String(or[oCol["Order Status"]] || "Pending")
      };

      orders.push(orderObj);

      // Aggregate by date
      if (!visitByDate[oDateStr]) visitByDate[oDateStr] = { date: oDateStr, visits: 0, orders: 0, qty: 0 };
      visitByDate[oDateStr].orders++;
      visitByDate[oDateStr].qty += qty;

      // Aggregate by product
      if (orderObj.productName) {
        if (!orderByProduct[orderObj.productName]) orderByProduct[orderObj.productName] = { name: orderObj.productName, qty: 0, count: 0 };
        orderByProduct[orderObj.productName].qty += qty;
        orderByProduct[orderObj.productName].count++;
      }

      // Aggregate by customer
      if (orderObj.customerName) {
        if (!orderByCustomer[orderObj.customerName]) orderByCustomer[orderObj.customerName] = { name: orderObj.customerName, qty: 0, count: 0 };
        orderByCustomer[orderObj.customerName].qty += qty;
        orderByCustomer[orderObj.customerName].count++;
      }
    }
  } catch (e) { /* orders sheet error */ }

  // --- Attendance in range ---
  var attendance = [];
  var totalClockIns = 0;
  try {
    var lss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
    var lSheet = lss.getSheetByName("Logs");
    if (lSheet) {
      var lData = lSheet.getDataRange().getValues();
      for (var k = 1; k < lData.length; k++) {
        var lr = lData[k];
        var lUserId = String(lr[1] || "").replace(/[\s\u00A0]+/g, "").toLowerCase();
        var lType = String(lr[2] || "").trim();
        var lTs = lr[3];
        var lDateStr = "";
        if (lTs instanceof Date) {
          lDateStr = Utilities.formatDate(lTs, "Asia/Dhaka", "dd-MMM-yyyy");
        } else {
          lDateStr = String(lTs || "");
        }

        if (lUserId !== email) continue;
        if (!dateSet[lDateStr]) continue;

        if (lType === "Clock In") totalClockIns++;

        attendance.push({
          type: lType,
          timestamp: lTs instanceof Date ? lTs.toISOString() : String(lTs || ""),
          date: lDateStr
        });
      }
    }
  } catch (e) { /* logs error */ }

  // --- Build daily summary (sorted) ---
  var dailySummary = Object.keys(visitByDate).map(function (d) {
    return visitByDate[d];
  }).sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });

  // --- Top products ---
  var topProducts = Object.keys(orderByProduct).map(function (p) {
    return orderByProduct[p];
  }).sort(function (a, b) {
    return b.qty - a.qty;
  }).slice(0, 10);

  // --- Top customers ---
  var topCustomers = Object.keys(orderByCustomer).map(function (c) {
    return orderByCustomer[c];
  }).sort(function (a, b) {
    return b.qty - a.qty;
  }).slice(0, 10);

  // --- Area breakdown ---
  var areaBreakdown = Object.keys(visitByArea).map(function (a) {
    return { area: a, visits: visitByArea[a] };
  }).sort(function (a, b) {
    return b.visits - a.visits;
  });

  // --- Brand breakdown ---
  var brandBreakdown = Object.keys(visitByBrand).map(function (b) {
    return { brand: b, visits: visitByBrand[b] };
  }).sort(function (a, b) {
    return b.visits - a.visits;
  });

  // --- Unique active days ---
  var activeDays = Object.keys(visitByDate).length;

  // --- Sort visits by timestamp (newest first) ---
  visits.sort(function (a, b) {
    return a.timestamp < b.timestamp ? 1 : -1;
  });

  // --- Sort orders by timestamp (newest first) ---
  orders.sort(function (a, b) {
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  return createResponse({
    success: true,
    data: {
      startDate: startStr,
      endDate: endStr,
      summary: {
        totalVisits: visits.length,
        totalOrders: orders.length,
        totalOrderQty: totalOrderQty,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        activeDays: activeDays,
        totalClockIns: totalClockIns,
        uniqueAreas: Object.keys(visitByArea).length,
        uniqueCustomers: Object.keys(orderByCustomer).length,
        avgQtyPerVisit: visits.length > 0 ? Math.round((totalOrderQty / visits.length) * 10) / 10 : 0,
        avgVisitsPerDay: activeDays > 0 ? Math.round((visits.length / activeDays) * 10) / 10 : 0
      },
      visits: visits,
      orders: orders,
      attendance: attendance,
      route: routeCoords,
      dailySummary: dailySummary,
      topProducts: topProducts,
      topCustomers: topCustomers,
      areaBreakdown: areaBreakdown,
      brandBreakdown: brandBreakdown
    }
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==========================================
// PRODUCTS LIST
// ==========================================

function getProducts() {
  var ss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
  var sheet = ss.getSheetByName("Products");
  if (!sheet) {
    return createResponse({ success: false, message: "Products tab not found" }, 404);
  }
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0] || [];
  var col = toMap(headers);

  var products = [];
  for (var i = 1; i < allData.length; i++) {
    var r = allData[i];
    var status = String(r[col["Status"]] || "Active").trim();
    if (status !== "Active") continue;
    products.push({
      productId: String(r[col["Product ID"]] || ""),
      productName: String(r[col["Product Name"]] || ""),
      category: String(r[col["Category"]] || ""),
      packSize: String(r[col["Pack Size"]] || ""),
      pricePerLiter: Number(r[col["Price Per Liter"]]) || 0,
      canPailDrum: Number(r[col["Can Pail Drum"]]) || 0,
      cartoonPrice: Number(r[col["Cartoon Price"]]) || 0,
      status: status
    });
  }

  return createResponse({ success: true, data: products });
}

// ==========================================
// SUB DB LIST
// ==========================================

function getSubDBs() {
  var ss = SpreadsheetApp.openById(ADMIN_SHEET_ID);
  var sheet = ss.getSheetByName("Sub DB");
  if (!sheet) {
    return createResponse({ success: false, message: "Sub DB tab not found" }, 404);
  }
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0] || [];
  var col = toMap(headers);

  var subDBs = [];
  for (var i = 1; i < allData.length; i++) {
    var r = allData[i];
    var status = String(r[col["Status"]] || "Active").trim();
    if (status !== "Active") continue;
    subDBs.push({
      zone: String(r[col["Zone"]] || ""),
      sapId: String(r[col["SAP ID"]] || ""),
      area: String(r[col["Area"]] || ""),
      subDbName: String(r[col["Sub DB Name"]] || ""),
      status: status
    });
  }

  return createResponse({ success: true, data: subDBs });
}

// ==========================================
// ORDER SUBMISSION
// ==========================================

function handleSubmitOrder(data) {
  var required = ["email", "customerId", "products"];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]] || (Array.isArray(data[required[i]]) && data[required[i]].length === 0)) {
      return createResponse({ success: false, message: "Missing required field: " + required[i] }, 400);
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var ss = SpreadsheetApp.openById(ORDERS_SHEET_ID);
    var sheet = ss.getSheetByName("Sec Orders");
    var sheetUsed = sheet ? sheet.getName() : "NOT FOUND";
    if (!sheet) {
      sheet = ss.getSheets()[0];
      sheetUsed = sheet.getName() + " (fallback to first tab)";
    }
    var allData = sheet.getDataRange().getValues();
    var headers = allData[0] || [];
    var col = toMap(headers);

    // Generate Invoice ID
    var lastId = "ORD100000";
    for (var r = 1; r < allData.length; r++) {
      if (allData[r][col["Invoice ID"]]) {
        lastId = String(allData[r][col["Invoice ID"]]);
      }
    }
    var numPart = parseInt(lastId.replace("ORD", ""), 10) || 0;
    var nextId = "ORD" + String(numPart + 1).padStart(6, "0");

    // Upload attachment
    var docUrl = "";
    var driveFileId = "";
    if (data.attachmentBase64) {
      try {
        var settings = getSettings();
        var folderId = settings.Order_Folder_ID;
        if (folderId) {
          var ext = data.attachmentType === "pdf" ? "pdf" : "jpg";
          var blob = Utilities.newBlob(
            Utilities.base64Decode(data.attachmentBase64.split(",")[1]),
            data.attachmentType === "pdf" ? "application/pdf" : "image/jpeg",
            nextId + "_" + new Date().getTime() + "." + ext
          );
          var folder = DriveApp.getFolderById(folderId);
          var file = folder.createFile(blob);
          docUrl = file.getUrl();
          driveFileId = file.getId();
        }
      } catch (e) { /* folder not configured */ }
    }

    var now = new Date();
    var month = now.getMonth() + 1;
    var year = now.getFullYear();

    // Write one row per product
    var rowsBefore = sheet.getLastRow();
    for (var p = 0; p < data.products.length; p++) {
      var product = data.products[p];
      var row = headers.map(function (h) {
        var h2 = String(h).trim().toLowerCase();
        if (h2 === "invoice id") return nextId;
        if (h2 === "dsr") return data.dsr || "";
        if (h2 === "customer id") return data.customerId || "";
        if (h2 === "customer name") return data.customerName || "";
        if (h2 === "email") return data.email || "";
        if (h2 === "product id") return product.productId || "";
        if (h2 === "product name") return product.productName || "";
        if (h2 === "quantity") return Number(product.quantity) || 0;
        if (h2 === "timestamp") return now;
        if (h2 === "document url") return docUrl;
        if (h2 === "drive file id") return driveFileId;
        if (h2 === "sap id") return data.sapId || "";
        if (h2 === "zone") return data.zone || "";
        if (h2 === "area") return data.area || "";
        if (h2 === "distributor name") return data.distributorName || "";
        if (h2 === "month") return month;
        if (h2 === "year") return year;
        if (h2 === "category") return data.category || "";
        if (h2 === "territory") return data.territory || "";
        if (h2 === "employee name") return data.employeeName || "";
        if (h2 === "product category") return product.category || "";
        if (h2 === "order status") return "Done";
        if (h2 === "created by") return data.email || "";
        if (h2 === "created at") return now;
        return "";
      });
      sheet.appendRow(row);
    }
    var rowsAfter = sheet.getLastRow();

    return createResponse({
      success: true,
      invoiceId: nextId,
      debug: "Sheet used: " + sheetUsed + " | SheetID: " + ss.getId() + " | Rows before: " + rowsBefore + " | Rows after: " + rowsAfter + " | Headers: " + headers.join(", "),
      message: "Order " + nextId + " placed successfully with " + data.products.length + " product(s)"
    });

  } catch (e) {
    return createResponse({ success: false, message: "Order submission failed: " + e.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// HELPERS
// ==========================================

function getSettings() {
  var sheet = SpreadsheetApp.openById(ADMIN_SHEET_ID).getSheetByName("Settings");
  var values = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < values.length; i++) {
    if (values[i][0]) settings[values[i][0]] = values[i][1];
  }
  return settings;
}

function toMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i]).trim()] = i;
  }
  return map;
}

function createResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
