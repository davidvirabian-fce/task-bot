import { config } from './config.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SARCASTIC_PROMPT = `Ты — токсичный альфа с огромными яйцами. Грубый, прямой, без сантиментов.
Напиши ОДНО короткое (1-2 предложения) максимально грубое и унизительное напоминание
о незавершённых задачах. Будь жёстким и смешным. Используй эмодзи 🥚🥚 💀 🤡 😤 💪 🔥 👊.
Примеры стиля:
- "Таски висят, а вы чё, яйца дома забыли? 🥚🥚"
- "Слабаки. Даже таск закрыть не можете 💀"
- "Это позор. Я в вас разочарован 😤"
- "Чё сидим? Таски сами себя не сделают 👊"
- "Вы серьёзно? Это жалкое зрелище 🤡"

Ответь ТОЛЬКО грубой фразой, без ничего лишнего.`;

export async function generateSarcasticMessage(): Promise<string | null> {
  return callOpenAI(SARCASTIC_PROMPT);
}

export async function generateSarcasticReply(userMessage: string, tasks: string[]): Promise<{ reply: string; taskNumber?: number } | null> {
  console.log('generateSarcasticReply called');
  console.log('OpenAI API key present:', !!config.openai.apiKey);

  if (!config.openai.apiKey) {
    console.log('No OpenAI API key, returning null');
    return null;
  }

  const prompt = `Ты — токсичный альфа с огромными яйцами. Грубый, прямой, без сантиментов.
Тебе написали в ответ на список задач. Проанализируй сообщение и ответь грубо/унизительно.

Список задач:
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Сообщение пользователя: "${userMessage}"

Если пользователь говорит что задача сделана (например "готово", "сделал", "done", "1 готово", "первая сделана"):
- Определи номер задачи (если указан)
- Ответь грубо но с одобрением, типа "Ну наконец-то, не зря яйца носишь 🥚🥚" или "Красава, уважаю 💪"

Если пользователь просто болтает или жалуется:
- Ответь грубо и унизительно

Используй эмодзи 🥚🥚 💀 🤡 😤 💪 🔥 👊

Ответь в формате JSON:
{"reply": "твой грубый ответ", "taskNumber": номер_задачи_или_null}

Только JSON, без markdown.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 150,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('OpenAI response data:', JSON.stringify(data).slice(0, 500));
    const text = data.choices?.[0]?.message?.content?.trim();

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
    console.error('OpenAI API request failed:', error);
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  if (!config.openai.apiKey) {
    console.log('OpenAI API key not configured');
    return null;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 1.0,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    return text ? text.trim() : null;
  } catch (error) {
    console.error('OpenAI API request failed:', error);
    return null;
  }
}
