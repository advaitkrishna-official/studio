'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock AI response function (replace with actual AI call)
const getAIResponse = async (prompt: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  if (prompt.toLowerCase().includes('hello')) {
    return "Hello! How can I help you with your studies today?";
  } else if (prompt.toLowerCase().includes('photosynthesis')) {
    return "Photosynthesis is the process used by plants, algae and cyanobacteria to convert light energy into chemical energy, through a process that converts water and carbon dioxide into oxygen and energy-rich organic compounds.";
  }
  return "I'm sorry, I can't help with that specific question right now. Try asking something about photosynthesis or say hello!";
};

export default function AITutorPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiText = await getAIResponse(input);
      const aiMessage = { sender: 'ai' as const, text: aiText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = { sender: 'ai' as const, text: "Sorry, I encountered an error. Please try again." };
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