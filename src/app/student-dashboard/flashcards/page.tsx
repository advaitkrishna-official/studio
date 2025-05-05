'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader, // Added CardHeader
  CardTitle, // Added CardTitle
  CardDescription // Added CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateFlashcards, GenerateFlashcardsOutput } from '@/ai/flows/generate-flashcards';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { getGrades } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type Grade = { id: string; score: number };

interface AnimatedFlashcardProps {
  front: string;
  back: string;
}

const AnimatedFlashcard = React.forwardRef<HTMLDivElement, AnimatedFlashcardProps>(
  ({ front, back }, ref) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = () => {
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }
      const next = !isFlipped;
      setIsFlipped(next);
      if (next) {
        flipTimeoutRef.current = setTimeout(() => {
          setIsFlipped(false);
          flipTimeoutRef.current = null;
        }, 5000); // 5 seconds timeout
      }
    };

    useEffect(() => {
      // Cleanup timeout on unmount
      return () => {
        if (flipTimeoutRef.current) {
          clearTimeout(flipTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      // Reset flip state and timeout when content changes (new card)
      setIsFlipped(false);
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }
    }, [front, back]);

    return (
      <div
        ref={ref}
        className="w-full h-56 perspective cursor-pointer" // Added perspective class
        onClick={handleClick}
        aria-live="polite" // Announce content changes for screen readers
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full h-full preserve-3d" // Added preserve-3d
        >
          {/* Front Face */}
          <Card className="absolute inset-0 backface-hidden flex items-center justify-center p-6 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg shadow-lg"> {/* Added backface-hidden */}
             <CardContent className="text-center p-0"> {/* Removed default CardContent padding */}
                <h3 className="text-xl font-semibold text-indigo-800 mb-2">Question</h3>
                <p className="text-lg text-gray-800">{front}</p>
             </CardContent>
          </Card>
          {/* Back Face */}
          <Card className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-6 bg-gradient-to-br from-green-100 to-teal-100 rounded-lg shadow-lg"> {/* Added rotate-y-180 and backface-hidden */}
             <CardContent className="text-center p-0"> {/* Removed default CardContent padding */}
               <h3 className="text-xl font-semibold text-green-800 mb-2">Answer</h3>
               <p className="text-lg text-gray-800">{back}</p>
             </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }
);

AnimatedFlashcard.displayName = 'AnimatedFlashcard';


export default function AnimatedFlashcardPage() {
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for AI generation
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentCard, setCurrentCard] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user, userClass, loading: authLoading } = useAuth(); // Get user, class, and auth loading state
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const { toast } = useToast();

  // Debug log for auth state changes
  useEffect(() => {
    console.log(`Flashcards Page - Auth State: user: ${!!user}, userClass: ${userClass}, authLoading: ${authLoading}`);
  }, [user, userClass, authLoading]);

  // Fetch average score from previous grades
  const fetchTotalScore = useCallback(async () => {
    if (!user || authLoading) { // Also wait for auth loading to finish
      setTotalScore(null);
      return;
    }
    try {
      const grades: Grade[] = await getGrades(user.uid);
      if (grades.length) {
        const avg = grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length;
        setTotalScore(avg);
      } else {
        setTotalScore(0);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch previous scores.' });
      setTotalScore(0); // Set to 0 on error to avoid null state loops
    }
  }, [user, toast, authLoading]); // Add authLoading

  useEffect(() => {
    fetchTotalScore();
  }, [fetchTotalScore]); // Dependency array already correct

  const handleGenerate = async () => {
    console.log(`[Flashcards Page] handleGenerate called. authLoading: ${authLoading}, user: ${!!user}, userClass: ${userClass}`); // Debug log

    // Enhanced check for auth status and userClass
    if (authLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'Authentication is still loading.' });
      console.log("Flashcards: Generation blocked - auth is loading.");
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please log in to generate flashcards.' });
       console.log("Flashcards: Generation blocked - user not logged in.");
      return;
    }
    // Check userClass AFTER checking authLoading and user
    if (!userClass) {
      toast({ variant: 'destructive', title: 'Error', description: 'Student grade information is missing. Cannot generate flashcards.' });
      console.error("Flashcard Generation Error: userClass is null or undefined even though authLoading is false and user exists.");
      setError("Could not load your grade information. Please try logging out and back in.");
      return;
    }
    if (!topic.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a topic.' });
      return;
    }

    setIsLoading(true); // Start loading for AI generation
    setError(null);
    setFlashcards(null);
    setProgress(10);
    setCurrentCard(0);

    try {
      setProgress(50);
      // Prepare grade string for AI (e.g., "Grade 8" -> "grade-8")
      const gradeForAI = userClass.toLowerCase().replace(/\s+/g, '-');
      const inputData = { topic, numCards, grade: gradeForAI };
      console.log(`[Flashcards Page] Sending input to generateFlashcards flow:`, inputData); // Log input data

      // Use a timeout to ensure the progress bar is visible for a moment
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for 300ms

      // Call the AI flow
      const res = await generateFlashcards({ topic, numCards, grade: gradeForAI });

      if (res?.flashcards && Array.isArray(res.flashcards)) {
         if (res.flashcards.length > 0) {
           setFlashcards(res);
           setProgress(100);
           toast({ title: 'Flashcards Generated', description: `${res.flashcards.length} cards ready!` });
           console.log(`[Flashcards Page] Successfully generated ${res.flashcards.length} flashcards.`); // Log success
         } else {
           // Handle case where AI returns an empty array
           setError('No flashcards were generated for this topic and grade.');
           toast({ variant: 'default', title: 'No Cards Generated', description: 'Try a different topic or number of cards.' });
           setProgress(0);
         }
      } else {
        console.error("[Flashcards Page] Received invalid response structure from generateFlashcards:", res); // More specific error log
        throw new Error('Received invalid response from AI.');
      }
    } catch (e: any) {
      console.error("Flashcards: Error generating flashcards:", e); // Log the detailed error
      const msg = e.message?.includes('Quota')
        ? 'API quota limit reached. Please try again later.'
        : e.message?.includes('invalid response')
        ? 'The AI returned an unexpected response. Please try again.'
        : e.message?.includes('AI returned an invalid response structure') // Catch specific errors
        ? 'The AI failed to generate cards in the expected format. Please try again.'
        : e.message || 'An error occurred during generation.';
      setError(msg);
      setProgress(0);
      toast({ variant: 'destructive', title: 'Generation Failed', description: msg });
    } finally {
      setIsLoading(false); // Stop AI generation loading
    }
  };

  const nextCard = () => setCurrentCard(i => Math.min(i + 1, (flashcards?.flashcards.length || 1) - 1));
  const prevCard = () => setCurrentCard(i => Math.max(i - 1, 0));

  // Disable button if auth is loading, AI is generating, user info missing, or topic empty
  const isGenerateDisabled = isLoading || authLoading || !user || !userClass || !topic.trim();
  console.log(`Flashcards: isGenerateDisabled: ${isGenerateDisabled} (isLoading: ${isLoading}, authLoading: ${authLoading}, user: ${!!user}, userClass: ${userClass}, topic empty: ${!topic.trim()})`); // Debug log

  // UI Rendering
  if (authLoading) {
    // Show a loading indicator for the entire page while auth is loading
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 md:p-10">
      {/* Animated Blobs */}
      <motion.div
        className="absolute w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply blur-3xl opacity-30 top-0 left-0"
        animate={{ x: [0, 200, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-56 h-56 bg-pink-300 rounded-full mix-blend-multiply blur-2xl opacity-25 bottom-0 right-0"
        animate={{ x: [0, -150, 0], y: [0, -50, 0] }}
        transition={{ duration: 18, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Flashcard Generator</h1>
          <p className="text-gray-600 mt-1">Enter a topic and number of cards to study.</p>
          {/* Display User Class or error state */}
          {userClass ? (
            <p className="text-sm text-gray-500 mt-1">Grade Level: {userClass}</p>
          ) : user && !authLoading ? ( // Check user existence and ensure auth is not loading before showing the error
            <p className="text-sm text-red-500 mt-1">Grade information not loaded. Please log in again.</p>
          ) : !user ? ( // Message for logged out users
             <p className="text-sm text-gray-500 mt-1">Please log in to see grade info.</p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Loading grade information...</p> // Show loading message
          )}
        </div>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, World War II"
              disabled={!userClass && !authLoading} // Disable if userClass missing AND auth finished loading
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numCards">Number of Cards (1–20)</Label>
            <Input
              id="numCards"
              type="number"
              value={numCards}
              onChange={e => setNumCards(Math.max(1, Math.min(20, +e.target.value)))}
              min={1}
              max={20}
               disabled={!userClass && !authLoading} // Disable if userClass missing AND auth finished loading
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerateDisabled} // Use combined disabled state
            className="md:col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {isLoading ? 'Generating…' : 'Generate Flashcards'}
          </Button>
        </div>

        {/* Progress & Feedback */}
        {isLoading && <Progress value={progress} className="h-2 w-full" />}
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        {totalScore !== null && !isLoading && !error && ( // Only show score if not loading/erroring
          <p className="text-right text-gray-700 font-medium mt-2">
            Average Flashcard Score: {totalScore.toFixed(1)}%
          </p>
        )}

        {/* Flashcard Viewer */}
        {flashcards?.flashcards && flashcards.flashcards.length > 0 ? (
          <div className="mt-6">
            <p className="text-center text-sm text-muted-foreground mb-2">
              Card {currentCard + 1} of {flashcards.flashcards.length}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={prevCard}
                disabled={currentCard === 0}
                aria-label="Previous Card"
              >
                <ArrowLeft />
              </Button>
              <AnimatedFlashcard
                key={currentCard}
                front={flashcards.flashcards[currentCard].front}
                back={flashcards.flashcards[currentCard].back}
                ref={cardRef}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={nextCard}
                disabled={currentCard === flashcards.flashcards.length - 1}
                 aria-label="Next Card"
              >
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          !isLoading &&
          !error &&
          flashcards === null && ( // Show placeholder only if not loading, no error, and no generation attempt made/failed
            <p className="text-center text-gray-500 mt-6">
              Enter a topic above to generate flashcards.
            </p>
          )
        )}
      </motion.div>
    </div>
  );
}