"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";

const FlashcardPage = () => {
  const [topic, setTopic] = useState("");
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
    try {
      const result = await generateFlashcards({ topic, numCards });
      setFlashcards(result);
    } catch (e: any) {
      setError(e.message || "An error occurred while generating flashcards.");
    } finally {
            setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Flashcard Generator</CardTitle>
          <CardDescription>
            Enter a topic and the number of flashcards to generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="Enter topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numCards">Number of Flashcards</Label>
            <Input
              id="numCards"
              type="number"
              placeholder="Number of flashcards to generate"
              value={numCards.toString()}
              onChange={(e) => setNumCards(parseInt(e.target.value))}
            />
          </div>
            <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Generating Flashcards..." : "Generate Flashcards"}
            </Button>
            {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {flashcards && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated Flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated flashcards on the topic of {topic}
          </p>
          <div className="grid gap-4 mt-4">
            {flashcards.flashcards.map((card, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Card {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">Front: {card.front}</p>
                  <p>Back: {card.back}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardPage;
