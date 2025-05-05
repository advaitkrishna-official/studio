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
import { generateFlashcards, GenerateFlashcardsOutput } from '@/ai/flows/generate-flashcards';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { getGrades } from '@/lib/firebase';

type Grade = { id: string; score: number };

export default function AnimatedFlashcardPage() {
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentCard, setCurrentCard] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user, userClass } = useAuth(); // Get userClass (student's grade)
  const [totalScore, setTotalScore] = useState<number | null>(null);

  // Fetch total score
  useEffect(() => {
    if (user) {
      getGrades(user.uid)
        .then((grades: Grade[]) => {
          if (grades.length) setTotalScore(grades.reduce((a, g) => a + g.score, 0));
        })
        .catch(() => {});
    }
  }, [user]);

  const handleGenerate = async () => {
    if (!userClass) {
        setError("Student grade not found.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setProgress(0);
    try {
      // Pass the student's grade from userClass
      const res = await generateFlashcards({ topic, numCards, grade: userClass });
      setFlashcards(res);
      setProgress(100);
      setCurrentCard(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => setCurrentCard(i => Math.min(i + 1, (flashcards?.flashcards.length || 1) - 1));
  const prevCard = () => setCurrentCard(i => Math.max(i - 1, 0));

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-10">
      {/* Animated Blobs */}
      <motion.div className="absolute w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply blur-3xl opacity-30 top-0 left-0"
        animate={{ x: [0, 200, 0], y: [0, 50, 0] }} transition={{ duration: 20, repeat: Infinity }} />
      <motion.div className="absolute w-56 h-56 bg-pink-300 rounded-full mix-blend-multiply blur-2xl opacity-25 bottom-0 right-0"
        animate={{ x: [0, -150, 0], y: [0, -50, 0] }} transition={{ duration: 18, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Flashcard Generator</h1>
          <p className="text-gray-600">Enter a topic and number of cards to study.</p>
        </div>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Photosynthesis" />
          </div>
          <div className="space-y-2">
            <Label>Number of Cards</Label>
            <Input type="number" value={numCards} onChange={e => setNumCards(+e.target.value)} min="1" max="20" />
          </div>
          {/* Removed Grade Selector */}
          <Button onClick={handleGenerate} disabled={isLoading || !userClass} className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white">
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {isLoading && <Progress value={progress} className="h-2" />}
        {error && <p className="text-red-500">{error}</p>}
        {totalScore !== null && <p className="text-right text-gray-700">Total Score: {totalScore}%</p>}

        {/* Flashcards */}
        {flashcards && (
          <div className="mt-6 flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={prevCard} disabled={currentCard === 0}><ArrowLeft /></Button>
            <AnimatedFlashcard front={flashcards.flashcards[currentCard].front} back={flashcards.flashcards[currentCard].back} ref={cardRef} />
            <Button variant="outline" size="icon" onClick={nextCard} disabled={currentCard === flashcards.flashcards.length - 1}><ArrowRight /></Button>
          </div>
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

    const handleClick = () => {
      setIsFlipped(!isFlipped);
      if (!isFlipped) { // If we are flipping to show the back
        // Set a timeout to flip back after 5 seconds
        setTimeout(() => {
          setIsFlipped(false);
        }, 5000); // 5000 milliseconds = 5 seconds
      }
    };


    // Use useEffect to reset flip state when card content changes (optional, good practice)
    useEffect(() => {
        setIsFlipped(false);
    }, [front, back]);


    return (
      <Card ref={ref} onClick={handleClick} className="w-full h-56 perspective cursor-pointer overflow-hidden rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full h-full preserve-3d" // Added preserve-3d
        >
          {/* Front Face */}
          <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-100 to-blue-100 rounded-lg">
            <h3 className="text-xl font-semibold text-indigo-800 mb-2">Question</h3>
            <p className="text-lg text-gray-700">{ front }</p>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-green-100 to-teal-100 rounded-lg">
            <h3 className="text-xl font-semibold text-green-800 mb-2">Answer</h3>
            <p className="text-lg text-gray-700">{ back }</p>
          </div>
        </motion.div>
      </Card>
    );
});


AnimatedFlashcard.displayName = 'AnimatedFlashcard';