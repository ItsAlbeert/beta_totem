"use client"

import type React from "react"
import { motion } from "framer-motion"
import type { LeaderboardEntry } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ParticipantCardProps {
  participant: LeaderboardEntry
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant }) => {
  return (
    <motion.div
      className="relative flex flex-col rounded-xl p-6 shadow-md bg-card border border-border"
      whileHover={{ scale: 1.02, boxShadow: "0px 10px 20px hsla(var(--primary)/0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      layout
    >
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-14 w-14">
            <AvatarImage src={participant.photoUrl || undefined} alt={participant.name} data-ai-hint="person face" />
            <AvatarFallback>{participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
            <h3 className="text-xl font-semibold text-foreground">{participant.name}</h3>
            <span className="text-sm font-semibold text-muted-foreground">Año {participant.year}</span>
        </div>
      </div>

      <div className="flex-grow" />

      <div className="text-right">
        <p className="text-sm text-muted-foreground">Puntos Totales</p>
        <p className="text-4xl font-bold text-primary">{participant.puntos_total.toFixed(1)}</p>
      </div>
    </motion.div>
  )
}

export default ParticipantCard
