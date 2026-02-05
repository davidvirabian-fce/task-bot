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
  if (!config.gemini.apiKey) {
    console.log('Gemini API key not configured, skipping sarcastic message');
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${config.gemini.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: SARCASTIC_PROMPT,
              },
            ],
          },
        ],
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

    if (text) {
      return text.trim();
    }

    return null;
  } catch (error) {
    console.error('Gemini API request failed:', error);
    return null;
  }
}
