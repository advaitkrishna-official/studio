"use client";

import { useState, useEffect } from "react";

// Auth & Toast
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

// AI Flows
import {
  generateLongAnswerQuestions,
  GenerateLongAnswerQuestionsOutput,
} from "@/ai/flows/generate-long-answer-questions";
import { checkLongAnswer } from "@/ai/flows/check-long-answer";

// Firebase helpers
import { saveGrade, getGrades } from "@/lib/firebase";

// UI Components
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
