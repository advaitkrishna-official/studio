"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProgressPage = () => {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This feature is under development. Stay tuned for a visual progress
            tracker!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
