import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://localhost:5000/api/candidates');
    console.log('Status Candidates:', response.status);
    console.log('Candidates count:', response.data.candidates?.length);
    console.log('Sample candidate:', response.data.candidates?.[0]);

    for (const dept of ['Sustainability', 'AI Automation Engineer', 'Web Developer']) {
      try {
        const dRes = await axios.get(`http://localhost:5000/api/departments/${encodeURIComponent(dept)}`);
        console.log(`Status Dept ${dept}:`, dRes.status);
        console.log(`Count ${dept}:`, dRes.data.candidates?.length);
      } catch (err) {
        console.error(`Error Dept ${dept}:`, err.message);
        if (err.response) {
          console.error('Details:', err.response.data);
        }
      }
    }
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

test();
