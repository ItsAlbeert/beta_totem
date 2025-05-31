
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import type { Participant } from "@/types";
import { useState, useEffect } from "react";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants"; // Must match the key in participants/page.tsx

const timeInputSchema = z.object({
  participantId: z.string().min(1, "Participant selection is required."),
  physicalTime: z.coerce
    .number({ invalid_type_error: "Physical time must be a number." })
    .min(0, "Physical time cannot be negative."),
  mentalTime: z.coerce
    .number({ invalid_type_error: "Mental time must be a number." })
    .min(0, "Mental time cannot be negative."),
  extraTime: z.coerce
    .number({ invalid_type_error: "Extra time must be a number." })
    .min(0, "Extra time cannot be negative.")
    .optional(),
});

type TimeInputFormValues = z.infer<typeof timeInputSchema>;

const getStoredParticipants = (): Participant[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Participant[];
      } catch (e) {
        console.error("Failed to parse participants from localStorage on TimesPage", e);
        return []; // Return empty array on error
      }
    }
  }
  return []; // Return empty array if not in client or no data
};


export default function TimesPage() {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    setParticipants(getStoredParticipants());
  }, []);


  const form = useForm<TimeInputFormValues>({
    resolver: zodResolver(timeInputSchema),
    defaultValues: {
      participantId: "",
      physicalTime: 0,
      mentalTime: 0,
      extraTime: 0,
    },
  });

  // Watch for changes in participants list (e.g., if user navigates back and forth after updates)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PARTICIPANTS_STORAGE_KEY) {
        setParticipants(getStoredParticipants());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      // Also refresh on focus in case localStorage was changed in another tab
      const refreshOnFocus = () => setParticipants(getStoredParticipants());
      window.addEventListener('focus', refreshOnFocus);


      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', refreshOnFocus);
      };
    }
  }, []);


  async function onSubmit(values: TimeInputFormValues) {
    // Simulate API call
    console.log("Form submitted:", values);
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    const selectedParticipant = participants.find(p => p.id === values.participantId);
    toast({
      title: "Time Recorded Successfully!",
      description: `Times for ${selectedParticipant?.name || 'Participant'} have been saved.`,
      variant: "default",
    });
    form.reset(); 
    // Potentially re-fetch participants if submission could change the list,
    // but for this page, it's unlikely.
  }

  return (
    <>
      <PageHeader
        title="Record Times"
        description="Enter the physical, mental, and any extra (bonus) times for a participant."
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>New Time Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="participantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participant</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // If participants list could become empty, reset selection
                        if (participants.length > 0 && !participants.find(p => p.id === value)) {
                           form.resetField("participantId");
                        }
                      }} 
                      value={field.value} // Ensure value is controlled
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a participant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {participants.length === 0 && (
                           <div className="p-4 text-sm text-muted-foreground text-center">
                             No participants found. Please add participants on the Participants page.
                           </div>
                        )}
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.name} (Year {participant.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="physicalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 30" {...field} />
                    </FormControl>
                    <FormDescription>
                      Time taken for the physical challenge.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mentalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mental Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15" {...field} />
                    </FormControl>
                    <FormDescription>
                      Time taken for the mental challenge.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extraTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extra Bonus Time (minutes, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} />
                    </FormControl>
                    <FormDescription>
                      Bonus time to be subtracted (e.g., for completing tasks quickly).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting || participants.length === 0}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Times"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

