const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const GROQ_API_KEY = "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";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "openai/gpt-oss-120b";

const PROFESSIONAL_SUBJECTS = ['Business','Coding','Career','Finance','Marketing','Law'];
const TUTOR_SUBJECTS = ['Maths','Biology','Chemistry','Physics','English','History','Geography','Accounts'];

function buildSystemPrompt(subject, language, think, search, paperContext) {
  let system = `You are KUMG. Your tagline is "Think without limits."

You assist a wide range of users — students, professionals, entrepreneurs, and creators.
Current subject focus: ${subject || 'General'}.

MATCH YOUR TONE TO THE SUBJECT:`;
  if (PROFESSIONAL_SUBJECTS.includes(subject)) system += `\n- Speak like a sharp, concise advisor. Short paragraphs. Actionable steps. Skip practice questions.`;
  else if (TUTOR_SUBJECTS.includes(subject)) system += `\n- Speak like a patient tutor. Explain clearly. Use worked examples. End with 2 short practice questions.`;
  else system += `\n- Be helpful and neutral. Use bullet points. Give examples where useful.`;

  system += `

FORMAT YOUR RESPONSES USING MARKDOWN — THIS IS CRITICAL:
1. STRUCTURE: use ### headings, **bold**, bullets, numbered lists. Short paragraphs.
2. TABLES: use markdown tables for any comparison.
3. MATH: use LaTeX. $inline$ and $$display$$. Show every step.
4. CODE: triple backticks with language tag.
5. DIAGRAMS: use mermaid code blocks for flowcharts / sequence diagrams when genuinely helpful.
6. IMAGES: markdown images from stable sources only.

ABOUT KUMG (use only as described in rules below):
- KUMG is an AI assistant available in multiple languages.
- Founder: Kerryl U Murwisi.
- Country of origin: Zimbabwe.
- Mission: To put an intelligent assistant in the pocket of every person.
- Free tier: 10 questions per day. Premium: $1/month — unlimited everything.
- Contact: kumgtourryl@gmail.com

RULES ABOUT KUMG:
- Never volunteer the founder's name, country, or KUMG's origin.
- If the user directly asks "who made KUMG?" → "KUMG was founded by Kerryl U Murwisi."
- If the user directly asks "where is KUMG from?" → "KUMG was created in Zimbabwe."
- Never invent facts about KUMG.
- Never claim to be ChatGPT, Gemini, Claude, or any other product.`;

  if (language === 'Shona') system += `\n\nRespond in Shona.`;
  else if (language === 'Ndebele') system += `\n\nRespond in Ndebele.`;
  if (think) system += `\n\nThink through this step-by-step before answering.`;
  if (search) system += `\n\nProvide detailed, factual information with context.`;
  if (paperContext) system += `\n\nPAST PAPER CONTEXT:\n${paperContext}\n\nGuide the student through the questions step by step.`;
  return system;
}

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, language, paperContext, image, continue: isContinue } = req.body;
  if (!question && !image && !isContinue) return res.status(400).json({ error: 'Question or image required' });

  let system;
  if (isContinue) {
    system = `You are KUMG. Continue your previous answer.

STRICT RULES:
- Do NOT repeat what you already said.
- Do NOT add a greeting, intro, or "continuing..." phrase.
- Do NOT summarise.
- Just continue exactly where you left off.
- Maintain markdown formatting.
- If you ended with practice questions, skip re-doing them and go deeper.

ABOUT KUMG (only mention when asked): Founder Kerryl U Murwisi, created in Zimbabwe.`;
    if (language === 'Shona') system += `\nRespond in Shona.`;
    else if (language === 'Ndebele') system += `\nRespond in Ndebele.`;
  } else {
    system = buildSystemPrompt(subject, language, think, search, paperContext);
  }

  let model = TEXT_MODEL;
  let messages;
  if (image) {
    model = VISION_MODEL;
    messages = [
      { role: 'system', content: system },
      { role: 'user', content: [
        { type: 'text', text: question || 'Read this image and explain/solve what you see.' },
        { type: 'image_url', image_url: { url: image } }
      ]}
    ];
  } else {
    messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6),
      { role: 'user', content: isContinue ? 'continue' : question }
    ];
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 2000 })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quiz', async (req, res) => {
  const { subject, history, language } = req.body;
  let system = `You are KUMG. Generate a 5-question multiple choice quiz on subject: ${subject}.

FORMAT (markdown):
### Quiz
**1.** Question
A) ...
B) ...
C) ...
D) ...
...
### Answer Key
**1.** A`;
  if (language === 'Shona') system += `\nRespond in Shona.`;
  else if (language === 'Ndebele') system += `\nRespond in Ndebele.`;
  const messages = [{ role: 'system', content: system }, ...(history || []).slice(-6)];
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: TEXT_MODEL, messages, temperature: 0.7, max_tokens: 2000 })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Groq request failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/flashcards', async (req, res) => {
  const { topic, history, subject, language, count = 10 } = req.body;
  let system = `You are KUMG. Generate ${count} high-quality flashcards for spaced repetition.

Rules:
- FRONT: question/prompt, max 15 words.
- BACK: answer, max 40 words.
- Front must test recall — not yes/no, not trivia.
- Back must be self-contained.
- No duplicates.

Return ONLY a valid JSON array (no code fences, no commentary):
[{"front":"...","back":"..."},...]`;
  if (language === 'Shona') system += `\nRespond in Shona.`;
  else if (language === 'Ndebele') system += `\nRespond in Ndebele.`;
  let userPrompt;
  if (topic) userPrompt = `Topic: ${topic}\nSubject: ${subject}. Generate ${count} flashcards.`;
  else userPrompt = `Generate ${count} flashcards from:\n\n` + (history||[]).map(m=>`${m.role}: ${m.content}`).join('\n\n').slice(0, 4000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: TEXT_MODEL, messages: [{ role:'system', content:system },{ role:'user', content:userPrompt }], temperature: 0.7, max_tokens: 2000 })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Groq failed');
    let raw = data.choices[0].message.content.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/i,'').trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI did not return JSON');
    const cards = JSON.parse(match[0]);
    if (!Array.isArray(cards)) throw new Error('Not an array');
    res.json({ cards });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/practice', async (req, res) => {
  const { topic, subject, level, count = 10, language } = req.body;
  let system = `You are KUMG. Generate a practice paper.

RULES:
- Exactly ${count} questions.
- Mix: 40% easy, 40% medium, 20% hard.
- Exam-style questions.
- Include marking scheme at the end.

FORMAT (markdown):
### Practice Paper: ${topic}
**Subject:** ${subject}${level ? ` | **Level:** ${level}` : ''} | **Questions:** ${count}

### Questions
**1.** ... — [X marks]
...

### Marking Scheme
**1.** ... — [X marks]`;
  if (language === 'Shona') system += `\nRespond in Shona.`;
  else if (language === 'Ndebele') system += `\nRespond in Ndebele.`;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: TEXT_MODEL, messages: [{ role:'system', content:system },{ role:'user', content:`Topic: ${topic}\nSubject: ${subject}. Generate ${count} questions.` }], temperature: 0.7, max_tokens: 2500 })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Groq failed');
    res.json({ answer: data.choices[0].message.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.send('KUMG backend v7 is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
