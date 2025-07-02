
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import type { Participant, Score, Game, GameCategory, ExtraGameStatusDetail } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getParticipants, getGames, addScore, getScoreById, updateScore } from "@/lib/firestore-services";
import { Skeleton } from "@/components/ui/skeleton";

const timeInputSchema = z.object({
  participantId: z.string().min(1, "La selección de participante es obligatoria."),
  tiempo_fisico: z.coerce
    .number({ invalid_type_error: "El tiempo físico debe ser un número.", required_error: "El tiempo físico es obligatorio." })
    .min(0, "El tiempo físico no puede ser negativo."),
  tiempo_mental: z.coerce
    .number({ invalid_type_error: "El tiempo mental debe ser un número.", required_error: "El tiempo mental es obligatorio." })
    .min(0, "El tiempo mental no puede ser negativo."),
  gameTimes: z.record(z.string(), z.coerce.number().min(0, "El tiempo de juego no puede ser negativo.").optional()).optional(),
  extraGameDetailedStatuses: z.record(z.string(), z.enum(['muy_bien', 'regular', 'no_hecho'])).optional(),
});

type TimeInputFormValues = z.infer<typeof timeInputSchema>;

export default function TimesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive state from URL params instead of using useState to prevent infinite loops
  const scoreIdFromParams = searchParams.get('edit_score_id');
  const editMode = !!scoreIdFromParams;
  const editingScoreId = scoreIdFromParams;

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
  
  const { data: scoreToEdit, isLoading: isLoadingScoreToEdit, isError: isErrorScoreToEdit } = useQuery({
    queryKey: ['scoreToEdit', scoreIdFromParams],
    queryFn: () => scoreIdFromParams ? getScoreById(scoreIdFromParams) : Promise.resolve(null),
    enabled: !!scoreIdFromParams, 
  });

  useEffect(() => {
    // This effect now only syncs the form state with the URL and fetched data
    const defaultExtraStatuses: { [key: string]: ExtraGameStatusDetail } = {};
    if (games) {
      games.filter(g => g.category === 'Extra').forEach(g => {
        defaultExtraStatuses[g.id] = 'no_hecho';
      });
    }

    if (editMode && scoreToEdit) {
      form.reset({
        participantId: scoreToEdit.participantId,
        tiempo_fisico: scoreToEdit.tiempo_fisico,
        tiempo_mental: scoreToEdit.tiempo_mental,
        gameTimes: scoreToEdit.gameTimes || {},
        extraGameDetailedStatuses: { ...defaultExtraStatuses, ...(scoreToEdit.extraGameDetailedStatuses || {}) },
      });
    } else if (!editMode) {
      form.reset({
        participantId: "",
        tiempo_fisico: 0,
        tiempo_mental: 0,
        gameTimes: {},
        extraGameDetailedStatuses: defaultExtraStatuses,
      });
    }
  }, [editMode, scoreToEdit, games]);


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

      const participantName = participants.find(p => p.id === newScore.participantId)?.name || "Participante";
      toast({
        title: "¡Puntuación Registrada Correctamente!",
        description: `Datos brutos para ${participantName} guardados. Puntuaciones actualizadas globalmente.`,
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
        title: "Error al registrar la puntuación",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: (data: { scoreId: string; values: TimeInputFormValues }) => {
        const { participantId, ...updatableValues } = data.values;
        return updateScore(data.scoreId, updatableValues as Pick<Score, 'tiempo_fisico' | 'tiempo_mental' | 'gameTimes' | 'extraGameDetailedStatuses'>);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["scores"] });
        queryClient.invalidateQueries({ queryKey: ["recentScores"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["leaderboardData"] });
        queryClient.invalidateQueries({ queryKey: ["trendsData"] });
        queryClient.invalidateQueries({ queryKey: ["comparisonsData"] });
        queryClient.invalidateQueries({ queryKey: ["calculationsData"] });
        queryClient.invalidateQueries({ queryKey: ['scoreToEdit', editingScoreId] });


        toast({
            title: "Puntuación Actualizada",
            description: "Los datos de la puntuación han sido actualizados con éxito.",
        });
        router.push('/statistics/leaderboard'); 
    },
    onError: (error) => {
        toast({
            title: "Error al actualizar la puntuación",
            description: (error as Error).message,
            variant: "destructive",
        });
    },
  });


  async function onSubmit(values: TimeInputFormValues) {
    if (editMode && editingScoreId) {
        updateScoreMutation.mutate({ scoreId: editingScoreId, values });
    } else {
        const newScoreData = {
        ...values,
        recordedAt: new Date(),
        };
        addScoreMutation.mutate(newScoreData);
    }
  }
  
  if (errorParticipants || errorGames || (editMode && isErrorScoreToEdit)) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos de la página.</p>;
  }

  if (isLoadingParticipants || isLoadingGames || (editMode && isLoadingScoreToEdit && !scoreToEdit)) {
    return (
        <>
        <PageHeader
            title={editMode ? "Editar Puntuación" : "Registrar Tiempos"}
            description={editMode ? "Modifica los detalles de la puntuación." : "Introduce tiempos totales físicos, mentales y estados para los desafíos extra."}
        />
        <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <Skeleton className="h-8 w-3/5" />
                <Skeleton className="h-4 w-4/5 mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
        </Card>
        </>
    );
  }


  const renderGameTimeFields = (category: GameCategory) => {
    const categoryGames = games.filter(game => game.category === category);
    if (categoryGames.length === 0 || category === 'Extra') return null;

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">Tiempos de Juegos {category === 'Physical' ? 'Físicos' : 'Mentales'} (Registro Individual Opcional)</h4>
        {categoryGames.map(game => (
          <FormField
            key={game.id}
            control={form.control}
            name={`gameTimes.${game.id}`}
            render={({ field }) => (
              <FormItem className="ml-4">
                <FormLabel>{game.name} (minutos)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="ej., 10" 
                    {...field} 
                    value={field.value ?? ''} 
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                    step="any"
                    disabled={addScoreMutation.isPending || updateScoreMutation.isPending || isLoadingGames}
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
                <h4 className="text-md font-semibold text-muted-foreground">Estado de Juegos Extra</h4>
                <p className="text-sm text-muted-foreground ml-4 mt-2">No hay juegos "Extra" definidos. Añádelos en la página de Juegos.</p>
            </div>
        );
    }

    return (
      <div className="mt-4 space-y-4">
        <h4 className="text-md font-semibold text-muted-foreground">Estado de Juegos Extra</h4>
        {extraGames.map(game => (
          <FormField
            key={game.id}
            control={form.control}
            name={`extraGameDetailedStatuses.${game.id}`}
            defaultValue={'no_hecho' as ExtraGameStatusDetail} 
            render={({ field }) => (
              <FormItem className="ml-4">
                <FormLabel>{game.name} <span className="text-xs text-muted-foreground">({game.extraType === 'obligatoria' ? 'obligatoria' : 'opcional'})</span></FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={addScoreMutation.isPending || updateScoreMutation.isPending || isLoadingGames}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
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

  const participantBeingEdited = editMode && scoreToEdit && participants.find(p => p.id === scoreToEdit.participantId);

  return (
    <>
      <PageHeader
        title={editMode ? "Editar Puntuación" : "Registrar Tiempos"}
        description={editMode ? "Modifica los detalles de la puntuación existente." : "Introduce tiempos totales físicos, mentales y estados para los desafíos extra."}
      />
      <Card className="max-w-2xl mx-auto shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>{editMode ? "Actualizar Entrada de Puntuación" : "Nueva Entrada de Puntuación"}</CardTitle>
          {editMode && scoreToEdit && participantBeingEdited && (
            <CardDescription>
                Editando la puntuación de: <strong>{participantBeingEdited.name}</strong> registrada el {new Date(scoreToEdit.recordedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="participantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participante</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isLoadingParticipants || addScoreMutation.isPending || updateScoreMutation.isPending || editMode} // Disable if editing
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar un participante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingParticipants && <SelectItem value="loading" disabled>Cargando participantes...</SelectItem>}
                        {!isLoadingParticipants && participants.length === 0 && (
                           <div className="p-4 text-sm text-muted-foreground text-center">
                             No se encontraron participantes. Añade participantes en la página de Participantes.
                           </div>
                        )}
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.name} (Año {participant.year})
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
                    <FormLabel>Tiempo Total Desafío Físico (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ej., 240.5" {...field} step="any" disabled={addScoreMutation.isPending || updateScoreMutation.isPending} />
                    </FormControl>
                    <FormDescription>
                      Tiempo total para todos los desafíos físicos. (ej. ≤220 para 100pts, ≥360 para 30pts)
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
                    <FormLabel>Tiempo Total Desafío Mental (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ej., 60" {...field} step="any" disabled={addScoreMutation.isPending || updateScoreMutation.isPending}/>
                    </FormControl>
                    <FormDescription>
                      Tiempo total para todos los desafíos mentales. (ej. ≤50 para 100pts, ≥120 para 30pts)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderGameTimeFields("Mental")}
              
              <Separator />
              
              {renderExtraGameStatusFields()}
              
              <Separator />
              
              <div className="flex justify-end space-x-2">
                 {editMode && (
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={updateScoreMutation.isPending}>
                        Cancelar
                    </Button>
                 )}
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={addScoreMutation.isPending || updateScoreMutation.isPending || participants.length === 0 || isLoadingParticipants || isLoadingGames || (editMode && isLoadingScoreToEdit)}
                >
                  {addScoreMutation.isPending || updateScoreMutation.isPending ? "Guardando..." : (editMode ? "Actualizar Puntuación" : "Guardar Datos")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
