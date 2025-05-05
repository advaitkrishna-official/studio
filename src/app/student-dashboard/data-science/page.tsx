
// src/app/student-dashboard/data-science/page.tsx
export default function DataSciencePage() {
  return (
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
      <h1 className="text-3xl font-bold mb-4">Data Science</h1>
      <div className="bg-muted p-4 rounded-md shadow-inner">
        <p className="text-muted-foreground">
          Welcome to the Data Science learning area. Explore various topics, tools, and techniques in data analysis, visualization, and modeling.
        </p>
        {/* Add Data Science specific content here */}
      </div>
    </>
  );
}

    