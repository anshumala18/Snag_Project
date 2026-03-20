# 🏗️ Snag AI: Advanced Structural Inspection Platform

A premium, end-to-end snag management system designed for modern construction sites. This platform leverages **Agentic AI Vision** to detect, classify, and match structural damage to specialized contractors in real-time.

---

## 🚀 Key Features

### 🤖 Intelligent AI Pipeline
*   **Neural Crack Classification**: Distinguishes between **Hairline**, **Surface**, and **Structural** cracks by analyzing area and quantity.
*   **Vision Agent**: Powered by YOLOv8 (Roboflow API) for high-accuracy damage detection in construction photos.
*   **Agentic Contractor Matching**: Automatically routes snags to specialists (**Structural, Civil, Plumbing, Electrical, General**) using a precise `SPEC_MAPPING` logic.
*   **Severity Assessment**: AI-driven priority assignment (Low, Medium, High) with corresponding visual indicators.

### 🎨 Premium UI/UX (Redesigned)
*   **4-Step Inspection Flow**:
    1.  **Image Hub**: Modern card-based selection for Camera & Gallery.
    2.  **Intelligence Engine**: Dynamic "Scanning" animation visualizing the AI analysis.
    3.  **Refined Details**: Tactile classification buttons and live confidence progress bars.
    4.  **Global Dispatch**: Glassmorphic review interface with integrated email composition.
*   **Interactive Dashboards**: Real-time project tracking and contractor performance metrics.

### 📡 Offline & Secure
*   **Offline Sync (LocalFirst)**: Capture and save snags in basements with no internet; auto-sync once a connection is found via IndexedDB.
*   **Secure OTP Registry**: Email-based One-Time Password verification for all contractor signups.
*   **Verification Badges**: Universal "Email Verified" status badges across all profiles and dashboards.
*   **Automatic Emailing**: Instant dispatch of professional AI inspection reports (PDF/Text) to contractors.

---

## 🛠️ Technology Stack

### **Frontend**
*   **Core**: [React.js](https://reactjs.org/) (Vite)
*   **Visuals**: [Lucide React](https://lucide.dev/), Vanilla CSS (Premium Glassmorphism Design)
*   **Real-time**: [Socket.io-client](https://socket.io/docs/v4/client-api/)
*   **Offline**: IndexedDB & Custom Sync Manager

### **Backend**
*   **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Auth**: [JWT](https://jwt.io/), [Bcryptjs](https://github.com/dcodeIO/bcrypt.js)
*   **Emailing**: [Nodemailer](https://nodemailer.com/) (Gmail SMTP Integration)

### **AI Core (Python)**
*   **Logic**: Analysis Agent & Discovery Pipeline
*   **Computer Vision**: YOLOv8 (Roboflow), OpenCV, Numpy

---

## ⚙️ Quick Start

1.  **Backend**:
    ```bash
    cd backend
    npm install
    # Set EMAIL_USER and EMAIL_PASS in .env
    npm run dev
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **AI Requirements**:
    ```bash
    pip install requests opencv-python numpy
    ```

---

## 📁 System Architecture
*   `backend/snag-detection-system/`: The AI "Brain" (Vision & Logic agents).
*   `backend/src/utils/syncManager.js`: The "Offline Sync" engine.
*   `frontend/src/pages/engineer/GenerateSnag.jsx`: The premium inspection workflow.

---
*Built for excellence in engineering and site management.*
