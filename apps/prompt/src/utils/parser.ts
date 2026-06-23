/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function extractVariables(content: string): string[] {
  // Regex to detect:
  // 1. {{VARIABLE}}
  // 2. {VARIABLE}
  // 3. [VARIABLE]
  const regex = /\{\{([^{}]+)\}\}|\{([^{}]+)\}|\[([^[\]]+)\]/g;
  const variables: string[] = [];
  let match;
  
  // Re-run matching on the input string to collect all variable names
  while ((match = regex.exec(content)) !== null) {
    const varName = (match[1] || match[2] || match[3] || '').trim();
    // Exclude empty and avoid duplicates
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  return variables;
}

/**
 * Replace placeholders in the prompt text with actual values provided by the user.
 */
export function replaceVariables(content: string, values: Record<string, string>): string {
  const regex = /(\{\{([^{}]+)\}\})|(\{([^{}]+)\})|(\[([^[\]]+)\])/g;
  return content.replace(regex, (fullMatch, p1, p2, p3, p4, p5, p6) => {
    // p2 is double curly inner, p4 is single curly inner, p6 is bracket inner
    const varName = (p2 || p4 || p6 || '').trim();
    return values[varName] !== undefined ? values[varName] : fullMatch;
  });
}

/**
 * Mock actions for enhancing, summarizing, or translating prompts.
 * These simulate AI-driven capabilities and are structured to accept an API key connection latter.
 */
export async function enhancePromptMock(text: string, action: 'enhance' | 'translate' | 'optimize' | 'tone-professional' | 'tone-creative'): Promise<string> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  switch (action) {
    case 'enhance':
      return `${text}\n\n[Enhanced Preview: Act as an expert copywriter with structured reasoning. Utilize step-by-step thinking to structure the requested contents. Break down the response into: 1. Executive Summary, 2. Deep Dive Analysis, 3. Bullet points of key findings.]`;
    case 'translate':
      return `[Translated to Spanish (Simulated API Call)]\n\n${text}`;
    case 'optimize':
      return `${text}\n\n[Optimized Settings: Formatted with markdown parameters, added temperature: 0.7 control, and requested standard output constraints.]`;
    case 'tone-professional':
      return `Dear AI Assistant, please execute the following instruction with high precision, professional terminology, and structured analytical language:\n\n${text}`;
    case 'tone-creative':
      return `Imagine a vibrant, outside-the-box solution, using vivid metaphors and storytelling techniques to deliver the following idea:\n\n${text}`;
    default:
      return text;
  }
}
