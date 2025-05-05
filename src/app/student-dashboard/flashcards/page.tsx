
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateFlashcards, GenerateFlashcardsOutput } from '@/ai/flows/generate-flashcards'; // AI flow import
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider'; // Auth context import
import { getGrades } from '@/lib/firebase'; // Firebase grades import
import { useToast } from '@/hooks/use-toast'; // Toast import

type Grade = { id: string; score: number };

export default function AnimatedFlashcardPage() {
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // Renamed from loadingProgress for clarity
  const [currentCard, setCurrentCard] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user, userClass, loading: authLoading } = useAuth(); // Get user, userClass, and auth loading state
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const { toast } = useToast(); // Use the toast hook

  // Fetch total score - Wrap in useCallback to prevent re-renders
  const fetchTotalScore = React.useCallback(async () => {
    if (user) {
      try {
        const grades: Grade[] = await getGrades(user.uid);
        const flashcardGrades = grades; // Assuming all grades contribute for now
        if (flashcardGrades.length) {
          setTotalScore(flashcardGrades.reduce((a, g) => a + g.score, 0));
        } else {
          setTotalScore(0); // Set to 0 if no grades
        }
      } catch (e) {
        console.error("Failed to fetch grades:", e);
        // Optionally set an error state or show a toast
      }
    } else {
      setTotalScore(null); // Reset score if user logs out
    }
  }, [user]); // Dependency on user

  useEffect(() => {
    fetchTotalScore();
  }, [fetchTotalScore]); // Fetch score when component mounts or user changes

  // Handle flashcard generation
  const handleGenerate = async () => {
    // Prevent generation if auth is still loading or user/class info is missing
    if (authLoading) {
      setError("User information is loading. Please wait.");
      toast({ variant: 'destructive', title: 'Error', description: 'User information is loading.' });
      return;
    }
    if (!user) {
      setError("User not logged in.");
      toast({ variant: 'destructive', title: 'Error', description: 'Please log in to generate flashcards.' });
      return;
    }
    if (!userClass) {
      setError("Student class information is missing. Cannot generate flashcards.");
      toast({ variant: 'destructive', title: 'Error', description: 'Student class info missing.' });
      return;
    }
    if (!topic.trim()) {
       setError("Please enter a topic.");
       toast({ variant: 'destructive', title: 'Error', description: 'Please enter a topic to generate flashcards.' });
       return;
    }

    setIsLoading(true);
    setError(null);
    setFlashcards(null); // Reset previous flashcards
    setProgress(10); // Initial progress
    setCurrentCard(0); // Reset card position

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate progress
      let currentProgress = 10;
      progressInterval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 10) + 5;
        if (currentProgress >= 90) {
          if (progressInterval) clearInterval(progressInterval); // Stop before reaching 100, wait for AI call
        } else {
          setProgress(currentProgress);
        }
      }, 200);

      // Call the AI flow
      console.log(`Generating flashcards for topic: ${topic}, grade: ${userClass}`); // Debug log
      const res = await generateFlashcards({ topic, numCards, grade: userClass });
      if (progressInterval) clearInterval(progressInterval); // Ensure interval is cleared

      if (res && res.flashcards) {
        setFlashcards(res);
        setProgress(100); // Final progress
        toast({ title: 'Flashcards Generated', description: `${res.flashcards.length} cards ready!` });
      } else {
         throw new Error("Received invalid response from AI.");
      }

    } catch (e: any) {
      if (progressInterval) clearInterval(progressInterval); // Clear interval on error too
      console.error("Error generating flashcards:", e); // Log the actual error
      setError(e.message || 'An error occurred during generation.');
      setProgress(0); // Reset progress on error
       toast({
         variant: 'destructive',
         title: 'Generation Failed',
         description: e.message || 'Could not generate flashcards.',
       });
    } finally {
      setIsLoading(false); // Ensure loading state is always reset
      console.log("handleGenerate finished"); // Add log
    }
  };

  const nextCard = () => setCurrentCard(i => Math.min(i + 1, (flashcards?.flashcards.length || 1) - 1));
  const prevCard = () => setCurrentCard(i => Math.max(i - 1, 0));

  const canGenerate = !isLoading && !authLoading && !!userClass && !!topic.trim();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 md:p-10">
      {/* Animated Blobs */}
      <motion.div className="absolute w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply blur-3xl opacity-30 top-0 left-0"
        animate={{ x: [0, 200, 0], y: [0, 50, 0] }} transition={{ duration: 20, repeat: Infinity }} />
      <motion.div className="absolute w-56 h-56 bg-pink-300 rounded-full mix-blend-multiply blur-2xl opacity-25 bottom-0 right-0"
        animate={{ x: [0, -150, 0], y: [0, -50, 0] }} transition={{ duration: 18, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Flashcard Generator</h1>
          <p className="text-gray-600 mt-1">Enter a topic and number of cards to study.</p>
        </div>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Photosynthesis, World War II" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numCards">Number of Cards</Label>
            <Input id="numCards" type="number" value={numCards} onChange={e => setNumCards(Math.max(1, Math.min(20, +e.target.value)))} min="1" max="20" />
          </div>
          {/* Ensure button is clickable and checks for userClass */}
          <Button
             onClick={handleGenerate}
             disabled={!canGenerate} // Simplified disabled logic
             className="md:col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
           >
             {isLoading ? 'Generating...' : 'Generate Flashcards'}
          </Button>
        </div>

        {/* Progress Bar */}
        {isLoading && <Progress value={progress} className="h-2 w-full" />}

        {/* Error Display */}
        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* Total Score Display */}
        {totalScore !== null && <p className="text-right text-gray-700 font-medium">Flashcard Score: {totalScore}%</p>}

        {/* Flashcards Display Area */}
        {flashcards && flashcards.flashcards.length > 0 ? (
          <div className="mt-6">
            <p className="text-center text-sm text-muted-foreground mb-2">Card {currentCard + 1} of {flashcards.flashcards.length}</p>
            <div className="flex items-center justify-center space-x-2 md:space-x-4">
              <Button variant="outline" size="icon" onClick={prevCard} disabled={currentCard === 0}>
                <ArrowLeft />
              </Button>
              <AnimatedFlashcard
                key={currentCard} // Add key to force re-render on card change
                front={flashcards.flashcards[currentCard].front}
                back={flashcards.flashcards[currentCard].back}
                ref={cardRef}
              />
              <Button variant="outline" size="icon" onClick={nextCard} disabled={currentCard === flashcards.flashcards.length - 1}>
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          !isLoading && flashcards === null && ( // Show only if not loading and no flashcards generated yet
            <p className="text-center text-gray-500 mt-6">Enter a topic above to generate flashcards.</p>
          )
        )}
      </motion.div>
    </div>
  );
}

// Define props type for AnimatedFlashcard
interface AnimatedFlashcardProps {
  front: string;
  back: string;
}

const AnimatedFlashcard = React.forwardRef<HTMLDivElement, AnimatedFlashcardProps>(({ front, back }, ref) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to store timeout ID

    const handleClick = () => {
      // Clear any existing timeout if the card is clicked again before 5s
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }

      const newFlipState = !isFlipped;
      setIsFlipped(newFlipState);

      // If flipping to show the back, set timeout to flip back
      if (newFlipState) {
        flipTimeoutRef.current = setTimeout(() => {
          setIsFlipped(false);
          flipTimeoutRef.current = null; // Clear the ref after timeout runs
        }, 5000); // 5000 milliseconds = 5 seconds
      }
    };

    // Cleanup timeout on component unmount or when front/back changes
    useEffect(() => {
      return () => {
        if (flipTimeoutRef.current) {
          clearTimeout(flipTimeoutRef.current);
        }
      };
    }, []);

    // Reset flip state when card content changes
    useEffect(() => {
        setIsFlipped(false);
        // Clear timeout if content changes while timeout is active
        if (flipTimeoutRef.current) {
          clearTimeout(flipTimeoutRef.current);
          flipTimeoutRef.current = null;
        }
    }, [front, back]);

    return (
      <div ref={ref} className="w-full h-56 perspective cursor-pointer" onClick={handleClick}>
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full h-full preserve-3d"
        >
          {/* Front Face */}
          <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-4 md:p-6 text-center bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg shadow-lg">
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <h3 className="text-lg md:text-xl font-semibold text-indigo-800 mb-2">Question</h3>
              <p className="text-base md:text-lg text-gray-700">{front}</p>
            </CardContent>
          </Card>

          {/* Back Face */}
          <Card className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-4 md:p-6 text-center bg-gradient-to-br from-green-100 to-teal-100 rounded-lg shadow-lg">
             <CardContent className="flex-1 flex flex-col items-center justify-center">
              <h3 className="text-lg md:text-xl font-semibold text-green-800 mb-2">Answer</h3>
              <p className="text-base md:text-lg text-gray-700">{back}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
});

AnimatedFlashcard.displayName = 'AnimatedFlashcard';

// Add these styles to globals.css or a relevant CSS module
/*
.perspective { perspective: 1000px; }
.preserve-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
*/
