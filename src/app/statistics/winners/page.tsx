"use client";

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function WinnersPage() {
  useEffect(() => {
    redirect('/statistics/leaderboard');
  }, []);
  
  return null; // Render nothing while redirecting
}
