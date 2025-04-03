// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const ANNOTATION_PROMPT = `You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you and then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

import { tutor } from './tutor.js';
import { ID as TUTOR_ID } from './tutor.js';
import { annotateCode } from './annotate.js';
import { logger } from './telemetry.js';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Create a participant
  const tutorParticipant = vscode.chat.createChatParticipant(TUTOR_ID, tutor);
  tutorParticipant.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    'cat.jpeg'
  );

  context.subscriptions.push(
    tutorParticipant.onDidReceiveFeedback(
      (feedback: vscode.ChatResultFeedback) => {
        // Log chat result feedback to be able to compute the success matric of the participant
        // unhelpful / totalRequests is a good success metric
        logger.logUsage('chatResultFeedback', {
          kind: feedback.kind,
        });
      }
    )
  );

  registerTextEditorCommand(context, annotateCode);
}

function registerTextEditorCommand(
  context: vscode.ExtensionContext,
  callback: (
    textEditor: vscode.TextEditor,
    edit: vscode.TextEditorEdit,
    ...args: any[]
  ) => void
) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'code-tutor.annotate',
    callback
  );

  context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}
