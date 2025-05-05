
import React from 'react';

export default function ProgrammingPage() {
  return (
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
      <h1 className="text-3xl font-bold mb-4">Programming</h1>
       <div className="bg-muted p-4 rounded-md shadow-inner">
         <p className="text-muted-foreground">Welcome to the Programming section! Here you will find resources and tools to enhance your coding skills in various languages.</p>
         {/* Add Programming specific content here */}
      </div>
    </>
  );
}

    