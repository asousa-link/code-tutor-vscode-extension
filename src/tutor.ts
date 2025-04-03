import * as vscode from 'vscode';
import { handleError, logger } from './telemetry';

export const FULLNAME = 'Code Tutor';

const BASE_PROMPT =
  'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.';

const EXERCISES_PROMPT =
  'You are a helpful tutor. Your job is to teach the user with fun, simple exercises that they can complete in the editor. Your exercises should start simple and get more complex as the user progresses. Move one concept at a time, and do not move on to the next concept until the user provides the correct answer. Give hints in your exercises to help the user learn. If the user is stuck, you can provide the answer and explain why it is the answer. If the user asks a non-programming question, politely decline to respond.';

interface ITutorChatResult extends vscode.ChatResult {}

export const ID = 'chat-tutorial.code-tutor';

export async function tutor(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<ITutorChatResult> {
  console.log('DEBUG: REFERENCE:');
  console.debug(request.references);
  let prompt: string;

  switch (request.command) {
    case 'exercise':
      prompt = EXERCISES_PROMPT;
      break;
    default:
      prompt = BASE_PROMPT;
  }

  // Initialize messages array
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];

  // Get previous participant messages
  // const previousMessages = context.history.filter( (h) => h instanceof vscode.ChatResponseTurn);
  const previousMessages = context.history;
  console.log('DEBUG: CONTEXT:');
  console.log(context.history);

  // Push previous messages to the array
  previousMessages.forEach((m) => {
    // Previous model responses
    if (m instanceof vscode.ChatResponseTurn) {
      let fullMessage = '';
      m.response.forEach((r) => {
        const mdPart = r as vscode.ChatResponseMarkdownPart;
        fullMessage += mdPart.value.value;
      });
      messages.push(
        vscode.LanguageModelChatMessage.Assistant(
          fullMessage,
          m.participant || FULLNAME
        )
      );
      // Previous user prompts
    } else if (m instanceof vscode.ChatRequestTurn) {
      messages.push(vscode.LanguageModelChatMessage.User(m.prompt, 'Human'));
    }
  });

  // Add the user's message
  messages.push(vscode.LanguageModelChatMessage.User(request.prompt, 'Human'));

  console.log('DEBUG: MESSAGES:');
  console.log(messages);

  // Send the request
  try {
    const chatResponse = await request.model.sendRequest(messages, {}, token);

    // Stream the response
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  } catch (err) {
    handleError(logger, err, stream);
  }

  logger.logUsage('request', { kind: '' });
  return { metadata: { command: '' } };
};
