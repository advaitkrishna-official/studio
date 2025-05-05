
// src/app/student-dashboard/mathematics/page.tsx
export default function MathematicsPage() {
  return (
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
      <h1 className="text-3xl font-bold mb-4">Mathematics</h1>
      <div className="bg-muted p-4 rounded-md shadow-inner">
        <p className="text-muted-foreground">
          Welcome to the Mathematics learning zone. Practice algebra, geometry, calculus, and more.
        </p>
        {/* Add Mathematics specific content here */}
      </div>
    </>
  );
}

    