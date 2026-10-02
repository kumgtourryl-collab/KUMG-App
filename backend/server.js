const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const GROQ_API_KEY = "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";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "openai/gpt-oss-120b";

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, language, paperContext, image } = req.body;
  if (!question && !image) return res.status(400).json({ error: 'Question or image required' });

  let system = `You are KUMG, a professional study assistant for Zimbabwean secondary school students.
Subject focus: ${subject || 'General'}.`;

  if (language === 'Shona') system += `\n- Respond in Shona language.`;
  else if (language === 'Ndebele') system += `\n- Respond in Ndebele language.`;

  system += `\nRules:
- Explain clearly and simply, as if to a student.
- Use short paragraphs and bullet points.
- Give a worked example where useful.
- End with 2 short practice questions.`;

  if (think) system += `\n- Think step-by-step. Show reasoning.`;
  if (search) system += `\n- Provide detailed, factual information with citations.`;
  if (paperContext) system += `\n\nPast paper context:\n${paperContext}\n\nGuide the student through the questions.`;

  let model = TEXT_MODEL;
  let messages = [];

  if (image) {
    // Multimodal: image + optional text question
    model = VISION_MODEL;
    messages = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: question || 'Read this image and explain/solve what you see. If it contains a question, answer it. If it contains text, summarize it.' },
          { type: 'image_url', image_url: { url: image } }
        ]
      }
    ];
  } else {
    messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6),
      { role: 'user', content: question }
    ];
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

app.post('/api/quiz', async (req, res) => {
  const { subject, history, language } = req.body;
  let system = `You are KUMG. Generate a 5-question multiple choice quiz based on the recent chat history for subject: ${subject}. Include the answer key at the end.`;
  if (language === 'Shona') system += `\nRespond in Shona.`;
  if (language === 'Ndebele') system += `\nRespond in Ndebele.`;
  const messages = [{ role: 'system', content: system }, ...(history || []).slice(-6)];
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: TEXT_MODEL, messages, temperature: 0.7, max_tokens: 2000 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => res.send('KUMG backend v3 is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
