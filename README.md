# HR Automation Platform

This repository contains a full-stack, **multi-tenant** HR automation system for managing employee records, leave requests, approval workflows, appointment/offer letters, document handling, attendance (web login + biometric), asset tracking, and org reporting — built to be run as a SaaS product serving multiple customer organizations ("tenants") from one deployment.

The project is composed of three main parts:

- Backend API built with Flask
- React frontend for HR and employee workflows
- Biometric sync service for polling an eSSL/ZKTeco attendance device and writing records to MySQL

---

## 1. Overview

The platform is designed to support common HR operations in one place:

- Employee onboarding and profile management
- Template-based offer/appointment letter generation
- Approval flows for exits, appointment orders, and documents
- Leave tracking with monthly quota logic and manager approvals
- Attendance monitoring with device synchronization
- Document upload and review workflows

This system is intended for internal HR use and can be run locally or via Docker Compose.

---

## 2. Architecture

### Backend
The backend is a Flask application exposed on port 5050 by default.

Key responsibilities:
- Authentication and role-based access using JWT
- Employee CRUD operations
- Template and document management
- Letter generation and PDF/DOCX handling
- Leave request processing and approval logic
- Exit/resignation workflow
- Appointment order lifecycle management
- Attendance-related APIs

Main backend entry point:
- [backend/app.py](backend/app.py)

### Frontend
The frontend is a React application served on port 3000 in development mode.

It provides pages for:
- Dashboard
- Employees
- Onboarding (Templates, Offer Letters, Appointment Orders)
- Approvals
- Exit & Relieving
- Leave tracking and management
- Attendance (Web Login self-punch, Biometric device sync, Holidays)
- Payroll (Payslips)
- Organization (Assets, Org Chart, Reports)
- Platform admin (`#/platform`, separate from the tenant app — see section 10)

Main frontend entry point:
- [frontend/src/App.jsx](frontend/src/App.jsx)

### Biometric Sync Service
The biometric sync service connects to an eSSL/ZKTeco device, polls for attendance records, and writes them to MySQL.

It is separate from the main web app and is intended to run continuously in the background.

Main sync entry point:
- [biometric_sync/sync.py](biometric_sync/sync.py)

---

## 3. Main Features

### Employee Management
- Create, update, view, and delete employee records
- Bulk employee upload support
- Employee-specific profile information and references

### Template and Letter Generation
- Upload reusable document templates
- Generate offer/appointment letters dynamically
- Preview and revise letter content
- Export DOCX/PDF outputs

### Approval Workflow
- Manage approval queues for letters, exits, and appointment orders
- Support HR and manager review actions

### Leave Management
- Apply leave requests
- Review monthly leave balances
- Handle leave type categories such as CL, SL, LP, ML, OD, CO, and permission-based requests
- Preview the paid/leave split before submission

### Documents and Review
- Upload supporting documents
- Submit documents for review
- Track document-related workflows

### Attendance
- Self-service web login punch in/out (any employee, from the browser)
- Biometric device sync (eSSL/ZKTeco) — polled and merged with web punches into one daily record
- Holiday calendar management

### Organization
- Asset inventory: register equipment and assign/unassign it to employees
- Org chart: read-only reporting-line tree built from employee records
- Reports hub: quick-glance attendance/leave/payroll summaries linking to full detail views

---

## 4. Technology Stack

### Backend
- Python 3.x
- Flask
- Flask-CORS
- Flask-JWT-Extended
- PyMongo
- python-docx
- pdfplumber
- Pillow / OpenCV / numpy
- python-dotenv

### Frontend
- React 18
- React Router DOM
- Axios
- Create React App / react-scripts

### Biometric Sync
- Python
- pyzk
- mysql-connector-python
- schedule

### Infrastructure
- Docker Compose
- MongoDB
- MySQL

---

## 5. Project Structure

```text
backend/                  # Flask API and business logic
  app.py                  # Application entry point
  routes/                 # API blueprints for each module
  services/               # letter generation and other helpers
  storage/                # local document/template storage
  requirements.txt        # Python dependencies

biometric_sync/           # Attendance polling service
  config.py               # Device and MySQL settings
  db.py                   # Database access helpers
  device.py               # Device communication logic
  sync.py                 # Main polling loop
  requirements.txt        # Python dependencies

frontend/                 # React app
  src/                    # Pages, context, layout, components
  package.json            # Frontend dependencies and scripts

docker-compose.yml        # Container setup for backend and frontend
```

---

## 6. Prerequisites

Before running the project, make sure you have:

- Python 3.9+ installed
- Node.js and npm installed
- MongoDB running and accessible
- MySQL running if you plan to use the biometric sync service
- Optional: Docker and Docker Compose for containerized setup

---

## 7. Environment Setup

### Backend
Copy `backend/.env.example` to `backend/.env` and fill in real values:

```env
MONGO_URI=mongodb://localhost:27017/hr_offer_letters
JWT_SECRET_KEY=change-this-secret
ALLOWED_ORIGINS=http://localhost:3000
FLASK_ENV=development
PORT=5050
```

`JWT_SECRET_KEY` and `ALLOWED_ORIGINS` (a comma-separated list of frontend origins allowed to call the API) are **required** when `FLASK_ENV=production` — the app refuses to start without them rather than falling back to an insecure default. In development, missing values fall back to permissive defaults with a startup warning.

### Biometric Sync
The device and database settings are stored in [biometric_sync/config.py](biometric_sync/config.py). You can override them with environment variables such as:

```env
DEVICE_IP=192.168.0.4
DEVICE_PORT=4370
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=hr_attendance_db
POLL_INTERVAL_SECONDS=30
```

---

## 8. Running the Project

### Option A: Run locally

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows use .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API will start on:
- http://localhost:5050

#### Frontend
```bash
cd frontend
npm install
npm start
```

The web app will be available at:
- http://localhost:3000

#### Biometric Sync Service
```bash
cd biometric_sync
pip install -r requirements.txt
python sync.py
```

### Option B: Run with Docker Compose
```bash
docker compose up --build
```

This starts:
- Backend on port 5050
- Frontend on port 3000

---

## 9. API Notes

The backend exposes routes under `/api/...` for each functional area.

Examples include:
- `/api/auth` for authentication
- `/api/employees` for employee data
- `/api/templates` for templates
- `/api/letters` for letter generation
- `/api/approvals` for approval workflows
- `/api/leave`/`/api/leaves` for leave processing
- `/api/attendance` for attendance APIs (including `/api/attendance/web-punch` for self-service check-in/out)
- `/api/appointment-orders` for appointment order workflows
- `/api/assets` for asset inventory
- `/api/platform` for platform-admin tenant provisioning (separate auth, see section 10)

---

## 10. Multi-Tenancy & Platform Admin

Every piece of data (employees, leave, payslips, documents, attendance, assets, etc.) is scoped to a **tenant** (a `companies` document) via a `tenant_id` field, enforced by a query wrapper (`backend/tenant_scope.py`) so route code can't accidentally leak data across tenants.

**Logging in** now requires a company code in addition to email/password — `POST /api/auth/login` takes `{company, email, password}`, where `company` is the tenant's `slug`.

**Provisioning a new tenant** is done by a platform (super-admin) account, not by tenant users self-signing-up:

1. Bootstrap your own platform-admin account once:
   ```bash
   cd backend
   python scripts/create_platform_admin.py --email you@yourcompany.com --name "Your Name"
   ```
2. Log in at `#/platform` in the frontend (a page outside the normal tenant app and nav) using that account.
3. Create a new company there — it takes the company name, a login slug, and the first admin user's credentials for that tenant.

**Migrating existing single-company data**: if you're upgrading a pre-multi-tenant database, run `python backend/scripts/backfill_tenant.py` once (after `python backend/db_init.py`) to turn the existing dataset into "tenant zero" and convert the relevant indexes — see the script's docstring for details.

---

## 11. Important Notes

- The app uses JWT-based authentication, so a strong secret key should be configured in production.
- Replace default credentials and secrets before deploying to a real environment.
- The biometric sync service depends on the device being reachable and the MySQL schema being prepared.
- Local file storage for templates and generated documents is under the backend storage directories.
- `docker-compose.yml` includes a local `mongo` service for development; production deployments should point `MONGO_URI` at a managed/hosted MongoDB instead.

---

## 12. Summary

This project is a practical, multi-tenant HR automation platform covering the core needs of an HR department, deployable as a SaaS product for multiple customer organizations:

- Manage employees, onboarding, and organization structure (assets, org chart, reports)
- Generate and review letters
- Approve employee lifecycle workflows
- Track leave requests
- Monitor attendance via web login and a connected biometric device
- Process payroll

It is suitable for local development, internal demos, and further customization for production use.
