"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createNutritionLog,
  fetchActivityAnalytics,
  fetchNutritionAnalytics,
} from "@/lib/authApi";
import { getStoredAccessToken } from "@/lib/authToken";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activity, setActivity] = useState<{ date: string; user_messages: number }[]>([]);
  const [nutrition, setNutrition] = useState<{ date: string; calories: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logCalories, setLogCalories] = useState("");
  const [logNotes, setLogNotes] = useState("");

  useEffect(() => {
    setMounted(true);
    setLoggedIn(Boolean(getStoredAccessToken()));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const [a, n] = await Promise.all([fetchActivityAnalytics(14), fetchNutritionAnalytics(14)]);
        if (!cancelled) {
          setActivity(a.bars);
          setNutrition(n.bars);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cal = logCalories.trim() ? Number(logCalories) : undefined;
    if (logCalories.trim() && (Number.isNaN(cal) || cal! < 0)) {
      setError("Calories must be a non-negative number.");
      return;
    }
    setBusy(true);
    try {
      await createNutritionLog({
        logged_on: logDate,
        calories: cal ?? null,
        notes: logNotes.trim() || null,
      });
      const n = await fetchNutritionAnalytics(14);
      setNutrition(n.bars);
      setLogNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save log.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh flex items-center justify-center text-muted-foreground text-sm">Loading…</main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="text-sm text-muted-foreground">Sign in to see your analytics.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Home</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/chat">Chat</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 p-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Chat activity</h2>
          <p className="text-xs text-muted-foreground">Your messages per day (last 14 days).</p>
          <div className="h-56 w-full rounded-lg border border-border bg-card p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
                <Tooltip />
                <Bar dataKey="user_messages" name="Messages" fill="#404040" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Logged calories</h2>
          <p className="text-xs text-muted-foreground">Sum of manual nutrition entries by day.</p>
          <div className="h-56 w-full rounded-lg border border-border bg-card p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nutrition} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip />
                <Bar dataKey="calories" name="Calories" fill="hsl(142 60% 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium">Add nutrition log</h2>
          <form onSubmit={(e) => void submitLog(e)} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label htmlFor="logDate" className="text-xs text-muted-foreground">
                Date
              </label>
              <Input
                id="logDate"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cal" className="text-xs text-muted-foreground">
                Calories (optional)
              </label>
              <Input
                id="cal"
                type="number"
                min={0}
                placeholder="e.g. 450"
                value={logCalories}
                onChange={(e) => setLogCalories(e.target.value)}
                disabled={busy}
                className="w-32"
              />
            </div>
            <div className="min-w-[12rem] flex-1 space-y-1">
              <label htmlFor="notes" className="text-xs text-muted-foreground">
                Notes
              </label>
              <Input
                id="notes"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                disabled={busy}
                placeholder="Meal notes"
              />
            </div>
            <Button type="submit" disabled={busy}>
              Save
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
