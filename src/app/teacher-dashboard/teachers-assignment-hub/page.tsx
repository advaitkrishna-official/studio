'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface McqQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedTo: { classId: string; studentIds: string[] };
  createdBy: string;
  createdAt: Timestamp;
  type: AssignmentType;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: McqQuestion[];
}

interface NonMcqAssignment extends BaseAssignment {
  type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: McqQuestion[];
}

type Assignment = McqAssignment | NonMcqAssignment;

export default function TeachersAssignmentHubPage() {
  const { toast } = useToast();
  const { user, userClass } = useAuth();

  const [selectedClass, setSelectedClass] = useState(userClass || '');
  const [classes] = useState<string[]>([
    'Grade 1','Grade 2','Grade 3','Grade 4',
    'Grade 5','Grade 6','Grade 7','Grade 8'
  ]);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date>(new Date());

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    type: 'Written' as AssignmentType,
    mcqQuestions: [] as McqQuestion[],
    assignedTo: { classId: selectedClass, studentIds: [] as string[] },
  });

  // AI‐generated MCQs (only fully valid ones)
  const [generatedMCQs, setGeneratedMCQs] = useState<{ questions: McqQuestion[] } | null>(null);
  const [mcqTopic, setMcqTopic] = useState('');
  const [mcqCount, setMcqCount] = useState(5);
  const [isGenMCQ, setIsGenMCQ] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // when class changes, update newAssignment.assignedTo
    setNewAssignment(a => ({
      ...a,
      assignedTo: { ...a.assignedTo, classId: selectedClass }
    }));
  }, [selectedClass]);

  useEffect(() => {
    if (!user || !selectedClass) {
      setAssignments([]);
      return;
    }
    const q = query(
      collection(db, 'assignments'),
      where('createdBy','==',user.uid),
      where('assignedTo.classId','==', selectedClass),
      orderBy('createdAt','desc')
    );
    return onSnapshot(q, snap => {
      const items: Assignment[] = snap.docs.map(d => {
        const data = d.data() as DocumentData;
        // normalize dueDate
        let due = data.dueDate instanceof Timestamp
          ? data.dueDate.toDate()
          : new Date(data.dueDate);
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          type: data.type,
          dueDate: due,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
        } as Assignment;
      }).filter(a => a.dueDate);
      setAssignments(items);
    });
  }, [user, selectedClass]);

  const formatDate = (d: Date) => format(d, 'PPP');

  const handleCreate = async () => {
    if (!user || !selectedClass) {
      toast({ title:'Error', description:'Select a class.' });
      return;
    }
    if (!newAssignment.title || !newAssignment.description) {
      toast({ title:'Error', description:'Fill title & desc.' });
      return;
    }
    if (
      newAssignment.type === 'MCQ' &&
      newAssignment.mcqQuestions.length === 0
    ) {
      toast({ title:'Error', description:'Generate MCQs.' });
      return;
    }
    try {
      await addDoc(collection(db,'assignments'), {
        ...newAssignment,
        dueDate: newDueDate,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title:'Success', description:'Assignment created.' });
      setIsCreateOpen(false);
      setNewAssignment({
        title:'', description:'', type:'Written',
        mcqQuestions:[], assignedTo:{ classId:selectedClass, studentIds:[] }
      });
      setGeneratedMCQs(null);
    } catch {
      toast({ variant:'destructive', title:'Error', description:'Failed to save.' });
    }
  };

  const handleGenMCQ = async () => {
    if (!mcqTopic.trim()) {
      toast({ title:'Error', description:'Enter a topic.' });
      return;
    }
    setIsGenMCQ(true);
    try {
      const res: GenerateMCQOutput = await generateMCQ({
        topic: mcqTopic,
        numQuestions: mcqCount,
        grade: selectedClass.toLowerCase().replace(/\s+/g,'-'),
      });
      // filter into our required shape
      const clean: McqQuestion[] = (res.questions||[])
        .filter(
          (q): q is McqQuestion =>
            typeof q.question==='string' &&
            Array.isArray(q.options) &&
            typeof q.correctAnswer==='string'
        );
      if (clean.length===0) {
        toast({ title:'Info', description:'No valid questions returned.' });
      }
      setGeneratedMCQs({ questions: clean });
      setNewAssignment(a => ({ ...a, mcqQuestions: clean }));
      setCurrentIndex(0);
    } catch(e:any) {
      toast({ variant:'destructive', title:'Error', description:e.message||'AI error' });
    } finally {
      setIsGenMCQ(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Teachers Assignment Hub</CardTitle>
          <CardDescription>Select class & create assignments</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 items-center mb-4">
            <Label>Select Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Class"/></SelectTrigger>
              <SelectContent>
                {classes.map(c=> <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={()=>setIsCreateOpen(true)}>New Assignment</Button>
          </div>

          {assignments.length>0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map(a=>(
                  <TableRow key={a.id}>
                    <TableCell>{a.title}</TableCell>
                    <TableCell><Badge>{a.type}</Badge></TableCell>
                    <TableCell>{formatDate(a.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No assignments yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Create / Generate MCQ Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Assignment</DialogTitle>
            <DialogDescription>Fill in details below.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side */}
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({...newAssignment, title:e.target.value})}
                  placeholder="Assignment Title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newAssignment.description}
                  onChange={e=>setNewAssignment({...newAssignment, description:e.target.value})}
                  placeholder="Assignment Description"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newAssignment.type}
                  onValueChange={v => setNewAssignment({...newAssignment, type:v as AssignmentType})}
                >
                  <SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger>
                  <SelectContent>
                    {(['Written','MCQ','Test','Other'] as AssignmentType[]).map(t=>
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full text-left">
                      <CalendarIcon className="mr-2 inline-block"/> {formatDate(newDueDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={newDueDate}
                      onSelect={(d:any)=>setNewDueDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Right side: only for MCQ */}
            {newAssignment.type==='MCQ' ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Generate MCQs</h3>
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={mcqTopic}
                    onChange={e=>setMcqTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis"
                  />
                </div>
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={mcqCount}
                    onChange={e=>setMcqCount(+e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGenMCQ}
                  disabled={isGenMCQ || !mcqTopic.trim()}
                >
                  {isGenMCQ ? 'Generating…' : 'Generate MCQs'}
                </Button>

                {generatedMCQs && generatedMCQs.questions.length>0 && (
                  <div>
                    <Label>Preview ({currentIndex+1}/{generatedMCQs.questions.length})</Label>
                    <Card className="p-4">
                      <p className="font-medium">{generatedMCQs.questions[currentIndex].question}</p>
                      <ul className="list-disc pl-5 mt-2 text-sm">
                        {generatedMCQs.questions[currentIndex].options.map((o,i)=>(
                          <li
                            key={i}
                            className={o===generatedMCQs.questions[currentIndex].correctAnswer ? 'text-green-600 font-semibold' : ''}
                          >
                            {o} {o===generatedMCQs.questions[currentIndex].correctAnswer && '(Correct)'}
                          </li>
                        ))}
                      </ul>
                    </Card>
                    <div className="flex justify-between mt-2">
                      <Button
                        variant="outline"
                        onClick={()=>setCurrentIndex(i=>Math.max(i-1,0))}
                        disabled={currentIndex===0}
                      >
                        <ArrowLeft className="mr-1"/> Prev
                      </Button>
                      <Button
                        variant="outline"
                        onClick={()=>setCurrentIndex(i=>Math.min(i+1, generatedMCQs.questions.length-1))}
                        disabled={currentIndex===generatedMCQs.questions.length-1}
                      >
                        Next <ArrowRight className="ml-1"/>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed p-8 text-gray-400">
                MCQ options appear here when you select “MCQ” above.
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-4">
            <Button variant="secondary" onClick={()=>setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
