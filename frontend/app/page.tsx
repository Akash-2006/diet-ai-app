import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-background">
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Diet &amp; Nutrition AI</h1>
        <p className="text-sm text-muted-foreground">
          Next.js 14 · Tailwind CSS · shadcn/ui scaffold (issue #7). Chat UI follows in later issues.
        </p>
      </div>
      <Button type="button">shadcn/ui wired</Button>
    </main>
  );
}
