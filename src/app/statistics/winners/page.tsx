
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalculatedLeaderboardData, getGames } from "@/lib/firestore-services";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardEntry, Game } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Award, Star, BarChart, BrainCircuit, Zap } from "lucide-react";
import { Icons } from "@/components/icons";
import { motion, useScroll, useTransform, useMotionValue, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// --- Loading Screen Component ---
const LoadingScreen = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 1 } }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
          filter: [
            "drop-shadow(0 0 5px hsl(var(--accent)))",
            "drop-shadow(0 0 15px hsl(var(--accent)))",
            "drop-shadow(0 0 5px hsl(var(--accent)))",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Icons.Logo className="h-24 w-24 text-accent" />
      </motion.div>
    </motion.div>
  </div>
);

const NoWinnerComponent = () => (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-card border border-border min-h-[60vh]">
        <Trophy className="w-24 h-24 text-muted-foreground/50 mb-6" />
        <h3 className="text-3xl font-bold text-foreground">El Trono del Campeón está Vacío</h3>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
            La competición aún arde. Sigue el camino de nuestros héroes en la clasificación mientras luchan por la gloria del Tótem.
        </p>
    </div>
);


// --- Main Page ---
export default function WinnersPage() {
  const [showPage, setShowPage] = useState(false);

  const { data: leaderboardData = [], isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboardData"],
    queryFn: getCalculatedLeaderboardData,
  });

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const isLoadingData = isLoadingLeaderboard || isLoadingGames;

  useEffect(() => {
    if (!isLoadingData) {
      const timer = setTimeout(() => setShowPage(true), 2500); // Wait for animation
      return () => clearTimeout(timer);
    }
  }, [isLoadingData]);

  const winner = useMemo(() => {
    if (isLoadingData || leaderboardData.length === 0) return null;
    return leaderboardData[0];
  }, [isLoadingData, leaderboardData]);
  
  const winnerHighlights = useMemo(() => {
    if (!winner || !leaderboardData || !games.length) return { bestAt: [], muyBienIn: [] };
    const physicalAndMentalGames = games.filter(g => g.category === 'Physical' || g.category === 'Mental');
    const bestAt: string[] = [];
    physicalAndMentalGames.forEach(game => {
      const timesForGame = leaderboardData
        .map(p => p.gameTimes?.[game.id])
        .filter((t): t is number => t != null && t > 0);
      if (timesForGame.length === 0) return;
      const bestTime = Math.min(...timesForGame);
      const winnerTime = winner.gameTimes?.[game.id];
      if (winnerTime === bestTime) {
        bestAt.push(game.name);
      }
    });

    const extraGames = games.filter(g => g.category === 'Extra');
    const muyBienIn: string[] = [];
    extraGames.forEach(game => {
      if (winner.latest_extra_game_detailed_statuses?.[game.id] === 'muy_bien') {
        muyBienIn.push(game.name);
      }
    });
    return { bestAt, muyBienIn };
  }, [winner, leaderboardData, games]);

  const radarStats = useMemo(() => {
      if (!winner) return [];
      const maxPoints = 100; // Assuming max points for a category is 100 for normalization
      return [
        { subject: 'Fuerza', A: (winner.puntos_fisico / maxPoints) * 100, fullMark: 100 },
        { subject: 'Ingenio', A: (winner.puntos_mental / maxPoints) * 100, fullMark: 100 },
        { subject: 'Constancia', A: (winner.puntos_extras / 30) * 100, fullMark: 100 }, // Max extra points is 30
      ];
  }, [winner]);

  const timelineEvents = [
    { title: "Inicio de la Competición", description: "El viaje hacia la gloria comienza." },
    { title: "Dominio Físico", description: "Demostrando fuerza y resistencia en las pruebas físicas." },
    { title: "Estratega Mental", description: "Superando los desafíos mentales con ingenio y velocidad." },
    { title: "Liderazgo en la Clasificación", description: "Alcanzando la cima de la tabla de puntuaciones." },
    { title: "Victoria Final", description: "Coronado como Campeón del Tótem 2025." },
  ];

  if (isLoadingData) {
      return <LoadingScreen />;
  }

  return (
    <>
      <AnimatePresence>
        {!showPage && <LoadingScreen />}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: showPage ? 1 : 0, scale: showPage ? 1 : 0.95 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full"
      >
        <PageHeader title="Ganador" description="El Altar del Campeón" />

        {!winner ? (
            <NoWinnerComponent />
        ) : (
          <div className="space-y-24 md:space-y-32">
            
            {/* --- Hero Section --- */}
            <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-primary/10 p-4 md:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent -z-10"></div>
                 <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22hsl(var(--primary))%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-6xl mx-auto">
                    <div className="text-center md:text-left z-10">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-foreground"
                        >
                            {winner.name}
                        </motion.h1>
                        <motion.p 
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ duration: 0.8, delay: 0.4 }}
                            className="mt-2 text-xl md:text-2xl text-primary font-semibold"
                        >
                            Campeón del Tótem 2025
                        </motion.p>
                    </div>
                    <motion.div 
                        className="relative h-96 w-full md:h-auto md:aspect-square"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                       <WinnerPhoto participant={winner} />
                    </motion.div>
                </div>
            </section>

            {/* --- Stats Dashboard --- */}
            <section className="max-w-7xl mx-auto px-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Main Score Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}
                        className="lg:col-span-2 bg-secondary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                    >
                         <Trophy className="h-16 w-16 text-yellow-400 mb-4" />
                         <CardTitle className="text-2xl text-muted-foreground">Puntuación Total</CardTitle>
                         <p className="text-7xl font-bold text-primary">{winner.puntos_total.toFixed(1)}</p>
                    </motion.div>
                    {/* Radar Chart Card */}
                     <motion.div 
                        initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-2 bg-secondary/30 rounded-2xl p-6"
                    >
                         <CardTitle className="mb-4 text-center">Análisis de Habilidades</CardTitle>
                          <ResponsiveContainer width="100%" height={250}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarStats}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Habilidad" dataKey="A" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.4} />
                               <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                    <div className="bg-popover p-2 rounded-md border border-border">
                                        <p className="text-popover-foreground">{`${payload[0].payload.subject}: ${payload[0].value?.toFixed(0)}%`}</p>
                                    </div>
                                    );
                                }
                                return null;
                                }} />
                            </RadarChart>
                          </ResponsiveContainer>
                    </motion.div>
                </div>
            </section>

             {/* --- Highlights Gallery --- */}
            <section className="w-full">
                <h2 className="text-4xl font-bold text-center mb-12 font-serif">Galería de Hazañas</h2>
                 <div className="flex overflow-x-auto space-x-8 pb-8 px-4 w-full scrollbar-hide">
                    {winnerHighlights.bestAt.map((gameName, index) => (
                        <HighlightCard key={`best-${index}`} title={gameName} Icon={Award} index={index} />
                    ))}
                    {winnerHighlights.muyBienIn.map((gameName, index) => (
                         <HighlightCard key={`muybien-${index}`} title={gameName} Icon={Star} index={index + winnerHighlights.bestAt.length} />
                    ))}
                 </div>
                 {winnerHighlights.bestAt.length === 0 && winnerHighlights.muyBienIn.length === 0 && (
                     <p className="text-muted-foreground text-center col-span-full">
                        El camino a la victoria es una suma de constancia y esfuerzo.
                    </p>
                 )}
            </section>


             {/* --- Timeline Section --- */}
            <section className="relative max-w-3xl mx-auto px-4 w-full pb-16">
                 <h2 className="text-4xl font-bold text-center mb-16 font-serif">El Camino a la Victoria</h2>
                 <div className="absolute left-1/2 top-0 h-full w-[2px] bg-accent/20 -translate-x-1/2" />
                 <div className="space-y-16">
                    {timelineEvents.map((event, index) => (
                        <TimelineItem key={index} event={event} index={index} />
                    ))}
                 </div>
            </section>
          </div>
        )}
      </motion.div>
    </>
  );
}


// --- Sub-components for the Winners Page ---

const WinnerPhoto = ({ participant }: { participant: LeaderboardEntry }) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const transformX = useTransform(x, (latest) => latest * 0.1 - 10);
    const transformY = useTransform(y, (latest) => latest * 0.1 - 10);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            x.set(e.clientX - rect.left - rect.width / 2);
            y.set(e.clientY - rect.top - rect.height / 2);
        }
    };
    
    return (
        <motion.div
            ref={ref}
            className="relative w-full h-full flex items-center justify-center"
            style={{ x: transformX, y: transformY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            whileHover="hover"
        >
            <motion.div 
                className="absolute inset-0"
                variants={{
                    hover: {
                        filter: [
                             "drop-shadow(0 0 0px hsl(var(--accent)/0))",
                             "drop-shadow(0 0 30px hsl(var(--accent)/0.5))",
                             "drop-shadow(0 0 15px hsl(var(--accent)/0.3))",
                        ]
                    }
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            <Avatar className="h-full w-auto max-h-[500px] max-w-full aspect-[4/5] object-cover rounded-none bg-transparent">
                <AvatarImage 
                    src={participant.photoUrl || `https://placehold.co/400x500.png`} 
                    alt={participant.name} 
                    className="object-contain" 
                    data-ai-hint="person portrait"
                />
                <AvatarFallback className="text-6xl bg-transparent">{participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
        </motion.div>
    );
};


const HighlightCard = ({ title, Icon, index }: { title: string; Icon: React.ElementType; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -10, transition: { duration: 0.2 } }}
        className="relative flex-shrink-0 w-64 h-80 rounded-2xl bg-secondary/50 p-6 flex flex-col justify-end overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <div className="relative z-20 text-white">
            <Icon className="h-8 w-8 text-primary mb-2" />
            <h3 className="text-xl font-bold">{title}</h3>
        </div>
    </motion.div>
);

const TimelineItem = ({ event, index }: { event: { title: string, description: string }, index: number }) => {
  const isEven = index % 2 === 0;
  return (
    <div className={cn("flex items-center w-full", isEven ? 'justify-start' : 'justify-end')}>
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.6 }}
        className={cn("w-[calc(50%-2rem)]", isEven ? 'text-right' : 'text-left')}
      >
        <div className="p-4 bg-card rounded-lg shadow-lg">
          <h4 className="font-bold text-lg text-primary">{event.title}</h4>
          <p className="text-muted-foreground text-sm">{event.description}</p>
        </div>
      </motion.div>
      <div className="w-16 flex justify-center">
        <motion.div
           initial={{ scale: 0 }}
           whileInView={{ scale: 1 }}
           viewport={{ once: true, amount: 0.8 }}
           transition={{ duration: 0.4, delay: 0.2 }}
           className="w-4 h-4 rounded-full bg-accent border-2 border-background ring-4 ring-accent/50" 
        />
      </div>
       <div className="w-[calc(50%-2rem)]"></div>
    </div>
  );
};
