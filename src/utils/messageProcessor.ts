import { messageModeHandler } from "@/utils/messageModeHandler";

export interface ProcessMessageResult {
  success: boolean;
  output?: string;
  error?: string;
}

export const processUserMessage = async (message: string, userId: string): Promise<ProcessMessageResult> => {
  try {
    const result = await messageModeHandler.processMessage(message, userId);
    return {
      success: result.success,
      output: result.output || "Processing completed successfully.",
      error: result.error
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const getDefaultErrorMessage = (error?: string) => {
  return error 
    ? `I encountered an issue processing your request: ${error}`
    : "I'm having trouble connecting to the backend. Please try again later.";
};