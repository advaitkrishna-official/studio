"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";
import { cn } from "@/lib/utils";

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
          <Button onClick={() => {
            setIsLoading(true);
            setError(null);
            generateFlashcards({ topic, numCards })
              .then(result => setFlashcards(result))
              .catch(e => setError(e.message || "An error occurred while generating flashcards."))
              .finally(() => setIsLoading(false));
          }} disabled={isLoading}>
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
              <AnimatedFlashcard key={index} front={card.front} back={card.back} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface AnimatedFlashcardProps {
  front: string;
  back: string;
}

const AnimatedFlashcard: React.FC<AnimatedFlashcardProps> = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(false);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isFlipped]);

  return (
    <Button variant={"secondary"} className="w-full h-48 relative" onClick={handleClick}>
      <CardContent style={{pointerEvents: "none"}}>
        <p className="text-xl font-bold">{isFlipped ? back : front}</p>
      </CardContent>
    </Button>
  );
};

export default FlashcardPage;

    