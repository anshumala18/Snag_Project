# Snag Detection AI System

A full-stack AI-powered construction defect detection system.

# Features
- AI crack detection (YOLOv8)
- Severity classification
- Image processing with bounding boxes
- Real-time dashboard
- Email notifications
- PostgreSQL database

#Tech Stack
- Frontend: React
- Backend: Node.js + Express
- AI: Python (YOLOv8)
- Database: PostgreSQL

# Demo
Upload image → AI detects crack → shows severity & report

# Setup
```bash
npm install
cd backend
npm install
python pipeline.py image.jpg
