const express  = require('express');
const multer   = require('multer');
const Groq     = require('groq-sdk');
const pdfParse = require('pdf-parse');
const cors     = require('cors');
const path     = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const groq   = new Groq({ apiKey: 'ENTER_YOUR_GROQ_API_KEY_HERE' });
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ══════════════════════════════════════════════
   PROMPT
══════════════════════════════════════════════ */
const SYSTEM_PROMPT = `You are a senior AI career advisor and expert recruiter.
Analyze the resume text provided and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Return exactly this JSON structure:
{
  "candidateName": "Full name from resume",
  "candidateInitials": "AB",
  "candidateLevel": "Fresher",
  "levelReason": "One sentence explaining the level",
  "overallFeedback": "2-3 honest sentences about strengths and biggest gap",
  "atsScore": 68,
  "atsBreakdown": {
    "keywords": 60,
    "formatting": 75,
    "impact": 55,
    "readability": 72
  },
  "careerDomains": [
    {
      "name": "Domain Name",
      "score": 74,
      "emoji": "💻",
      "industries": ["Industry 1", "Industry 2"],
      "description": "One specific sentence about fit"
    }
  ],
  "jobMatches": [
    {
      "title": "Job Title",
      "company": "Realistic Indian company e.g. Infosys, Razorpay, Swiggy",
      "companyType": "Type of company",
      "whyMatch": "2-3 sentences referencing actual skills from the resume",
      "missingSkills": ["Skill A", "Skill B"],
      "salary": "₹4-8 LPA",
      "experience": "0-2 yrs",
      "applyLink": "https://www.naukri.com/job-title-jobs",
      "applySource": "Naukri",
      "priority": 9
    }
  ],
  "resumeImprovements": [
    {
      "number": 1,
      "title": "Short title",
      "detail": "Specific explanation of the problem and how to fix it",
      "before": "Weak phrasing from the resume",
      "after": "Improved version with quantified impact"
    }
  ],
  "skillsToLearn": [
    {
      "skill": "Skill Name",
      "demandLevel": "Very High",
      "reason": "Why this skill boosts their chances",
      "learnFrom": "Platform name",
      "learnUrl": "https://actual-learning-url.com"
    }
  ],
  "missingKeywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5", "Keyword6"],
  "presentKeywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4"],
  "linkedinSummary": "3-4 sentence first-person LinkedIn About section personalised to this candidate"
}

Rules:
- candidateLevel must be one of: Fresher, Entry-Level, Mid-Level, Senior
- careerDomains: 3 to 5 items
- jobMatches: exactly 5 items ordered by priority descending
- resumeImprovements: exactly 3 items
- skillsToLearn: exactly 3 items, demandLevel must be "Very High", "High", or "Medium"
- missingKeywords: 6 to 12 items
- presentKeywords: 3 to 8 items
- All salaries in Indian format
- Be specific to THIS resume — no generic advice`;

/* ══════════════════════════════════════════════
   ROUTE
══════════════════════════════════════════════ */
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: 'No file received. Please upload a PDF.' });

    if (!req.file.originalname.toLowerCase().endsWith('.pdf'))
      return res.status(400).json({ error: 'Only PDF files are supported.' });

    // Extract text from PDF
    let resumeText = '';
    try {
      const parsed = await pdfParse(req.file.buffer);
      resumeText = parsed.text.trim();
    } catch (e) {
      return res.status(400).json({ error: 'Could not read the PDF. Make sure it is a text-based PDF, not a scanned image.' });
    }

    if (!resumeText || resumeText.length < 100)
      return res.status(400).json({ error: 'PDF appears to be empty or image-based. Please use a text-based PDF resume.' });

    // Call Groq — JSON mode guarantees valid JSON output
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this resume and return the JSON analysis:\n\n${resumeText}`
        }
      ]
    });

    const raw  = completion.choices[0]?.message?.content || '';
    const data = JSON.parse(raw); // JSON mode always returns valid JSON

    res.json({ success: true, data });

  } catch (err) {
    console.error('[Nexus Error]', err.message || err);

    // Friendly error messages
    let msg = 'Analysis failed. Please try again.';
    if (err.message?.includes('rate_limit'))
      msg = 'Rate limit reached. Please wait 30 seconds and try again.';
    else if (err.message?.includes('api_key') || err.message?.includes('401'))
      msg = 'Invalid API key. Please check your GROQ_API_KEY in the .env file.';
    else if (err.message?.includes('JSON'))
      msg = 'AI returned unexpected data. Please try again.';

    res.status(500).json({ error: msg });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  ✦ Nexus (Groq) running\n  → http://localhost:${PORT}\n`);
});
