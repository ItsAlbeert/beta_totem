"use client";
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    redirect('/times');
  }, []);
  
  return null; // Or a loading spinner
}
