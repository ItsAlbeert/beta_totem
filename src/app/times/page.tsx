
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
import { getStoredData, storeData, PARTICIPANTS_STORAGE_KEY, GAMES_STORAGE_KEY, SCORES_STORAGE_KEY } from "@/lib/storage";

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

  const loadInitialData = () => {
    const storedParticipants = getStoredData<Participant>(PARTICIPANTS_STORAGE_KEY, []);
    setParticipants(storedParticipants);
    setGames(getStoredData<Game>(GAMES_STORAGE_KEY, []));

    const currentSelectedId = form.getValues("participantId");
    if (currentSelectedId && !storedParticipants.find(p => p.id === currentSelectedId)) {
        form.resetField("participantId");
        form.setValue("participantId", ""); 
    }
  };
  
  useEffect(() => {
    loadInitialData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PARTICIPANTS_STORAGE_KEY || event.key === GAMES_STORAGE_KEY) {
        loadInitialData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('focus', loadInitialData); 
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', loadInitialData);
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

    const existingScores = getStoredData<Score>(SCORES_STORAGE_KEY, []);
    const updatedScores = [...existingScores, newScore];
    storeData<Score>(SCORES_STORAGE_KEY, updatedScores);
    
    toast({
      title: "Time Recorded Successfully!",
      description: `Times for ${selectedParticipant.name} have been saved. Weighted total: ${weightedTotalTime.toFixed(2)} min.`,
      variant: "default",
    });
    form.reset({ 
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
                    value={field.value ?? ''} 
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
      <Card className="max-w-2xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
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
