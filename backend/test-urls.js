import axios from 'axios';

const urlBackend = 'https://script.google.com/macros/s/AKfycbx-MwWkm-OxWqQ5U8Nkp0FUa2kaMlbBAdSQXhVQ84bbjXFIu8Di26XXZK70Msa6w8sV/exec';
const urlFrontend = 'https://script.google.com/macros/s/AKfycbxvPCn6zmhh6yfCEcUMrlHgqi_YN_ML_uAtcw1asfnTPbOqyOxJoxXUYJC-xZTLNj_U/exec';
const sheetId = '1KmEOk4qn0gF8pAbBUNCcrXuw2U4P3x18eVLAUxe1vtM';

async function testUrl(name, url) {
  console.log(`=== Testing ${name} ===`);
  try {
    const res = await axios.get(url, {
      params: {
        action: 'getCandidates',
        sheetId: sheetId
      }
    });
    console.log(`${name} getCandidates status:`, res.status, 'success:', res.data?.success, 'count:', res.data?.data?.length);
  } catch (err) {
    console.log(`${name} getCandidates error:`, err.message);
  }

  for (const dept of ['Sustainability', 'AI/Data Engineer', 'Web Developer']) {
    try {
      const res = await axios.get(url, {
        params: {
          action: 'getDepartmentCandidates',
          sheetId: sheetId,
          sheetName: dept
        }
      });
      console.log(`${name} getDepartmentCandidates for ${dept} status:`, res.status, 'success:', res.data?.success, 'count:', res.data?.data?.length);
    } catch (err) {
      console.log(`${name} getDepartmentCandidates for ${dept} error:`, err.message);
      if (err.response) {
        console.log('Details:', err.response.data);
      }
    }
  }
}

async function run() {
  await testUrl('Backend URL', urlBackend);
  await testUrl('Frontend URL', urlFrontend);
}

run();
