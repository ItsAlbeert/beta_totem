
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
import { useToast } from "@/hooks/use-toast";

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
  const [newYear, setNewYear] = useState<1 | 2 | 3 | "">(1); // Ensure year is one of the allowed types or empty for input
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching participants only if the list is empty
    if (participants.length === 0) {
      const timer = setTimeout(() => {
        setParticipants(mockParticipants);
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setLoading(false); // Already have data, no need to load mock
    }
  }, [participants.length]); // Rerun if participants.length changes (e.g. all deleted)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newName || !newYear) {
      toast({
        title: "Error",
        description: "Name and year are required.",
        variant: "destructive",
      });
      return;
    }
    
    const numericYear = parseInt(newYear.toString(), 10);
    if (isNaN(numericYear) || ![1, 2, 3].includes(numericYear)) {
         toast({
            title: "Error",
            description: "Year must be 1, 2, or 3.",
            variant: "destructive",
        });
        return;
    }


    const newParticipant: Participant = {
      id: Date.now().toString(), // Simple unique ID for client-side
      name: newName,
      year: numericYear as 1 | 2 | 3,
    };

    if (newPhoto) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newParticipant.photoUrl = reader.result as string;
        setParticipants(prevParticipants => [...prevParticipants, newParticipant]);
        toast({
          title: "Participant Added",
          description: `${newParticipant.name} has been added.`,
        });
      };
      reader.readAsDataURL(newPhoto);
    } else {
      setParticipants(prevParticipants => [...prevParticipants, newParticipant]);
      toast({
        title: "Participant Added",
        description: `${newParticipant.name} has been added.`,
      });
    }

    // Reset form fields
    setNewName("");
    setNewYear(1);
    setNewPhoto(null);
    const form = e.target as HTMLFormElement;
    form.reset();
  };

  const handleDelete = (participantId: string) => {
    const participantToDelete = participants.find(p => p.id === participantId);
    setParticipants(prevParticipants => prevParticipants.filter(p => p.id !== participantId));
    toast({
      title: "Participant Deleted",
      description: `${participantToDelete?.name || 'Participant'} has been removed.`,
      variant: "destructive",
    });
  };

  return (
    <>
      <PageHeader
        title="Participants"
        description="View and manage registered participants in the competition."
      />

      <Card className="shadow-lg mb-6">
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
              <Label htmlFor="year">Year (1, 2, or 3)</Label>
              <Input
                type="number"
                id="year"
                placeholder="e.g., 1"
                value={newYear === "" ? "" : newYear} // Handle empty input string for number
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                        setNewYear("");
                    } else {
                        const numVal = parseInt(val, 10);
                         if (!isNaN(numVal) && [1, 2, 3].includes(numVal)) {
                            setNewYear(numVal as 1 | 2 | 3);
                        } else if (val.length <=1 && !isNaN(numVal) ) { // Allow typing single digit
                             setNewYear(val as any); // Temporarily allow other numbers if user is typing
                        }
                    }
                }}
                min="1"
                max="3"
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Participant List</CardTitle>
          <CardDescription>
            A list of all participants.
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
            <p className="text-center text-muted-foreground py-8">No participants found. Add some using the form above!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
