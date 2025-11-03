/**
 * Project Workflow Modal
 * 
 * Interactive modal for guiding users through the project manager workflow
 * Handles intent validation, decomposition, and skill assessment
 */

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ProjectWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
  onComplete?: (results: any) => void;
}

export const ProjectWorkflowModal = ({
  open,
  onOpenChange,
  projectId,
  userId,
  onComplete,
}: ProjectWorkflowModalProps) => {
  const [response, setResponse] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');

  const {
    connected,
    currentQuestion,
    progress,
    sendResponse,
    startWorkflow,
  } = useWebSocket(
    (results) => {
      // Workflow completed
      console.log('Workflow completed with results:', results);
      if (onComplete) {
        onComplete(results);
      }
      // Close modal after a delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    },
    (error) => {
      console.error('Workflow error:', error);
    }
  );

  // Start workflow when modal opens
  useEffect(() => {
    if (open && connected && projectId && userId) {
      startWorkflow(projectId, userId).catch(console.error);
    }
  }, [open, connected, projectId, userId, startWorkflow]);

  // Reset state when question changes
  useEffect(() => {
    setResponse('');
    setSelectedOption('');
  }, [currentQuestion]);

  const handleSubmitResponse = () => {
    if (!currentQuestion) return;

    let finalResponse: any = response;

    // Handle different question types
    switch (currentQuestion.type) {
      case 'multiple_choice':
        finalResponse = selectedOption || response;
        break;
      case 'yes_no':
        finalResponse = selectedOption === 'Yes' || selectedOption === 'yes';
        break;
      case 'scale':
        finalResponse = parseInt(response) || 1;
        break;
      case 'free_text':
      default:
        finalResponse = response;
        break;
    }

    if (!finalResponse) {
      return; // Don't send empty responses
    }

    sendResponse(finalResponse);
    setResponse('');
    setSelectedOption('');
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'yes_no':
        return (
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="yes" />
              <Label htmlFor="yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="no" />
              <Label htmlFor="no">No</Label>
            </div>
          </RadioGroup>
        );

      case 'multiple_choice':
        return (
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'scale':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              min={currentQuestion.options?.[0] || 1}
              max={
                currentQuestion.options?.[currentQuestion.options.length - 1] ||
                5
              }
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter a number"
            />
            <div className="text-sm text-muted-foreground">
              Scale:{' '}
              {currentQuestion.options?.[0] || 1} to{' '}
              {currentQuestion.options?.[currentQuestion.options.length - 1] ||
                5}
            </div>
          </div>
        );

      case 'free_text':
      default:
        return (
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            className="resize-none"
          />
        );
    }
  };

  const canSubmit = () => {
    if (!currentQuestion) return false;

    switch (currentQuestion.type) {
      case 'yes_no':
      case 'multiple_choice':
        return !!selectedOption;
      case 'scale':
      case 'free_text':
        return response.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Project Workflow Assistant</DialogTitle>
          <DialogDescription>
            Let's work through your project together. Answer the questions to
            help me understand your goals and create a plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          {!connected && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting to workflow server...</span>
            </div>
          )}

          {/* Progress Indicator */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{progress.stage}</span>
                {progress.progress !== undefined && (
                  <span className="text-muted-foreground">
                    {progress.progress}%
                  </span>
                )}
              </div>
              {progress.progress !== undefined && (
                <Progress value={progress.progress} className="h-2" />
              )}
              <p className="text-sm text-muted-foreground">
                {progress.message}
              </p>
            </div>
          )}

          {/* Current Question */}
          {currentQuestion && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.context &&
                  Object.keys(currentQuestion.context).length > 0 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {currentQuestion.context.gap && (
                        <p>Skill: {currentQuestion.context.gap.skill}</p>
                      )}
                      {currentQuestion.context.subproject && (
                        <p>
                          For subproject: {currentQuestion.context.subproject}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              <div className="space-y-4">
                {renderQuestionInput()}

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={!canSubmit()}
                  >
                    Submit Answer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting State */}
          {connected && !currentQuestion && !progress && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing your project...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};







