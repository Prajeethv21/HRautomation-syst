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
  } catch(err) {
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
    var candidateEmail = data.candidateEmail;

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

      candidate.status = row[4] ? row[4].toString().trim() : "Pending";
      candidate.emailStatus = row[5] ? row[5].toString().trim() : "Pending";

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
    } catch(err) {
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

// REST Endpoint Helper: Update candidate status (column E) by email
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

    var allowedStatuses = ['Selected', 'Not Selected', 'Maybe'];
    if (allowedStatuses.indexOf(newStatus) === -1) {
      Logger.log('INVALID status value: ' + newStatus);
      return makeJsonResponse({ success: false, message: "Invalid status value. Allowed: " + allowedStatuses.join(', ') }, 400);
    }

    const sheet = getSheet(sheetId);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // Search column B (index 1) for matching email
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim().toLowerCase() === candidateEmail.trim().toLowerCase()) {
        rowIndex = i + 1; // Convert 0-based array index to 1-based spreadsheet row
        Logger.log('Found candidate at array index ' + i + ' → spreadsheet row ' + rowIndex);
        Logger.log('Candidate name: ' + data[i][0]);
        Logger.log('Current status (col E / col 5): ' + data[i][4]);
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log('FAILED: candidate not found for email=' + candidateEmail);
      return makeJsonResponse({ success: false, message: "Candidate not found: " + candidateEmail }, 404);
    }

    // SAFETY: only write to column E (column number 5)
    // Column A=1, B=2, C=3, D=4(Joining Date), E=5(Status), F=6(Email Status)
    var STATUS_COLUMN = 5; // Column E = Status
    Logger.log('Writing to: Row=' + rowIndex + ', Column=' + STATUS_COLUMN + ' (Column E = Status)');
    Logger.log('Value to write: ' + newStatus);

    var statusCell = sheet.getRange(rowIndex, STATUS_COLUMN);

    // ── Dropdown chip preservation ──────────────────────────────────────────
    // Verify the target cell already contains a dropdown validation before updating.
    Logger.log('Current validation:');
    Logger.log(statusCell.getDataValidation());

    var currentValidation = statusCell.getDataValidation();
    if (currentValidation === null) {
      Logger.log('Validation is missing. Recreating dropdown validation rule.');
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(
          ['Selected', 'Not Selected', 'Maybe'],
          true
        )
        .build();
      statusCell.setDataValidation(rule);
    }

    // Update only the value to preserve existing validation, dropdown chip, and formatting
    statusCell.setValue(newStatus);

    Logger.log('SUCCESS: Status updated. Row=' + rowIndex + ', Column=E(5), Value=' + newStatus);

    return makeJsonResponse({
      success: true,
      message: "Status updated to " + newStatus + " for " + candidateEmail
    }, 200);

  } catch (error) {
    Logger.log('handleUpdateCandidateStatus FAILED: ' + error.toString());
    return makeJsonResponse({ success: false, message: "Status update failed: " + error.toString() }, 500);
  }
}
