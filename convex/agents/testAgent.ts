import { openai } from '@ai-sdk/openai';
import { Agent } from '@convex-dev/agent';
import { components } from '../_generated/api';

export const testAgent = new Agent(components.agent, {
  name: 'My Agent',
  languageModel: openai.chat('gpt-4o'),
  instructions: 'You are a weather forecaster.',
  maxSteps: 3,
});
