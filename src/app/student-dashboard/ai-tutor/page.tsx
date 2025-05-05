
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { aiTutor } from '@/ai/flows/ai-tutor-flow'; // Import the new Genkit flow

export default function AITutorPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input; // Capture input before clearing
    setInput('');
    setIsLoading(true);

    try {
      // Call the Genkit flow
      const aiResult = await aiTutor({ prompt: currentInput });
      const aiMessage = { sender: 'ai' as const, text: aiResult.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      let errorMessageText = "Sorry, I encountered an error. Please try again.";
      if (error instanceof Error && error.message.includes('Quota')) {
          errorMessageText = "Sorry, I've reached my processing limit for now. Please try again later.";
      }
      const errorMessage = { sender: 'ai' as const, text: errorMessageText };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent new line on Enter
      handleSendMessage();
    }
  };

  return (
    // Container div removed to make it embeddable, height set on parent
    <Card className="flex-1 flex flex-col h-full shadow-lg"> {/* Added shadow */}
        <CardHeader className="p-4 border-b"> {/* Reduced padding */}
            <CardTitle className="text-lg">AI Tutor</CardTitle> {/* Reduced font size */}
            {/* <CardDescription>Ask me anything!</CardDescription> */}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-3 space-y-3"> {/* Reduced padding and spacing */}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}> {/* Reduced gap */}
                        {msg.sender === 'ai' && (
                            <Avatar className="h-6 w-6"> {/* Smaller avatar */}
                                <AvatarImage src="https://picsum.photos/seed/ai/200/200" alt="AI Avatar" data-ai-hint="robot avatar"/>
                                <AvatarFallback>AI</AvatarFallback>
                            </Avatar>
                        )}
                        <div
                          className={`rounded-lg p-2 text-sm max-w-[75%] ${ /* Reduced padding and font size */
                              msg.sender === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                          }`}
                        >
                            {msg.text}
                        </div>
                        {msg.sender === 'user' && (
                            <Avatar className="h-6 w-6"> {/* Smaller avatar */}
                                <AvatarImage src="https://picsum.photos/seed/user/200/200" alt="User Avatar" data-ai-hint="user avatar" />
                                <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-2"> {/* Reduced gap */}
                        <Avatar className="h-6 w-6"> {/* Smaller avatar */}
                            <AvatarImage src="https://picsum.photos/seed/ai/200/200" alt="AI Avatar" data-ai-hint="robot avatar"/>
                            <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg p-2 bg-muted animate-pulse text-sm"> {/* Reduced padding and font size */}
                            Thinking...
                        </div>
                    </div>
                )}
            </ScrollArea>
            <div className="border-t p-3 flex items-center gap-2"> {/* Reduced padding and gap */}
                <Textarea
                  placeholder="Ask anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 resize-none min-h-[36px] max-h-[120px] text-sm" /* Adjusted height and font size */
                  rows={1}
                  disabled={isLoading}
                />
                <Button size="sm" onClick={handleSendMessage} disabled={isLoading || !input.trim()}> {/* Smaller button */}
                    {isLoading ? '...' : 'Send'} {/* Adjusted loading text */}
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}
