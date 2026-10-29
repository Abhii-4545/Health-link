# HealthLink ABHA — ABHA-Based Inter-Hospital Medical Record Exchange

> **Tagline:** Secure Medical Records. Connected Healthcare.  
> **Project Presentation:** *ABHA-Based Inter-Hospital Medical Record Exchange*  
> **Presented By:** Priya Gaikwad, Mahank Yesambare, Abhay Wable, Mahesh Khanat  
> **Under the Guidance of:** Prof. Anil Lohar (Department of Computer Science)

An ABHA-linked medical record exchange platform designed to help authorized healthcare professionals access patient history securely, subject to explicit patient consent and supported integrations, with AI-assisted medical record summarization.

---

## 1. Architecture & Clean Initial State Guarantee

- **Zero Preloaded Profiles:** The database starts completely empty (`0` patients, `0` doctors, `0` hospital staff, `0` medical records, `0` consents). No sample personal data, fake ABHA numbers, or pre-filled dashboard statistics are seeded.
- **Role-Based Access Control (RBAC):** Supports four isolated roles:
  1. **Patient** — Registers/links ABHA identifier, manages medical records, reviews incoming hospital/doctor sharing requests, grants time-bounded category-scoped consent, revokes consent at any time, and audits every access event.
  2. **Doctor** — Searches patients by exact Internal Patient ID (`HL-PAT-YYYY-XXXXXX`) or 14-digit ABHA number, requests access with a clinical purpose, views authorized records only after patient approval, generates AI-assisted clinical summaries, and signs off on clinical reviews.
  3. **Hospital Staff** — Registers walk-in patients, generates Internal Patient IDs, uploads categorized medical documents (`Prescriptions`, `Laboratory reports`, `Discharge summaries`, `Consultation notes`, `Diagnostic reports`, `Other medical documents`), and tracks facility record requests.
  4. **Administrator** — Provisioned only via a secure setup key (`HEALTHLINK-ADMIN-SETUP`), verifies participating hospitals, manages account statuses, and monitors security audit logs under least-privilege rules (no raw access to readable clinical content).

---

## 2. Repository Structure

```text
├── backend/
│   ├── app.py                # Python Flask REST API + MySQL + Pandas/NumPy + Gemini API
│   ├── schema.sql            # Normalized 11-table MySQL DDL schema (empty initial state)
│   └── requirements.txt      # Python dependencies (Flask, mysql-connector-python, google-genai, pandas, numpy)
├── src/
│   ├── components/           # Modular UI components (Navbar, Footer, BrandLogo, Vector Illustrations, Modals)
│   ├── pages/                # 20 complete views (Landing, Auth, Patient, Doctor, Staff, Admin, Legal/About)
│   ├── services/api.ts       # Authenticated REST API client
│   ├── types/models.ts       # TypeScript domain interfaces
│   └── utils/
│       ├── domainLogic.ts      # Pure validation, ABHA formatting, and consent scope evaluation
│       └── domainLogic.test.ts # Automated Node unit tests
├── server.ts                 # Full-stack runtime server for live preview (port 3000)
└── .env.example              # Environment variable template (no secrets)
```

---

## 3. MySQL & Python Flask Setup Instructions

### Step 1: Initialize the MySQL Database
```bash
mysql -u root -p < backend/schema.sql
```
This creates the `healthlink_abha_db` database with 11 normalized InnoDB tables:
`users`, `hospitals`, `patient_profiles`, `doctor_profiles`, `hospital_staff_affiliations`, `patient_medical_records`, `record_sharing_requests`, `consent_grants`, `consent_revocations`, `ai_generated_summaries`, and `audit_logs`.

### Step 2: Install Python Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and set:
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `SESSION_SECRET` (random 64-byte hex string)
- `GEMINI_API_KEY` (Google Gemini API key for server-side clinical summarization)

### Step 4: Run the Application
- **Full-Stack Web Runtime (Port 3000):**
  ```bash
  npm install
  npm run dev
  ```
- **Standalone Python Flask API (Port 5000):**
  ```bash
  python backend/app.py
  ```

---

## 4. API Testing Examples (Postman / cURL)

### 1. Register a New Patient Account
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "patient",
    "fullName": "Aarav Deshmukh",
    "email": "aarav@example.org",
    "dateOfBirth": "1998-05-14",
    "password": "SecurePassword123",
    "confirmPassword": "SecurePassword123",
    "abhaNumber": "91-2837-4651-0928"
  }'
```

### 2. Doctor Requests Patient Medical Records
```bash
curl -X POST http://localhost:3000/api/consents/request \
  -H "Authorization: Bearer <DOCTOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "HL-PAT-2026-123456",
    "purpose": "Follow-up cardiology evaluation and medication review",
    "requestedCategories": ["Prescriptions", "Laboratory reports"],
    "requestedDurationHours": 72
  }'
```

### 3. Patient Approves Consent Request
```bash
curl -X POST http://localhost:3000/api/patient/requests/<REQUEST_ID>/decision \
  -H "Authorization: Bearer <PATIENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "Approved",
    "durationHours": 72
  }'
```

### 4. Generate AI-Assisted Clinical Summary (Authorized Doctor Only)
```bash
curl -X POST http://localhost:3000/api/summaries/generate \
  -H "Authorization: Bearer <DOCTOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "HL-PAT-2026-123456"
  }'
```

---

## 5. Limitations & Project Disclaimer

- **Academic Demonstration Status:** HealthLink ABHA is an academic prototype built for the final-year Computer Science project presentation *"ABHA-Based Inter-Hospital Medical Record Exchange"*. It is **not** an official Government of India / National Health Authority (NHA) portal.
- **ABHA Verification:** User-entered 14-digit ABHA numbers are validated for format (`XX-XXXX-XXXX-XXXX`) and labeled **Unverified — Pending Authorized ABDM Gateway** unless live ABDM Sandbox credentials are configured.
- **Clinical AI Disclaimer:** AI-generated summaries process only consented records via server-side Gemini API (`gemini-3.8-flash`) and require physician verification before clinical use.
