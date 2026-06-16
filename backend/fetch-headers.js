import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_APPS_SCRIPT_URL;
const sheetId = process.env.VITE_GOOGLE_SHEET_ID;

async function getHeaders(sheetName) {
  try {
    const res = await axios.get(url, {
      params: {
        action: 'getDepartmentCandidates',
        sheetId: sheetId,
        sheetName: sheetName
      }
    });
    console.log(`--- Sheet: ${sheetName} ---`);
    console.log("Data:", JSON.stringify(res.data.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function testAll() {
  await getHeaders('Web Devloper');
  await getHeaders('Sustainability');
}

testAll();

