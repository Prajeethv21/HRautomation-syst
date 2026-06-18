# Deepwoods Green - Joining Letter Automation Portal

An elegant, sustainability-focused internal HR portal built for **Deepwoods Green Initiatives Pvt. Ltd.** to streamline the recruitment-to-onboarding pipeline. This application acts as a clean, modern dashboard layer sitting on top of the company's existing Google Sheets + Google Docs + Gmail joining letter automation script.

---

## 📁 Project Structure

```text
DeepwoodsAutomation/
├── frontend/                 # React SPA (Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/      # UI components (Button, Modal, Card, Toast, Sidebar, Header)
│   │   ├── pages/           # View pages (Dashboard, Candidates, DepartmentDetails, AdminPanel, Login, Register)
│   │   ├── services/        # Axios API Client service
│   │   ├── App.tsx          # Router layout & application root
│   │   └── index.css        # Tailwind style directives & Google typography
│   └── tailwind.config.js    # Custom brand color extensions
│
├── backend/                  # Node.js + Express API Proxy Server
│   ├── routes/              # Express endpoint controllers
│   ├── services/            # Settings storage & Candidate proxy service
│   ├── data/                # Local JSON persistent files (mock candidates & settings)
│   └── index.js             # API server entry point
│
└── docs/
    └── google-apps-script.js # Reference copy of Google Macro automation code
```

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) (v18+ recommended)
- [npm](https://www.npmjs.com/)

### 1. Setup Backend
Open a terminal in the `backend/` folder:
```bash
cd backend
npm install
npm run dev
```
The backend server will start on [http://localhost:5000](http://localhost:5000).

### 2. Setup Frontend
Open a separate terminal in the `frontend/` folder:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on [http://localhost:5173](http://localhost:5173).

---

## 📊 Google Integration Setup

### 1. Configure the Google Sheet
Ensure your Google Sheet contains the following columns in order (Row 1 is headers):
- **Column A (`A`):** `Candidate ID` (e.g. `cand-1`)
- **Column B (`B`):** `Candidate Name`
- **Column C (`C`):** `Email`
- **Column D (`D`):** `Role`
- **Column E (`E`):** `Joining Date` (formatted as Date or string)
- **Column F (`F`):** `Status` (e.g., `Selected`, `Offered`, `Interviewing`)
- **Column G (`G`):** `Email Status` (initialize as `Pending` or `Sent`)

### 2. Deploy Google Apps Script Web App
1. Open your Google Sheet, click **Extensions** > **Apps Script**.
2. Create a new file or copy the code from [google-apps-script.js](file:///C:/Users/praje/Documents/DeepwoodsAutomation/docs/google-apps-script.js) and paste it into the code editor.
3. Click **Deploy** > **New Deployment** (top right).
4. Click the gear icon and select **Web App**.
5. Set:
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone`
6. Click **Deploy**, authorize the requested permissions, and copy the generated **Web App URL**.

### 3. Connect the Portal
1. Open the portal in your browser: [http://localhost:5173](http://localhost:5173).
2. Navigate to **Admin Panel** in the left sidebar (sign in with your administrator account).
3. Under **Portal Configuration**, input your:
   - **Google Apps Script Web App URL** (copied in the previous step)
   - **Google Sheet ID** (extracted from your Spreadsheet browser URL)
   - **Google Docs Template ID** (the ID of your document template containing placeholders like `{{Candidate Name}}`, `{{Role}}`, `{{Joining Date}}`)
4. Click **Save Configuration**.
5. Click **Test Sync** or **Sync Candidates** to run a diagnostic test. Once connected, a green **Google Sheets Active** badge will appear in the top header, and your live sheet data will populate the portal.

---

## ⚙️ How it Works: Mock vs. Live Mode

- **Simulated Mock Mode (Offline):**
  If settings are not configured or the Google server is unreachable, the portal runs in a persistent mock state. It loads default candidates from `backend/data/candidates.json`. Any updates (like status changes or sending simulated letters) are written back to this JSON file so that operations remain persistent during local testing.
  
- **Google Sheets Active (Online):**
  When integration settings are saved and online, all operations fetch rows in real-time from your Google Sheet. Clicking **Send Letter** calls the Express API, which proxies the request to the Apps Script. The script copies your Doc template, swaps placeholders, exports to PDF, emails the applicant via Gmail, updates the spreadsheet row column G to `Sent`, and returns success.
