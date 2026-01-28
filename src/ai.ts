import OpenAI from 'openai';
import { config } from './config.js';
import { Task } from './database.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface AnalysisResult {
  taskNumber: number | null;
  shouldComplete: boolean;
  summary: string;
}

const SYSTEM_PROMPT = `You analyze user replies about tasks in a chat.
Based on the user's message and the task list, determine:
1. Which task number (1-based) the user is referring to (if any)
2. Whether the task should be marked as completed

Respond in JSON format:
{
  "taskNumber": <number or null>,
  "shouldComplete": <boolean>,
  "summary": "<brief summary>"
}

Examples of messages that mean task is done:
- "done", "completed", "finished", "ready"
- "made it", "sent it", "did it"
- Any confirmation that work is complete

If the message is unclear or doesn't relate to completing a task, return:
{"taskNumber": null, "shouldComplete": false, "summary": "unclear"}`;

export async function analyzeReply(
  userMessage: string,
  tasks: Task[]
): Promise<AnalysisResult> {
  if (!config.openai.apiKey) {
    return { taskNumber: null, shouldComplete: false, summary: 'AI not configured' };
  }

  const taskList = tasks
    .map((t, i) => `${i + 1}. ${t.description}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Task list:\n${taskList}\n\nUser message: "${userMessage}"`,
      },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  const content = response.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AnalysisResult;
    }
  } catch (error) {
    console.error('Failed to parse AI response:', content);
  }

  return { taskNumber: null, shouldComplete: false, summary: 'parse error' };
}
