'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MyResourcesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Resources</h1>
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Resources 1</CardTitle>
          <CardDescription>this is the description of resource 1</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="https://example.com">Go to Example</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyResourcesPage;