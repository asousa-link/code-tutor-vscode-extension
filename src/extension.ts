// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// import * as t from './tutor.js';
const BASE_PROMPT =
  'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    // Initialize prompt
    let prompt = BASE_PROMPT;

    // Initialize messages array
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];

    // Add the user's message
    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

    // Send the request
    const chatResponse = await request.model.sendRequest(messages, {}, token);

    // Stream the response
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }

    return;
  };

  // Create a participant
  const tutor = vscode.chat.createChatParticipant(
    'chat-tutorial.code-tutor',
    handler
  );

  // Add icon
  // tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');

  // const prompt = t.BASE_PROMPT;
  // const handler = t.handler;
  // const tutor = t.tutor;
  // t.defineIcon(tutor, context,'tutor.png');

  /*
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-tutor" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('code-tutor.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Code Tutor!');
	});

	context.subscriptions.push(disposable);
	*/
}

// This method is called when your extension is deactivated
export function deactivate() {}
