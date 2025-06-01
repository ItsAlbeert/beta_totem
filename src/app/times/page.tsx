
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react"; // Added React import
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
import type { Participant, Score, Game, GameCategory, ExtraChallengeStatus } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getParticipants, getGames, addScore } from "@/lib/firestore-services";

const timeInputSchema = z.object({
  participantId: z.string().min(1, "Participant selection is required."),
  tiempo_fisico: z.coerce
    .number({ invalid_type_error: "Physical time must be a number." })
    .min(0, "Physical time cannot be negative."),
  tiempo_mental: z.coerce
    .number({ invalid_type_error: "Mental time must be a number." })
    .min(0, "Mental time cannot be negative."),
  gameTimes: z.record(z.string(), z.coerce.number().min(0, "Game time cannot be negative.").optional()).optional(),
  extraGameStatuses: z.record(z.string(), z.enum(['no_hecho', 'hecho_a_medias', 'hecho'])).optional(),
});

type TimeInputFormValues = z.infer<typeof timeInputSchema>;

export default function TimesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const form = useForm<TimeInputFormValues>({
    resolver: zodResolver(timeInputSchema),
    defaultValues: {
      participantId: "",
      tiempo_fisico: 0,
      tiempo_mental: 0,
      gameTimes: {},
      extraGameStatuses: {},
    },
  });

  const addScoreMutation = useMutation({
    mutationFn: addScore,
    onSuccess: (newScore) => {
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      queryClient.invalidateQueries({ queryKey: ["recentScores"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] }); 
      queryClient.invalidateQueries({ queryKey: ["leaderboardData"] });
      queryClient.invalidateQueries({ queryKey: ["trendsData"] });
      queryClient.invalidateQueries({ queryKey: ["comparisonsData"] });

      const participantName = participants.find(p => p.id === newScore.participantId)?.name || "Participant";
      toast({
        title: "Score Recorded Successfully!",
        description: `Raw data for ${participantName} saved. Scores updated globally.`,
        variant: "default",
      });
      
      // Reset form, ensuring extraGameStatuses are also reset
      const defaultExtraStatuses: { [key: string]: ExtraChallengeStatus } = {};
      games.filter(g => g.category === 'Extra').forEach(g => {
        defaultExtraStatuses[g.id] = 'no_hecho';
      });

      form.reset({ 
        participantId: "",
        tiempo_fisico: 0,
        tiempo_mental: 0,
        gameTimes: {},
        extraGameStatuses: defaultExtraStatuses,
      });
    },
    onError: (error) => {
      toast({
        title: "Error recording score",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize extraGameStatuses in defaultValues when games are loaded
  React.useEffect(() => {
    if (games.length > 0) {
      const initialExtraStatuses: { [key: string]: ExtraChallengeStatus } = {};
      games.filter(g => g.category === 'Extra').forEach(g => {
        initialExtraStatuses[g.id] = 'no_hecho'; // Default to 'no_hecho' for all extra games
      });
      // Only update extraGameStatuses if they haven't been touched by the user for the current form session
      // This prevents overriding user input if games list re-fetches for some reason.
      // A more robust way might involve checking if the form is dirty for these fields.
      const currentExtraStatuses = form.getValues('extraGameStatuses');
      const hasUserSetExtraStatus = Object.keys(currentExtraStatuses || {}).length > 0;

      if (!hasUserSetExtraStatus) {
         form.reset((currentValues) => ({
           ...currentValues,
           extraGameStatuses: initialExtraStatuses,
         }));
      } else {
        // If user has set some, ensure all defined extra games have at least a default
        const updatedStatuses = { ...initialExtraStatuses, ...currentExtraStatuses };
        form.setValue('extraGameStatuses', updatedStatuses);
      }
    }
  }, [games, form]); // form.reset and form.setValue are stable


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
    
    // Ensure all defined extra games have a status
    const finalExtraStatuses: { [key: string]: ExtraChallengeStatus } = {};
    games.filter(g => g.category === 'Extra').forEach(g => {
      finalExtraStatuses[g.id] = values.extraGameStatuses?.[g.id] || 'no_hecho';
    });

    const newScoreData = {
      participantId: values.participantId,
      tiempo_fisico: values.tiempo_fisico,
      tiempo_mental: values.tiempo_mental,
      gameTimes: values.gameTimes || {},
      extraGameStatuses: finalExtraStatuses, // Use the ensured statuses
      recordedAt: new Date(),
    };
    
    addScoreMutation.mutate(newScoreData as any);
  }

  const renderGameTimeFields = (category: GameCategory) => {
    const categoryGames = games.filter(game => game.category === category);
    if (categoryGames.length === 0 || category === 'Extra') return null;

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">{category} Games Times (Optional Individual Logging)</h4>
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
                    disabled={addScoreMutation.isPending || isLoadingGames}
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

  const renderGameStatusFields = () => {
    const extraGames = games.filter(game => game.category === 'Extra');
    if (extraGames.length === 0) return null;

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">Extra Games Status</h4>
        {extraGames.map(game => (
          <FormField
            key={game.id}
            control={form.control}
            name={`extraGameStatuses.${game.id}`}
            defaultValue={'no_hecho' as ExtraChallengeStatus} 
            render={({ field }) => (
              <FormItem className="ml-4">
                <FormLabel>{game.name}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={addScoreMutation.isPending || isLoadingGames}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no_hecho">No Hecho</SelectItem>
                    <SelectItem value="hecho_a_medias">Hecho a Medias</SelectItem>
                    <SelectItem value="hecho">Hecho</SelectItem>
                  </SelectContent>
                </Select>
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
        title="Record Times & Status"
        description="Enter total physical, mental times, and status for extra challenges."
      />
      <Card className="max-w-2xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>New Score Entry</CardTitle>
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
                      disabled={isLoadingParticipants || addScoreMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a participant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingParticipants && <SelectItem value="loading" disabled>Loading participants...</SelectItem>}
                        {!isLoadingParticipants && participants.length === 0 && (
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
                name="tiempo_fisico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Physical Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 340.25" {...field} step="any" disabled={addScoreMutation.isPending} />
                    </FormControl>
                    <FormDescription>
                      Total time for all physical challenges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Physical")}

              <Separator />

              <FormField
                control={form.control}
                name="tiempo_mental"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Mental Challenge Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 125.0" {...field} step="any" disabled={addScoreMutation.isPending}/>
                    </FormControl>
                    <FormDescription>
                      Total time for all mental challenges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Mental")}
              
              <Separator />
              
              {renderGameStatusFields()}
              
              <Separator />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={addScoreMutation.isPending || participants.length === 0 || isLoadingParticipants || isLoadingGames}
                >
                  {addScoreMutation.isPending ? "Saving..." : "Save Data"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
