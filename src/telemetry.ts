import * as vscode from 'vscode';

export const logger: vscode.TelemetryLogger = vscode.env.createTelemetryLogger({
    sendEventData(eventName, data) {
      console.log(`Event: ${eventName}`);
      console.log(`Data: ${JSON.stringify(data)}`);
    },
    sendErrorData(error, data) {
      console.error(`Error: ${error}`);
      console.error(`Data: ${JSON.stringify(data)}`);
    },
  });

export function handleError(
  logger: vscode.TelemetryLogger,
  err: any,
  stream: vscode.ChatResponseStream
): void {
  // making the chat request might fail because
  // - model does not exist
  // - user consent not given
  // - quote limits exceeded
  logger.logError(err);

  if (err instanceof vscode.LanguageModelError) {
    console.log(err.message, err.code, err.cause);
    stream.markdown('An error occurred:');
    stream.markdown('```');
    stream.markdown(`${err.code} ${err.cause}`);
    stream.markdown(`${err.message}`);
    stream.markdown('```');
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}
