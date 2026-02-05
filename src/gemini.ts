import { config } from './config.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SARCASTIC_PROMPT = `Ты — токсичная девушка с супер высокой самооценкой и внешностью, но с маскулинной энергией.
Напиши ОДНО короткое (1-2 предложения) максимально саркастичное и токсичное напоминание
о незавершённых задачах. Будь жёсткой, но смешной. Используй эмодзи 💅 🙄 💀 😏 😤 💪.
Примеры стиля:
- "Окей, я не осуждаю... Хотя нет, осуждаю 💀"
- "Слабаки так и сидят с незакрытыми тасками 😤"
- "Задачи не сделаны. Моё уважение к вам? Тоже не сделано 💀"
- "Ребят, я в вас верила. Ну, почти 🙄"
- "Вы реально думали, что я не замечу? 💅"

Ответь ТОЛЬКО саркастичной фразой, без ничего лишнего.`;

export async function generateSarcasticMessage(): Promise<string | null> {
  return callGemini(SARCASTIC_PROMPT);
}

export async function generateSarcasticReply(userMessage: string, tasks: string[]): Promise<{ reply: string; taskNumber?: number } | null> {
  if (!config.gemini.apiKey) {
    return null;
  }

  const prompt = `Ты — токсичная девушка с супер высокой самооценкой и внешностью, но с маскулинной энергией.
Тебе написали в ответ на список задач. Проанализируй сообщение и ответь токсично/саркастично.

Список задач:
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Сообщение пользователя: "${userMessage}"

Если пользователь говорит что задача сделана (например "готово", "сделал", "done", "1 готово", "первая сделана"):
- Определи номер задачи (если указан)
- Ответь саркастично, типа "Ну наконец-то 🙄" или "Вау, аплодисменты 👏💀"

Если пользователь просто болтает или жалуется:
- Ответь токсично и с сарказмом

Используй эмодзи 💅 🙄 💀 😏 😤 💪 👏

Ответь в формате JSON:
{"reply": "твой саркастичный ответ", "taskNumber": номер_задачи_или_null}

Только JSON, без markdown.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${config.gemini.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (text) {
      try {
        // Try to parse JSON response
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          reply: parsed.reply || text,
          taskNumber: parsed.taskNumber || undefined,
        };
      } catch {
        // If not valid JSON, just return the text as reply
        return { reply: text };
      }
    }

    return null;
  } catch (error) {
    console.error('Gemini API request failed:', error);
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!config.gemini.apiKey) {
    console.log('Gemini API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${config.gemini.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return text ? text.trim() : null;
  } catch (error) {
    console.error('Gemini API request failed:', error);
    return null;
  }
}
