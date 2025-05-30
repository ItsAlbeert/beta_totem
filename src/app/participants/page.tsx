
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newPhoto, setNewPhoto] = useState<File | null>(null);

  useEffect(() => {
    // Simulate fetching participants
    const timer = setTimeout(() => {
      setParticipants(mockParticipants);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // This is where you would handle the form submission,
    // including uploading the photo and saving the participant data.
    // This requires backend logic.

    console.log("New Participant Data:", {
      name: newName,
      year: newYear,
      photo: newPhoto, // This will be a File object
    });

    // Reset form fields after submission attempt
    setNewName("");
    setNewYear("");
    setNewPhoto(null);
    // Clear file input value if possible (might require a ref or specific component logic)
    const form = e.target as HTMLFormElement;
    form.reset(); // Resets all form controls to their initial values
  };

  const handleDelete = (participantId: string) => {
    // This is where you would handle participant deletion.
    // This requires backend logic to remove the participant from your data source.

    console.log(`Attempting to delete participant with ID: ${participantId}`);

    // For a frontend-only demonstration with mock data,
    // you could filter the participants list to remove the participant:
    // setParticipants(participants.filter(p => p.id !== participantId));
  };

  return (
    <>
      <PageHeader
        title="Participants"
        description="View all registered participants in the competition."
      />

      {/* New Card for adding participant */}
      <Card className="shadow-lg mb-6"> {/* Added margin-bottom */}
        <CardHeader>
          <CardTitle>Add New Participant</CardTitle>
          <CardDescription>
            Fill in the details below to add a new participant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                type="text"
                id="name"
                placeholder="Participant Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                type="number"
                id="year"
                placeholder="e.g., 1"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                required
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="photo">Photo</Label>
              <Input
                type="file"
                id="photo"
                onChange={(e) => setNewPhoto(e.target.files ? e.target.files[0] : null)}
                accept="image/*"
              />
            </div>
            <Button type="submit">Add Participant</Button>
          </form>
        </CardContent>
      </Card>


      {/* Existing Card for participant list */}
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
                <TableRow><TableHead className="w-[80px]">Photo</TableHead><TableHead>Name</TableHead><TableHead>Year</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
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
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(participant.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
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
