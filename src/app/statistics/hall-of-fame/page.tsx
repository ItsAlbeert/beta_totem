
"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalculatedLeaderboardData } from "@/lib/firestore-services";
import type { LeaderboardEntry } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

type Winner = LeaderboardEntry & { victoryYear: number };

// --- Sub-Components ---

const Plaque = React.forwardRef<HTMLDivElement, { winner: Winner }>(
  ({ winner }, ref) => (
    <motion.div
      ref={ref}
      className="w-full"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="bg-[hsl(var(--card)/0.8)] border border-white/10 rounded-lg p-4 md:p-6 text-center shadow-2xl backdrop-blur-sm">
        <h2 
          className="font-serif text-5xl md:text-6xl font-bold text-muted-foreground/60 tracking-wider"
          style={{ textShadow: "1px 1px 2px hsl(var(--background)), 0 0 1px hsl(var(--background))" }}
        >
          {winner.victoryYear}
        </h2>
        <div className="relative aspect-square w-full max-w-[250px] mx-auto my-4 overflow-hidden rounded-full border-4 border-muted-foreground/30">
          <Image
            src={winner.photoUrl || `https://placehold.co/400x400.png`}
            alt={`Foto de ${winner.name}`}
            fill
            className="object-cover grayscale transition-all duration-500 hover:grayscale-0"
            data-ai-hint="person portrait"
            sizes="(max-width: 768px) 80vw, (max-width: 1024px) 40vw, 25vw"
          />
        </div>
        <h3 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
          {winner.name}
        </h3>
      </div>
    </motion.div>
  )
);
Plaque.displayName = "Plaque";

const TimelineNav = ({
  years,
  activeYear,
  scrollToYear,
}: {
  years: number[];
  activeYear: number | null;
  scrollToYear: (year: number) => void;
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-center p-2 bg-gradient-to-t from-background via-background/90 to-transparent">
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto rounded-full bg-card/80 border border-white/10 backdrop-blur-md shadow-lg scrollbar-hide">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => scrollToYear(year)}
          className={cn(
            "flex-shrink-0 rounded-full h-10 w-10 flex items-center justify-center text-sm font-bold transition-all duration-300",
            activeYear === year
              ? "bg-primary text-primary-foreground scale-110"
              : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          '{String(year).slice(-2)}
        </button>
      ))}
    </div>
  </nav>
);

// --- Main Page Component ---

export default function HallOfFamePage() {
  const { data: leaderboardData = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboardData"],
    queryFn: getCalculatedLeaderboardData,
  });

  const winnersByYear = useMemo((): Winner[] => {
    if (!leaderboardData.length) return [];
    
    const yearlyWinners: { [year: number]: LeaderboardEntry } = {};

    leaderboardData.forEach(player => {
      const year = new Date(player.scoreRecordedAt).getFullYear();
      if (!yearlyWinners[year] || player.rank < yearlyWinners[year].rank) {
        yearlyWinners[year] = player;
      }
    });

    return Object.entries(yearlyWinners)
      .map(([year, winner]) => ({
        ...winner,
        victoryYear: parseInt(year),
      }))
      .sort((a, b) => b.victoryYear - a.victoryYear);
  }, [leaderboardData]);

  const [activeYear, setActiveYear] = useState<number | null>(
    winnersByYear.length > 0 ? winnersByYear[0].victoryYear : null
  );
  
  const plaqueRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    plaqueRefs.current = plaqueRefs.current.slice(0, winnersByYear.length);
  }, [winnersByYear]);
  
  useEffect(() => {
    if (winnersByYear.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const year = parseInt(entry.target.getAttribute('data-year') || '0', 10);
                    if (year) {
                        setActiveYear(year);
                    }
                }
            });
        },
        { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );

    const currentRefs = plaqueRefs.current;
    currentRefs.forEach((ref) => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentRefs.forEach((ref) => {
            if (ref) observer.unobserve(ref);
        });
    };
  }, [winnersByYear]);

  const scrollToYear = (year: number) => {
    const yearIndex = winnersByYear.findIndex(w => w.victoryYear === year);
    if (yearIndex !== -1 && plaqueRefs.current[yearIndex]) {
      plaqueRefs.current[yearIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="w-full h-[400px] bg-card/80 rounded-lg" />
          ))}
        </div>
      );
    }

    if (winnersByYear.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <Icons.Trophy className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground">El Muro de los Inmortales espera...</h2>
            <p className="text-muted-foreground mt-2">Aún no hay campeones que hayan alcanzado la gloria.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {winnersByYear.map((winner, index) => (
          <div key={winner.id} data-year={winner.victoryYear}>
             <Plaque
              ref={(el: HTMLDivElement | null) => plaqueRefs.current[index] = el}
              winner={winner}
            />
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-background min-h-screen">
      {/* Background with texture and vignette */}
      <div
        className="fixed inset-0 z-0 bg-background bg-fixed"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, transparent 60%, hsl(var(--background)) 90%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `
        }}
      />
      
      {/* Fixed Header */}
      <header className="sticky top-0 z-20 py-6 text-center bg-gradient-to-b from-background via-background/90 to-transparent">
        <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl"
            style={{ textShadow: "0px 2px 10px hsla(var(--primary)/0.3)" }}>
          Leyendas del Tótem
        </h1>
      </header>

      {/* Main Scrollable Content */}
      <main className="relative z-10 px-4 md:px-8 pb-24 pt-8">
        {renderContent()}
      </main>

      {/* Fixed Bottom Timeline */}
      {winnersByYear.length > 0 && (
        <TimelineNav
          years={winnersByYear.map(w => w.victoryYear)}
          activeYear={activeYear}
          scrollToYear={scrollToYear}
        />
      )}
    </div>
  );
}

    