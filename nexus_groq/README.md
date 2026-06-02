# ✦ Nexus — AI Resume Intelligence (Groq Edition)
### 100% Free · No Credit Card · Unlimited*

---

## ⚡ Setup (3 steps)

### 1. Install
```bash
npm install
```

### 2. Add your Groq API key
Create a file called `.env` in the project folder and paste:
```
GROQ_API_KEY=your_groq_key_here
PORT=3000
```
Get a FREE key at → https://console.groq.com/keys

### 3. Start
```bash
npm start
```
Open → http://localhost:3000

---

## 🔁 If port 3000 is busy
```bash
# Find the PID
netstat -ano | findstr :3000

# Kill it (replace 12345 with actual PID)
taskkill /PID 12345 /F

# Then start again
npm start
```

---

## 📁 Files
```
nexus-groq/
├── server.js        ← Backend (Groq API + PDF reading)
├── index.html       ← Upload page
├── css/style.css    ← All styles
├── js/app.js        ← All frontend logic
├── package.json
├── .env             ← YOUR API KEY (create this yourself)
└── .env.example     ← Template
```

---

## ⚠️ Important
- Keep your `.env` file private — never share it
- Resume must be a text-based PDF (not a scanned image)
- Free Groq tier: 30 requests/minute, 14,400/day
