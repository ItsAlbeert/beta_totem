
"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CalculationBreakdownEntry, Participant, Score, Game, ExtraGameStatusDetail, ScoringSettings, ExtraGameType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getParticipants, getScores, getGames, getScoringSettings, updateScoringSettings, DEFAULT_SCORING_SETTINGS } from "@/lib/firestore-services";
import { calculateAllParticipantScores } from "@/lib/data-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const scoringSettingsSchema = z.object({
  physical: z.object({
    threshold1: z.coerce.number().min(0),
    threshold2: z.coerce.number().min(0),
    maxPoints: z.coerce.number().min(0),
    minPoints: z.coerce.number().min(0),
  }),
  mental: z.object({
    threshold1: z.coerce.number().min(0),
    threshold2: z.coerce.number().min(0),
    maxPoints: z.coerce.number().min(0),
    minPoints: z.coerce.number().min(0),
  }),
  extras: z.object({
    capMax: z.coerce.number(),
    capMin: z.coerce.number(),
    points: z.object({
      opcional: z.object({
        muy_bien: z.coerce.number(),
        regular: z.coerce.number(),
        no_hecho: z.coerce.number(),
      }),
      obligatoria: z.object({
        muy_bien: z.coerce.number(),
        regular: z.coerce.number(),
        no_hecho: z.coerce.number(),
      }),
    }),
  }),
}).refine(data => data.physical.threshold1 <= data.physical.threshold2, {
  message: "Umbral Físico 1 debe ser menor o igual al Umbral Físico 2",
  path: ["physical", "threshold2"],
}).refine(data => data.mental.threshold1 <= data.mental.threshold2, {
  message: "Umbral Mental 1 debe ser menor o igual al Umbral Mental 2",
  path: ["mental", "threshold2"],
}).refine(data => data.extras.capMin <= data.extras.capMax, {
  message: "Cap. Mín. Extras debe ser menor o igual al Cap. Máx. Extras",
  path: ["extras", "capMax"],
});


export default function CalculationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: participants = [], isLoading: isLoadingParticipants, error: errorParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const { data: allScores = [], isLoading: isLoadingScores, error: errorScores } = useQuery<Score[]>({
    queryKey: ["scores"],
    queryFn: getScores,
  });
  
  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const { data: scoringSettings, isLoading: isLoadingSettings, error: errorSettings } = useQuery<ScoringSettings>({
    queryKey: ["scoringSettings"],
    queryFn: getScoringSettings,
    staleTime: Infinity, // Settings rarely change
  });

  const settingsForm = useForm<ScoringSettings>({
    resolver: zodResolver(scoringSettingsSchema),
    defaultValues: scoringSettings || DEFAULT_SCORING_SETTINGS,
  });

  React.useEffect(() => {
    if (scoringSettings) {
      settingsForm.reset(scoringSettings);
    }
  }, [scoringSettings, settingsForm]);

  const updateSettingsMutation = useMutation({
    mutationFn: updateScoringSettings,
    onSuccess: () => {
      toast({ title: "Configuración Guardada", description: "Las reglas de puntuación han sido actualizadas." });
      queryClient.invalidateQueries({ queryKey: ["scoringSettings"] });
      // Invalidate all queries that depend on scoring settings
      queryClient.invalidateQueries({ queryKey: ["leaderboardData"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["trendsData"] });
      queryClient.invalidateQueries({ queryKey: ["comparisonsData"] });
      queryClient.invalidateQueries({ queryKey: ["calculationsData"] }); // Self invalidate
    },
    onError: (error) => {
      toast({ title: "Error al Guardar", description: (error as Error).message, variant: "destructive" });
    },
  });

  const onSettingsSubmit = (data: ScoringSettings) => {
    const { id, ...settingsToSave } = data; // Exclude id if present
    updateSettingsMutation.mutate(settingsToSave);
  };

  const isLoadingOverall = isLoadingParticipants || isLoadingScores || isLoadingGames || isLoadingSettings;
  const overallError = errorParticipants || errorScores || errorGames || errorSettings;

  const calculationData = React.useMemo((): CalculationBreakdownEntry[] => {
    if (isLoadingOverall || overallError || !participants.length || !allScores.length || !games.length || !scoringSettings) return [];
    return calculateAllParticipantScores(participants, allScores, games, scoringSettings) as CalculationBreakdownEntry[];
  }, [participants, allScores, games, scoringSettings, isLoadingOverall, overallError]);

  const getExtraGameStatusText = (status: ExtraGameStatusDetail | undefined): string => {
    if (!status) return "N/A";
    switch (status) {
      case 'muy_bien': return 'Muy Bien';
      case 'regular': return 'Regular';
      case 'no_hecho': return 'No Hecho';
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getExtraGamePointsText = (points: number | undefined): string => {
    if (points === undefined) return "N/A";
    return points >= 0 ? `+${points.toFixed(1)}` : points.toFixed(1);
  };

  if (overallError) {
    return <p className="text-destructive text-center py-8">Error al cargar los datos de cálculo: {(overallError as Error).message}</p>;
  }

  const definedExtraGames = games.filter(g => g.category === 'Extra');

  return (
    <>
      <PageHeader
        title="Desglose del Cálculo de Puntuaciones"
        description="Visión transparente de cómo los datos brutos se traducen en puntuaciones finales según el sistema y configuración actual."
      />
      
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 mb-8">
        <CardHeader>
          <CardTitle>Configuración de Reglas de Puntuación</CardTitle>
          <CardDescription>
            Ajusta las variables utilizadas para calcular las puntuaciones. Los cambios afectarán a todos los cálculos retrospectivamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings && !scoringSettings ? (
            <Skeleton className="h-60 w-full" />
          ) : (
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
              <Accordion type="multiple" defaultValue={['physical', 'mental', 'extras']} className="w-full">
                <AccordionItem value="physical">
                  <AccordionTrigger className="text-lg font-semibold">Puntuación Física</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div><Label htmlFor="physical.threshold1">Tiempo para Puntos Máx. (min)</Label><Input id="physical.threshold1" type="number" step="any" {...settingsForm.register("physical.threshold1")} />{settingsForm.formState.errors.physical?.threshold1 && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.physical.threshold1.message}</p>}</div>
                    <div><Label htmlFor="physical.threshold2">Tiempo para Puntos Mín. (min)</Label><Input id="physical.threshold2" type="number" step="any" {...settingsForm.register("physical.threshold2")} />{settingsForm.formState.errors.physical?.threshold2 && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.physical.threshold2.message}</p>}</div>
                    <div><Label htmlFor="physical.maxPoints">Puntos Máximos</Label><Input id="physical.maxPoints" type="number" step="any" {...settingsForm.register("physical.maxPoints")} />{settingsForm.formState.errors.physical?.maxPoints && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.physical.maxPoints.message}</p>}</div>
                    <div><Label htmlFor="physical.minPoints">Puntos Mínimos</Label><Input id="physical.minPoints" type="number" step="any" {...settingsForm.register("physical.minPoints")} />{settingsForm.formState.errors.physical?.minPoints && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.physical.minPoints.message}</p>}</div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mental">
                  <AccordionTrigger className="text-lg font-semibold">Puntuación Mental</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div><Label htmlFor="mental.threshold1">Tiempo para Puntos Máx. (min)</Label><Input id="mental.threshold1" type="number" step="any" {...settingsForm.register("mental.threshold1")} />{settingsForm.formState.errors.mental?.threshold1 && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.mental.threshold1.message}</p>}</div>
                    <div><Label htmlFor="mental.threshold2">Tiempo para Puntos Mín. (min)</Label><Input id="mental.threshold2" type="number" step="any" {...settingsForm.register("mental.threshold2")} />{settingsForm.formState.errors.mental?.threshold2 && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.mental.threshold2.message}</p>}</div>
                    <div><Label htmlFor="mental.maxPoints">Puntos Máximos</Label><Input id="mental.maxPoints" type="number" step="any" {...settingsForm.register("mental.maxPoints")} />{settingsForm.formState.errors.mental?.maxPoints && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.mental.maxPoints.message}</p>}</div>
                    <div><Label htmlFor="mental.minPoints">Puntos Mínimos</Label><Input id="mental.minPoints" type="number" step="any" {...settingsForm.register("mental.minPoints")} />{settingsForm.formState.errors.mental?.minPoints && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.mental.minPoints.message}</p>}</div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="extras">
                  <AccordionTrigger className="text-lg font-semibold">Puntuación Extras</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label htmlFor="extras.capMax">Cap. Máximo de Puntos Extras</Label><Input id="extras.capMax" type="number" step="any" {...settingsForm.register("extras.capMax")} />{settingsForm.formState.errors.extras?.capMax && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.extras.capMax.message}</p>}</div>
                      <div><Label htmlFor="extras.capMin">Cap. Mínimo de Puntos Extras</Label><Input id="extras.capMin" type="number" step="any" {...settingsForm.register("extras.capMin")} />{settingsForm.formState.errors.extras?.capMin && <p className="text-destructive text-xs mt-1">{settingsForm.formState.errors.extras.capMin.message}</p>}</div>
                    </div>
                    <h4 className="font-medium text-sm">Puntos por Estado (Opcional):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
                      <div><Label htmlFor="extras.points.opcional.muy_bien">Muy Bien</Label><Input id="extras.points.opcional.muy_bien" type="number" step="any" {...settingsForm.register("extras.points.opcional.muy_bien")} /></div>
                      <div><Label htmlFor="extras.points.opcional.regular">Regular</Label><Input id="extras.points.opcional.regular" type="number" step="any" {...settingsForm.register("extras.points.opcional.regular")} /></div>
                      <div><Label htmlFor="extras.points.opcional.no_hecho">No Hecho</Label><Input id="extras.points.opcional.no_hecho" type="number" step="any" {...settingsForm.register("extras.points.opcional.no_hecho")} /></div>
                    </div>
                     <h4 className="font-medium text-sm">Puntos por Estado (Obligatoria):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
                       <div><Label htmlFor="extras.points.obligatoria.muy_bien">Muy Bien</Label><Input id="extras.points.obligatoria.muy_bien" type="number" step="any" {...settingsForm.register("extras.points.obligatoria.muy_bien")} /></div>
                       <div><Label htmlFor="extras.points.obligatoria.regular">Regular</Label><Input id="extras.points.obligatoria.regular" type="number" step="any" {...settingsForm.register("extras.points.obligatoria.regular")} /></div>
                       <div><Label htmlFor="extras.points.obligatoria.no_hecho">No Hecho</Label><Input id="extras.points.obligatoria.no_hecho" type="number" step="any" {...settingsForm.register("extras.points.obligatoria.no_hecho")} /></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex justify-end">
                <Button type="submit" disabled={updateSettingsMutation.isPending || !settingsForm.formState.isDirty}>
                  {updateSettingsMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>


      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Cálculos Detallados (Sistema Actual)</CardTitle>
          {scoringSettings && (
          <CardDescription>
            P<sub>Físico</sub> (máx {scoringSettings.physical.maxPoints}, mín {scoringSettings.physical.minPoints}), 
            P<sub>Mental</sub> (máx {scoringSettings.mental.maxPoints}, mín {scoringSettings.mental.minPoints}), 
            P<sub>Extras</sub> (máx {scoringSettings.extras.capMax}, mín {scoringSettings.extras.capMin}). P<sub>Total</sub> = Suma.
          </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingOverall && !calculationData.length ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" /> 
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[75vh] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Clasif.</TableHead>
                    <TableHead className="w-[60px]">Foto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-center">T<sub>Físico</sub> (min)</TableHead>
                    <TableHead className="text-center">P<sub>Físico</sub></TableHead>
                    <TableHead className="text-center">T<sub>Mental</sub> (min)</TableHead>
                    <TableHead className="text-center">P<sub>Mental</sub></TableHead>
                    <TableHead className="min-w-[200px]">Estado y Puntos de Juegos Extra</TableHead>
                    <TableHead className="text-center">P<sub>Extras</sub> (Cruda)</TableHead>
                    <TableHead className="text-center">P<sub>Extras</sub> (Final)</TableHead>
                    <TableHead className="text-center font-semibold">P<sub>Total</sub></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.rank}</TableCell>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={entry.photoUrl || undefined} alt={entry.name} data-ai-hint="person face"/>
                          <AvatarFallback>{entry.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{entry.name} <span className="text-xs text-muted-foreground">(Año {entry.year})</span></TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_fisico.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_fisico.toFixed(1)}</TableCell>
                      <TableCell className="text-center">{entry.latest_tiempo_mental.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_mental.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">
                        {definedExtraGames.length > 0 ? (
                            definedExtraGames.map(extraGame => (
                                <div key={extraGame.id} className="flex justify-between items-center py-0.5">
                                    <span>
                                      {extraGame.name} ({extraGame.extraType || 'opcional'}): 
                                      <Badge variant={entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'muy_bien' ? 'default' : entry.latest_extra_game_detailed_statuses?.[extraGame.id] === 'regular' ? 'secondary' : 'outline'} className="ml-1 text-xs">
                                        {getExtraGameStatusText(entry.latest_extra_game_detailed_statuses?.[extraGame.id])}
                                      </Badge>
                                    </span>
                                    <span className="font-medium ml-2">
                                      {getExtraGamePointsText(entry.individual_extra_game_points?.[extraGame.id])}
                                    </span>
                                </div>
                            ))
                        ) : "Sin Juegos Extra"}
                      </TableCell>
                      <TableCell className="text-center">{entry.puntos_extras_cruda.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-lg font-medium">{entry.puntos_extras.toFixed(1)}</TableCell>
                      <TableCell className="text-center text-xl font-bold text-primary">{entry.puntos_total.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {calculationData.length === 0 && !isLoadingOverall && !overallError && (
            <p className="text-center text-muted-foreground py-8">No hay datos de cálculo disponibles. Añade participantes y registra sus puntuaciones.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
