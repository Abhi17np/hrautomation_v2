# HR Automation Platform

This repository contains a full-stack HR automation system for managing employee records, leave requests, approval workflows, appointment/offer letters, document handling, and biometric attendance synchronization.

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
- Templates
- Letters
- Approvals
- Exit management
- Appointment workflow
- Documents
- Leave tracking and management
- Attendance

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

### Attendance Sync
- Poll attendance punches from a connected biometric device
- Store results in MySQL for downstream reporting or integration

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
Create a file named `.env` in the backend folder with values such as:

```env
JWT_SECRET_KEY=change-this-secret
MONGO_URI=mongodb://localhost:27017/hr_offer_letters
PORT=5050
```

You can also configure additional environment variables if needed for your deployment.

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
- `/api/attendance` for attendance APIs
- `/api/appointment-orders` for appointment order workflows

---

## 10. Important Notes

- The app uses JWT-based authentication, so a strong secret key should be configured in production.
- Replace default credentials and secrets before deploying to a real environment.
- The biometric sync service depends on the device being reachable and the MySQL schema being prepared.
- Local file storage for templates and generated documents is under the backend storage directories.

---

## 11. Summary

This project is a practical HR automation platform covering the core needs of an HR department:

- Manage employees
- Generate and review letters
- Approve employee lifecycle workflows
- Track leave requests
- Monitor attendance through a connected biometric device

It is suitable for local development, internal demos, and further customization for production use.
