import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-background">
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Diet &amp; Nutrition AI</h1>
        <p className="text-sm text-muted-foreground">
          Configure your encrypted Anthropic API key (stored in the browser only), then continue to chat
          when it ships.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/setup">API key setup</Link>
        </Button>
      </div>
    </main>
  );
}
