import * as vscode from 'vscode';

export const FULLNAME = 'Code Tutor';

const BASE_PROMPT =
  'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Respond with a guided overview of the concept in a series of messages. Do not give the user the answer directly, but guide them to find the answer themselves. If the user asks a non-programming question, politely decline to respond.';

const EXERCISES_PROMPT =
  'You are a helpful tutor. Your job is to teach the user with fun, simple exercises that they can complete in the editor. Your exercises should start simple and get more complex as the user progresses. Move one concept at a time, and do not move on to the next concept until the user provides the correct answer. Give hints in your exercises to help the user learn. If the user is stuck, you can provide the answer and explain why it is the answer. If the user asks a non-programming question, politely decline to respond.';

interface ITutorChatResult extends vscode.ChatResult {}

const TUTOR_ID = 'chat-tutorial.code-tutor';

export function registerParticipant(context: vscode.ExtensionContext) {
  // Define the tutor chat handler.
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ITutorChatResult> => {
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
    messages.push(
      vscode.LanguageModelChatMessage.User(request.prompt, 'Human')
    );

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

  // Create a participant
  const tutor = vscode.chat.createChatParticipant(TUTOR_ID, handler);
  tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'cat.jpeg');

  // Telemetry
  const logger: vscode.TelemetryLogger = vscode.env.createTelemetryLogger({
    sendEventData(eventName, data) {
      console.log(`Event: ${eventName}`);
      console.log(`Data: ${JSON.stringify(data)}`);
    },
    sendErrorData(error, data) {
      console.error(`Error: ${error}`);
      console.error(`Data: ${JSON.stringify(data)}`);
    },
  });

  context.subscriptions.push(
    tutor.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
      // Log chat result feedback to be able to compute the success matric of the participant
      // unhelpful / totalRequests is a good success metric
      logger.logUsage('chatResultFeedback', {
        kind: feedback.kind,
      });
    })
  );
}

function handleError(
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