
"use client"

import type React from "react"
import { motion } from "framer-motion"
import type { LeaderboardEntry } from "@/types"
import { cn } from "@/lib/utils"

interface ParticipantCardProps {
  participant: LeaderboardEntry
  selectedMetric: string
  onMetricSelect: (metric: string) => void
}

const METRICS = [
  { key: "Total", label: "P. Total" },
  { key: "Físico", label: "P. Físico" },
  { key: "Mental", label: "P. Mental" },
  { key: "Extras", label: "P. Extras" },
]

const getScoreForMetric = (participant: LeaderboardEntry, metric: string): number => {
  switch (metric) {
    case "Total":
      return participant.puntos_total
    case "Físico":
      return participant.puntos_fisico
    case "Mental":
      return participant.puntos_mental
    case "Extras":
      return participant.puntos_extras
    default:
      return participant.puntos_total
  }
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant, selectedMetric, onMetricSelect }) => {
  const score = getScoreForMetric(participant, selectedMetric)

  return (
    <motion.div
      className="relative flex flex-col rounded-xl p-6 shadow-md bg-card border border-border"
      whileHover={{ scale: 1.02,boxShadow: "0px 10px 20px hsla(var(--primary)/0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      layout
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">{participant.name}</h3>
        <span className="text-xs font-semibold text-muted-foreground">Año {participant.year}</span>
      </div>
      <p className="text-3xl font-bold text-primary mt-2">{score.toFixed(1)}</p>
      <p className="text-sm text-muted-foreground">{METRICS.find(m => m.key === selectedMetric)?.label}</p>

      <div className="mt-auto pt-4 flex flex-wrap gap-2">
        {METRICS.map((metric) => (
          <button
            key={metric.key}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedMetric === metric.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
            onClick={() => onMetricSelect(metric.key)}
          >
            {metric.key}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default ParticipantCard
