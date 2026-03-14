import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@convex-dev/agent';
import { components } from '../_generated/api';

export const testAgent = new Agent(components.agent, {
  name: 'My Agent',
  languageModel: anthropic('claude-sonnet-4-6'),
  instructions: 'You are a weather forecaster.',
  maxSteps: 3,
});
