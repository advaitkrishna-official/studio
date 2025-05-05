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
    <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-10rem)]"> {/* Adjust height as needed */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>AI Tutor</CardTitle>
          <CardDescription>Ask me anything about your studies!</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                  <Avatar className="h-8 w-8">
                     <AvatarImage src="https://picsum.photos/seed/ai/200/200" alt="AI Avatar" data-ai-hint="robot avatar"/>
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[75%] ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.text}
                </div>
                 {msg.sender === 'user' && (
                    <Avatar className="h-8 w-8">
                       <AvatarImage src="https://picsum.photos/seed/user/200/200" alt="User Avatar" data-ai-hint="user avatar" />
                       <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                 )}
              </div>
            ))}
             {isLoading && (
                <div className="flex gap-3">
                   <Avatar className="h-8 w-8">
                      <AvatarImage src="https://picsum.photos/seed/ai/200/200" alt="AI Avatar" data-ai-hint="robot avatar"/>
                      <AvatarFallback>AI</AvatarFallback>
                   </Avatar>
                   <div className="rounded-lg p-3 bg-muted animate-pulse">
                      Thinking...
                   </div>
                </div>
             )}
          </ScrollArea>
          <div className="border-t p-4 flex items-center gap-2">
            <Textarea
              placeholder="Type your question here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 resize-none min-h-[40px] max-h-[150px]"
              rows={1}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
