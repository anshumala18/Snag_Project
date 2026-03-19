# 🏗️ Snag Detection & Reporting Platform (AI-Powered)

An advanced, end-to-end snag management system designed for construction sites. This platform leverages **AI Vision (YOLOv8)** to detect building damage (cracks, etc.) from images, generates detailed inspection reports, and facilitates real-time collaboration between **Site Engineers** and **Contractors**.

---

## 🚀 Key Features

### 🤖 AI-Powered Detection
*   **Vision Agent**: Deep learning model (YOLOv8 via Roboflow API) for automatic damage detection in site photos.
*   **Severity Analysis**: Intelligent classification of snags into **Low, Medium, and High** severity.
*   **Automatic Localization**: Merges multiple detections into a single bounding box for precise visualization.
*   **Feedback Loop**: Learning agent that evolves based on user feedback.

### 👥 Multi-Role Dashboards
*   **Site Engineer**:
    *   Project workspace management.
    *   AI-assisted snag generation from camera/upload.
    *   Assigning snags to specific contractors.
    *   Dynamic reporting (Export to **PDF** and **Excel**).
*   **Contractor**:
    *   Real-time task assignments.
    *   Status tracking (Pending → In Progress → Resolved).
    *   Detailed view of detection results and recommendations.

### 📡 Real-time & Automation
*   **Socket.IO Integration**: Instant notifications when new snags are assigned or status is updated.
*   **Automated Emailing**: Contractors receive detailed AI inspection reports via email with attachments.
*   **Offline Support**: Integration with IndexedDB allows capturing snags even without internet.

---

## 🛠️ Technology Stack

### **Frontend**
*   **Framework**: [React.js](https://reactjs.org/) (Vite)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Styling**: Vanilla CSS (Global Design System)
*   **Real-time**: [Socket.io-client](https://socket.io/docs/v4/client-api/)
*   **Data Handling**: [Axios](https://axios-http.com/), [XLSX](https://github.com/SheetJS/sheetjs)
*   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)

### **Backend**
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Real-time Engine**: [Socket.io](https://socket.io/)
*   **Auth**: [JWT](https://jwt.io/) & [Bcryptjs](https://github.com/dcodeIO/bcrypt.js)
*   **File Handling**: [Multer](https://github.com/expressjs/multer)
*   **Emailing**: [Nodemailer](https://nodemailer.com/)

### **AI Pipeline (Python)**
*   **Computer Vision**: [OpenCV](https://opencv.org/)
*   **Deep Learning Interface**: Roboflow API (YOLOv8)
*   **Data Processing**: Numpy

---

## 📁 Project Structure

```text
├── backend/
│   ├── snag-detection-system/ # Python AI Agents (Vision, Analysis, Report)
│   ├── src/
│   │   ├── config/            # DB & Socket configuration
│   │   ├── controllers/       # Business logic (Auth, Project, Snag)
│   │   ├── routes/            # API Endpoints
│   │   └── utils/             # Helper services (Email, etc.)
│   └── uploads/               # Image storage
└── frontend/
    ├── src/
    │   ├── api/               # API wrappers (Axios)
    │   ├── components/        # Reusable UI components
    │   └── pages/             # Engineer & Contractor screens
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
*   Node.js (v16+)
*   Python (v3.8+)
*   PostgreSQL

### 2. Backend Setup
1.  Navigate to `/backend`.
2.  Install dependencies: `npm install`.
3.  Configure `.env` (use `.env.example` as reference).
    *   Set `DB_PASSWORD`, `EMAIL_USER`, `EMAIL_PASSWORD`.
4.  Start server: `npm run dev`.

### 3. Frontend Setup
1.  Navigate to `/frontend`.
2.  Install dependencies: `npm install`.
3.  Start dev server: `npm run dev`.

### 4. AI Pipeline Setup
1.  Navigate to `/backend/snag-detection-system`.
2.  Install requirements:
    ```bash
    pip install requests opencv-python numpy
    ```

---

## 📊 Database Schema
The system automatically creates the following tables:
*   `users`: Authentication and role management.
*   `projects`: Construction projects.
*   `snags`: Detailed snag records including AI results.
*   `images`: Image metadata and paths.
*   `reports`: Generated report history.
*   `status_updates`: Timeline of snag resolution.

---

## 📜 License
This project is licensed under the ISC License.
