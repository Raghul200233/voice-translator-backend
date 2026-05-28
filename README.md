# 🎙️ Speech-to-Text Converter

A full-stack web application that converts audio to text using Groq's Whisper API. Built with the MERN stack (MongoDB/Express/React/Node) and Tailwind CSS.

## ✨ Features

- 🎤 **Audio Upload & Recording** - Upload audio files or record directly in browser
- 🤖 **AI-Powered Transcription** - Uses Groq's Whisper API for accurate speech recognition
- 📝 **Edit & Manage** - Edit transcriptions, mark favorites, organize by categories
- 🔍 **Search & Filter** - Search through transcriptions and filter by category
- 📊 **Statistics Dashboard** - View usage statistics and analytics
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 💾 **Persistent Storage** - SQLite database for local development, MongoDB for production

## 🛠️ Tech Stack

### Frontend
- React 18 with Hooks
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide React for icons

### Backend
- Node.js with Express
- Groq Whisper API for transcription
- SQLite (development) / MongoDB Atlas (production)
- Multer for file uploads

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Groq API key (free tier available)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/speech-to-text-app.git
cd speech-to-text-app
2. Backend Setup
cd backend
npm install
Create .env file in backend root directory
# Add your GROQ_API_KEY to .env
npm start
3. Frontend Setup
bash
cd frontend
npm install
npm run dev
4. Open your browser
text
http://localhost:5173
```
```
## 🔧 Environment Variables
Backend (.env)
env
PORT=5003
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development
```
```
Frontend (.env)
env
VITE_API_URL=http://localhost:5003/api
```
```
## 📡 API Endpoints
Method	Endpoint	Description
GET	/api/health	Health check
POST	/api/transcribe	Upload audio for transcription
GET	/api/transcriptions	Get all transcriptions
GET	/api/transcriptions/:id	Get single transcription
PUT	/api/transcriptions/:id	Update transcription
DELETE	/api/transcriptions/:id	Delete transcription
GET	/api/statistics	Get usage statistics
```
```
## 🚢 Deployment
Backend (Render)
Push code to GitHub
Create new Web Service on Render
Connect repository
Add environment variables
Deploy

Frontend (Vercel)
Install Vercel CLI: npm i -g vercel
Run vercel in frontend directory
Set VITE_API_URL environment variable
```
```
## 📁 Project Structure
speech-to-text-app/
├── backend/
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── server-final.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## 🎯 Features Demo
Upload Audio: Click "Upload Audio" and select an MP3/WAV file
Record Audio: Click "Start Recording" and speak
View Results: Transcription appears instantly
Manage: Edit, favorite, or delete transcriptions
Filter: Use categories and search to find transcriptions

## ⚠️ Error Handling
The application handles various error scenarios:
Invalid file types
File size exceeding limits (25MB)
API rate limiting (30 requests/minute)
Network connectivity issues
Database connection failures

## 📄 License
MIT License - feel free to use this project for learning or production!

## 🙏 Acknowledgments
Groq for free Whisper API access
OpenAI for Whisper model
Tailwind CSS for styling
Framer Motion for animations

Made with ❤️ for the Voice-to-Text Project
