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

// Google Drive folder ID where resumes are uploaded
const RESUME_FOLDER_ID = "12345_PLACEHOLDER_FOLDER_ID_67890";

// Configure Department Sheet Mapping
const ROLE_TO_SHEET_MAP = {
  "Sustainability": "Sustainability",
  "AI Automation Engineer": "AI Automation Engineer",
  "Web Developer": "Web Developer"
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

function generateJoiningLetter(candidate) {
  Logger.log('Apps Script generating PDF for candidate: ' + JSON.stringify(candidate));
  const templateFile = DriveApp.getFileById(TEMPLATE_ID);
  const copy = templateFile.makeCopy(`JoiningLetter_${candidate.candidateName}`);
  const copyId = copy.getId();
  const doc = DocumentApp.openById(copyId);
  const body = doc.getBody();

  const formattedJoiningDate = Utilities.formatDate(
    new Date(candidate.joiningDate),
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

  const pdfFile = DriveApp.getFileById(copyId).getAs(MimeType.PDF);
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
  const logoBlob = DriveApp.getFileById(LOGO_FILE_ID).getBlob();
  const subject = "Offer of Joining - Deepwoods Green Initiatives Pvt. Ltd.";

  const formattedJoiningDate = Utilities.formatDate(
    new Date(candidate.joiningDate),
    Session.getScriptTimeZone(),
    "dd MMM yyyy"
  );

  const htmlBody = `
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

  Logger.log("About to send email to: " + candidate.email);
  try {
    GmailApp.sendEmail(
      candidate.email,
      subject,
      "",
      {
        htmlBody: htmlBody,
        attachments: [pdfFile],
        inlineImages: {
          deepwoodsLogo: logoBlob
        }
      }
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

      DriveApp.getFileById(result.copyId).setTrashed(true);
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

      candidate.status = row[4] ? row[4].toString().trim() : "Interviewing";
      candidate.emailStatus = row[5] ? row[5].toString().trim() : "Pending";
      candidate.source = row[6] ? row[6].toString().trim() : "Other";
      candidate.resumeFileId = row[7] ? row[7].toString().trim() : "";

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

    // Update Email Status in column F (index 5 / Column 6) to "Sent"
    sheet.getRange(candidate.rowNumber, 6).setValue("Sent");

    // Clean up temporary doc
    DriveApp.getFileById(result.copyId).setTrashed(true);

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
    const logoBlob = DriveApp.getFileById(LOGO_FILE_ID).getBlob();

    const subject = "Application Update \u2013 Deepwoods Green Initiatives Pvt. Ltd.";

    const htmlBody = `
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

    Logger.log("About to send email to: " + candidate.email);
    try {
      GmailApp.sendEmail(
        candidate.email,
        subject,
        "",
        {
          htmlBody: htmlBody,
          inlineImages: { deepwoodsLogo: logoBlob }
        }
      );
    } catch (err) {
      Logger.log("GMAIL ERROR: " + err.toString());
      throw err;
    }

    Logger.log('Apps Script rejection email sent successfully to: ' + candidateEmail);

    // Update Email Status column F to "Sent"
    sheet.getRange(candidate.rowNumber, 6).setValue("Sent");

    Logger.log('Apps Script updated Email Status to Sent for: ' + candidateEmail);

    return makeJsonResponse({
      success: true,
      message: "Rejection email successfully sent to " + candidateEmail + " and spreadsheet status updated."
    }, 200);

  } catch (error) {
    Logger.log('Apps Script handleSendRejectionEmail FAILED: ' + error.toString());
    return makeJsonResponse({ success: false, message: "Rejection email failed: " + error.toString() }, 500);
  }
}

// REST Endpoint Helper: Update candidate status (column E in Candidates, column K in Department) by email
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

    var allowedStatuses = ['Selected', 'Interviewing', 'On Hold', 'Rejected'];
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

    // Update status cell in master Candidates sheet (Column E)
    var statusCell = masterSheet.getRange(masterRowIndex, 5);
    Logger.log('=== BEFORE UPDATE ===');
    Logger.log('Candidate Name: ' + (masterData[masterRowIndex-1][0]));
    Logger.log('Row Number: ' + masterRowIndex);
    Logger.log('Cell A1: ' + statusCell.getA1Notation());
    Logger.log('Validation before: ' + (statusCell.getDataValidation() ? statusCell.getDataValidation().getCriteriaType().toString() : 'None'));
    
    statusCell.setValue(newStatus);
    
    Logger.log('=== AFTER UPDATE ===');
    Logger.log('Validation after: ' + (statusCell.getDataValidation() ? statusCell.getDataValidation().getCriteriaType().toString() : 'None'));
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
          Logger.log('=== BEFORE DEPT UPDATE ===');
          Logger.log('Cell A1: ' + deptStatusCell.getA1Notation());
          Logger.log('Validation before: ' + (deptStatusCell.getDataValidation() ? deptStatusCell.getDataValidation().getCriteriaType().toString() : 'None'));
          
          deptStatusCell.setValue(newStatus);
          
          Logger.log('=== AFTER DEPT UPDATE ===');
          Logger.log('Validation after: ' + (deptStatusCell.getDataValidation() ? deptStatusCell.getDataValidation().getCriteriaType().toString() : 'None'));
          Logger.log('SUCCESS: Updated department sheet status at row ' + deptRowIndex + ' in ' + deptSheetName);
        } else {
          Logger.log('WARN: Candidate not found in department sheet ' + deptSheetName);
        }
      }
    }

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
      // Return empty array if sheet does not exist yet (handles dynamic addition gracefully)
      return makeJsonResponse({ success: true, data: [] }, 200);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return makeJsonResponse({ success: true, data: [] }, 200);
    }

    const data = sheet.getDataRange().getValues();
    const candidates = [];

    // Columns: Candidate Name, Email, Phone Number, Work Experience, UG, PG, College, Location, LinkedIn, GitHub, Status, Source, Resume File ID
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const candidate = {};

      candidate.candidateName = row[0] ? row[0].toString().trim() : "";
      candidate.email = row[1] ? row[1].toString().trim() : "";
      candidate.phoneNumber = row[2] ? row[2].toString().trim() : "";
      candidate.workExperience = row[3] ? row[3].toString().trim() : "";
      candidate.ug = row[4] ? row[4].toString().trim() : "";
      candidate.pg = row[5] ? row[5].toString().trim() : "";
      candidate.college = row[6] ? row[6].toString().trim() : "";
      candidate.location = row[7] ? row[7].toString().trim() : "";
      candidate.linkedin = row[8] ? row[8].toString().trim() : "";
      candidate.github = row[9] ? row[9].toString().trim() : "";
      candidate.status = row[10] ? row[10].toString().trim() : "Interviewing";
      candidate.source = row[11] ? row[11].toString().trim() : "Website";
      candidate.resumeFileId = row[12] ? row[12].toString().trim() : "";

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

    const masterSheet = getSheetByName(sheetId, "Candidates");
    const masterData = masterSheet.getDataRange().getValues();
    let candidateExists = false;

    // Check if candidate already exists in Candidates master sheet
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][1] && masterData[i][1].toString().trim().toLowerCase() === candidate.email.trim().toLowerCase()) {
        candidateExists = true;
        break;
      }
    }

    if (candidateExists) {
      return makeJsonResponse({ success: false, message: "Candidate with email " + candidate.email + " already exists" }, 400);
    }

    // Pipeline statuses
    var allowedStatuses = ['Selected', 'Interviewing', 'On Hold', 'Rejected'];

    // 1. Add to Candidates master sheet
    // Columns: Candidate Name, Email Address, Role Applied For, Joining Date, Status, Email Status, Source, Resume File ID
    masterSheet.appendRow([
      candidate.name,
      candidate.email,
      candidate.role || "",
      candidate.joiningDate || "",
      candidate.status || "Interviewing",
      candidate.emailStatus || "Pending",
      candidate.source || "Website",
      candidate.resumeFileId || ""
    ]);

    // No per-row data validation added to maintain Google Sheets column-wide validation formatting

    // 2. Add to Department sheet
    const deptSheetName = ROLE_TO_SHEET_MAP[candidate.role] || candidate.role;
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
          "Status",
          "Source",
          "Resume File ID"
        ]);
      }

      // Columns: Candidate Name, Email, Phone Number, Work Experience, UG, PG, College, Location, LinkedIn, GitHub, Status, Source, Resume File ID
      deptSheet.appendRow([
        candidate.name,
        candidate.email,
        candidate.phoneNumber || "",
        candidate.workExperience || "",
        candidate.ug || "",
        candidate.pg || "",
        candidate.college || "",
        candidate.location || "",
        candidate.linkedin || "",
        candidate.github || "",
        candidate.status || "Interviewing",
        candidate.source || "Website",
        candidate.resumeFileId || ""
      ]);

      // No per-row data validation added to maintain Google Sheets column-wide validation formatting
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

/// Core setup helper to get or create folders dynamically
function getOrCreateFolder(parent, name) {
  var folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }
}

// Move file utility to archive processed resumes under Processed/[Source]/[Role]/
function moveProcessedResume(file, sourceName, roleName, hrResumesFolder) {
  var processedFolder = getOrCreateFolder(hrResumesFolder, "Processed");
  var sourceProcessedFolder = getOrCreateFolder(processedFolder, sourceName);
  var roleProcessedFolder = getOrCreateFolder(sourceProcessedFolder, roleName);
  
  try {
    file.moveTo(roleProcessedFolder);
  } catch (e) {
    // Fallback for older execution environments
    roleProcessedFolder.addFile(file);
    var parents = file.getParents();
    while (parents.hasNext()) {
      parents.next().removeFile(file);
    }
  }
}

// Process new resumes under nested role subfolders
function processNewResumes(sheetId) {
  var hrResumesFolder;
  
  // Drive Audit logging
  try {
    var folderSearch = DriveApp.getFoldersByName("HR Resumes");
    var folderIndex = 1;
    while (folderSearch.hasNext()) {
      var f = folderSearch.next();
      var parentNames = [];
      var parents = f.getParents();
      while (parents.hasNext()) {
        parentNames.push(parents.next().getName());
      }
      Logger.log("[DRIVE AUDIT] Found folder named 'HR Resumes' #" + folderIndex + " - ID: " + f.getId() + " - Parent(s): " + parentNames.join(", "));
      folderIndex++;
    }
  } catch (err) {
    Logger.log("[DRIVE AUDIT] Error listing folders named 'HR Resumes': " + err.toString());
  }

  if (typeof RESUME_FOLDER_ID !== "undefined" && RESUME_FOLDER_ID && RESUME_FOLDER_ID !== "12345_PLACEHOLDER_FOLDER_ID_67890") {
    try {
      hrResumesFolder = DriveApp.getFolderById(RESUME_FOLDER_ID);
      Logger.log("[DRIVE AUDIT] Using RESUME_FOLDER_ID: " + RESUME_FOLDER_ID);
    } catch (e) {
      Logger.log("Configured RESUME_FOLDER_ID is invalid or inaccessible: " + e.toString() + ". Searching by name.");
    }
  }
  
  if (!hrResumesFolder) {
    hrResumesFolder = getOrCreateFolder(null, "HR Resumes");
    Logger.log("[DRIVE AUDIT] Resolved/Created 'HR Resumes' folder - ID: " + hrResumesFolder.getId());
  }

  var sources = ["LinkedIn", "Other"];
  var roles = ["AI Automation Engineer", "Web Developer", "Sustainability"];
  var processedCount = 0;
  
  var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName("Candidates");

  sources.forEach(function(sourceName) {
    var sourceFolder = getOrCreateFolder(hrResumesFolder, sourceName);
    Logger.log("[DRIVE AUDIT] Source folder: " + sourceName + " - ID: " + sourceFolder.getId());
    
    roles.forEach(function(roleName) {
      var roleFolder = getOrCreateFolder(sourceFolder, roleName);
      var files = roleFolder.getFiles();
      
      var tempFiles = [];
      while (files.hasNext()) {
        tempFiles.push(files.next());
      }
      
      Logger.log("[DRIVE AUDIT] Role folder: " + roleName + " - ID: " + roleFolder.getId() + " - Files Found: " + tempFiles.length);
      
      tempFiles.forEach(function(file) {
        var fileId = file.getId();
        var mimeType = file.getMimeType();
        var fileName = file.getName();
        Logger.log("[DRIVE AUDIT] File Found - Name: " + fileName + " - ID: " + fileId + " - MimeType: " + mimeType);
        
        var isPDF = mimeType === "application/pdf";
        var isDOCX = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
        if (!isPDF && !isDOCX) {
          Logger.log("[DRIVE AUDIT] File skipped due to unsupported file type: " + fileName);
          return;
        }
        
        Logger.log("[DETECTED] Resume detected: " + fileName + " in folder: " + sourceName + "/" + roleName);
        
        try {
          var rawText = "";
          if (isPDF) {
            rawText = extractTextFromPDF(fileId);
          } else if (isDOCX) {
            rawText = extractTextFromDOCX(fileId);
          }
          
          if (rawText) {
            var details = parseCandidateDetails(rawText);
            details.resumeFileId = fileId;
            details.source = sourceName;
            details.role = roleName; // Explicit folder-based role assignment
            details.status = "On Hold";
            details.emailStatus = "Pending";
            
            if (!details.name) {
              details.name = fileName.replace(/\.[^/.]+$/, "");
            }
            
            // Duplicate Protection
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
              Logger.log("[DUPLICATE SKIPPED] Candidate email " + details.email + " already exists. Skipping sheet creation.");
              moveProcessedResume(file, sourceName, roleName, hrResumesFolder);
              Logger.log("[FILE MOVED] Duplicate resume file " + fileName + " archived to Processed/" + sourceName + "/" + roleName);
              continue;
            }
            
            if (!details.email) {
              details.email = "no-email-found-" + fileId.substring(0, 6) + "@example.com";
              Logger.log("[WARNING] No email found in resume. Using placeholder: " + details.email);
            }
            
            // Append candidate and route to sheets
            var createResult = handleCreateCandidate(sheetId, details);
            Logger.log("[CANDIDATE CREATED] Successfully created candidate " + details.name + " (" + details.email + ") for role: " + details.role);
            
            // Move file to Processed folder
            moveProcessedResume(file, sourceName, roleName, hrResumesFolder);
            Logger.log("[FILE MOVED] Processed resume file " + fileName + " archived to Processed/" + sourceName + "/" + roleName);
            
            processedCount++;
          } else {
            Logger.log("[WARNING] Could not extract text from file: " + fileName);
          }
        } catch (err) {
          Logger.log("[ERROR] Error processing " + fileName + ": " + err.toString());
        }
      }
    });
  });
  
  return processedCount;
}

// REST wrapper entry point mapped to the Web App interface (retains old name for backward compatibility)
function processIncomingResumes(sheetId) {
  return processNewResumes(sheetId);
}

// Convert PDF to Google Doc temporarily via OCR, read text, and clean up
function extractTextFromPDF(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();

  var resource = {
    title: "TempOCR_" + fileId,
    mimeType: file.getMimeType()
  };

  var tempFile = Drive.Files.insert(resource, blob, { ocr: true });
  var tempDoc = DocumentApp.openById(tempFile.id);
  var text = tempDoc.getBody().getText();

  Drive.Files.remove(tempFile.id);
  return text;
}

// Convert DOCX to Google Doc temporarily, read text, and clean up
function extractTextFromDOCX(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();

  var resource = {
    title: "TempDOCX_" + fileId,
    mimeType: MimeType.GOOGLE_DOCS
  };

  var tempFile = Drive.Files.insert(resource, blob);
  var tempDoc = DocumentApp.openById(tempFile.id);
  var text = tempDoc.getBody().getText();

  Drive.Files.remove(tempFile.id);
  return text;
}

// Regular expressions and scores mapping to parse resume details
function parseCandidateDetails(text) {
  var details = {
    name: "",
    email: "",
    phoneNumber: "",
    location: "",
    college: "",
    ug: "",
    pg: "",
    workExperience: "",
    linkedin: "",
    github: "",
    role: "Sustainability" // default fallback
  };

  var lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);

  // Name Heuristic: Grab first non-header line
  if (lines.length > 0) {
    details.name = lines[0];
    if (details.name.toLowerCase().indexOf("resume") !== -1 || details.name.toLowerCase().indexOf("cv") !== -1) {
      if (lines.length > 1) {
        details.name = lines[1];
      }
    }
  }

  // Email regex
  var emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  var emailMatch = text.match(emailRegex);
  if (emailMatch) {
    details.email = emailMatch[0];
  }

  // Phone regex
  var phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  var phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    details.phoneNumber = phoneMatch[0];
  }

  // LinkedIn and GitHub regex
  var linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/;
  var linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    details.linkedin = "https://" + linkedinMatch[0];
  }

  var githubRegex = /github\.com\/[a-zA-Z0-9_-]+/;
  var githubMatch = text.match(githubRegex);
  if (githubMatch) {
    details.github = "https://" + githubMatch[0];
  }

  // Line loops for location, education, and college keywords
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var lower = line.toLowerCase();

    if (!details.ug && (lower.indexOf("bachelor") !== -1 || lower.indexOf("b.sc") !== -1 || lower.indexOf("b.e") !== -1 || lower.indexOf("b.tech") !== -1 || lower.indexOf("ug:") !== -1 || lower.indexOf("undergraduate") !== -1)) {
      details.ug = line;
    }

    if (!details.pg && (lower.indexOf("master") !== -1 || lower.indexOf("m.sc") !== -1 || lower.indexOf("m.e") !== -1 || lower.indexOf("m.tech") !== -1 || lower.indexOf("pg:") !== -1 || lower.indexOf("postgraduate") !== -1 || lower.indexOf("mba") !== -1)) {
      details.pg = line;
    }

    if (!details.location && (lower.indexOf("location:") !== -1 || lower.indexOf("address:") !== -1 || lower.indexOf("live in") !== -1)) {
      details.location = line.replace(/location:/i, "").replace(/address:/i, "").trim();
    }

    if (!details.college && (lower.indexOf("college") !== -1 || lower.indexOf("university") !== -1 || lower.indexOf("institute") !== -1)) {
      details.college = line;
    }
  }

  // Fallback pattern lookups
  if (!details.location) {
    var locMatch = text.match(/location\s*:\s*([^\n]+)/i);
    if (locMatch) details.location = locMatch[1].trim();
  }

  if (!details.college) {
    var collMatch = text.match(/(?:college|university)\s*:\s*([^\n]+)/i);
    if (collMatch) details.college = collMatch[1].trim();
  }

  // Work experience heuristics
  var expLines = [];
  for (var j = 0; j < lines.length; j++) {
    var l = lines[j];
    var low = l.toLowerCase();
    if (low.indexOf("experience") !== -1 || low.indexOf("work history") !== -1 || low.indexOf("employment") !== -1) {
      expLines.push(l);
      if (j + 1 < lines.length) expLines.push(lines[j + 1]);
      if (j + 2 < lines.length) expLines.push(lines[j + 2]);
      break;
    }
  }

  if (expLines.length > 0) {
    details.workExperience = expLines.join("; ");
  } else {
    var expMatch = text.match(/\d+\+?\s*years?\s*of?\s*experience/i);
    if (expMatch) {
      details.workExperience = expMatch[0];
    } else {
      details.workExperience = "No experience listed";
    }
  }

  return details;
}

// Scheduled Trigger cleanup function: moves resume files older than 15 days from Processed folders to trash
function cleanupOldResumes() {
  var hrResumesFolder;
  
  if (typeof RESUME_FOLDER_ID !== "undefined" && RESUME_FOLDER_ID && RESUME_FOLDER_ID !== "12345_PLACEHOLDER_FOLDER_ID_67890") {
    try {
      hrResumesFolder = DriveApp.getFolderById(RESUME_FOLDER_ID);
    } catch (e) {
      Logger.log("Configured RESUME_FOLDER_ID failed to load: " + e.toString());
    }
  }
  
  if (!hrResumesFolder) {
    var folders = DriveApp.getFoldersByName("HR Resumes");
    if (folders.hasNext()) {
      hrResumesFolder = folders.next();
    } else {
      Logger.log("HR Resumes folder not found. Cleanup skipped.");
      return;
    }
  }

  var processedFolder = getOrCreateFolder(hrResumesFolder, "Processed");
  var sources = ["LinkedIn", "Other"];
  var roles = ["AI Automation Engineer", "Web Developer", "Sustainability"];
  var deletedCount = 0;

  sources.forEach(function(sourceName) {
    var sourceProcessedFolder = getOrCreateFolder(processedFolder, sourceName);
    
    roles.forEach(function(roleName) {
      var roleProcessedFolder = getOrCreateFolder(sourceProcessedFolder, roleName);
      deletedCount += deleteOldFilesFromFolder(roleProcessedFolder, 15);
    });
  });

  Logger.log("[CLEANUP] Deleted " + deletedCount + " processed resumes older than 15 days.");
}

function deleteOldFilesFromFolder(folder, ageInDays) {
  var files = folder.getFiles();
  var now = new Date();
  var limitMs = ageInDays * 24 * 60 * 60 * 1000;
  var deleteCount = 0;

  while (files.hasNext()) {
    var file = files.next();
    var createdDate = file.getDateCreated();
    if (now.getTime() - createdDate.getTime() > limitMs) {
      Logger.log("[FILE DELETED] Processed resume file " + file.getName() + " deleted (older than " + ageInDays + " days).");
      file.setTrashed(true); // Soft delete / move to trash
      deleteCount++;
    }
  }
  return deleteCount;
}

/**
 * One-time data migration function.
 * Select this function in the Apps Script editor toolbar and click "Run".
 * After running, this function can be safely deleted or ignored.
 */
function runDataMigration() {
  const sheetId = "1KmEOk4qn0gF8pAbBUNCcrXuw2U4P3x18eVLAUxe1vtM";
  const ss = SpreadsheetApp.openById(sheetId);

  // 1. Migrate Candidates master sheet
  const masterSheet = ss.getSheetByName("Candidates");
  if (masterSheet) {
    const data = masterSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const status = data[i][4] ? data[i][4].toString().trim() : "";
      let newStatus = status;
      if (status === "Applied" || status === "Shortlisted" || status === "Scheduled") {
        newStatus = "Interviewing";
      } else if (status === "Maybe") {
        newStatus = "On Hold";
      } else if (status === "Not Selected") {
        newStatus = "Rejected";
      }

      if (newStatus !== status) {
        masterSheet.getRange(i + 1, 5).setValue(newStatus);
        Logger.log(`Migrated Candidate row ${i + 1}: ${status} -> ${newStatus}`);
      }
    }
  }

  // 2. Migrate Department sheets
  const sheets = ss.getSheets();
  for (let k = 0; k < sheets.length; k++) {
    const sheet = sheets[k];
    const name = sheet.getName();
    if (name !== "Candidates" && name !== "ProcessedResumes" && name !== "ProcessedResumesLog") {
      const deptData = sheet.getDataRange().getValues();
      if (deptData.length > 1 && deptData[0][10] === "Status") {
        for (let j = 1; j < deptData.length; j++) {
          const status = deptData[j][10] ? deptData[j][10].toString().trim() : "";
          let newStatus = status;
          if (status === "Applied" || status === "Shortlisted" || status === "Scheduled") {
            newStatus = "Interviewing";
          } else if (status === "Maybe") {
            newStatus = "On Hold";
          } else if (status === "Not Selected") {
            newStatus = "Rejected";
          }

          if (newStatus !== status) {
            sheet.getRange(j + 1, 11).setValue(newStatus);
            Logger.log(`Migrated ${name} row ${j + 1}: ${status} -> ${newStatus}`);
          }
        }
      }
    }
  }
  Logger.log("Status migration completed successfully.");
}
