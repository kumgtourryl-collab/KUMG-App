const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Your Groq API Key.
const GROQ_API_KEY = "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";

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, image } = req.body;

  if (!question && !image) {
    return res.status(400).json({ error: 'Question or image is required' });
  }

  let system = `You are KUMG, a professional study assistant for Zimbabwean secondary school students.
Subject focus: ${subject || 'General'}.
Rules:
- Explain clearly and simply, as if to a student.
- Use short paragraphs and bullet points.
- Give a worked example where useful.
- End with 2 short practice questions.`;

  if (think) {
    system += `\n- IMPORTANT: Think through this step-by-step before giving your final answer. Show your reasoning.`;
  }
  if (search) {
    system += `\n- Provide detailed, factual information. Cite any relevant sources or historical context in your answer.`;
  }

  // Determine which model to use based on user selection
  let model = 'openai/gpt-oss-120b';
  let messages = [];

  if (image) {
    // Use the Vision model if an image is attached
    model = 'llama-3.2-11b-vision-preview';
    messages = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: question || 'Explain what is in this image.' },
          { type: 'image_url', image_url: { url: image } } // Base64 string
        ]
      }
    ];
  } else {
    // Use the Reasoning model if Think is on
    if (think) {
      model = 'deepseek-r1-distill-llama-70b';
    }
    messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6),
      { role: 'user', content: question }
    ];
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
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

app.get('/', (req, res) => res.send('KUMG backend is running.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
