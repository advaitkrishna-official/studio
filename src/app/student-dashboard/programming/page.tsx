
'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, Zap } from 'lucide-react';
import Link from 'next/link'; // Import Link for internal navigation if needed later

// Dynamically import Monaco editor (client‑only)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ProgrammingPage() {
  const [code, setCode] = useState<string>(
    `// Write JavaScript here and click Run\nconsole.log('Hello, EduAI IDE!');`
  );
  const [output, setOutput] = useState<string>('');
  const consoleRef = useRef<HTMLDivElement>(null);

  const runCode = () => {
    let result = '';
    try {
      const logs: any[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));
      // eslint-disable-next-line no-new-func
      const fn = new Function(code);
      fn();
      console.log = origLog;
      result = logs.join('\n');
    } catch (err: any) {
      result = err.message;
    }
    setOutput(result);
    setTimeout(() => {
      consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Programming Hub</h1>
        <Button variant="outline" onClick={runCode}>
          <Zap className="mr-2 h-4 w-4" /> Run Code
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Embedded IDE */}
        <Card className="col-span-1 md:col-span-2 shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="mr-2 h-5 w-5 text-indigo-500" /> Embedded IDE
            </CardTitle>
            <CardDescription>Type JavaScript and execute below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-80 border rounded overflow-hidden">
              {typeof window !== 'undefined' && (
                <MonacoEditor
                  height="100%"
                  defaultLanguage="javascript"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{ fontSize: 14, minimap: { enabled: false } }}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Console Output:</h3>
              <div
                ref={consoleRef}
                className="h-40 bg-black text-white p-2 overflow-auto rounded"
              >
                {output.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Resources */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="mr-2 h-5 w-5 text-indigo-500" /> Learning Resources
            </CardTitle>
            <CardDescription>Explore tutorials and docs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Introduction to Python</span>
              {/* Wrap Button in an anchor tag for external link */}
              <a href="https://docs.python.org/3/tutorial/introduction.html" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Read Now →
                </Button>
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>JavaScript Fundamentals</span>
              <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Watch Video →
                </Button>
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Data Structures Guide</span>
               <a href="https://www.geeksforgeeks.org/data-structures/" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Explore →
                </Button>
               </a>
            </div>
          </CardContent>
        </Card>

        {/* Practice Problems */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-green-500" /> Practice Problems
            </CardTitle>
            <CardDescription>Coding challenges to sharpen skills.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Easy: Two Sum</span>
              {/* Link to a relevant coding platform or internal problem page */}
              <a href="https://leetcode.com/problems/two-sum/" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Solve →
                </Button>
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Medium: Reverse Linked List</span>
              <a href="https://leetcode.com/problems/reverse-linked-list/" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Solve →
                </Button>
               </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Hard: Find Median from Data Stream</span>
              <a href="https://leetcode.com/problems/find-median-from-data-stream/" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="px-0">
                  Solve →
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 bg-muted p-4 rounded-md shadow-inner">
        <p className="text-muted-foreground text-center">
          Welcome to the Programming section! Enhance your coding skills here.
        </p>
      </div>
    </>
  );
}
