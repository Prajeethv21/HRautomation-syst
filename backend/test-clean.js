import dotenv from 'dotenv';
dotenv.config();

function cleanToOnlyDegree(str, isPG) {
  if (!str) return "";
  
  // Split by dashes, commas, or "at"/"from" to separate college
  var parts = str.split(/[-–—|]|\bat\b|\bfrom\b/i);
  
  var ugKeywords = ["btech", "b.tech", "be", "b.e", "bsc", "b.sc", "bca", "bba", "ba", "bcom", "b.com", "bachelor"];
  var pgKeywords = ["mtech", "m.tech", "mba", "msc", "m.sc", "mca", "pgdm", "mcom", "m.com", "me", "m.e", "master", "postgraduate", "pg"];
  var targetKeywords = isPG ? pgKeywords : ugKeywords;
  
  // Expanded college pattern — covers common institution name words including South Indian ones
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

console.log("Result Basalingappa:", cleanToOnlyDegree("B.E. in Information Science and Engineering", false));
console.log("Result Prajeeth:", cleanToOnlyDegree("B.Tech in Computer Science and Engineering", false));
