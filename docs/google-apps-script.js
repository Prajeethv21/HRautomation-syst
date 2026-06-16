/**
 * DEEPWOODS GREEN INITIATIVES PVT. LTD.
 * Google Apps Script - Joining Letter Automation Macro (REST API Version)
 * 
 * Deployment Instructions:
 * 1. Open your Google Sheet ("Candidates").
 * 2. Click Extensions > Apps Script.
 * 3. Replace all the code in the Apps Script editor with this entire file.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New Deployment.
 * 6. Select Type: Web App.
 *    - Execute as: "Me" (your account)
 *    - Who has access: "Anyone"
 * 7. Click Deploy, authorize the permissions, and copy the Web App URL.
 * 8. Paste the Web App URL into your frontend/.env file as VITE_APPS_SCRIPT_URL.
 */

const SHEET_NAME = "Candidates";
const TEMPLATE_ID = "1T7cl_UOi8ojl5tR99gplQCJuNARs4hD5kTZw9NXT3tw";
const LOGO_FILE_ID = "1LimR9KAN-1FteqjlNR-h_mfAuy3kqRHR10hMplcf67iLGN1SUHoy5PYReXQoj6FIV";

const IS_TESTING_MODE = true; // Set to true to schedule reminders 1 minute before, false for 1 hour before

// Google Drive folder ID where resumes are uploaded
const RESUME_FOLDER_ID = "12345_PLACEHOLDER_FOLDER_ID_67890";

// Configure Department Sheet Mapping
const ROLE_TO_SHEET_MAP = {
  "Sustainability": "Sustainability",
  "AI Automation Engineer": "AI Automation Engineer",
  "AI/Data Engineer": "AI Automation Engineer",
  "Web Developer": "Web Devloper",
  "Marketing": "Marketing",
  "Creative": "Creative",
  "Others": "Others",
  "Other": "Others"
};

// --- ORIGINAL AUTOMATION FUNCTIONS ---

function getPendingCandidates() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const pendingCandidates = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const candidateName = row[0];
    const email = row[1];
    const role = row[2];
    const joiningDate = row[3];
    const status = row[4];
    const emailStatus = row[5];

    if (status === "Selected" && emailStatus === "Pending") {
      pendingCandidates.push({
        rowNumber: i + 1,
        candidateName,
        email,
        role,
        joiningDate
      });
    }
  }
  return pendingCandidates;
}

function getLogoBlobSafely() {
  try {
    if (typeof LOGO_FILE_ID !== 'undefined' && LOGO_FILE_ID) {
      // Use Advanced Drive Service and UrlFetchApp to bypass DriveApp permissions issues
      var fileMetadata = Drive.Files.get(LOGO_FILE_ID);
      if (fileMetadata && fileMetadata.downloadUrl) {
        var response = UrlFetchApp.fetch(fileMetadata.downloadUrl, {
          headers: {
            'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
          }
        });
        return response.getBlob().setName("logo.png");
      }
    }
  } catch (e) {
    Logger.log("WARNING: Failed to fetch logo image from Drive: " + e.toString());
  }
  return null;
}

function getOrCreateTemplateDocId() {
  try {
    DocumentApp.openById(TEMPLATE_ID);
    return TEMPLATE_ID;
  } catch (e) {
    Logger.log("TEMPLATE_ID inaccessible. Searching for template in Drive...");
  }
  var query = "title contains 'Joining Letter Template' and mimeType = 'application/vnd.google-apps.document' and trashed = false";
  var filesList = Drive.Files.list({ q: query, maxResults: 1 });
  if (filesList.items && filesList.items.length > 0) {
    var foundId = filesList.items[0].id;
    Logger.log("Found existing template doc ID: " + foundId);
    return foundId;
  }
  Logger.log("No template found. Creating new Joining Letter Template document...");
  var newDoc = DocumentApp.create("Joining Letter Template");
  var body = newDoc.getBody();
  body.appendParagraph("DEEPWOODS GREEN INITIATIVES PVT. LTD.");
  body.appendParagraph("Date: {{date_of_letter}}");
  body.appendParagraph("\nDear {{candidate_name}},");
  body.appendParagraph("\nWe are pleased to offer you the position of {{role}} starting on {{joining_date}}.");
  body.appendParagraph("\nWelcome to the team!");
  body.appendParagraph("\nBest regards,\nDeepwoods Green HR");
  var newId = newDoc.getId();
  newDoc.saveAndClose();
  try {
    Drive.Permissions.insert({
      role: "reader",
      type: "anyone"
    }, newId);
  } catch (e) {
    // ignore
  }
  Logger.log("Created new template doc ID: " + newId);
  return newId;
}

function generateJoiningLetter(candidate) {
  Logger.log('Apps Script generating PDF for candidate: ' + JSON.stringify(candidate));
  
  var activeTemplateId = TEMPLATE_ID;
  try {
    Drive.Files.get(activeTemplateId);
  } catch (err) {
    activeTemplateId = getOrCreateTemplateDocId();
  }

  // Use Advanced Drive Service to copy the template instead of DriveApp
  var copyFile = Drive.Files.copy({
    title: `JoiningLetter_${candidate.candidateName}`
  }, activeTemplateId);
  const copyId = copyFile.id;
  
  const doc = DocumentApp.openById(copyId);
  const body = doc.getBody();

  var joiningDateObj = new Date();
  if (candidate.joiningDate) {
    var parsedDate = new Date(candidate.joiningDate);
    if (!isNaN(parsedDate.getTime())) {
      joiningDateObj = parsedDate;
    }
  }

  const formattedJoiningDate = Utilities.formatDate(
    joiningDateObj,
    Session.getScriptTimeZone(),
    "dd MMM yyyy"
  );

  body.replaceText("{{candidate_name}}", candidate.candidateName);
  body.replaceText("{{role}}", candidate.role);
  body.replaceText("{{joining_date}}", formattedJoiningDate);
  body.replaceText(
    "{{date_of_letter}}",
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy")
  );

  doc.saveAndClose();

  // Export copy to PDF using DocumentApp's getAs instead of DriveApp
  const pdfFile = doc.getAs(MimeType.PDF);
  const pdfName = `JoiningLetter_${candidate.candidateName.replace(/\s+/g, "")}_${candidate.role.replace(/\s+/g, "")}.pdf`;
  pdfFile.setName(pdfName);

  Logger.log('Apps Script generateJoiningLetter SUCCESS. Temp doc copy ID: ' + copyId);

  return {
    pdf: pdfFile,
    copyId: copyId
  };
}

function sendJoiningEmail(candidate, pdfFile) {
  Logger.log('Apps Script sending email to: ' + candidate.email);
  const logoBlob = getLogoBlobSafely();
  const subject = "Offer of Joining - Deepwoods Green Initiatives Pvt. Ltd.";

  var joiningDateObj = new Date();
  if (candidate.joiningDate) {
    var parsedDate = new Date(candidate.joiningDate);
    if (!isNaN(parsedDate.getTime())) {
      joiningDateObj = parsedDate;
    }
  }

  const formattedJoiningDate = Utilities.formatDate(
    joiningDateObj,
    Session.getScriptTimeZone(),
    "dd MMM yyyy"
  );

  var htmlBody = `
  <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
    <p>Dear <b>${candidate.candidateName}</b>,</p>
    <p>
      We are delighted to inform you that you have been selected
      to join <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
      as <b>${candidate.role}</b>.
    </p>
    <p>
      Your joining date is <b>${formattedJoiningDate}</b>.
    </p>
    <p>
      Please find your joining letter attached to this email.
    </p>
    <p>
      We look forward to having you on the team.
    </p>
    <p>
      Warm Regards,<br>
      <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
    </p>
    <img src="cid:deepwoodsLogo" width="300">
    <hr>
    <p style="font-size:12px;color:#666;">
      we@deepwoodsgreen.com | +91 98413 39293
    </p>
  </div>
  `;

  var options = {
    htmlBody: htmlBody,
    attachments: [pdfFile]
  };

  if (logoBlob) {
    options.inlineImages = {
      deepwoodsLogo: logoBlob
    };
  } else {
    htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
    options.htmlBody = htmlBody;
  }

  Logger.log("About to send email to: " + candidate.email);
  try {
    GmailApp.sendEmail(
      candidate.email,
      subject,
      "",
      options
    );
  } catch (err) {
    Logger.log("GMAIL ERROR: " + err.toString());
    throw err;
  }
  Logger.log('Apps Script sendJoiningEmail executed successfully.');
}

function sendJoiningLetters() {
  const sheet = getSheet();
  const candidates = getPendingCandidates();

  if (candidates.length === 0) {
    SpreadsheetApp.getUi().alert("No pending candidates found.");
    return;
  }

  let sentCount = 0;

  candidates.forEach(candidate => {
    try {
      if (!candidate.email) {
        Logger.log(`Missing email for ${candidate.candidateName}`);
        return;
      }

      const result = generateJoiningLetter(candidate);
      sendJoiningEmail(candidate, result.pdf);

      sheet.getRange(candidate.rowNumber, 6).setValue("Sent");

      // Use Advanced Drive Service to delete the file
      Drive.Files.remove(result.copyId);
      sentCount++;
    } catch (error) {
      Logger.log(`Error for ${candidate.candidateName}: ${error}`);
    }
  });

  SpreadsheetApp.getUi().alert(`Done. ${sentCount} joining letter(s) sent.`);
}

function confirmAndSend() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "This will send joining letters to all Selected candidates with Pending email status. Continue?",
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    sendJoiningLetters();
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("HR Automation")
    .addItem("Send Joining Letters", "confirmAndSend")
    .addToUi();
}

// Bidirectional status synchronization trigger
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var row = range.getRow();
  var col = range.getColumn();
  var val = range.getValue().toString().trim();
  
  if (row <= 1) return; // Skip headers
  
  var allowedStatuses = ['Submitted', 'Shortlisted', 'Scheduled', 'On Hold', 'Selected', 'Rejected'];
  if (allowedStatuses.indexOf(val) === -1) return; // Only sync valid statuses
  
  var oldStatus = e.oldValue ? e.oldValue.toString().trim() : "";
  if (oldStatus === val) return; // No change
  
  if (sheetName === "Candidates" && col === 5) {
    // Candidates status changed -> sync to Department sheet column K (11)
    var email = sheet.getRange(row, 2).getValue().toString().trim();
    var role = sheet.getRange(row, 3).getValue().toString().trim();
    var deptSheetName = ROLE_TO_SHEET_MAP[role] || role;
    if (deptSheetName && email) {
      var deptSheet = sheet.getParent().getSheetByName(deptSheetName);
      if (deptSheet) {
        var deptData = deptSheet.getDataRange().getValues();
        for (var i = 1; i < deptData.length; i++) {
          if (deptData[i][1] && deptData[i][1].toString().trim().toLowerCase() === email.toLowerCase()) {
            var deptStatusCell = deptSheet.getRange(i + 1, 11);
            if (deptStatusCell.getValue().toString().trim() !== val) {
              deptStatusCell.setValue(val);
            }
            break;
          }
        }
      }
    }
    // Trigger any side effects (like auto shortlist/review emails)
    triggerTransitionSideEffects(null, email, oldStatus, val);
    
  } else if (sheetName !== "Candidates" && sheetName !== "ProcessedResumes" && sheetName !== "ProcessedResumesLog" && col === 11) {
    // Department status changed -> sync to Candidates sheet column E (5)
    var email = sheet.getRange(row, 2).getValue().toString().trim();
    if (email) {
      var masterSheet = sheet.getParent().getSheetByName("Candidates");
      if (masterSheet) {
        var masterData = masterSheet.getDataRange().getValues();
        for (var i = 1; i < masterData.length; i++) {
          if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === email.toLowerCase()) {
            var masterStatusCell = masterSheet.getRange(i + 1, 5);
            if (masterStatusCell.getValue().toString().trim() !== val) {
              masterStatusCell.setValue(val);
            }
            break;
          }
        }
      }
    }
    // Trigger any side effects (like auto shortlist/review emails)
    triggerTransitionSideEffects(null, email, oldStatus, val);
  }
}

function formatSheetValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val instanceof Date) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return "";
  }
  var str = val.toString().trim();
  if (str.indexOf("+") === 0 || str.indexOf("=") === 0) {
    return "'" + str;
  }
  return str;
}

// --- REST API ENDPOINTS FOR FRONTEND ---

// Helper: Safely resolve the target sheet
function getSheet(sheetId) {
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getSheetByName(SHEET_NAME);
    } catch (e) {
      // Fallback
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  } catch (e) {
    // If running headless and openById fails, return first sheet of provided ID
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId).getSheets()[0];
    }
    throw e;
  }
}

function getSheetByName(sheetId, name) {
  const targetName = name || SHEET_NAME;
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId).getSheetByName(targetName);
    } catch (e) {
      // Fallback
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetName);
  } catch (e) {
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId).getSheets()[0];
    }
    throw e;
  }
}

// CORS pre-flight handler for POST requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle GET Requests from frontend portal
 * URL params: ?action=getCandidates&sheetId=YOUR_SHEET_ID
 */
function doGet(e) {
  var action = e.parameter.action;
  var sheetId = e.parameter.sheetId;

  if (action === "getCandidates") {
    return handleGetCandidates(sheetId);
  }

  if (action === "getDepartmentCandidates") {
    var sheetName = e.parameter.sheetName;
    return handleGetDepartmentCandidates(sheetId, sheetName);
  }

  if (action === "processResumes") {
    return handleProcessResumes(sheetId);
  }

  return makeJsonResponse({ success: false, message: "Unknown GET action" }, 400);
}

/**
 * Handle POST Requests from frontend portal
 * Body: { action: "sendJoiningLetter", sheetId: "...", candidateEmail: "..." }
 */
function doPost(e) {
  Logger.log("FULL REQUEST:");
  Logger.log(e.postData.contents);
  Logger.log('Apps Script doPost() received request payload: ' + e.postData.contents);
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var sheetId = data.sheetId;
    var candidateEmail = data.candidateEmail || data.email;

    if (action === "sendJoiningLetter") {
      return handleSendJoiningLetter(sheetId, candidateEmail);
    }

    if (action === "sendRejectionEmail") {
      return handleSendRejectionEmail(sheetId, candidateEmail);
    }

    if (action === "updateCandidateStatus") {
      var newStatus = data.status;
      return handleUpdateCandidateStatus(sheetId, candidateEmail, newStatus);
    }

    if (action === "createCandidate") {
      var candidate = data.candidate;
      return handleCreateCandidate(sheetId, candidate);
    }

    if (action === "processResumes") {
      return handleProcessResumes(sheetId);
    }

    if (action === "sendInterviewEmail") {
      return handleSendInterviewEmail(sheetId, candidateEmail);
    }

    return makeJsonResponse({ success: false, message: "Unknown POST action" }, 400);
  } catch (error) {
    return makeJsonResponse({ success: false, message: "Exception encountered: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Retrieve all candidate rows
function handleGetCandidates(sheetId) {
  try {
    const sheet = getSheet(sheetId);
    const data = sheet.getDataRange().getValues();
    const candidates = [];

    // Map sheet rows starting from index 1 (skipping header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const candidate = {};

      candidate.candidateName = row[0] ? row[0].toString().trim() : "";
      candidate.email = row[1] ? row[1].toString().trim() : "";
      candidate.role = row[2] ? row[2].toString().trim() : "";

      // Date formatting
      var rawDate = row[3];
      if (rawDate instanceof Date) {
        candidate.joiningDate = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        candidate.joiningDate = rawDate ? rawDate.toString().trim() : "";
      }

      candidate.status = row[4] ? row[4].toString().trim() : "Submitted";
      candidate.emailStatus = row[5] ? row[5].toString().trim() : "Pending";
      candidate.source = row[6] ? row[6].toString().trim() : "Other";
      candidate.resumeFileId = ""; // removed completely

      var rawInterviewDate = row[7];
      if (rawInterviewDate instanceof Date) {
        candidate.interviewDate = Utilities.formatDate(rawInterviewDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        candidate.interviewDate = rawInterviewDate ? rawInterviewDate.toString().trim() : "";
      }

      var rawInterviewTime = row[8];
      if (rawInterviewTime instanceof Date) {
        candidate.interviewTime = Utilities.formatDate(rawInterviewTime, Session.getScriptTimeZone(), "hh:mm a");
      } else {
        candidate.interviewTime = rawInterviewTime ? rawInterviewTime.toString().trim() : "";
      }

      // Avoid pushing empty rows
      if (candidate.candidateName || candidate.email) {
        candidates.push(candidate);
      }
    }

    return makeJsonResponse({ success: true, data: candidates }, 200);
  } catch (error) {
    return makeJsonResponse({ success: false, message: "Failed to read Google Sheet: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Trigger letter for a candidate by Email
function handleSendJoiningLetter(sheetId, candidateEmail) {
  Logger.log("ENTERED handleSendJoiningLetter");
  Logger.log("candidateEmail = " + candidateEmail);
  Logger.log('Apps Script looking up candidate with email: ' + candidateEmail);
  try {
    if (!candidateEmail) {
      return makeJsonResponse({ success: false, message: "Candidate Email parameter is required" }, 400);
    }

    const sheet = getSheet(sheetId);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let candidate = null;

    // Search for the candidate by Email in column B (index 1)
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        rowIndex = i;
        candidate = {
          rowNumber: i + 1,
          candidateName: data[i][0].toString().trim(),
          email: data[i][1].toString().trim(),
          role: data[i][2].toString().trim(),
          joiningDate: data[i][3]
        };
        break;
      }
    }

    if (!candidate || rowIndex === -1) {
      Logger.log('Apps Script candidate lookup FAILED for email: ' + candidateEmail);
      return makeJsonResponse({ success: false, message: "Candidate Email not found in spreadsheet: " + candidateEmail }, 404);
    }

    Logger.log('Apps Script candidate lookup SUCCESS. Candidate data: ' + JSON.stringify(candidate));

    // Generate joining letter PDF using the template
    const result = generateJoiningLetter(candidate);

    // Send the email with GmailApp
    sendJoiningEmail(candidate, result.pdf);

    // Update Email Status in column F (index 5 / Column 6) to "Joining Letter Sent"
    sheet.getRange(candidate.rowNumber, 6).setValue("Joining Letter Sent");

    // Clean up temporary doc via Advanced Drive
    Drive.Files.remove(result.copyId);

    Logger.log('Apps Script sendJoiningLetter successfully completed for email: ' + candidateEmail);

    return makeJsonResponse({
      success: true,
      message: "Joining Letter successfully emailed to " + candidateEmail + " and spreadsheet status updated."
    }, 200);

  } catch (error) {
    Logger.log('Apps Script sendJoiningLetter FAILED with error: ' + error.toString());
    return makeJsonResponse({ success: false, message: "Automation failed: " + error.toString() }, 500);
  }
}

// Response output wrapper with CORS headers
function makeJsonResponse(data, status) {
  try {
    data.logs = Logger.getLog();
  } catch (e) {
    // ignore
  }
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

// REST Endpoint Helper: Send rejection email (no PDF, no DriveApp)
function handleSendRejectionEmail(sheetId, candidateEmail) {
  Logger.log("ENTERED handleSendRejectionEmail");
  Logger.log("candidateEmail = " + candidateEmail);
  Logger.log('Apps Script looking up candidate for rejection email: ' + candidateEmail);
  try {
    if (!candidateEmail) {
      return makeJsonResponse({ success: false, message: "Candidate Email parameter is required" }, 400);
    }

    const sheet = getSheet(sheetId);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let candidate = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        rowIndex = i;
        candidate = {
          rowNumber: i + 1,
          candidateName: data[i][0].toString().trim(),
          email: data[i][1].toString().trim(),
          role: data[i][2].toString().trim()
        };
        break;
      }
    }

    if (!candidate || rowIndex === -1) {
      Logger.log('Apps Script candidate lookup FAILED for rejection email: ' + candidateEmail);
      return makeJsonResponse({ success: false, message: "Candidate Email not found in spreadsheet: " + candidateEmail }, 404);
    }

    Logger.log('Apps Script candidate found for rejection: ' + JSON.stringify(candidate));

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy");
    const logoBlob = getLogoBlobSafely();

    const subject = "Application Update \u2013 Deepwoods Green Initiatives Pvt. Ltd.";

    var htmlBody = `
  <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
    <p>Date: ${today}</p>

    <p>Dear <b>${candidate.candidateName}</b>,</p>

    <p>
      Thank you for your interest in <b>Deepwoods Green Initiatives Pvt. Ltd.</b> and for participating in our recruitment process for the position of <b>${candidate.role}</b>.
    </p>

    <p>
      After careful review, we regret to inform you that you have not been selected for this opportunity. We sincerely appreciate the time and effort you invested throughout the selection process.
    </p>

    <p>
      We wish you success in your future endeavors and encourage you to apply for suitable opportunities with us in the future.
    </p>

    <p>
      Sustainably Yours&reg;,<br>
      <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
    </p>

    <img src="cid:deepwoodsLogo" width="300">

    <hr>

    <p style="font-size:12px;color:#666;">
      we@deepwoodsgreen.com | +91 98413 39293
    </p>
  </div>
  `;

    var options = {
      htmlBody: htmlBody
    };

    if (logoBlob) {
      options.inlineImages = { deepwoodsLogo: logoBlob };
    } else {
      htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
      options.htmlBody = htmlBody;
    }

    Logger.log("About to send email to: " + candidate.email);
    try {
      GmailApp.sendEmail(
        candidate.email,
        subject,
        "",
        options
      );
    } catch (err) {
      Logger.log("GMAIL ERROR: " + err.toString());
      throw err;
    }

    Logger.log('Apps Script rejection email sent successfully to: ' + candidateEmail);

    // Update Email Status column F (index 5) to "Rejection Email Sent"
    sheet.getRange(candidate.rowNumber, 6).setValue("Rejection Email Sent");

    Logger.log('Apps Script updated Email Status to Rejection Email Sent for: ' + candidateEmail);

    return makeJsonResponse({
      success: true,
      message: "Rejection email successfully sent to " + candidateEmail + " and spreadsheet status updated."
    }, 200);

  } catch (error) {
    Logger.log('Apps Script handleSendRejectionEmail FAILED: ' + error.toString());
    return makeJsonResponse({ success: false, message: "Rejection email failed: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Update candidate status (column E in Candidates, column J in Department) by email
function handleUpdateCandidateStatus(sheetId, candidateEmail, newStatus) {
  Logger.log('=== handleUpdateCandidateStatus CALLED ===');
  Logger.log('candidateEmail: ' + candidateEmail);
  Logger.log('newStatus: ' + newStatus);
  Logger.log('sheetId: ' + sheetId);

  try {
    if (!candidateEmail) {
      return makeJsonResponse({ success: false, message: "candidateEmail is required" }, 400);
    }
    if (!newStatus) {
      return makeJsonResponse({ success: false, message: "status is required" }, 400);
    }

    var allowedStatuses = ['Submitted', 'Shortlisted', 'Scheduled', 'On Hold', 'Selected', 'Rejected'];
    if (allowedStatuses.indexOf(newStatus) === -1) {
      Logger.log('INVALID status value: ' + newStatus);
      return makeJsonResponse({ success: false, message: "Invalid status value. Allowed: " + allowedStatuses.join(', ') }, 400);
    }

    const masterSheet = getSheetByName(sheetId, "Candidates");
    const masterData = masterSheet.getDataRange().getValues();
    let masterRowIndex = -1;
    let candidateRole = "";

    // 1. Update Candidates master sheet
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        masterRowIndex = i + 1; // Convert 0-based to 1-based row index
        candidateRole = masterData[i][2] ? masterData[i][2].toString().trim() : "";
        break;
      }
    }

    if (masterRowIndex === -1) {
      Logger.log('FAILED: candidate not found for email=' + candidateEmail);
      return makeJsonResponse({ success: false, message: "Candidate not found: " + candidateEmail }, 404);
    }

    // Read old status
    var oldStatus = masterSheet.getRange(masterRowIndex, 5).getValue().toString().trim();

    // Update status cell in master Candidates sheet (Column E)
    var statusCell = masterSheet.getRange(masterRowIndex, 5);
    statusCell.setValue(newStatus);
    Logger.log('SUCCESS: Updated master sheet status at row ' + masterRowIndex);

    // 2. Update matching Department sheet
    const deptSheetName = ROLE_TO_SHEET_MAP[candidateRole] || candidateRole;
    if (deptSheetName) {
      const deptSheet = getSheetByName(sheetId, deptSheetName);
      if (deptSheet) {
        const deptData = deptSheet.getDataRange().getValues();
        let deptRowIndex = -1;

        for (let j = 1; j < deptData.length; j++) {
          if (deptData[j][1] && deptData[j][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
            deptRowIndex = j + 1;
            break;
          }
        }

        if (deptRowIndex !== -1) {
          // Status column in Department sheet is at index 10 (Column K, 11th column)
          var deptStatusCell = deptSheet.getRange(deptRowIndex, 11);
          deptStatusCell.setValue(newStatus);
          Logger.log('SUCCESS: Updated department sheet status at row ' + deptRowIndex + ' in ' + deptSheetName);
        } else {
          Logger.log('WARN: Candidate not found in department sheet ' + deptSheetName);
        }
      }
    }

    // Trigger any side effects (like auto shortlist/review emails)
    triggerTransitionSideEffects(sheetId, candidateEmail, oldStatus, newStatus);

    return makeJsonResponse({
      success: true,
      message: "Status updated to " + newStatus + " for " + candidateEmail
    }, 200);

  } catch (error) {
    Logger.log('handleUpdateCandidateStatus FAILED: ' + error.toString());
    return makeJsonResponse({ success: false, message: "Status update failed: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Retrieve department candidates
function handleGetDepartmentCandidates(sheetId, sheetName) {
  try {
    if (!sheetName) {
      return makeJsonResponse({ success: false, message: "sheetName is required" }, 400);
    }

    const sheet = getSheetByName(sheetId, sheetName);
    if (!sheet) {
      return makeJsonResponse({ success: true, data: [] }, 200);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return makeJsonResponse({ success: true, data: [] }, 200);
    }

    const data = sheet.getDataRange().getValues();
    const candidates = [];

    // Read sources and email statuses from Candidates master sheet
    var emailSources = {};
    var emailStatuses = {};
    const masterSheet = getSheet(sheetId);
    if (masterSheet) {
      const masterData = masterSheet.getDataRange().getValues();
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][1]) {
          var emailKey = masterData[i][1].toString().trim().toLowerCase();
          emailSources[emailKey] = masterData[i][6] ? masterData[i][6].toString().trim() : "Website";
          emailStatuses[emailKey] = masterData[i][5] ? masterData[i][5].toString().trim() : "Pending";
        }
      }
    }

    // Columns: Candidate Name, Email, Phone Number, Work Experience, UG, PG, College, Location, LinkedIn, GitHub, Status
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const candidate = {};

      candidate.candidateName = row[0] ? row[0].toString().trim() : "";
      candidate.email = row[1] ? row[1].toString().trim() : "";
      candidate.phoneNumber = row[2] ? row[2].toString().trim() : "";
      candidate.ug = row[4] ? row[4].toString().trim() : "";
      candidate.pg = row[5] ? row[5].toString().trim() : "";
      candidate.college = row[6] ? row[6].toString().trim() : "";
      candidate.location = row[7] ? row[7].toString().trim() : "N/A";
      candidate.linkedin = row[8] ? row[8].toString().trim() : "";
      candidate.github = row[9] ? row[9].toString().trim() : "";
      candidate.status = row[10] ? row[10].toString().trim() : "Interviewing";
      candidate.source = emailSources[candidate.email.toLowerCase()] || "Website";
      candidate.emailStatus = emailStatuses[candidate.email.toLowerCase()] || "Pending";
      candidate.resumeFileId = "";

      if (candidate.candidateName || candidate.email) {
        candidates.push(candidate);
      }
    }

    return makeJsonResponse({ success: true, data: candidates }, 200);
  } catch (error) {
    return makeJsonResponse({ success: false, message: "Failed to read department sheet: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Ingest a candidate and auto-route them to the correct department
function handleCreateCandidate(sheetId, candidate) {
  try {
    if (!candidate || !candidate.email || !candidate.name) {
      return makeJsonResponse({ success: false, message: "Candidate name and email are required" }, 400);
    }

    // Run validation to replace failed/error values with blank strings
    var clean = validateAndCleanCandidate(candidate);

    const masterSheet = getSheetByName(sheetId, "Candidates");
    const masterData = masterSheet.getDataRange().getValues();
    let candidateExists = false;

    // Check if candidate already exists in Candidates master sheet using clean email key
    var cleanEmailKey = clean.email.replace(/^'/, "").trim().toLowerCase();
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === cleanEmailKey) {
        candidateExists = true;
        break;
      }
    }

    if (candidateExists) {
      return makeJsonResponse({ success: false, message: "Candidate with email " + clean.email + " already exists" }, 400);
    }

    // 1. Add to Candidates master sheet (exactly 9 columns)
    // Columns: Candidate Name, Email Address, Role Applied For, Joining Date, Status, Email Status, Source, Interview Date, Interview Time
    masterSheet.appendRow([
      clean.name,
      clean.email,
      formatSheetValue(clean.role),
      formatSheetValue(clean.joiningDate),
      formatSheetValue(clean.status),
      formatSheetValue(clean.emailStatus),
      formatSheetValue(clean.source),
      formatSheetValue(clean.interviewDate),
      formatSheetValue(clean.interviewTime)
    ]);

    // 2. Add to Department sheet (exactly 11 columns, no Source or Resume File ID)
    const deptSheetName = ROLE_TO_SHEET_MAP[clean.role] || clean.role;
    if (deptSheetName) {
      let deptSheet = getSheetByName(sheetId, deptSheetName);
      if (!deptSheet) {
        // Create the department sheet dynamically if missing
        const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
        deptSheet = ss.insertSheet(deptSheetName);
        deptSheet.appendRow([
          "Candidate Name",
          "Email",
          "Phone Number",
          "Work Experience",
          "UG",
          "PG",
          "College",
          "Location",
          "LinkedIn",
          "GitHub",
          "Status"
        ]);
      }

      // Columns: Candidate Name, Email, Phone Number, Work Experience, UG, PG, College, Location, LinkedIn, GitHub, Status
      deptSheet.appendRow([
        clean.name,
        clean.email,
        clean.phoneNumber,
        "", // Work Experience remains blank
        clean.ug,
        clean.pg,
        clean.college,
        clean.location,
        clean.linkedin,
        clean.github,
        formatSheetValue(clean.status)
      ]);
    }

    return makeJsonResponse({ success: true, message: "Candidate created and routed to " + deptSheetName }, 200);

  } catch (error) {
    return makeJsonResponse({ success: false, message: "Failed to create candidate: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Trigger Resume Scan of designated Google Drive folder
function handleProcessResumes(sheetId) {
  try {
    const count = processIncomingResumes(sheetId);
    return makeJsonResponse({ success: true, message: "Processed " + count + " new resumes." }, 200);
  } catch (error) {
    return makeJsonResponse({ success: false, message: "Failed to process resumes: " + error.toString() }, 500);
  }
}

/// Core setup helper to get or create folders dynamically using Advanced Drive Service
function getOrCreateFolder(parentId, name) {
  var query = `title = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  var list = Drive.Files.list({ q: query, maxResults: 1 });
  if (list.items && list.items.length > 0) {
    return list.items[0].id;
  } else {
    var resource = {
      title: name,
      mimeType: "application/vnd.google-apps.folder"
    };
    if (parentId) {
      resource.parents = [{ id: parentId }];
    }
    var newFolder = Drive.Files.insert(resource);
    return newFolder.id;
  }
}

// Move file utility to archive processed resumes under Processed/[Source]/[Role]/ using Advanced Drive API
function moveProcessedResume(fileId, sourceName, roleName, hrResumesFolderId) {
  var processedFolderId = getOrCreateFolder(hrResumesFolderId, "Processed");
  var sourceProcessedFolderId = getOrCreateFolder(processedFolderId, sourceName);
  var roleProcessedFolderId = getOrCreateFolder(sourceProcessedFolderId, roleName);
  
  var file = Drive.Files.get(fileId);
  var previousParents = file.parents.map(function(p) { return p.id; }).join(",");
  
  Drive.Files.update({ title: file.title }, fileId, null, {
    addParents: roleProcessedFolderId,
    removeParents: previousParents
  });
}

function cleanUGDegree(line) {
  if (!line) return "";
  var cleaned = line
    .replace(/\b\d{4}\s*(?:-|–|to)?\s*\d{4}\b/g, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\b(?:gpa|cgpa|grade|score|marks?)\s*:\s*\d+(?:\.\d+)?\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:%|gpa|cgpa)\b/gi, "")
    .trim();
  var degreeMatch = cleaned.match(/\b(B\.?Tech|B\.?E|B\.?Sc|B\.?C|B\.?A|B\.?Com|B\.?B\.?A|Bachelor\s+of\s+[A-Za-z]+)\b/i);
  if (degreeMatch) {
    var degree = degreeMatch[1];
    var afterPart = cleaned.substring(cleaned.indexOf(degree) + degree.length).trim();
    afterPart = afterPart.replace(/^(?:in\s+|of\s+)/i, "").trim();
    var parts = afterPart.split(/[,;\-—|]|\bat\b|\bfrom\b/i);
    var major = parts[0] ? parts[0].trim() : "";
    var normalizedDegree = degree.replace(/\./g, "");
    if (normalizedDegree.toLowerCase() === "btech") normalizedDegree = "B.Tech";
    else if (normalizedDegree.toLowerCase() === "be") normalizedDegree = "B.E";
    else if (normalizedDegree.toLowerCase() === "bsc") normalizedDegree = "B.Sc";
    else if (normalizedDegree.toLowerCase() === "ba") normalizedDegree = "B.A";
    else if (normalizedDegree.toLowerCase() === "bcom") normalizedDegree = "B.Com";
    else if (normalizedDegree.toLowerCase() === "bba") normalizedDegree = "B.B.A";
    return major ? (normalizedDegree + " " + major).replace(/\s+/g, " ") : normalizedDegree;
  }
  return cleaned;
}

function cleanPGDegree(line) {
  if (!line) return "";
  var cleaned = line
    .replace(/\b\d{4}\s*(?:-|–|to)?\s*\d{4}\b/g, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\b(?:gpa|cgpa|grade|score|marks?)\s*:\s*\d+(?:\.\d+)?\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:%|gpa|cgpa)\b/gi, "")
    .trim();
  var degreeMatch = cleaned.match(/\b(M\.?Tech|M\.?E|M\.?Sc|M\.?A|M\.?Com|M\.?B\.?A|Master\s+of\s+[A-Za-z]+)\b/i);
  if (degreeMatch) {
    var degree = degreeMatch[1];
    var afterPart = cleaned.substring(cleaned.indexOf(degree) + degree.length).trim();
    afterPart = afterPart.replace(/^(?:in\s+|of\s+)/i, "").trim();
    var parts = afterPart.split(/[,;\-—|]|\bat\b|\bfrom\b/i);
    var major = parts[0] ? parts[0].trim() : "";
    var normalizedDegree = degree.replace(/\./g, "");
    if (normalizedDegree.toLowerCase() === "mtech") normalizedDegree = "M.Tech";
    else if (normalizedDegree.toLowerCase() === "me") normalizedDegree = "M.E";
    else if (normalizedDegree.toLowerCase() === "msc") normalizedDegree = "M.Sc";
    else if (normalizedDegree.toLowerCase() === "ma") normalizedDegree = "M.A";
    else if (normalizedDegree.toLowerCase() === "mcom") normalizedDegree = "M.Com";
    else if (normalizedDegree.toLowerCase() === "mba") normalizedDegree = "MBA";
    return major ? (normalizedDegree + " " + major).replace(/\s+/g, " ") : normalizedDegree;
  }
  return cleaned;
}

// Clean extracted college field, returning only the institution name
function cleanCollegeName(line) {
  if (!line) return "";
  
  // 1. Remove tabs, dates/years, grades, percentages
  var cleaned = line
    .replace(/\t/g, " ")
    .replace(/\b\d{4}\s*(?:-|–|to)?\s*\d{4}\b/g, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\b(?:gpa|cgpa|grade|score|marks?)\s*:\s*\d+(?:\.\d+)?\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:%|gpa|cgpa)\b/gi, "")
    .trim();
  
  // 2. Remove leading prep words
  cleaned = cleaned.replace(/^(?:at\s+|from\s+|in\s+)/i, "").trim();
  
  // 3. Split by separators
  var parts = cleaned.split(/[,;\-|—]|\bat\b|\bfrom\b/i);
  var collegeKeywords = /\b(university|college|institute|school|academy|vidyapeeth|iit|nit|bits|zell|institution|deemed)\b/i;
  
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (collegeKeywords.test(p)) {
      // Remove any trailing/leading degree prefixes if they are separate words at start/end
      var cleanPart = p.replace(/\b(B\.?Tech|B\.?E|B\.?Sc|B\.?A|B\.?Com|B\.?B\.?A|M\.?Tech|M\.?E|M\.?Sc|M\.?A|M\.?Com|M\.?B\.?A|Bachelor|Master|Degree)\b/gi, "").trim();
      return cleanPart.replace(/\s+/g, " ");
    }
  }
  
  // Fallback to first part
  var fallback = parts[0] ? parts[0].trim() : cleaned;
  var cleanFallback = fallback.replace(/\b(B\.?Tech|B\.?E|B\.?Sc|B\.?A|B\.?Com|B\.?B\.?A|M\.?Tech|M\.?E|M\.?Sc|M\.?A|M\.?Com|M\.?B\.?A|Bachelor|Master|Degree)\b/gi, "").trim();
  return cleanFallback.replace(/\s+/g, " ");
}

// Calculate total experience in months (strictly numeric format string e.g. "12")
function extractExperienceInMonths(text) {
  if (!text) return "0";
  
  var lines = text.split('\n');
  var totalMonths = 0;
  
  // List of month abbreviations/names
  var monthsMap = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8, sept: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  // Excluded keywords
  var exclusions = /\b(intern|internship|project|academic|student|education|college|university|school|course|training|fresher|learning|freelancer?|hobby)\b/i;

  // Job title indicator keywords
  var jobIndicators = /\b(engineer|developer|analyst|lead|manager|consultant|specialist|designer|programmer|architect|associate|writer|officer|coordinator|administrator|specialist|head|director)\b/i;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Check if line contains any exclusion keywords
    if (exclusions.test(line)) {
      continue;
    }

    // Must be clearly identifiable employment duration
    // Must contain a job indicator or be under an "Experience" section
    var dateRangeRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2})\b\s*[-–\/\s\(\)]*\s*\b(\d{4}|\d{2})\b\s*(?:-|–|to)\s*\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}|present)\b\s*[-–\/\s\(\)]*\s*\b(\d{4}|\d{2})?\b/i;
    
    var match = line.match(dateRangeRegex);
    if (match) {
      // Validate if it is a job experience line (contains job title indicators)
      var hasJobIndicator = jobIndicators.test(line);
      if (!hasJobIndicator) {
        // If no direct job indicator, check if previous line has one
        var prevHasJobIndicator = false;
        if (i > 0) {
          prevHasJobIndicator = jobIndicators.test(lines[i-1]) && !exclusions.test(lines[i-1]);
        }
        if (!prevHasJobIndicator) {
          continue; // skip if not clearly associated with a job title
        }
      }

      var startMonthStr = match[1].toLowerCase();
      var startYearStr = match[2];
      var endMonthStr = match[3].toLowerCase();
      var endYearStr = match[4];

      var startMonth = 0;
      if (monthsMap[startMonthStr] !== undefined) {
        startMonth = monthsMap[startMonthStr];
      } else {
        var num = parseInt(startMonthStr, 10);
        if (num >= 1 && num <= 12) startMonth = num - 1;
      }

      var startYear = parseInt(startYearStr, 10);
      if (startYearStr.length === 2) {
        startYear += (startYear > 50 ? 1900 : 2000);
      }

      var endMonth = 5; // default to June
      var endYear = 2026; // default to current year
      var now = new Date();
      if (endMonthStr === "present") {
        endMonth = now.getMonth();
        endYear = now.getFullYear();
      } else {
        if (monthsMap[endMonthStr] !== undefined) {
          endMonth = monthsMap[endMonthStr];
        } else {
          var num = parseInt(endMonthStr, 10);
          if (num >= 1 && num <= 12) endMonth = num - 1;
        }

        if (endYearStr) {
          endYear = parseInt(endYearStr, 10);
          if (endYearStr.length === 2) {
            endYear += (endYear > 50 ? 1900 : 2000);
          }
        } else {
          // E.g. June 2022 to 2024
          var possibleYear = parseInt(endMonthStr, 10);
          if (possibleYear >= 1900 && possibleYear <= 2100) {
            endYear = possibleYear;
            endMonth = 0;
          }
        }
      }

      var diffMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (diffMonths > 0 && diffMonths < 600) {
        totalMonths += diffMonths;
      }
    }
  }

  return totalMonths.toString();
}

// Process new resumes under nested role subfolders using Advanced Drive API
function processNewResumes(sheetId) {
  Logger.log("[SCAN] processNewResumes() started.");
  
  var hrResumesFolderId;
  var isConfiguredFolder = false;
  
  if (typeof RESUME_FOLDER_ID !== "undefined" && RESUME_FOLDER_ID && RESUME_FOLDER_ID !== "12345_PLACEHOLDER_FOLDER_ID_67890") {
    hrResumesFolderId = RESUME_FOLDER_ID;
    isConfiguredFolder = true;
    Logger.log("[SCAN] Using configured RESUME_FOLDER_ID: " + RESUME_FOLDER_ID);
  } else {
    Logger.log("[SCAN] RESUME_FOLDER_ID is set to placeholder. Resolving or creating default 'HR Resumes' folder...");
    hrResumesFolderId = getOrCreateFolder(null, "HR Resumes");
    Logger.log("[SCAN] Default 'HR Resumes' folder resolved to ID: " + hrResumesFolderId);
  }

  // Get the exact folder path/metadata if possible
  try {
    var folderMetadata = Drive.Files.get(hrResumesFolderId);
    Logger.log("[FOLDER] Root Folder ID: " + hrResumesFolderId + " | Title: " + folderMetadata.title + " | Path: /" + folderMetadata.title);
  } catch (e) {
    Logger.log("[ERROR] Failed to fetch root folder metadata: " + e.toString());
  }

  var sources = ["LinkedIn", "Other"];
  var roles = [
    "Sustainability",
    "AI Automation Engineer",
    "Web Developer",
    "Marketing",
    "Creative",
    "Others"
  ];
  var processedCount = 0;
  
  var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName("Candidates");

  sources.forEach(function(sourceName) {
    Logger.log("[SCAN] Checking source directory: " + sourceName);
    var sourceFolderId = getOrCreateFolder(hrResumesFolderId, sourceName);
    Logger.log("[FOLDER] Source Folder Name: " + sourceName + " | ID: " + sourceFolderId + " | Path: /" + (isConfiguredFolder ? "ConfiguredFolder" : "HR Resumes") + "/" + sourceName);
    
    roles.forEach(function(roleName) {
      Logger.log("[SCAN] Checking role directory: " + roleName);
      var roleFolderId = getOrCreateFolder(sourceFolderId, roleName);
      Logger.log("[FOLDER] Role Folder Name: " + roleName + " | ID: " + roleFolderId + " | Path: /" + (isConfiguredFolder ? "ConfiguredFolder" : "HR Resumes") + "/" + sourceName + "/" + roleName);
      
      // List all files in the role folder using Advanced Drive Service
      var filesResult = Drive.Files.list({
        q: `'${roleFolderId}' in parents and trashed = false`
      });
      var tempFiles = filesResult.items || [];
      
      Logger.log("[FOLDER] Discovered subfolder contents. Role folder: " + roleName + " (ID: " + roleFolderId + ") contains " + tempFiles.length + " files.");
      
      tempFiles.forEach(function(file) {
        var fileId = file.id;
        var mimeType = file.mimeType;
        var fileName = file.title;
        Logger.log("[FILE] Found File Name: " + fileName + " | ID: " + fileId + " | MIME Type: " + mimeType);
        
        var isPDF = mimeType === "application/pdf";
        var isDOCX = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
        var passesValidation = isPDF || isDOCX;
        Logger.log("[FILE] File Validation check: passesValidation = " + passesValidation + " (isPDF=" + isPDF + ", isDOCX=" + isDOCX + ")");
        
        if (!passesValidation) {
          Logger.log("[SKIPPED] File skipped: Name: " + fileName + " | ID: " + fileId + " | Reason: Unsupported file type. Only PDF/DOCX are allowed. MIME was: " + mimeType);
          return;
        }
        
        Logger.log("[SCAN] Processing resume file: " + fileName + " under " + sourceName + "/" + roleName);
        
        try {
          var extracted = null;
          if (isPDF) {
            extracted = extractTextFromPDF(fileId);
          } else if (isDOCX) {
            extracted = extractTextFromDOCX(fileId);
          }
          
          if (extracted && extracted.text) {
            var rawText = extracted.text;
            var links = extracted.links;
            Logger.log("[SCAN] Text successfully extracted from " + fileName + ". Extract character length: " + rawText.length);
            var textSnippet = rawText.substring(0, Math.min(200, rawText.length)).replace(/\n/g, " ");
            Logger.log("[SCAN] Text snippet: " + textSnippet);

            var details = parseCandidateDetails(rawText, links);
            details.resumeFileId = fileId;
            details.source = sourceName;
            details.role = roleName;
            details.status = "Submitted";
            details.emailStatus = "Pending";
            
            if (!details.name) {
              details.name = fileName.replace(/\.[^/.]+$/, "");
            }
            
            Logger.log("[SCAN] Parsed candidate details: " + JSON.stringify(details));
            
            var emailToCheck = details.email ? details.email.trim().toLowerCase() : "";
            var emailExists = false;
            
            if (emailToCheck) {
              var masterData = masterSheet.getDataRange().getValues();
              for (var i = 1; i < masterData.length; i++) {
                if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === emailToCheck) {
                  emailExists = true;
                  break;
                }
              }
            }
            
            if (emailExists) {
              Logger.log("[SKIPPED] File skipped: Name: " + fileName + " | ID: " + fileId + " | Reason: Duplicate candidate email (" + details.email + ") already exists in Candidates sheet.");
              moveProcessedResume(fileId, sourceName, roleName, hrResumesFolderId);
              Logger.log("[PROCESSED] Moved duplicate file " + fileName + " (ID: " + fileId + ") to Processed folder.");
              return;
            }
            
            if (!details.email) {
              details.email = "no-email-found-" + fileId.substring(0, 6) + "@example.com";
              Logger.log("[WARNING] No email found in resume. Using placeholder: " + details.email);
            }
            
            // Append candidate and route to sheets
            Logger.log("[SCAN] Creating candidate in sheets...");
            var createRes = handleCreateCandidate(sheetId, details);
            Logger.log("[SCAN] Sheet creation result: " + JSON.stringify(createRes));
            Logger.log("[PROCESSED] Successfully created candidate: Name: " + details.name + " | Email: " + details.email + " | Role: " + details.role);
            
            // Log file ID mapping
            logProcessedResume(sheetId, details.email, fileId);
            
            // Move file to Processed folder
            Logger.log("[SCAN] Archiving file to Processed...");
            moveProcessedResume(fileId, sourceName, roleName, hrResumesFolderId);
            Logger.log("[PROCESSED] Moved file " + fileName + " (ID: " + fileId + ") to Processed folder.");
            
            processedCount++;
          } else {
            Logger.log("[SKIPPED] File skipped: Name: " + fileName + " | ID: " + fileId + " | Reason: Extracted text is empty or conversion failed.");
          }
        } catch (err) {
          Logger.log("[ERROR] Exception processing file: " + fileName + " | ID: " + fileId + " | Error: " + err.toString());
        }
      });
    });
  });
  
  Logger.log("[SCAN] processNewResumes() complete. Total processed: " + processedCount);
  return processedCount;
}

// REST wrapper entry point mapped to the Web App interface (retains old name for backward compatibility)
function processIncomingResumes(sheetId) {
  return processNewResumes(sheetId);
}

function extractLinksFromElement(element, links) {
  var type = element.getType();
  if (type === DocumentApp.ElementType.TEXT) {
    var textObj = element.asText();
    var textStr = textObj.getText();
    var inLink = false;
    var currentLink = null;
    for (var i = 0; i < textStr.length; i++) {
      var url = textObj.getLinkUrl(i);
      if (url) {
        if (!inLink) {
          inLink = true;
          currentLink = { url: url, text: textStr[i] };
        } else {
          if (url !== currentLink.url) {
            links.push(currentLink);
            currentLink = { url: url, text: textStr[i] };
          } else {
            currentLink.text += textStr[i];
          }
        }
      } else {
        if (inLink) {
          links.push(currentLink);
          inLink = false;
          currentLink = null;
        }
      }
    }
    if (inLink && currentLink) {
      links.push(currentLink);
    }
  } else if (element.getNumChildren) {
    var numChildren = element.getNumChildren();
    for (var i = 0; i < numChildren; i++) {
      var child = element.getChild(i);
      extractLinksFromElement(child, links);
    }
  }
}

// Convert PDF to Google Doc temporarily via OCR, read text, and clean up
function extractTextFromPDF(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();

  var resource = {
    title: "TempOCR_" + fileId,
    mimeType: blob.getMimeType()
  };

  var tempFile = Drive.Files.insert(resource, blob, { ocr: true });
  var tempDoc = DocumentApp.openById(tempFile.id);
  var text = tempDoc.getBody().getText();

  var links = [];
  try {
    var numChildren = tempDoc.getBody().getNumChildren();
    for (var i = 0; i < numChildren; i++) {
      var child = tempDoc.getBody().getChild(i);
      extractLinksFromElement(child, links);
    }
  } catch (err) {
    Logger.log("Error extracting PDF links: " + err.toString());
  }

  Drive.Files.remove(tempFile.id);
  return { text: text, links: links };
}

// Convert DOCX to Google Doc temporarily, read text, and clean up
function extractTextFromDOCX(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();

  var resource = {
    title: "TempDOCX_" + fileId,
    mimeType: MimeType.GOOGLE_DOCS
  };

  // Convert Docx to Google Doc correctly to allow DocumentApp parsing
  var tempFile = Drive.Files.insert(resource, blob, { convert: true });
  var tempDoc = DocumentApp.openById(tempFile.id);
  var text = tempDoc.getBody().getText();

  var links = [];
  try {
    var numChildren = tempDoc.getBody().getNumChildren();
    for (var i = 0; i < numChildren; i++) {
      var child = tempDoc.getBody().getChild(i);
      extractLinksFromElement(child, links);
    }
  } catch (err) {
    Logger.log("Error extracting DOCX links: " + err.toString());
  }

  Drive.Files.remove(tempFile.id);
  return { text: text, links: links };
}

function extractCandidateName(lines) {
  var blacklist = /^(about me|profile|summary|objective|resume|curriculum vitae|personal details|contact information|education|experience|skills|hobbies|languages|projects|unknown candidate|work experience|references|details|email|phone)$/i;
  
  function cleanLine(l) {
    return l.replace(/[\r\n\t]/g, "").trim();
  }

  // 1. Search first 20 lines with strict capitalization heuristics
  var searchLimit = Math.min(20, lines.length);
  for (var i = 0; i < searchLimit; i++) {
    var line = cleanLine(lines[i]);
    if (!line) continue;
    
    // Check if line length is standard for a name (3 to 35 characters)
    if (line.length < 3 || line.length > 35) continue;
    
    // Must not contain numbers, emails, links, or symbols
    if (/\d/.test(line)) continue;
    if (/[@\/\\#_\+\*:]/.test(line)) continue;
    
    // Case-insensitive blacklist test on the whole line or parts of it
    var cleanLower = line.toLowerCase();
    if (blacklist.test(cleanLower)) continue;
    if (cleanLower.indexOf("resume") !== -1 || cleanLower.indexOf("cv") !== -1 || cleanLower.indexOf("page") !== -1) continue;
    
    // Standard names are capitalized or fully uppercase
    var words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) {
      var capitalizedCount = 0;
      words.forEach(function(w) {
        if (w[0] && w[0] === w[0].toUpperCase() && /[a-zA-Z]/.test(w[0])) {
          capitalizedCount++;
        }
      });
      if (capitalizedCount === words.length) {
        return line;
      }
    }
  }

  // 2. Backup looser loop (ignoring strict capitalization but applying all blacklist/character checks)
  for (var i = 0; i < searchLimit; i++) {
    var line = cleanLine(lines[i]);
    if (!line) continue;
    if (line.length >= 3 && line.length <= 40 && !/\d/.test(line) && !/[@\/\\#_\+\*:]/.test(line)) {
      var cleanLower = line.toLowerCase();
      if (blacklist.test(cleanLower)) continue;
      var words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 1 && words.length <= 4) {
        return line;
      }
    }
  }

  return "Unknown Candidate";
}

function getHeadingSection(line) {
  var clean = line.trim().replace(/[:\-\#\=\*]/g, "").trim().toLowerCase();
  if (!clean) return null;
  
  if (/^(education|educational qualification(s)?|qualification(s)?|academic(s)?|academic background|academic profile)$/i.test(clean)) {
    return "Education";
  }
  if (/^(experience|work experience|professional experience|employment history|work history|professional background|internship(s)?)$/i.test(clean)) {
    return "Experience";
  }
  if (/^(project(s)?|academic project(s)?|key project(s)?|personal project(s)?|professional project(s)?)$/i.test(clean)) {
    return "Projects";
  }
  if (/^(skill(s)?|technical skill(s)?|key skill(s)?|core competencies|expertise|tools)$/i.test(clean)) {
    return "Skills";
  }
  if (/^(summary|about me|professional summary|profile|objective|career objective|summary of qualifications)$/i.test(clean)) {
    return "Summary";
  }
  
  return null;
}

function parseSections(text) {
  var sections = {
    Header: [],
    Education: [],
    Experience: [],
    Projects: [],
    Skills: [],
    Summary: []
  };
  
  var currentSection = "Header";
  var lines = text.split('\n');
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    var detectedSection = getHeadingSection(line);
    if (detectedSection) {
      currentSection = detectedSection;
    } else {
      sections[currentSection].push(lines[i]);
    }
  }
  
  var sectionTexts = {};
  for (var key in sections) {
    sectionTexts[key] = sections[key].join('\n');
  }
  return sectionTexts;
}

function isValidPG(pgStr) {
  if (!pgStr) return true;
  if (pgStr.length > 150) return false;
  
  // Sentence separator check
  var sentences = pgStr.split(/[.;]\s+/).filter(Boolean);
  if (sentences.length > 1) return false;
  
  // Experience/Project/Resume block keywords
  var blacklist = /\b(responsibilities|worked|led|managed|implemented|experience|achievement|developed|built|designed|project|client|team|spearheaded|created|monitored)\b/i;
  if (blacklist.test(pgStr)) return false;
  
  return true;
}

function isValidUG(ugStr) {
  if (!ugStr) return true;
  if (ugStr.length > 150) return false;
  
  var blacklist = /\b(responsibilities|worked|led|managed|implemented|experience|achievement|developed|built|designed|project|client|team|spearheaded|created|monitored)\b/i;
  if (blacklist.test(ugStr)) return false;
  
  return true;
}

function extractDegreeDetails(educationText, isPG) {
  var ugRegex = /\b(b\.?tech|b\.?e|b\.?sc|b\.?c\.?a|b\.?a|b\.?com|b\.?b\.?a|bachelor)\b/i;
  var pgRegex = /\b(m\.?tech|m\.?e|m\.?sc|m\.?c\.?a|m\.?a|m\.?com|m\.?b\.?a|master|postgraduate|pg)\b/i;
  var targetRegex = isPG ? pgRegex : ugRegex;
  
  var lines = educationText.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    
    if (targetRegex.test(line)) {
      if (!isPG && pgRegex.test(line)) {
        continue;
      }
      
      var surroundingLines = [];
      if (i > 0) surroundingLines.push(lines[i-1]);
      surroundingLines.push(line);
      if (i < lines.length - 1) surroundingLines.push(lines[i+1]);
      
      // 1. Find Year/Range
      var year = "";
      var yearRangeRegex = /\b(19\d{2}|20\d{2})\s*[-–\/\s(to)]+\s*(19\d{2}|20\d{2})\b/;
      var singleYearRegex = /\b(19\d{2}|20\d{2})\b/;
      
      for (var k = 0; k < surroundingLines.length; k++) {
        var mRange = surroundingLines[k].match(yearRangeRegex);
        if (mRange) {
          year = mRange[0].replace(/\s+/g, " ");
          break;
        }
      }
      if (!year) {
        for (var k = 0; k < surroundingLines.length; k++) {
          var mSingle = surroundingLines[k].match(singleYearRegex);
          if (mSingle) {
            year = mSingle[1];
            break;
          }
        }
      }
      
      // 2. Find College
      var college = "";
      var collegeKeywords = /\b(university|college|institute|school|academy|vidyapeeth|iit|nit|bits|zell|institution|deemed)\b/i;
      
      for (var k = 0; k < surroundingLines.length; k++) {
        if (collegeKeywords.test(surroundingLines[k])) {
          college = cleanCollegeName(surroundingLines[k]);
          break;
        }
      }
      
      if (!college) {
        for (var k = 0; k < surroundingLines.length; k++) {
          var sl = surroundingLines[k];
          if (sl !== line && !/\d{4}/.test(sl)) {
            college = cleanCollegeName(sl);
            break;
          }
        }
      }
      
      if (!college) {
        college = cleanCollegeName(line);
      }
      
      // 3. Find Degree Name
      var degree = "";
      var cleanLine = line.replace(/\b\d{4}\b/g, "").replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "").trim();
      if (college && cleanLine.indexOf(college) !== -1) {
        cleanLine = cleanLine.replace(college, "");
      }
      cleanLine = cleanLine.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
      degree = cleanLine || (isPG ? "Postgraduate" : "Bachelor");
      
      if (degree.length > 80) {
        var degMatch = degree.match(isPG ? pgRegex : ugRegex);
        if (degMatch) {
          degree = degMatch[0];
        }
      }
      
      if (college && degree) {
        return {
          college: college,
          degree: degree,
          year: year
        };
      }
    }
  }
  return null;
}

function isValidLinkedInProfile(url) {
  if (!url) return false;
  var str = url.toLowerCase().trim();
  
  // Must contain linkedin.com/in/
  if (str.indexOf("linkedin.com/in/") === -1) return false;
  
  // Ignore company pages, generic pages, search pages, feed, etc.
  var ignoreKeywords = [
    "/company/", "/school/", "/jobs/", "/groups/", "/search/", 
    "/feed/", "/messaging/", "/mynetwork/"
  ];
  for (var i = 0; i < ignoreKeywords.length; i++) {
    if (str.indexOf(ignoreKeywords[i]) !== -1) return false;
  }
  
  // Ensure there is something after /in/ that is not empty
  var parts = str.split("linkedin.com/in/");
  if (parts.length >= 2) {
    var path = parts[1].replace(/^\//, "").split(/[?#]/)[0].trim();
    if (path.length > 0) return true;
  }
  
  return false;
}

function normalizeLinkedInUrl(url) {
  if (!url) return "";
  var str = url.trim();
  if (!/^https?:\/\//i.test(str)) {
    str = "https://" + str;
  }
  return str;
}

function getDegreeClassification(degreeText) {
  if (!degreeText) return null;
  var text = degreeText.toUpperCase().replace(/\./g, "").trim();
  
  // Strict matching lists
  // UG list
  var ugKeywords = ["BTECH", "BE", "BSC", "BCA", "BBA", "BA", "BCOM", "BACHELOR", "UNDERGRADUATE", "UG"];
  // PG list
  var pgKeywords = ["MTECH", "MBA", "MSC", "MCA", "PGDM", "MCOM", "ME", "MASTER", "POSTGRADUATE", "PG"];
  
  // Split by non-alphabetic characters
  var words = text.split(/[^A-Z]/).filter(Boolean);
  
  // Check PG first because it is higher level
  var hasPG = words.some(function(w) { return pgKeywords.indexOf(w) !== -1; });
  var hasUG = words.some(function(w) { return ugKeywords.indexOf(w) !== -1; });
  
  if (hasPG) return "PG";
  if (hasUG) return "UG";
  return null;
}

function cleanToOnlyDegree(str, isPG) {
  if (!str) return "";
  
  // Split by dashes, commas, or "at"/"from" to separate college
  var parts = str.split(/[-–—|]|\bat\b|\bfrom\b/i);
  
  var ugKeywords = ["btech", "b.tech", "be", "b.e", "bsc", "b.sc", "bca", "bba", "ba", "bcom", "b.com", "bachelor"];
  var pgKeywords = ["mtech", "m.tech", "mba", "msc", "m.sc", "mca", "pgdm", "mcom", "m.com", "me", "m.e", "master", "postgraduate", "pg"];
  var targetKeywords = isPG ? pgKeywords : ugKeywords;
  
  // Find a part that contains the degree keyword and does NOT contain college keywords
  var collegeKeywords = /\b(university|college|institute|school|academy|vidyapeeth|iit|nit|bits|zell|institution|deemed)\b/i;
  
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    var pLower = p.toLowerCase();
    
    // Check if this part contains any target degree keyword
    var containsDegree = false;
    for (var k = 0; k < targetKeywords.length; k++) {
      var kw = targetKeywords[k];
      // Check as a word
      var regex = new RegExp("\\b" + kw.replace(/\./g, "\\.?") + "\\b", "i");
      if (regex.test(pLower)) {
        containsDegree = true;
        break;
      }
    }
    
    if (containsDegree && !collegeKeywords.test(pLower)) {
      // Clean year values from it
      var cleaned = p.replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "").replace(/\s+/g, " ").trim();
      // Remove any leading/trailing punctuation
      cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
      if (cleaned) return cleaned;
    }
  }
  
  // Fallback: If no part matched perfectly, look inside the entire string and extract the degree phrase
  var lower = str.toLowerCase();
  for (var k = 0; k < targetKeywords.length; k++) {
    var kw = targetKeywords[k];
    var regex = new RegExp("\\b" + kw.replace(/\./g, "\\.?") + "\\b[^\\n]*", "i");
    var m = str.match(regex);
    if (m) {
      var matchStr = m[0];
      // Strip college keywords if present in the matched substring
      var parts2 = matchStr.split(collegeKeywords);
      var candidatePart = parts2[0].trim();
      var cleaned = candidatePart.replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "").trim();
      cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
      if (cleaned) return cleaned;
    }
  }
  
  return "";
}

function isInvalidLocation(str) {
  if (!str) return true;
  var val = str.toLowerCase();
  
  var rejectKeywords = [
    "college", "university", "institute", "engineering", "degree", 
    "cgpa", "school", "academy", "vidyapeeth", "iit", "nit", "bits", "zell", 
    "education", "qualification", "experience", "project", "gpa", "marks"
  ];
  for (var i = 0; i < rejectKeywords.length; i++) {
    if (val.indexOf(rejectKeywords[i]) !== -1) return true;
  }
  
  var rejectDegrees = [
    /\bb\.?e\b/i, /\bb\.?tech\b/i, /\bm\.?tech\b/i, /\bmba\b/i, 
    /\bb\.?sc\b/i, /\bm\.?sc\b/i, /\bbca\b/i, /\bmca\b/i,
    /\bpgdm\b/i, /\bbba\b/i, /\bba\b/i, /\bma\b/i, /\bb\.?com\b/i, /\bm\.?com\b/i
  ];
  for (var i = 0; i < rejectDegrees.length; i++) {
    if (rejectDegrees[i].test(val)) return true;
  }
  
  // Year values (4 consecutive digits starting with 19 or 20)
  if (/\b(19\d{2}|20\d{2})\b/.test(val)) return true;
  
  return false;
}

function isInvalidCollege(str) {
  var val = str.toLowerCase();
  
  // A college name shouldn't just be a city name
  var cities = ["bangalore", "bengaluru", "mysore", "chennai", "hyderabad", "pune", "mumbai", "delhi"];
  if (cities.indexOf(val) !== -1) return true;
  
  // A college name shouldn't just be a degree abbreviation
  var degrees = [
    "b.e", "be", "b.tech", "btech", "m.tech", "mtech", "mba", "m.sc", "msc", "b.sc", "bsc", 
    "bca", "mca", "pgdm", "bba", "ba", "ma", "b.com", "bcom", "m.com", "mcom"
  ];
  if (degrees.indexOf(val) !== -1) return true;
  
  return false;
}

function formatDegreeString(degreeInfo) {
  if (!degreeInfo) return "";
  return degreeInfo.degree || "";
}

function validateAndCleanCandidate(cand) {
  var clean = {
    name: "",
    email: "",
    phoneNumber: "",
    ug: "",
    pg: "",
    college: "",
    location: "N/A",
    linkedin: "",
    github: "",
    role: cand.role || "Sustainability",
    status: cand.status || "Submitted",
    emailStatus: cand.emailStatus || "Pending",
    source: cand.source || "Website",
    joiningDate: cand.joiningDate || "",
    interviewDate: cand.interviewDate || "",
    interviewTime: cand.interviewTime || ""
  };

  // Name validation
  var nameStr = cand.name ? cand.name.toString().trim() : "";
  var nameBlacklist = /^(about me|profile|summary|objective|resume|curriculum vitae|personal details|contact information|education|experience|skills|hobbies|languages|projects|unknown candidate|work experience|references|details|email|phone)$/i;
  if (nameStr && nameStr.length >= 2 && nameStr.length <= 50 && !nameBlacklist.test(nameStr) && !/\d/.test(nameStr)) {
    clean.name = nameStr;
  } else {
    Logger.log("[VALIDATION WARNING] Invalid candidate name: '" + nameStr + "'. Storing blank.");
  }

  // Email validation
  var emailStr = cand.email ? cand.email.toString().trim() : "";
  if (emailStr && emailStr.indexOf("@") !== -1 && emailStr.indexOf(".") !== -1) {
    clean.email = emailStr;
  } else {
    Logger.log("[VALIDATION WARNING] Invalid email: '" + emailStr + "'. Storing blank.");
  }

  // Phone validation
  var phoneStr = cand.phoneNumber ? cand.phoneNumber.toString().trim() : "";
  if (phoneStr && phoneStr.indexOf("#ERROR") === -1) {
    var digitsCount = phoneStr.replace(/\D/g, "").length;
    if (digitsCount >= 10 && digitsCount <= 15) {
      clean.phoneNumber = phoneStr;
    } else {
      Logger.log("[VALIDATION WARNING] Invalid phone digit count (" + digitsCount + ") for phone: '" + phoneStr + "'. Storing blank.");
    }
  } else {
    Logger.log("[VALIDATION WARNING] Phone contains error/formula: '" + phoneStr + "'. Storing blank.");
  }

  // PG and UG values extraction and classification
  var ugVal = cand.ug ? cand.ug.toString().trim() : "";
  var pgVal = cand.pg ? cand.pg.toString().trim() : "";

  // Strip college and year if present in ug/pg to ensure column integrity
  ugVal = cleanToOnlyDegree(ugVal, false);
  pgVal = cleanToOnlyDegree(pgVal, true);

  var ugClass = getDegreeClassification(ugVal);
  var pgClass = getDegreeClassification(pgVal);

  // Self-correcting cross-column checks
  if (pgClass === "UG") {
    if (!ugVal) {
      ugVal = pgVal;
      ugClass = "UG";
    }
    pgVal = "";
    pgClass = null;
  }
  if (ugClass === "PG") {
    if (!pgVal) {
      pgVal = ugVal;
      pgClass = "PG";
    }
    ugVal = "";
    ugClass = null;
  }

  // Final check: UG only contains UG degree info, PG only contains PG degree info
  if (ugVal && getDegreeClassification(ugVal) !== "UG") {
    Logger.log("[INTEGRITY WARNING] Rejecting invalid UG value: '" + ugVal + "'. Storing blank.");
    ugVal = "";
  }
  if (pgVal && getDegreeClassification(pgVal) !== "PG") {
    Logger.log("[INTEGRITY WARNING] Rejecting invalid PG value: '" + pgVal + "'. Storing blank.");
    pgVal = "";
  }

  clean.ug = ugVal;
  clean.pg = pgVal;

  // College validation (Only institution name)
  var collegeStr = cand.college ? cand.college.toString().trim() : "";
  if (collegeStr && collegeStr !== "N/A" && collegeStr.length >= 5 && /[a-zA-Z]/.test(collegeStr) && !isInvalidCollege(collegeStr)) {
    clean.college = collegeStr;
  } else {
    Logger.log("[VALIDATION WARNING] Invalid college name: '" + collegeStr + "'. Storing blank.");
    clean.college = "";
  }

  // Location validation (City only)
  var locStr = cand.location ? cand.location.toString().trim() : "";
  if (locStr && locStr !== "N/A" && locStr.length <= 40 && !isInvalidLocation(locStr)) {
    // If it contains a known city name, extract just the city name
    var matchedCity = "";
    var cities = ["Bangalore", "Bengaluru", "Mysore", "Chennai", "Hyderabad", "Pune", "Mumbai", "Delhi", "Kolkata", "Noida", "Gurgaon"];
    for (var c = 0; c < cities.length; c++) {
      var cityRegex = new RegExp("\\b" + cities[c] + "\\b", "i");
      if (cityRegex.test(locStr)) {
        matchedCity = cities[c];
        break;
      }
    }
    clean.location = matchedCity ? matchedCity : locStr;
  } else {
    Logger.log("[VALIDATION WARNING] Invalid location name: '" + locStr + "'. Storing N/A.");
    clean.location = "N/A";
  }

  // Other fields formatting
  clean.ug = formatSheetValue(clean.ug);
  clean.pg = formatSheetValue(clean.pg);
  clean.college = formatSheetValue(clean.college);
  clean.phoneNumber = formatSheetValue(clean.phoneNumber);
  clean.name = formatSheetValue(clean.name);
  clean.email = formatSheetValue(clean.email);
  clean.location = formatSheetValue(clean.location);
  clean.linkedin = formatSheetValue(cand.linkedin || "");
  clean.github = formatSheetValue(cand.github || "");

  return clean;
}

function extractAndNormalizePhone(text) {
  var regex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3}[-.\s]?\d{4,5}/g;
  var matches = text.match(regex);
  if (!matches) return "";
  
  for (var i = 0; i < matches.length; i++) {
    var raw = matches[i].trim();
    var digits = raw.replace(/[^\d+]/g, "");
    
    if (digits.length < 10 || digits.length > 15) continue;
    
    if (digits.startsWith("+91") && digits.length === 13) {
      return "+91 " + digits.substring(3, 8) + " " + digits.substring(8);
    }
    if (digits.startsWith("91") && digits.length === 12) {
      return "+91 " + digits.substring(2, 7) + " " + digits.substring(7);
    }
    if (digits.startsWith("0") && digits.length === 11) {
      return "+91 " + digits.substring(1, 6) + " " + digits.substring(6);
    }
    if (digits.length === 10) {
      return "+91 " + digits.substring(0, 5) + " " + digits.substring(5);
    }
    
    if (digits.startsWith("+")) {
      return digits;
    }
  }
  
  return matches[0].replace(/[()]/g, "").trim();
}

function extractGraduationYear(text, ugLine, pgLine, collegeLine) {
  var explicitMatch = text.match(/\b(?:graduation|passing|passed|class\s+of)\s*(?::|in)?\s*\b(19\d{2}|20\d{2})\b/i);
  if (explicitMatch) {
    return explicitMatch[1];
  }
  
  var yearRegex = /\b(19\d{2}|20\d{2})\b/g;
  var years = [];
  
  var searchLines = [ugLine, pgLine, collegeLine].filter(Boolean);
  searchLines.forEach(function(line) {
    var matches = line.match(yearRegex);
    if (matches) {
      matches.forEach(function(y) {
        years.push(parseInt(y, 10));
      });
    }
  });
  
  if (years.length > 0) {
    return Math.max.apply(null, years).toString();
  }
  
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].toLowerCase();
    if (line.indexOf("education") !== -1 || line.indexOf("academic") !== -1 || line.indexOf("degree") !== -1 || line.indexOf("bachelor") !== -1 || line.indexOf("master") !== -1) {
      for (var j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
        var m = lines[j].match(/\b(19\d{2}|20\d{2})\b/);
        if (m) {
          return m[1];
        }
      }
    }
  }
  return "";
}

function extractGraduationYearOrRange(text, ugLine, pgLine, collegeLine) {
  var rangeRegex = /\b(19\d{2}|20\d{2})\s*[-–\/\s(to)]+\s*(19\d{2}|20\d{2})\b/;
  
  var searchLines = [ugLine, pgLine, collegeLine].filter(Boolean);
  for (var i = 0; i < searchLines.length; i++) {
    var rangeMatch = searchLines[i].match(rangeRegex);
    if (rangeMatch) {
      return rangeMatch[0].replace(/\s+/g, " ");
    }
  }
  
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].toLowerCase();
    if (line.indexOf("education") !== -1 || line.indexOf("academic") !== -1 || line.indexOf("degree") !== -1 || line.indexOf("bachelor") !== -1 || line.indexOf("master") !== -1 || line.indexOf("passing") !== -1 || line.indexOf("graduation") !== -1) {
      for (var j = i; j <= Math.min(i + 3, lines.length - 1); j++) {
        var m = lines[j].match(rangeRegex);
        if (m) {
          return m[0].replace(/\s+/g, " ");
        }
      }
    }
  }
  
  return extractGraduationYear(text, ugLine, pgLine, collegeLine) || "";
}

function cleanLineToDegree(line, isPG) {
  var ugKeywords = ["btech", "b.tech", "be", "b.e", "bsc", "b.sc", "bca", "bba", "ba", "bcom", "b.com", "bachelor", "undergraduate", "ug"];
  var pgKeywords = ["mtech", "m.tech", "mba", "msc", "m.sc", "mca", "pgdm", "mcom", "m.com", "me", "m.e", "master", "postgraduate", "pg"];
  var targetKeywords = isPG ? pgKeywords : ugKeywords;
  
  var parts = line.split(/[-–—|]|\bat\b|\bfrom\b/i);
  var collegeKeywords = /\b(university|college|institute|school|academy|vidyapeeth|iit|nit|bits|zell|institution|deemed)\b/i;
  
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    var pLower = p.toLowerCase();
    
    var containsDegree = false;
    for (var k = 0; k < targetKeywords.length; k++) {
      var kw = targetKeywords[k];
      var regex = new RegExp("\\b" + kw.replace(/\./g, "\\.?") + "\\b", "i");
      if (regex.test(pLower)) {
        containsDegree = true;
        break;
      }
    }
    
    if (containsDegree && !collegeKeywords.test(pLower)) {
      // Clean years and GPA
      var cleaned = p.replace(/\b(19\d{2}|20\d{2})\b/g, "")
                     .replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "")
                     .replace(/\b(?:gpa|cgpa|grade|score|marks?)\s*:\s*\d+(?:\.\d+)?\b/gi, "")
                     .replace(/\b\d+(?:\.\d+)?\s*(?:%|gpa|cgpa)\b/gi, "")
                     .replace(/\s+/g, " ")
                     .trim();
      cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
      if (cleaned) return cleaned;
    }
  }
  
  // Fallback: search within the whole line but strip college
  var pLower = line.toLowerCase();
  var containsDegree = false;
  for (var k = 0; k < targetKeywords.length; k++) {
    var kw = targetKeywords[k];
    var regex = new RegExp("\\b" + kw.replace(/\./g, "\\.?") + "\\b", "i");
    if (regex.test(pLower)) {
      containsDegree = true;
      break;
    }
  }
  if (containsDegree) {
    var parts2 = line.split(collegeKeywords);
    for (var i = 0; i < parts2.length; i++) {
      var pt = parts2[i].trim();
      if (!pt) continue;
      
      var containsDegree2 = false;
      for (var k = 0; k < targetKeywords.length; k++) {
        var kw = targetKeywords[k];
        var regex = new RegExp("\\b" + kw.replace(/\./g, "\\.?") + "\\b", "i");
        if (regex.test(pt.toLowerCase())) {
          containsDegree2 = true;
          break;
        }
      }
      if (containsDegree2) {
        var cleaned = pt.replace(/\b(19\d{2}|20\d{2})\b/g, "")
                        .replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "")
                        .replace(/\b(?:gpa|cgpa|grade|score|marks?)\s*:\s*\d+(?:\.\d+)?\b/gi, "")
                        .replace(/\b\d+(?:\.\d+)?\s*(?:%|gpa|cgpa)\b/gi, "")
                        .replace(/\s+/g, " ")
                        .trim();
        cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
        if (cleaned) return cleaned;
      }
    }
  }
  return "";
}

function extractUG(text) {
  var ugRegex = /\b(b\.?tech|b\.?e|b\.?sc|b\.?c\.?a|b\.?a|b\.?com|b\.?b\.?a|bachelor|undergraduate|ug)\b/i;
  var pgRegex = /\b(m\.?tech|m\.?e|m\.?sc|m\.?c\.?a|m\.?a|m\.?com|m\.?b\.?a|master|postgraduate|pgdm|pg)\b/i;
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (ugRegex.test(line)) {
      if (pgRegex.test(line)) {
        continue;
      }
      var cleaned = cleanLineToDegree(line, false);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function extractPG(text) {
  var pgRegex = /\b(m\.?tech|m\.?e|m\.?sc|m\.?c\.?a|m\.?a|m\.?com|m\.?b\.?a|master|postgraduate|pgdm|pg)\b/i;
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (pgRegex.test(line)) {
      if (/\babout\s+me\b/i.test(line) || /\bcontact\s+me\b/i.test(line)) {
        continue;
      }
      var cleaned = cleanLineToDegree(line, true);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function extractCollege(text) {
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var collegeKeywords = /\b(university|college|institute|school|academy|vidyapeeth|iit|nit|bits|zell|institution|deemed)\b/i;
  
  var colleges = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (collegeKeywords.test(line)) {
      var cleaned = cleanCollegeName(line);
      if (cleaned && cleaned.length >= 5) {
        var year = "";
        var yearRangeRegex = /\b(19\d{2}|20\d{2})\s*[-–\/\s(to)]+\s*(19\d{2}|20\d{2})\b/;
        var singleYearRegex = /\b(19\d{2}|20\d{2})\b/;
        
        var mRange = line.match(yearRangeRegex);
        if (mRange) {
          year = mRange[0].replace(/\s+/g, " ");
        } else {
          var mSingle = line.match(singleYearRegex);
          if (mSingle) {
            year = mSingle[1];
          } else {
            if (i < lines.length - 1) {
              var nextLine = lines[i+1];
              var mRangeNext = nextLine.match(yearRangeRegex);
              if (mRangeNext) {
                year = mRangeNext[0].replace(/\s+/g, " ");
              } else {
                var mSingleNext = nextLine.match(singleYearRegex);
                if (mSingleNext) {
                  year = mSingleNext[1];
                }
              }
            }
          }
        }
        
        var collegeVal = cleaned;
        if (year) {
          collegeVal = cleaned + " (" + year + ")";
        }
        colleges.push(collegeVal);
      }
    }
  }
  
  if (colleges.length > 0) {
    return colleges[0];
  }
  
  return "";
}

function extractLocation(text) {
  var cities = [
    "Bangalore", "Bengaluru", "Mysore", "Chennai", "Hyderabad", 
    "Pune", "Mumbai", "Delhi", "Kolkata", "Noida", "Gurgaon"
  ];
  
  for (var c = 0; c < cities.length; c++) {
    var cityRegex = new RegExp("\\b" + cities[c] + "\\b", "i");
    if (cityRegex.test(text)) {
      return cities[c];
    }
  }
  
  var lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  for (var k = 0; k < lines.length; k++) {
    var ln = lines[k];
    var lnLower = ln.toLowerCase();
    if (lnLower.indexOf("location:") !== -1 || lnLower.indexOf("address:") !== -1 || lnLower.indexOf("live in") !== -1) {
      var candidateLoc = ln.replace(/location:/i, "").replace(/address:/i, "").replace(/live\s+in/i, "").trim();
      if (!isInvalidLocation(candidateLoc)) {
        return candidateLoc;
      }
    }
  }
  
  var locMatch = text.match(/location\s*:\s*([^\n]+)/i);
  if (locMatch) {
    var candidateLoc = locMatch[1].trim();
    if (!isInvalidLocation(candidateLoc)) {
      return candidateLoc;
    }
  }
  
  return "N/A";
}

function extractLinkedIn(text, links) {
  links = links || [];
  
  for (var i = 0; i < links.length; i++) {
    var url = links[i].url;
    if (isValidLinkedInProfile(url)) {
      return normalizeLinkedInUrl(url);
    }
  }
  
  var linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_\-\/\.\?\=\&]+/i;
  var linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch && isValidLinkedInProfile(linkedinMatch[0])) {
    return normalizeLinkedInUrl(linkedinMatch[0]);
  }
  
  return "";
}

function extractGitHub(text, links) {
  links = links || [];
  
  for (var i = 0; i < links.length; i++) {
    var url = links[i].url;
    if (url && url.toLowerCase().indexOf("github.com/") !== -1) {
      var str = url.trim();
      if (!/^https?:\/\//i.test(str)) {
        str = "https://" + str;
      }
      return str;
    }
  }
  
  var githubRegex = /github\.com\/[a-zA-Z0-9_-]+/i;
  var githubMatch = text.match(githubRegex);
  if (githubMatch) {
    return "https://" + githubMatch[0];
  }
  
  return "";
}

// Regular expressions and scores mapping to parse resume details
function parseCandidateDetails(text, links) {
  links = links || [];
  var details = {
    name: "",
    email: "",
    phoneNumber: "",
    location: "N/A",
    college: "",
    ug: "",
    pg: "",
    linkedin: "",
    github: "",
    role: "Sustainability" // default fallback
  };

  var lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);

  // 1. Name extraction
  details.name = extractCandidateName(lines);

  // 2. Email regex
  var emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  var emailMatch = text.match(emailRegex);
  if (emailMatch) {
    details.email = emailMatch[0].trim();
  }

  // 3. Phone extraction & normalization
  details.phoneNumber = extractAndNormalizePhone(text);

  // 4. Independent dedicated extractions
  details.ug = extractUG(text);
  details.pg = extractPG(text);
  details.college = extractCollege(text);
  details.location = extractLocation(text);
  details.linkedin = extractLinkedIn(text, links);
  details.github = extractGitHub(text, links);

  return details;
}

// Hidden log sheet name
const LOG_SHEET_NAME = "ProcessedResumesLog";

function logProcessedResume(sheetId, email, fileId) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["Email", "File ID", "Rejection Date"]);
      logSheet.hideSheet();
    }
    
    // Check if mapping already exists to prevent duplicate entries
    var data = logSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
        // If entry exists, just update File ID
        logSheet.getRange(i + 1, 2).setValue(fileId);
        return;
      }
    }
    
    logSheet.appendRow([email, fileId, ""]);
  } catch (e) {
    Logger.log("Error logging processed resume mapping: " + e.toString());
  }
}

function recordRejectionDate(sheetId, email) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) return;
    var data = logSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
        // Only set rejection date if not already set
        if (!data[i][2]) {
          logSheet.getRange(i + 1, 3).setValue(new Date());
        }
        break;
      }
    }
  } catch (e) {
    Logger.log("Error recording rejection date: " + e.toString());
  }
}

function clearRejectionDate(sheetId, email) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) return;
    var data = logSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
        logSheet.getRange(i + 1, 3).setValue("");
        break;
      }
    }
  } catch (e) {
    Logger.log("Error clearing rejection date: " + e.toString());
  }
}

function sendShortlistEmail(candidateName, candidateEmail, role) {
  const logoBlob = getLogoBlobSafely();
  const subject = "Application Shortlisted - Deepwoods Green Initiatives Pvt. Ltd.";
  
  var htmlBody = `
  <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
    <p>Dear <b>${candidateName}</b>,</p>
    <p>
      We are pleased to inform you that your application for the position of <b>${role}</b> has been shortlisted.
    </p>
    <p>
      Our HR team will reach out to you shortly to schedule the next rounds of interviews.
    </p>
    <p>
      Best regards,<br>
      <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
    </p>
    <img src="cid:deepwoodsLogo" width="300">
    <hr>
    <p style="font-size:12px;color:#666;">
      we@deepwoodsgreen.com | +91 98413 39293
    </p>
  </div>
  `;

  var options = {
    htmlBody: htmlBody
  };

  if (logoBlob) {
    options.inlineImages = {
      deepwoodsLogo: logoBlob
    };
  } else {
    htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
    options.htmlBody = htmlBody;
  }

  try {
    GmailApp.sendEmail(candidateEmail, subject, "", options);
    Logger.log("Shortlist email sent to: " + candidateEmail);
  } catch (err) {
    Logger.log("Error sending shortlist email: " + err.toString());
  }
}

function sendOnHoldEmail(candidateName, candidateEmail, role) {
  const logoBlob = getLogoBlobSafely();
  const subject = "Application Update - Deepwoods Green Initiatives Pvt. Ltd.";
  
  var htmlBody = `
  <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
    <p>Dear <b>${candidateName}</b>,</p>
    <p>
      Thank you for your patience during our recruitment process for the position of <b>${role}</b>.
    </p>
    <p>
      We wanted to let you know that your application is currently under review. We are evaluating all profiles carefully and will update you as soon as there is a decision.
    </p>
    <p>
      Best regards,<br>
      <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
    </p>
    <img src="cid:deepwoodsLogo" width="300">
    <hr>
    <p style="font-size:12px;color:#666;">
      we@deepwoodsgreen.com | +91 98413 39293
    </p>
  </div>
  `;

  var options = {
    htmlBody: htmlBody
  };

  if (logoBlob) {
    options.inlineImages = {
      deepwoodsLogo: logoBlob
    };
  } else {
    htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
    options.htmlBody = htmlBody;
  }

  try {
    GmailApp.sendEmail(candidateEmail, subject, "", options);
    Logger.log("On Hold email sent to: " + candidateEmail);
  } catch (err) {
    Logger.log("Error sending On Hold email: " + err.toString());
  }
}

function triggerTransitionSideEffects(sheetId, candidateEmail, oldStatus, newStatus) {
  Logger.log("triggerTransitionSideEffects from old=" + oldStatus + " to new=" + newStatus + " for email=" + candidateEmail);
  
  // Update rejected candidates log rejection timestamp
  if (newStatus === "Rejected") {
    recordRejectionDate(sheetId, candidateEmail);
  } else {
    clearRejectionDate(sheetId, candidateEmail);
  }

  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("Candidates");
  if (!masterSheet) return;
  const masterData = masterSheet.getDataRange().getValues();
  let masterRowIndex = -1;
  let candidateName = "";
  let role = "";
  
  for (let i = 1; i < masterData.length; i++) {
    if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
      masterRowIndex = i + 1;
      candidateName = masterData[i][0].toString().trim();
      role = masterData[i][2].toString().trim();
      break;
    }
  }

  if (masterRowIndex === -1) return;

  if (newStatus === "Shortlisted" && oldStatus === "Submitted") {
    sendShortlistEmail(candidateName, candidateEmail, role);
    masterSheet.getRange(masterRowIndex, 6).setValue("Shortlisted Email Sent");
  } else if (newStatus === "On Hold") {
    sendOnHoldEmail(candidateName, candidateEmail, role);
    masterSheet.getRange(masterRowIndex, 6).setValue("On Hold Email Sent");
  }
}

function handleSendInterviewEmail(sheetId, candidateEmail) {
  try {
    if (!candidateEmail) {
      return makeJsonResponse({ success: false, message: "candidateEmail is required" }, 400);
    }

    const masterSheet = getSheetByName(sheetId, "Candidates");
    const masterData = masterSheet.getDataRange().getValues();
    let masterRowIndex = -1;
    let candidate = null;

    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        masterRowIndex = i + 1;
        candidate = {
          rowNumber: masterRowIndex,
          candidateName: masterData[i][0].toString().trim(),
          email: masterData[i][1].toString().trim(),
          role: masterData[i][2].toString().trim(),
          interviewDate: masterData[i][7], // Column H (8th)
          interviewTime: masterData[i][8]  // Column I (9th)
        };
        break;
      }
    }

    if (!candidate || masterRowIndex === -1) {
      return makeJsonResponse({ success: false, message: "Candidate not found: " + candidateEmail }, 404);
    }

    if (!candidate.interviewDate || !candidate.interviewTime) {
      return makeJsonResponse({ success: false, message: "Please fill Interview Date and Interview Time in the Candidates sheet first." }, 400);
    }

    var formattedDate = "";
    if (candidate.interviewDate instanceof Date) {
      formattedDate = Utilities.formatDate(candidate.interviewDate, Session.getScriptTimeZone(), "dd MMM yyyy");
    } else {
      formattedDate = candidate.interviewDate.toString().trim();
    }

    var formattedTime = "";
    if (candidate.interviewTime instanceof Date) {
      formattedTime = Utilities.formatDate(candidate.interviewTime, Session.getScriptTimeZone(), "hh:mm a");
    } else {
      formattedTime = candidate.interviewTime.toString().trim();
    }

    // Send the interview invitation email
    const logoBlob = getLogoBlobSafely();
    const subject = "Interview Invitation - Deepwoods Green Initiatives Pvt. Ltd.";
    
    var htmlBody = `
    <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
      <p>Dear <b>${candidate.candidateName}</b>,</p>
      <p>
        Thank you for your application. We would like to invite you for an interview for the position of <b>${candidate.role}</b>.
      </p>
      <p><b>Interview details:</b></p>
      <ul>
        <li><b>Date:</b> ${formattedDate}</li>
        <li><b>Time:</b> ${formattedTime}</li>
      </ul>
      <p>
        Please ensure you join on time. We look forward to speaking with you.
      </p>
      <p>
        Best regards,<br>
        <b>Deepwoods Green Initiatives Pvt. Ltd.</b>
      </p>
      <img src="cid:deepwoodsLogo" width="300">
      <hr>
      <p style="font-size:12px;color:#666;">
        we@deepwoodsgreen.com | +91 98413 39293
      </p>
    </div>
    `;

    var options = { htmlBody: htmlBody };
    if (logoBlob) {
      options.inlineImages = { deepwoodsLogo: logoBlob };
    } else {
      htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
      options.htmlBody = htmlBody;
    }

    GmailApp.sendEmail(candidateEmail, subject, "", options);
    Logger.log("Interview invitation email sent successfully to: " + candidateEmail);

    // Update Email Status to "Interview Scheduled"
    masterSheet.getRange(masterRowIndex, 6).setValue("Interview Scheduled");

    // Schedule reminder trigger
    try {
      var interviewDateTime = parseInterviewDateTime(candidate.interviewDate, candidate.interviewTime);
      var offsetMs = IS_TESTING_MODE ? 60 * 1000 : 60 * 60 * 1000; // 1 min for testing, 1 hour for production
      var reminderTime = new Date(interviewDateTime.getTime() - offsetMs);
      var now = new Date();
      if (reminderTime.getTime() <= now.getTime()) {
        reminderTime = new Date(now.getTime() + 5 * 1000); // 5 sec in future if offset falls in past
      }

      var trigger = ScriptApp.newTrigger('sendInterviewReminderEmail')
        .timeBased()
        .at(reminderTime)
        .create();
      
      var triggerId = trigger.getUniqueId();
      var triggerData = {
        email: candidateEmail,
        sheetId: sheetId || ""
      };
      PropertiesService.getScriptProperties().setProperty(triggerId, JSON.stringify(triggerData));
      Logger.log("Scheduled interview reminder trigger: ID=" + triggerId + ", Time=" + reminderTime.toString());
    } catch (triggerErr) {
      Logger.log("Failed to schedule reminder trigger: " + triggerErr.toString());
    }

    return makeJsonResponse({
      success: true,
      message: "Interview invitation successfully emailed to " + candidateEmail + " and reminder scheduled."
    }, 200);

  } catch (error) {
    Logger.log("handleSendInterviewEmail failed: " + error.toString());
    return makeJsonResponse({ success: false, message: "Interview email trigger failed: " + error.toString() }, 500);
  }
}

function parseInterviewDateTime(dateVal, timeVal) {
  var dateObj;
  if (dateVal instanceof Date) {
    dateObj = new Date(dateVal.getTime());
  } else {
    var dateStr = dateVal.toString().trim();
    var parts = dateStr.split("-");
    if (parts.length === 3) {
      var year = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1; // 0-based
      var day = parseInt(parts[2], 10);
      dateObj = new Date();
      dateObj.setFullYear(year, month, day);
    } else {
      dateObj = new Date(dateStr);
    }
  }
  
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid Interview Date format.");
  }
  
  var timeStr = "";
  if (timeVal instanceof Date) {
    timeStr = Utilities.formatDate(timeVal, Session.getScriptTimeZone(), "HH:mm");
  } else {
    timeStr = timeVal.toString().trim();
  }
  
  var hours = 0;
  var minutes = 0;
  var timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    var ampm = timeMatch[3];
    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
  } else {
    var parts = timeStr.split(":");
    if (parts.length >= 2) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
  }
  
  dateObj.setHours(hours);
  dateObj.setMinutes(minutes);
  dateObj.setSeconds(0);
  dateObj.setMilliseconds(0);
  
  return dateObj;
}

function deleteTriggerById(triggerId) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(triggers[i]);
      break;
    }
  }
}

function sendInterviewReminderEmail(e) {
  var triggerId = e.triggerUid;
  var triggerDataStr = PropertiesService.getScriptProperties().getProperty(triggerId);
  Logger.log("sendInterviewReminderEmail fired for trigger ID: " + triggerId + ", triggerDataStr: " + triggerDataStr);
  
  if (!triggerDataStr) {
    Logger.log("No trigger data mapped for trigger ID: " + triggerId);
    return;
  }

  try {
    var triggerData = JSON.parse(triggerDataStr);
    var candidateEmail = triggerData.email;
    var sheetId = triggerData.sheetId;

    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Candidates");
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let candidateName = "";
    var role = "";
    var dateVal = "";
    var timeVal = "";

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        rowIndex = i + 1;
        candidateName = data[i][0].toString().trim();
        role = data[i][2].toString().trim();
        dateVal = data[i][7]; // Interview Date
        timeVal = data[i][8]; // Interview Time
        break;
      }
    }

    if (rowIndex !== -1) {
      var formattedDate = "";
      if (dateVal instanceof Date) {
        formattedDate = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "dd MMM yyyy");
      } else {
        formattedDate = dateVal.toString().trim();
      }

      var formattedTime = "";
      if (timeVal instanceof Date) {
        formattedTime = Utilities.formatDate(timeVal, Session.getScriptTimeZone(), "hh:mm a");
      } else {
        formattedTime = timeVal.toString().trim();
      }

      const logoBlob = getLogoBlobSafely();
      const subject = "Interview Reminder - Deepwoods Green Initiatives Pvt. Ltd.";
      
      var htmlBody = `
      <div style="font-family:'Trebuchet MS',sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:680px;">
        <p>Dear <b>${candidateName}</b>,</p>
        <p>This is a friendly reminder of your upcoming interview for the position of <b>${role}</b>.</p>
        <p><b>Interview Details:</b></p>
        <ul>
          <li><b>Date:</b> ${formattedDate}</li>
          <li><b>Time:</b> ${formattedTime}</li>
        </ul>
        <p>Please ensure you are ready and have a stable internet connection.</p>
        <p>Best regards,<br><b>Deepwoods Green Initiatives Pvt. Ltd.</b></p>
        <img src="cid:deepwoodsLogo" width="300">
      </div>
      `;

      var options = { htmlBody: htmlBody };
      if (logoBlob) {
        options.inlineImages = { deepwoodsLogo: logoBlob };
      } else {
        htmlBody = htmlBody.replace(/<img[^>]+deepwoodsLogo[^>]*>/gi, "");
        options.htmlBody = htmlBody;
      }

      GmailApp.sendEmail(candidateEmail, subject, "", options);
      Logger.log("Reminder email sent successfully to: " + candidateEmail);

      // Update Candidates sheet Email Status (column F / 6)
      sheet.getRange(rowIndex, 6).setValue("Reminder Sent");
    }
  } catch (error) {
    Logger.log("Error in sendInterviewReminderEmail: " + error.toString());
  } finally {
    PropertiesService.getScriptProperties().deleteProperty(triggerId);
    deleteTriggerById(triggerId);
  }
}

// Overridden Daily/Periodic cleanup trigger: deletes resume files of REJECTED candidates older than 30 days
function cleanupOldResumes(sheetId) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      Logger.log("[CLEANUP] log sheet ProcessedResumesLog not found.");
      return;
    }
    
    var data = logSheet.getDataRange().getValues();
    var now = new Date();
    var ageLimitMs = 30 * 24 * 60 * 60 * 1000; // 30 days limit
    var deletedCount = 0;
    
    for (var i = 1; i < data.length; i++) {
      var email = data[i][0];
      var fileId = data[i][1];
      var rejectionDateVal = data[i][2];
      
      if (fileId && rejectionDateVal && rejectionDateVal !== "Deleted") {
        var rejectionDate = new Date(rejectionDateVal);
        if (!isNaN(rejectionDate.getTime())) {
          if (now.getTime() - rejectionDate.getTime() >= ageLimitMs) {
            Logger.log("[CLEANUP] Deleting resume file ID=" + fileId + " for rejected email=" + email);
            try {
              Drive.Files.remove(fileId);
              deletedCount++;
              Logger.log("[CLEANUP] File deleted successfully.");
            } catch (err) {
              Logger.log("[CLEANUP] Error calling Drive.Files.remove: " + err.toString());
            }
            logSheet.getRange(i + 1, 2).setValue("");
            logSheet.getRange(i + 1, 3).setValue("Deleted");
          }
        }
      }
    }
    Logger.log("[CLEANUP] Rejected candidates resume files deleted: " + deletedCount);
  } catch (e) {
    Logger.log("[CLEANUP ERROR] cleanupOldResumes failed: " + e.toString());
  }
}

/**
 * One-time data migration function.
 * Select this function in the Apps Script editor toolbar and click "Run".
 * After running, this function can be safely deleted or ignored.
 */
function findCandidateInDeptSheet(deptSheet, email) {
  var data = deptSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
      return {
        rowIndex: i + 1,
        rowValues: data[i]
      };
    }
  }
  return null;
}

/**
 * One-time data migration function.
 * Select this function in the Apps Script editor toolbar and click "Run".
 * After running, this function can be safely deleted or ignored.
 */
function runExistingDataRepair() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // ignore
  }
  if (!ss) {
    const sheetId = "1KmEOk4qn0gF8pAbBUNCcrXuw2U4P3x18eVLAUxe1vtM";
    ss = SpreadsheetApp.openById(sheetId);
  }

  // 1. Repair Candidates Sheet Columns structure
  const masterSheet = ss.getSheetByName("Candidates");
  if (!masterSheet) {
    Logger.log("Candidates master sheet not found!");
    return;
  }
  
  var lastCol = masterSheet.getLastColumn();
  if (lastCol > 9) {
    masterSheet.getRange(1, 10, masterSheet.getLastRow(), lastCol - 9).clearContent();
  }
  
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  
  var nameIdx = masterHeaders.indexOf("Candidate Name");
  var emailIdx = masterHeaders.indexOf("Email Address");
  var roleIdx = masterHeaders.indexOf("Role Applied For");
  var joiningIdx = masterHeaders.indexOf("Joining Date");
  var statusIdx = masterHeaders.indexOf("Status");
  var emailStatusIdx = masterHeaders.indexOf("Email Status");
  var sourceIdx = masterHeaders.indexOf("Source");
  var intDateIdx = masterHeaders.indexOf("Interview Date");
  var intTimeIdx = masterHeaders.indexOf("Interview Time");
  
  if (nameIdx === -1) nameIdx = 0;
  if (emailIdx === -1) emailIdx = 1;
  if (roleIdx === -1) roleIdx = 2;
  if (joiningIdx === -1) joiningIdx = 3;
  if (statusIdx === -1) statusIdx = 4;
  if (emailStatusIdx === -1) emailStatusIdx = 5;
  if (sourceIdx === -1) sourceIdx = 6;
  if (intDateIdx === -1) intDateIdx = 7;
  if (intTimeIdx === -1) intTimeIdx = 8;

  // Build the email to fileId mapping from ProcessedResumesLog
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  var emailToFileId = {};
  if (logSheet) {
    var logData = logSheet.getDataRange().getValues();
    for (var i = 1; i < logData.length; i++) {
      var emailVal = logData[i][0] ? logData[i][0].toString().trim().toLowerCase() : "";
      var fileIdVal = logData[i][1] ? logData[i][1].toString().trim() : "";
      if (emailVal && fileIdVal) {
        emailToFileId[emailVal] = fileIdVal;
      }
    }
  }

  // Loop through all master Candidates sheet rows and repair them
  for (var i = 1; i < masterData.length; i++) {
    var row = masterData[i];
    var cName = row[nameIdx] ? row[nameIdx].toString().trim() : "";
    var email = row[emailIdx] ? row[emailIdx].toString().trim() : "";
    var role = row[roleIdx] ? row[roleIdx].toString().trim() : "Sustainability";
    var joiningDate = row[joiningIdx];
    var status = row[statusIdx] ? row[statusIdx].toString().trim() : "Submitted";
    var emailStatus = row[emailStatusIdx] ? row[emailStatusIdx].toString().trim() : "Pending";
    var source = row[sourceIdx] ? row[sourceIdx].toString().trim() : "Website";
    var interviewDate = row[intDateIdx];
    var interviewTime = row[intTimeIdx];

    if (!email) continue;

    var deptSheetName = ROLE_TO_SHEET_MAP[role] || role;
    var deptSheet = ss.getSheetByName(deptSheetName);
    
    // Ensure department sheet columns are cleaned of extra columns and formatted
    if (deptSheet) {
      var dLastCol = deptSheet.getLastColumn();
      if (dLastCol > 11) {
        deptSheet.getRange(1, 12, deptSheet.getLastRow(), dLastCol - 11).clearContent();
      }
    } else if (deptSheetName) {
      deptSheet = ss.insertSheet(deptSheetName);
      deptSheet.appendRow([
        "Candidate Name",
        "Email",
        "Phone Number",
        "Work Experience",
        "UG",
        "PG",
        "College",
        "Location",
        "LinkedIn",
        "GitHub",
        "Status"
      ]);
    }

    var deptRowInfo = findCandidateInDeptSheet(deptSheet, email);

    var fileId = emailToFileId[email.toLowerCase()];
    var parsedDetails = null;

    if (fileId) {
      try {
        var file = DriveApp.getFileById(fileId);
        var mimeType = file.getMimeType();
        var isPDF = mimeType === "application/pdf";
        var isDOCX = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        var extracted = null;
        if (isPDF) {
          extracted = extractTextFromPDF(fileId);
        } else if (isDOCX) {
          extracted = extractTextFromDOCX(fileId);
        }
        if (extracted && extracted.text) {
          parsedDetails = parseCandidateDetails(extracted.text, extracted.links);
          Logger.log("Re-parsed resume successfully for email: " + email + ", name: " + parsedDetails.name);
        }
      } catch (err) {
        Logger.log("Could not re-parse resume for email: " + email + " (fileId: " + fileId + "): " + err.toString());
      }
    }

    // Build candidate object for validation
    var candObj = {
      name: (parsedDetails && parsedDetails.name) ? parsedDetails.name : cName,
      email: email,
      phoneNumber: (parsedDetails && parsedDetails.phoneNumber) ? parsedDetails.phoneNumber : (deptRowInfo ? deptRowInfo.rowValues[2] : ""),
      ug: (parsedDetails && parsedDetails.ug) ? parsedDetails.ug : (deptRowInfo ? deptRowInfo.rowValues[4] : ""),
      pg: (parsedDetails && parsedDetails.pg) ? parsedDetails.pg : (deptRowInfo ? deptRowInfo.rowValues[5] : ""),
      college: (parsedDetails && parsedDetails.college) ? parsedDetails.college : (deptRowInfo ? deptRowInfo.rowValues[6] : ""),
      location: (parsedDetails && parsedDetails.location) ? parsedDetails.location : (deptRowInfo ? deptRowInfo.rowValues[7] : "N/A"),
      linkedin: (parsedDetails && parsedDetails.linkedin) ? parsedDetails.linkedin : (deptRowInfo ? deptRowInfo.rowValues[8] : ""),
      github: (parsedDetails && parsedDetails.github) ? parsedDetails.github : (deptRowInfo ? deptRowInfo.rowValues[9] : ""),
      role: role,
      status: status,
      emailStatus: emailStatus,
      source: source,
      joiningDate: joiningDate,
      interviewDate: interviewDate,
      interviewTime: interviewTime
    };

    var clean = validateAndCleanCandidate(candObj);

    // Update Candidates Master sheet row
    masterSheet.getRange(i + 1, nameIdx + 1).setValue(clean.name);
    masterSheet.getRange(i + 1, emailIdx + 1).setValue(clean.email);
    masterSheet.getRange(i + 1, roleIdx + 1).setValue(formatSheetValue(clean.role));
    masterSheet.getRange(i + 1, joiningIdx + 1).setValue(formatSheetValue(clean.joiningDate));
    masterSheet.getRange(i + 1, statusIdx + 1).setValue(formatSheetValue(clean.status));
    masterSheet.getRange(i + 1, emailStatusIdx + 1).setValue(formatSheetValue(clean.emailStatus));
    masterSheet.getRange(i + 1, sourceIdx + 1).setValue(formatSheetValue(clean.source));
    masterSheet.getRange(i + 1, intDateIdx + 1).setValue(formatSheetValue(clean.interviewDate));
    masterSheet.getRange(i + 1, intTimeIdx + 1).setValue(formatSheetValue(clean.interviewTime));

    // Update Department sheet row
    if (deptSheet) {
      var deptRowIndex = deptRowInfo ? deptRowInfo.rowIndex : -1;
      if (deptRowIndex === -1) {
        deptSheet.appendRow([
          clean.name,
          clean.email,
          clean.phoneNumber,
          "", // Work Experience
          clean.ug,
          clean.pg,
          clean.college,
          clean.location,
          clean.linkedin,
          clean.github,
          formatSheetValue(clean.status)
        ]);
      } else {
        deptSheet.getRange(deptRowIndex, 1).setValue(clean.name);
        deptSheet.getRange(deptRowIndex, 2).setValue(clean.email);
        deptSheet.getRange(deptRowIndex, 3).setValue(clean.phoneNumber);
        deptSheet.getRange(deptRowIndex, 4).setValue("");
        deptSheet.getRange(deptRowIndex, 5).setValue(clean.ug);
        deptSheet.getRange(deptRowIndex, 6).setValue(clean.pg);
        deptSheet.getRange(deptRowIndex, 7).setValue(clean.college);
        deptSheet.getRange(deptRowIndex, 8).setValue(clean.location);
        deptSheet.getRange(deptRowIndex, 9).setValue(clean.linkedin);
        deptSheet.getRange(deptRowIndex, 10).setValue(clean.github);
        deptSheet.getRange(deptRowIndex, 11).setValue(formatSheetValue(clean.status));
      }
    }
  }

  Logger.log("Data repair completed successfully.");
}

function verifyExtractionAccuracy() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // ignore
  }
  if (!ss) {
    const sheetId = "1KmEOk4qn0gF8pAbBUNCcrXuw2U4P3x18eVLAUxe1vtM";
    ss = SpreadsheetApp.openById(sheetId);
  }
  
  const masterSheet = ss.getSheetByName("Candidates");
  if (!masterSheet) {
    Logger.log("Candidates sheet not found!");
    return;
  }
  
  const masterData = masterSheet.getDataRange().getValues();
  if (masterData.length <= 1) {
    Logger.log("No candidates to verify.");
    return;
  }
  
  var total = masterData.length - 1;
  var validNames = 0;
  var validPhones = 0;
  var validEducations = 0;
  
  var nameBlacklist = /^(about me|profile|summary|objective|resume|curriculum vitae|personal details|contact information|education|experience|skills|hobbies|languages|projects|unknown candidate|work experience|references|details|email|phone)$/i;
  
  // Read all department sheets to get Phone/College/UG/PG info for each candidate
  var candidateDetailsMap = {};
  const sheets = ss.getSheets();
  for (let k = 0; k < sheets.length; k++) {
    const sheet = sheets[k];
    const name = sheet.getName();
    if (name !== "Candidates" && name !== "ProcessedResumes" && name !== "ProcessedResumesLog") {
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;
      
      var headers = data[0];
      var emailIdx = headers.indexOf("Email");
      var phoneIdx = headers.indexOf("Phone Number");
      var ugIdx = headers.indexOf("UG");
      var pgIdx = headers.indexOf("PG");
      var collegeIdx = headers.indexOf("College");
      
      for (var j = 1; j < data.length; j++) {
        var email = data[j][emailIdx] ? data[j][emailIdx].toString().trim().toLowerCase() : "";
        if (email) {
          candidateDetailsMap[email] = {
            phoneNumber: data[j][phoneIdx] ? data[j][phoneIdx].toString().trim() : "",
            ug: data[j][ugIdx] ? data[j][ugIdx].toString().trim() : "",
            pg: data[j][pgIdx] ? data[j][pgIdx].toString().trim() : "",
            college: data[j][collegeIdx] ? data[j][collegeIdx].toString().trim() : ""
          };
        }
      }
    }
  }
  
  for (var i = 1; i < masterData.length; i++) {
    var cName = masterData[i][0] ? masterData[i][0].toString().trim() : "";
    var email = masterData[i][1] ? masterData[i][1].toString().trim().toLowerCase() : "";
    
    // 1. Name Check
    var nameIsValid = cName && cName.length >= 2 && cName.length <= 50 && !nameBlacklist.test(cName) && !/\d/.test(cName);
    if (nameIsValid) {
      validNames++;
    }
    
    var details = candidateDetailsMap[email] || { phoneNumber: "", ug: "", pg: "", college: "" };
    
    // 2. Phone Check
    var phoneStr = details.phoneNumber;
    var phoneIsValid = false;
    if (phoneStr && phoneStr.indexOf("#ERROR") === -1) {
      var digitsCount = phoneStr.replace(/\D/g, "").length;
      if (digitsCount >= 10 && digitsCount <= 15) {
        phoneIsValid = true;
      }
    }
    if (phoneIsValid) {
      validPhones++;
    }
    
    // 3. Education Check (College + UG + PG validations)
    var collegeStr = details.college;
    var collegeIsValid = collegeStr && collegeStr.length >= 5 && /[a-zA-Z]/.test(collegeStr);
    
    var ugStr = details.ug;
    var ugIsValid = !ugStr || isValidUG(ugStr);
    
    var pgStr = details.pg;
    var pgIsValid = !pgStr || isValidPG(pgStr);
    
    if (collegeIsValid && ugIsValid && pgIsValid) {
      validEducations++;
    }
  }
  
  var nameAcc = (validNames / total) * 100;
  var phoneAcc = (validPhones / total) * 100;
  var eduAcc = (validEducations / total) * 100;
  
  Logger.log("======================================");
  Logger.log("ATS EXTRACTION ACCURACY REPORT:");
  Logger.log("Total Candidates Verified: " + total);
  Logger.log("Name Accuracy: " + nameAcc.toFixed(2) + "% (Target: >95%)");
  Logger.log("Phone Accuracy: " + phoneAcc.toFixed(2) + "% (Target: >95%)");
  Logger.log("Education Accuracy: " + eduAcc.toFixed(2) + "% (Target: >90%)");
  Logger.log("======================================");
  
  return {
    total: total,
    nameAccuracy: nameAcc,
    phoneAccuracy: phoneAcc,
    educationAccuracy: eduAcc
  };
}

function runDataMigration() {
  runExistingDataRepair();
}
