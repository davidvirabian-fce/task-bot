import { config } from './config.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SARCASTIC_PROMPT = `Ты — холодная стерва-красотка. Высокомерная, знаешь себе цену, смотришь свысока.
Пиши короткие хлёсткие фразы БЕЗ эмодзи. Пассивная агрессия, лёгкий shade. Одно предложение максимум.

Напиши напоминание о том, что задачи всё ещё висят.

Примеры стиля:
- "Задачи всё ещё висят. Удивительно."
- "Ну да, сами себя они не сделают."
- "И это всё?"
- "Я почти впечатлена."
- "Прокрастинация — это когда ты сейчас."
- "Твои задачи скучают. Ты — нет."

Ответь ТОЛЬКО одной короткой фразой без эмодзи.`;

export async function generateSarcasticMessage(): Promise<string | null> {
  return callOpenAI(SARCASTIC_PROMPT);
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
        max_tokens: 60,
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
