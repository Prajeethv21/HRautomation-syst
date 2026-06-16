// Test validation logic locally
function formatSheetValue(val) {
  if (val === null || val === undefined) return "";
  return val.toString().trim();
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
    /\bb\.?tech\b/i, /\bb\.?e\b/i, /\bb\.?sc\b/i, /\bb\.?ca\b/i, /\bb\.?ba\b/i, /\bb\.?a\b/i, /\bb\.?com\b/i,
    /\bm\.?tech\b/i, /\bm\.?b\.?a\b/i, /\bm\.?sc\b/i, /\bm\.?ca\b/i, /\bm\.?com\b/i, /\bm\.?e\b/i
  ];
  for (var i = 0; i < rejectDegrees.length; i++) {
    if (rejectDegrees[i].test(val)) return true;
  }
  
  if (/\b(19\d{2}|20\d{2})\b/.test(val)) return true;
  
  return false;
}

function isInvalidCollege(str) {
  var val = str.toLowerCase();
  var cities = ["bangalore", "bengaluru", "mysore", "chennai", "hyderabad", "pune", "mumbai", "delhi"];
  if (cities.indexOf(val) !== -1) return true;
  
  var degrees = [
    "b.e", "be", "b.tech", "btech", "m.tech", "mtech", "mba", "m.sc", "msc", "b.sc", "bsc", 
    "bca", "mca", "pgdm", "bba", "ba", "ma", "b.com", "bcom", "m.com", "mcom"
  ];
  if (degrees.indexOf(val) !== -1) return true;
  
  return false;
}

function getDegreeClassification(degreeText) {
  if (!degreeText) return null;
  var text = degreeText.toUpperCase().replace(/\./g, "").trim();
  var ugKeywords = ["BTECH", "BE", "BSC", "BCA", "BBA", "BA", "BCOM", "BACHELOR", "UNDERGRADUATE", "UG"];
  var pgKeywords = ["MTECH", "MBA", "MSC", "MCA", "PGDM", "MCOM", "ME", "MASTER", "POSTGRADUATE", "PG"];
  
  var words = text.split(/[^A-Z]/).filter(Boolean);
  var hasPG = words.some(function(w) { return pgKeywords.indexOf(w) !== -1; });
  var hasUG = words.some(function(w) { return ugKeywords.indexOf(w) !== -1; });
  
  if (hasPG) return "PG";
  if (hasUG) return "UG";
  return null;
}

function cleanToOnlyDegree(str, isPG) {
  if (!str) return "";
  var parts = str.split(/[-–—|]|\bat\b|\bfrom\b/i);
  var ugKeywords = ["btech", "b.tech", "be", "b.e", "bsc", "b.sc", "bca", "bba", "ba", "bcom", "b.com", "bachelor"];
  var pgKeywords = ["mtech", "m.tech", "mba", "msc", "m.sc", "mca", "pgdm", "mcom", "m.com", "me", "m.e", "master", "postgraduate", "pg"];
  var targetKeywords = isPG ? pgKeywords : ugKeywords;
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
      var cleaned = p.replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "").replace(/\s+/g, " ").trim();
      cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
      if (cleaned) return cleaned;
    }
  }
  
  var pLower = str.toLowerCase();
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
    var parts2 = str.split(collegeKeywords);
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
        var cleaned = pt.replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\b\d{4}\s*[-–\/\s(to)]+\s*\d{4}\b/g, "").replace(/\s+/g, " ").trim();
        cleaned = cleaned.replace(/^[,;\-\s—|]+|[,;\-\s—|]+$/g, "").trim();
        if (cleaned) return cleaned;
      }
    }
  }
  return "";
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

  clean.name = cand.name;
  clean.email = cand.email;
  clean.phoneNumber = cand.phoneNumber;

  var ugVal = cand.ug ? cand.ug.toString().trim() : "";
  var pgVal = cand.pg ? cand.pg.toString().trim() : "";

  ugVal = cleanToOnlyDegree(ugVal, false);
  pgVal = cleanToOnlyDegree(pgVal, true);

  var ugClass = getDegreeClassification(ugVal);
  var pgClass = getDegreeClassification(pgVal);

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

  if (ugVal && getDegreeClassification(ugVal) !== "UG") {
    console.log("[INTEGRITY WARNING] Rejecting invalid UG value: '" + ugVal + "'. Storing blank.");
    ugVal = "";
  }
  if (pgVal && getDegreeClassification(pgVal) !== "PG") {
    console.log("[INTEGRITY WARNING] Rejecting invalid PG value: '" + pgVal + "'. Storing blank.");
    pgVal = "";
  }

  clean.ug = ugVal;
  clean.pg = pgVal;

  var collegeStr = cand.college ? cand.college.toString().trim() : "";
  if (collegeStr && collegeStr !== "N/A" && collegeStr.length >= 5 && /[a-zA-Z]/.test(collegeStr) && !isInvalidCollege(collegeStr)) {
    clean.college = collegeStr;
  } else {
    console.log("[VALIDATION WARNING] Invalid college name: '" + collegeStr + "'. Storing blank.");
    clean.college = "";
  }

  return clean;
}

const candidate = {
  name: "Basalingappa Pagi",
  email: "basalingappapagi@gmail.com",
  phoneNumber: "+91 74069 47198",
  ug: "B.E Information Science and Engineering",
  pg: "",
  college: "BMS College of Engineering (2023–2026)",
  location: "Bangalore",
  linkedin: "https://www.linkedin.com/in/basalingappa-veerappa-pagi/",
  github: "https://github.com/pratikvpagi",
  role: "Web Developer",
  status: "Submitted",
  emailStatus: "Pending",
  source: "LinkedIn"
};

console.log("Cleaned:", JSON.stringify(validateAndCleanCandidate(candidate), null, 2));
