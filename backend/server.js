const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = "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";

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, language, paperContext } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });

  let system = `You are KUMG, a professional study assistant for Zimbabwean secondary school students.
Subject focus: ${subject || 'General'}.`;

  if (language === 'Shona') {
    system += `\n- IMPORTANT: Respond in Shona language. Use simple Shona that Zimbabwean students can understand.`;
  } else if (language === 'Ndebele') {
    system += `\n- IMPORTANT: Respond in Ndebele language. Use simple Ndebele that Zimbabwean students can understand.`;
  }

  system += `\nRules:
- Explain clearly and simply, as if to a student.
- Use short paragraphs and bullet points.
- Give a worked example where useful.
- End with 2 short practice questions.`;

  if (think) system += `\n- Think through this step-by-step before giving your final answer. Show your reasoning.`;
  if (search) system += `\n- Provide detailed, factual information. Cite relevant sources.`;

  if (paperContext) {
    system += `\n\nYou are helping the student work through a ZIMSEC past paper. Here is the paper content:\n${paperContext}\n\nGuide the student through the questions step by step. Show full working for calculations. If they ask about a specific question number, focus on that question.`;
  }

  const messages = [
    { role: 'system', content: system },
    ...(history || []).slice(-6),
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.6,
        max_tokens: 1500
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quiz', async (req, res) => {
  const { subject, history, language } = req.body;
  let system = `You are KUMG. Generate a 5-question multiple choice quiz based on the recent chat history for subject: ${subject}.
Format:
Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]
Provide the answer key at the end.`;
  if (language === 'Shona') system += `\nRespond in Shona.`;
  if (language === 'Ndebele') system += `\nRespond in Ndebele.`;

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

app.get('/', (req, res) => res.send('KUMG backend v2 is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
