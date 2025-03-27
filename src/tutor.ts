import * as vscode from 'vscode';

export const FULLNAME = 'Code Tutor';

export const BASE_PROMPT =
  'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.';

export const handler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  // Initialize prompt
  let prompt = BASE_PROMPT;

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
  const chatResponse = await request.model.sendRequest(messages, {}, token);

  // Stream the response
  for await (const fragment of chatResponse.text) {
    stream.markdown(fragment);
  }

  return;
};

// Create a participant
export const tutor = vscode.chat.createChatParticipant(
  'chat-tutorial.code-tutor',
  handler
);

// Add icon
export function defineIcon(
  tutor: vscode.ChatParticipant,
  context: vscode.ExtensionContext,
  ...pathSegments: string[]
) {
  tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, ...pathSegments);
}
