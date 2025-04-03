import * as vscode from 'vscode';

const ANNOTATION_PROMPT = `You are a code tutor who helps students learn how to write better code. Your job is to evaluate a block of code that the user gives you and then annotate any lines that could be improved with a brief suggestion and the reason why you are making that suggestion. Only make suggestions when you feel the severity is enough that it will impact the readability and maintainability of the code. Be friendly with your suggestions and remember that these are students so they need gentle guidance. Format each suggestion as a single JSON object. It is not necessary to wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 1, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }{ "line": 12, "suggestion": "I think you should use a for loop instead of a while loop. A for loop is more concise and easier to read." }
`;

export async function annotateCode(textEditor: vscode.TextEditor) {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);

      let [model] = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o',
      });

      const messages = [
        vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
        vscode.LanguageModelChatMessage.User(codeWithLineNumbers),
      ];

      if (model) {
        let chatResponse = await model.sendRequest(
          messages,
          {},
          new vscode.CancellationTokenSource().token
        );

        await parseChatResponse(chatResponse, textEditor);
      }
    }

function applyDecoration(
  editor: vscode.TextEditor,
  line: number,
  suggestion: string
) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: ` ${suggestion.substring(0, 30) + '...'}`,
      color: 'grey',
    },
  });

  const lineLength = editor.document.lineAt(line - 1).text.length;
  const range = new vscode.Range(
    new vscode.Position(line - 1, lineLength),
    new vscode.Position(line - 1, lineLength)
  );

  const decoration = { range: range, hoverMessage: suggestion };

  vscode.window.activeTextEditor?.setDecorations(decorationType, [decoration]);
}

async function parseChatResponse(
  chatResponse: vscode.LanguageModelChatResponse,
  textEditor: vscode.TextEditor
) {
  let accumulatedResponse = ``;

  for await (const fragment of chatResponse.text) {
    accumulatedResponse += fragment;

    if (fragment.includes('}')) {
      try {
        const annotation = JSON.parse(accumulatedResponse);
        applyDecoration(textEditor, annotation.line, annotation.suggestion);
        accumulatedResponse = ``;
      } catch (e) {
        // Do nothing
      }
    }
  }
}

function getVisibleCodeWithLineNumbers(textEditor: vscode.TextEditor) {
  let currentLine = textEditor.visibleRanges[0].start.line;
  const endLine = textEditor.visibleRanges[0].end.line;

  let code = ``;

  while (currentLine < endLine) {
    code += `${currentLine + 1}: ${
      textEditor.document.lineAt(currentLine).text
    }\n`;
    currentLine++;
  }

  return code;
}
