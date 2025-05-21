import { BrainCircuit } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="p-4 border-b border-border">
      <div className="container mx-auto flex items-center gap-2">
        <BrainCircuit className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">FraimeWorks Lite</h1>
      </div>
    </header>
  );
}
