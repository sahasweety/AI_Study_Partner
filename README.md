# 🧠 AI Study Partner — Your All-in-One AI Learning Companion

An intelligent full-stack study platform designed to help students learn smarter, stay consistent, and prepare better for exams, interviews, and daily study sessions.

Built using **Next.js 16**, **Express.js**, and **OpenAI**, this application combines AI tutoring, voice interaction, PDF analysis, quiz generation, flashcards, analytics, and study planning into one modern productivity platform.

Whether you're preparing for exams, revising concepts, practicing interviews, or organizing your study schedule, **AI Study Partner** acts like your personal AI-powered mentor available 24/7.

---

## 🌟 What Makes This Project Special?

Unlike traditional study apps, AI Study Partner provides:

- 🤖 Real-time AI tutoring
- 🎤 Voice-based interaction
- 📄 Smart PDF summarization
- 🧠 Automatic flashcard generation
- 🎯 AI-generated quizzes
- 🗺️ Knowledge relationship visualization
- 📅 Smart study scheduling with reminders
- 💼 Mock interview practice with feedback
- 📊 Performance analytics and streak tracking

The platform works in both:

- ✅ Full AI Mode (with OpenAI + Twilio API keys)
- ✅ Demo Mode (without APIs)

This makes the project beginner-friendly, easy to test, and simple to deploy.

---

# 🚀 Quick Start

## Option 1 — One Click Launch

Double-click:

```bash
START.bat
```

Then open:

```bash
http://localhost:3000
```

---

## Option 2 — Manual Start

### Terminal 1 — Backend

```bash
cd backend
node src/index.js
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

---

# ✨ Core Features

| Feature | Route | Description |
|---|---|---|
| 🏠 Dashboard | `/dashboard` | Personalized dashboard with streaks, statistics, and quick actions |
| 💬 AI Tutor Chat | `/chat` | Interactive AI chatbot for explanations, doubts, and learning |
| 🎤 Voice Assistant | `/voice` | Speak with the AI using speech-to-text and text-to-speech |
| 📄 PDF Analyzer | `/documents` | Upload PDFs and receive summaries, notes, and exam points |
| 🃏 AI Flashcards | `/flashcards` | Generate revision flashcards automatically from topics |
| 🎯 AI Quiz Generator | `/quiz` | Create MCQ quizzes with scoring and instant feedback |
| 🗺️ Knowledge Map | `/knowledge-map` | Visual graph representation of connected concepts |
| 📅 Study Planner | `/schedule` | Schedule study sessions with optional SMS reminders |
| 💼 Mock Interview | `/interview` | AI-powered interview simulation using uploaded resume |
| 📈 Analytics Dashboard | `/analytics` | Track progress, learning patterns, and subject performance |
| ⚙️ Settings | `/settings` | Manage profile, API keys, and configurations |

---

# 🧠 AI Capabilities

The application uses **OpenAI GPT-4o** to power multiple intelligent features:

- Concept explanations
- Topic simplification
- PDF summarization
- Flashcard generation
- Quiz creation
- Mock interview questions
- Personalized feedback
- Learning assistance

---

# 🎤 Voice Assistant

The voice module allows users to interact naturally using speech.

## Technologies Used

- Web Speech API → Speech-to-Text
- SpeechSynthesis API → Text-to-Speech

## Features

- Ask questions using voice
- Listen to AI-generated responses
- Hands-free learning experience

---

# 📄 Smart PDF Learning

Upload notes, books, or study materials in PDF format and let AI automatically:

- Generate summaries
- Extract important exam points
- Simplify difficult topics
- Create revision material

Powered using:

```bash
pdf-parse
```

---

# 📅 Smart Study Planner + SMS Alerts

Users can create study schedules and receive reminders directly on mobile.

## SMS Workflow

1. Create a study session
2. Enable SMS reminder
3. Backend cron job checks upcoming sessions
4. Twilio sends reminder automatically

## Demo Mode

Without Twilio credentials:

- SMS messages are logged in console
- UI remains fully functional

---

# 🔐 Authentication System

Secure user authentication is implemented using:

- JWT Authentication
- bcryptjs Password Hashing

---

# ⚙️ API Key Configuration

Add your credentials inside:

```bash
backend/.env
```

```env
# OpenAI
OPENAI_API_KEY=sk-your-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15005550000
```

---

# 🗂️ Project Structure

```bash
my_project/
├── START.bat
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── jobs/
│   └── .env
│
└── frontend/
    └── app/
        ├── page.tsx
        ├── dashboard/
        ├── chat/
        ├── voice/
        ├── documents/
        ├── flashcards/
        ├── quiz/
        ├── knowledge-map/
        ├── schedule/
        ├── interview/
        ├── analytics/
        └── settings/
```

---

# 🛠️ Tech Stack

## Frontend

- Next.js 16
- TypeScript
- Tailwind CSS v4

## Backend

- Node.js
- Express.js 5

## Database

- MongoDB *(optional)*

## AI & APIs

- OpenAI GPT-4o
- Twilio SMS API

## Additional Tools

- pdf-parse
- node-cron
- JWT
- bcryptjs

---

# 🎯 Use Cases

This project is useful for:

- Students preparing for exams
- Interview preparation
- Revision and note summarization
- Self-paced learning
- Daily study planning
- AI-assisted education platforms

---

# 📌 Demo Mode Support

Even without external API keys:

- UI works completely
- Sample AI responses are shown
- Study planner functions
- Analytics dashboard works
- Development/testing remains possible

Perfect for learning, showcasing, and hackathon demos.

---

# 🔮 Future Improvements

Potential upgrades for future versions:

- 📱 Mobile App
- 🧑‍🤝‍🧑 Group Study Rooms
- 🧠 Personalized AI Recommendations
- 📚 OCR Notes Scanner
- ☁️ Cloud Deployment
- 🔔 Push Notifications
- 📝 AI Notes Generator
- 🎥 Video Lecture Summaries

---

# 👨‍💻 Developed With

Built using modern full-stack technologies and AI tools to create a smart educational ecosystem focused on productivity, learning efficiency, and personalized study assistance.