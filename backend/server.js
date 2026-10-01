const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = "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";

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, image } = req.body;
  if (!question && !image) return res.status(400).json({ error: 'Question required' });

  let system = `You are KUMG, a professional study assistant. Subject: ${subject || 'General'}.`;
  if (think) system += `\nThink step-by-step.`;
  if (search) system += `\nProvide factual context.`;

  let model = 'openai/gpt-oss-120b';
  let messages = [];

  if (image) {
    messages = [{ role: 'system', content: system }, { role: 'user', content: [{ type: 'text', text: question || 'Explain this.' }, { type: 'image_url', image_url: { url: image } }] }];
  } else {
    messages = [{ role: 'system', content: system }, ...(history || []).slice(-6), { role: 'user', content: question }];
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 1500 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Quiz Generator Endpoint
app.post('/api/quiz', async (req, res) => {
  const { subject, history } = req.body;
  const system = `You are KUMG. Generate a 5-question multiple choice quiz based on the recent chat history for subject: ${subject}. 
Format: 
Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]
Provide the answer key at the end.`;

  const messages = [{ role: 'system', content: system }, ...(history || []).slice(-6)];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages, temperature: 0.7, max_tokens: 2000 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => res.send('KUMG backend is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));