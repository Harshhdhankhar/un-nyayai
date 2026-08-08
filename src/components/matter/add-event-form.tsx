"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Plus } from "lucide-react";

export function AddEventForm({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/matters/${matterId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDate: form.get("eventDate") || undefined,
        title: form.get("title"),
        description: form.get("description") || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add event.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add event
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-ink-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="eventDate">Date</Label>
          <Input id="eventDate" name="eventDate" type="date" />
        </div>
        <div>
          <Label htmlFor="title">What happened?</Label>
          <Input id="title" name="title" required placeholder="e.g. Notice sent to landlord" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Details</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      {error && <p className="text-sm text-critical-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting}>
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
