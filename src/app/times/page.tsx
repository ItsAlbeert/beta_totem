
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
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
import type { Participant, Score, Game, GameCategory, ExtraGameStatusDetail, ExtraGameType } from "@/types";
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
  extraGameDetailedStatuses: z.record(z.string(), z.enum(['muy_bien', 'regular', 'no_hecho'])).optional(),
});

type TimeInputFormValues = z.infer<typeof timeInputSchema>;

export default function TimesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading: isLoadingParticipants, error: errorParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
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
      extraGameDetailedStatuses: {},
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
      queryClient.invalidateQueries({ queryKey: ["calculationsData"] });


      const participantName = participants.find(p => p.id === newScore.participantId)?.name || "Participant";
      toast({
        title: "Score Recorded Successfully!",
        description: `Raw data for ${participantName} saved. Scores updated globally.`,
        variant: "default",
      });
      
      const defaultExtraStatuses: { [key: string]: ExtraGameStatusDetail } = {};
      games.filter(g => g.category === 'Extra').forEach(g => {
        defaultExtraStatuses[g.id] = 'no_hecho';
      });

      form.reset({ 
        participantId: "",
        tiempo_fisico: 0,
        tiempo_mental: 0,
        gameTimes: {},
        extraGameDetailedStatuses: defaultExtraStatuses,
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

  React.useEffect(() => {
    if (games.length > 0) {
      const initialExtraStatuses: { [key: string]: ExtraGameStatusDetail } = {};
      games.filter(g => g.category === 'Extra').forEach(g => {
        initialExtraStatuses[g.id] = 'no_hecho'; 
      });
      
      const currentExtraStatuses = form.getValues('extraGameDetailedStatuses');
      const hasUserSetExtraStatus = Object.values(currentExtraStatuses || {}).some(status => status !== 'no_hecho');

      if (!hasUserSetExtraStatus || Object.keys(currentExtraStatuses || {}).length === 0) {
         form.reset((currentValues) => ({
           ...currentValues,
           extraGameDetailedStatuses: initialExtraStatuses,
         }));
      } else {
        const updatedStatuses = { ...initialExtraStatuses, ...currentExtraStatuses };
        form.setValue('extraGameDetailedStatuses', updatedStatuses);
      }
    }
  }, [games, form]);


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
    
    const finalExtraStatuses: { [key: string]: ExtraGameStatusDetail } = {};
    games.filter(g => g.category === 'Extra').forEach(g => {
      finalExtraStatuses[g.id] = values.extraGameDetailedStatuses?.[g.id] || 'no_hecho';
    });

    const newScoreData = {
      participantId: values.participantId,
      tiempo_fisico: values.tiempo_fisico,
      tiempo_mental: values.tiempo_mental,
      gameTimes: values.gameTimes || {},
      extraGameDetailedStatuses: finalExtraStatuses, 
      recordedAt: new Date(),
    };
    
    addScoreMutation.mutate(newScoreData);
  }
  
  if (errorParticipants || errorGames) {
    return <p className="text-destructive text-center py-8">Error loading page data.</p>;
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

  const renderExtraGameStatusFields = () => {
    const extraGames = games.filter(game => game.category === 'Extra');
    if (extraGames.length === 0) {
        return (
            <div className="mt-4">
                <h4 className="text-md font-semibold text-muted-foreground">Extra Games Status</h4>
                <p className="text-sm text-muted-foreground ml-4 mt-2">No "Extra" games defined. Add them on the Games page.</p>
            </div>
        );
    }

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">Extra Games Status</h4>
        {extraGames.map(game => (
          <FormField
            key={game.id}
            control={form.control}
            name={`extraGameDetailedStatuses.${game.id}`}
            defaultValue={'no_hecho' as ExtraGameStatusDetail} 
            render={({ field }) => (
              <FormItem className="ml-4">
                <FormLabel>{game.name} <span className="text-xs text-muted-foreground">({game.extraType || 'opcional'})</span></FormLabel>
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
                    <SelectItem value="muy_bien">Muy Bien</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="no_hecho">No Hecho</SelectItem>
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
                      <Input type="number" placeholder="e.g., 240.5" {...field} step="any" disabled={addScoreMutation.isPending} />
                    </FormControl>
                    <FormDescription>
                      Total time for all physical challenges. (e.g. 220 for 100pts, 360 for 30pts)
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
                      <Input type="number" placeholder="e.g., 60" {...field} step="any" disabled={addScoreMutation.isPending}/>
                    </FormControl>
                    <FormDescription>
                      Total time for all mental challenges. (e.g. 50 for 100pts, 120 for 30pts)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Mental")}
              
              <Separator />
              
              {renderExtraGameStatusFields()}
              
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
