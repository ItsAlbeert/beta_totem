"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Participant } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data - replace with actual data fetching
const mockParticipants: Participant[] = [
  { id: "1", name: "Alice Wonderland", year: 1, photoUrl: "https://placehold.co/64x64.png" },
  { id: "2", name: "Bob The Builder", year: 2, photoUrl: "https://placehold.co/64x64.png" },
  { id: "3", name: "Charlie Chaplin", year: 3, photoUrl: "https://placehold.co/64x64.png" },
  { id: "4", name: "Diana Prince", year: 1, photoUrl: "https://placehold.co/64x64.png" },
  { id: "5", name: "Edward Scissorhands", year: 2 }, // No photo example
];

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching participants
    const timer = setTimeout(() => {
      setParticipants(mockParticipants);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <PageHeader
        title="Participants"
        description="View all registered participants in the competition."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Participant List</CardTitle>
          <CardDescription>
            A list of all participants. Full management is available via Strapi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={participant.photoUrl || undefined} alt={participant.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{participant.name}</TableCell>
                    <TableCell>{participant.year}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {participants.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">No participants found.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
