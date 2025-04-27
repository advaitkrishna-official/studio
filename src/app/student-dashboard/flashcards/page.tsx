"use client";

import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateFlashcards, GenerateFlashcardsOutput } from "@/ai/flows/generate-flashcards";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import React from "react";
import { useAuth } from "@/components/auth-provider";
import { getGrades } from "@/lib/firebase";

type Grade = {
  id: string;
  score: number
}

const FlashcardPage = () => {
  const [topic, setTopic] = useState("");
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<string>("grade-8"); // Default grade
  const [totalScore, setTotalScore] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      getGrades(user.uid)
        .then((grades) => {
          const gradesData = grades as Grade[];
          if (gradesData.length > 0) {
            const sum = gradesData.reduce((acc, grade) => acc + grade.score, 0);
            setTotalScore(sum);
          }
            }).catch(e => {
                console.error("Error fetching grades:", e);
                setError(e.message || "An error occurred while fetching grades.");
            });
        }
    }, [user]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await generateFlashcards({ topic, numCards, grade: selectedGrade });
      setFlashcards(result);
      setProgress(100);
      setCurrentCardIndex(0); // Reset to the first card after generating new flashcards
    } catch (e: any) {
      setError(e.message || "An error occurred while generating flashcards.");
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prevIndex) => Math.min(prevIndex + 1, (flashcards?.flashcards?.length || 1) - 1));
  };

  const handlePreviousCard = () => {
    setCurrentCardIndex((prevIndex) => Math.max(prevIndex - 1, 0));
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
              onChange={(e) => {
                const parsedValue = parseInt(e.target.value);
                if (!isNaN(parsedValue)) {
                  setNumCards(parsedValue);
                }
              }}
            />
            </div><div className="grid gap-2">
            <Label htmlFor="grade">Grade</Label>
            <Select
              onValueChange={setSelectedGrade}
              defaultValue={selectedGrade}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grade-8">Grade 8</SelectItem>
                <SelectItem value="grade-6">Grade 6</SelectItem>
                <SelectItem value="grade-4">Grade 4</SelectItem>
              </SelectContent>
            </Select>
            </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Generating Flashcards..." : "Generate Flashcards"}
          </Button>
          {isLoading && (
            <Progress value={progress} className="mt-2" />
          )}
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>{totalScore !== null && (
        <div className="mt-4 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold tracking-tight">Total Score</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your total score: {totalScore}%
          </p>
        </div>
      )}

      
      {flashcards && flashcards.flashcards && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated Flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated flashcards on the topic of {topic}
          </p>
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" size="icon" onClick={handlePreviousCard} disabled={currentCardIndex === 0}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-full">
              {flashcards.flashcards[currentCardIndex] && (
                <AnimatedFlashcard
                  front={flashcards.flashcards[currentCardIndex].front}
                  back={flashcards.flashcards[currentCardIndex].back}
                  ref={cardRef}
                />
              )}
            </div>
              <Button
              variant="outline"
              size="icon"
              onClick={handleNextCard}
              disabled={currentCardIndex === flashcards.flashcards.length - 1}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface AnimatedFlashcardProps {
  front: string;
  back: string
}

const AnimatedFlashcard = React.forwardRef<
  HTMLDivElement,
  AnimatedFlashcardProps
>(({ front, back }, ref) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleClick = () => {
    setIsFlipped(!isFlipped)
  }

    useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(false)
      }, 5000) // 5 seconds
      return () => clearTimeout(timer)
    }
  }, [isFlipped])

  return (<Card className="w-full h-48 relative transform-style-3d">
    <div className={cn("w-full h-full absolute transition-transform duration-500 transform-style-3d",
      "backface-hidden",
      isFlipped ? "rotate-y-180" : "")}>
        <div
          className="absolute w-full h-full"
          onClick={handleClick}
        >
          <CardContent className="flex items-center justify-center h-full">
            <p className="text-xl font-bold">{!isFlipped ? front : back}</p>
          </CardContent>
        </div>
      </div>
  </Card>);
})

AnimatedFlashcard.displayName = "AnimatedFlashcard"

export default FlashcardPage


