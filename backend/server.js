 const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Your Groq API Key.
// ⚠️ If you generated a new key, replace the one below with your new one.
const GROQ_API_KEY = "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";

if (!GROQ_API_KEY || GROQ_API_KEY.includes("gsk_") === false) {
  console.error("WARNING: The Groq API key is missing or invalid.");
}

app.post('/api/ask', async (req, res) => {
  const { question, subject, history } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const system = `You are KUMG, a professional study assistant for Zimbabwean secondary school students.
Subject focus: ${subject || 'General'}.
Rules:
- Explain clearly and simply, as if to a student.
- Use short paragraphs and bullet points.
- Give a worked example where useful.
- End with 2 short practice questions.
- If the question is not school-related, politely bring it back to studies.`;

  const messages = [
    { role: 'system', content: system },
    ...(history || []).slice(-6),
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: messages,
        temperature: 0.6,
        max_tokens: 900
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Log the actual error from Groq so you can see it in the Render logs
      console.error("Groq API Error:", data);
      throw new Error(data.error?.message || 'Groq request failed');
    }

    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('KUMG backend is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KUMG backend listening on port ${PORT}`);
});
