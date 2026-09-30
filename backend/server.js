const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// This is the secret key. It lives on Render, never on the user's phone.
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
      throw new Error(data.error?.message || 'Groq request failed');
    }

    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check route (so Render knows the app is running)
app.get('/', (req, res) => {
  res.send('KUMG backend is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KUMG backend listening on port ${PORT}`);
});
