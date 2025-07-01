"use client"

import type React from "react"
import { motion } from "framer-motion"
import type { LeaderboardEntry } from "@/types"
import Image from "next/image"

interface ParticipantCardProps {
  participant: LeaderboardEntry
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant }) => {
  return (
    <motion.div
      className="relative flex flex-col rounded-xl p-4 shadow-md bg-card border border-border overflow-hidden"
      whileHover={{ scale: 1.02, boxShadow: "0px 10px 20px hsla(var(--primary)/0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      layout
    >
      <div className="relative w-full aspect-square mb-4">
        {participant.photoUrl ? (
          <Image
            src={participant.photoUrl}
            alt={participant.name}
            fill
            className="object-cover rounded-lg"
            data-ai-hint="person face"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
            <span className="text-5xl font-bold text-muted-foreground">
              {participant.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold text-foreground truncate">{participant.name}</h3>
        <p className="text-4xl font-bold text-primary mt-1">{participant.puntos_total.toFixed(1)}</p>
        <p className="text-sm text-muted-foreground">Puntos Totales</p>
      </div>
    </motion.div>
  )
}

export default ParticipantCard
