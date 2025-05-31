
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
import type { Participant, Score, Game, GameCategory } from "@/types";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
const SCORES_STORAGE_KEY = "chronoScoreScores";
const GAMES_STORAGE_KEY = "chronoScoreGames";

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
  gameTimes: z.record(z.string(), z.coerce.number().min(0, "Game time cannot be negative.").optional()).optional(),
});

type TimeInputFormValues = z.infer<typeof timeInputSchema>;

const getStoredParticipants = (): Participant[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(PARTICIPANTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  return [];
};

const getStoredGames = (): Game[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(GAMES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  return [];
};

const getStoredScores = (): Score[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SCORES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  return [];
};

const storeScores = (scores: Score[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
  }
};

export default function TimesPage() {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const form = useForm<TimeInputFormValues>({
    resolver: zodResolver(timeInputSchema),
    defaultValues: {
      participantId: "",
      physicalTime: 0,
      mentalTime: 0,
      extraTime: 0,
      gameTimes: {},
    },
  });

  useEffect(() => {
    setParticipants(getStoredParticipants());
    setGames(getStoredGames());

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PARTICIPANTS_STORAGE_KEY) {
        const updatedParticipants = getStoredParticipants();
        setParticipants(updatedParticipants);
        const currentSelectedId = form.getValues("participantId");
        if (currentSelectedId && !updatedParticipants.find(p => p.id === currentSelectedId)) {
          form.resetField("participantId");
          form.setValue("participantId", "");
        }
      }
      if (event.key === GAMES_STORAGE_KEY) {
        setGames(getStoredGames());
        // Potentially reset gameTimes if games structure changes significantly, or re-validate
        // For now, just reload. If a game was deleted, its field won't render.
        // If a game was added, its field will appear.
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      const refreshOnFocus = () => {
        setParticipants(getStoredParticipants());
        setGames(getStoredGames());
        const currentSelectedId = form.getValues("participantId");
        if (currentSelectedId && !getStoredParticipants().find(p => p.id === currentSelectedId)) {
            form.resetField("participantId");
            form.setValue("participantId", "");
        }
      }
      window.addEventListener('focus', refreshOnFocus);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', refreshOnFocus);
      };
    }
  }, [form]);

  async function onSubmit(values: TimeInputFormValues) {
    const selectedParticipant = participants.find(p => p.id === values.participantId);
    if (!selectedParticipant) {
      toast({
        title: "Error",
        description: "Selected participant not found.",
        variant: "destructive",
      });
      return;
    }

    const physicalTime = values.physicalTime;
    const mentalTime = values.mentalTime;
    const extraTime = values.extraTime || 0;
    const gameSpecificTimes = values.gameTimes || {};

    // Optional: Validate sum of game times against total category time here if needed

    const weightedTotalTime = physicalTime + (mentalTime * 3) - extraTime;

    const newScore: Score = {
      id: Date.now().toString(),
      participantId: values.participantId,
      physicalTime: physicalTime,
      mentalTime: mentalTime,
      extraTime: extraTime,
      gameTimes: gameSpecificTimes,
      weightedTotalTime: weightedTotalTime,
      recordedAt: new Date().toISOString(),
    };

    const existingScores = getStoredScores();
    const updatedScores = [...existingScores, newScore];
    storeScores(updatedScores);
    
    toast({
      title: "Time Recorded Successfully!",
      description: `Times for ${selectedParticipant.name} have been saved. Weighted total: ${weightedTotalTime} min.`,
      variant: "default",
    });
    form.reset({ // Reset with specific empty/default values
      participantId: "",
      physicalTime: 0,
      mentalTime: 0,
      extraTime: 0,
      gameTimes: {},
    });
  }

  const renderGameTimeFields = (category: GameCategory) => {
    const categoryGames = games.filter(game => game.category === category);
    if (categoryGames.length === 0) return null;

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">{category} Games Times</h4>
        {categoryGames.map(game => (
          <FormField
            key={game.id}
            control={form.control}
            name={`gameTimes.${game.id}`}
            render={({ field }) => (
              <FormItem className="ml-4">
                <FormLabel>{game.name} (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 10" 
                    {...field} 
                    value={field.value ?? ''} // Handle undefined by showing empty string
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                    step="any" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Record Times"
        description="Enter total category times and specific game times for a participant."
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
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a participant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {participants.length === 0 && (
                           <div className="p-4 text-sm text-muted-foreground text-center">
                             No participants found. Add participants on the Participants page.
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

              <Separator />

              {/* Physical Times */}
              <FormField
                control={form.control}
                name="physicalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Physical Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 30" {...field} step="any" />
                    </FormControl>
                    <FormDescription>
                      Total time taken for all physical challenges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Physical")}

              <Separator />

              {/* Mental Times */}
              <FormField
                control={form.control}
                name="mentalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Mental Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15" {...field} step="any"/>
                    </FormControl>
                    <FormDescription>
                      Total time taken for all mental challenges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Mental")}
              
              <Separator />

              {/* Extra Times */}
              <FormField
                control={form.control}
                name="extraTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Extra Bonus Time (minutes, optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} step="any"/>
                    </FormControl>
                    <FormDescription>
                      Total bonus time to be subtracted (e.g., for all extra tasks).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Extra")}
              
              <Separator />
              
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
