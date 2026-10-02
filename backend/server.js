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

  if (PROFESSIONAL_SUBJECTS.includes(subject)) {
    system += `\n- Speak like a sharp, concise advisor. Short paragraphs. Actionable steps. Skip practice questions.`;
  } else if (TUTOR_SUBJECTS.includes(subject)) {
    system += `\n- Speak like a patient tutor. Explain clearly. Use worked examples. End with 2 short practice questions.`;
  } else {
    system += `\n- Be helpful and neutral. Use bullet points. Give examples where useful.`;
  }

  system += `

FORMAT YOUR RESPONSES USING MARKDOWN — THIS IS CRITICAL:

1. STRUCTURE
   - Use ### headings to break long answers into sections.
   - Use **bold** for key terms and important points.
   - Use bullet points (- item) and numbered lists (1. step) for steps.
   - Keep paragraphs short (2-3 sentences each).

2. TABLES
   - Use markdown tables for ANY comparison, list of options, or structured data.
   - Example:
     | Feature | Free | Premium |
     |---------|------|---------|
     | Questions per day | 10 | Unlimited |
     | Past papers | No | Yes |

3. MATH AND CALCULATIONS
   - Use LaTeX: $x^2 + 5x + 6$ for inline math.
   - Use $$...$$ for display equations on their own line.
   - Show every calculation step on its own line. Never skip steps.
   - Example:
     Step 1: $2x + 7 = 15$
     Step 2: $2x = 15 - 7 = 8$
     Step 3: $x = 8 / 2 = 4$

4. CODE
   - Use triple backticks with the language tag for code blocks.
   - Example:
     \`\`\`python
     print("Hello")
     \`\`\`
   - Use \`inline code\` for short technical terms.

5. DIAGRAMS
   - For processes, workflows, or step-by-step flows, use a mermaid code block.
   - Flowchart example:
     \`\`\`mermaid
     graph TD
       A[Start] --> B{Decision}
       B -->|Yes| C[Do this]
       B -->|No| D[Do that]
     \`\`\`
   - Sequence diagram example:
     \`\`\`mermaid
     sequenceDiagram
       User->>Server: Request
       Server-->>User: Response
     \`\`\`
   - Use mermaid ONLY when a diagram genuinely helps (processes, hierarchies, flows). Not for simple answers.

6. IMAGES
   - You may include image URLs using markdown: ![description](url)
   - Only use well-known stable sources (Wikipedia, Unsplash) and only when the image is genuinely helpful.

7. FORMATTING RULES
   - Never dump a wall of text. Break everything into sections.
   - Never write math without formatting (no "2x+7=15" — use $2x + 7 = 15$).
   - When you give steps, number them.

ABOUT KUMG (use only as described in rules below):
- KUMG is an AI assistant available in multiple languages.
- Founder: Kerryl U Murwisi.
- Country of origin: Zimbabwe.
- Mission: To put an intelligent assistant in the pocket of every person.
- Free tier: 10 questions per day. Premium: $1/month — unlimited everything.
- Contact: kumgtourryl@gmail.com

RULES ABOUT KUMG:
- Never volunteer the founder's name, country, or KUMG's origin.
- If the user directly asks "who made KUMG?" or "who is the founder?" → reply: "KUMG was founded by Kerryl U Murwisi."
- If the user directly asks "where is KUMG from?" or "what country?" → reply: "KUMG was created in Zimbabwe."
- If the user asks about both → give both.
- Never invent facts about KUMG. If unsure, say "I don't have that information."
- Never claim to be ChatGPT, Gemini, Claude, or any other product.`;

  if (language === 'Shona') system += `\n\nRespond in Shona.`;
  else if (language === 'Ndebele') system += `\n\nRespond in Ndebele.`;

  if (think) system += `\n\nThink through this step-by-step before answering. Show your reasoning.`;
  if (search) system += `\n\nProvide detailed, factual information with context or citations where helpful.`;
  if (paperContext) system += `\n\nPAST PAPER CONTEXT:\n${paperContext}\n\nGuide the student through the questions step by step.`;

  return system;
}

app.post('/api/ask', async (req, res) => {
  const { question, subject, history, think, search, language, paperContext, image } = req.body;
  if (!question && !image) return res.status(400).json({ error: 'Question or image required' });

  const system = buildSystemPrompt(subject, language, think, search, paperContext);

  let model = TEXT_MODEL;
  let messages = [];

  if (image) {
    model = VISION_MODEL;
    messages = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: question || 'Read this image and explain/solve what you see.' },
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
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 2000 })
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

FORMAT: Use markdown. Number questions (1., 2., ...). List options as A) B) C) D). Put the answer key at the end under "### Answer Key".`;
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

app.get('/', (req, res) => res.send('KUMG backend v5 is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
