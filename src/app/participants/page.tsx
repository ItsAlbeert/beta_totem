
"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { getParticipants, addParticipant, deleteParticipant } from "@/lib/firestore-services";

export default function ParticipantsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState<1 | 2 | 3 | "">(1);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);

  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: getParticipants,
  });

  const addParticipantMutation = useMutation({
    mutationFn: addParticipant,
    onSuccess: (newParticipant) => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast({
        title: "Participant Added",
        description: `${newParticipant.name} has been added.`,
      });
      setNewName("");
      setNewYear(1);
      setNewPhoto(null);
      const fileInput = document.getElementById('photo') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    },
    onError: (error) => {
      toast({
        title: "Error adding participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: deleteParticipant,
    onSuccess: (_, deletedParticipantId) => {
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] }); // Scores might be linked
      const deletedName = participants.find(p => p.id === deletedParticipantId)?.name || "Participant";
      toast({
        title: "Participant Deleted",
        description: `${deletedName} and their scores have been removed.`,
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

    const participantData: Omit<Participant, 'id' | 'photoUrl'> & { photoUrl?: string } = {
      name: newName,
      year: numericYear as 1 | 2 | 3,
    };
    
    const processAddition = (photoDataUrl?: string) => {
      const finalParticipantData: Omit<Participant, 'id'> = {
        ...participantData,
        ...(photoDataUrl && { photoUrl: photoDataUrl }),
      };
      addParticipantMutation.mutate(finalParticipantData);
    };

    if (newPhoto) {
      const reader = new FileReader();
      reader.onloadend = () => {
        processAddition(reader.result as string);
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Could not read the photo file.",
          variant: "destructive",
        });
         processAddition(); 
      };
      reader.readAsDataURL(newPhoto);
    } else {
      processAddition();
    }
  };

  const handleDelete = (participantId: string) => {
    deleteParticipantMutation.mutate(participantId);
  };

  return (
    <>
      <PageHeader
        title="Participants"
        description="View and manage registered participants in the competition."
      />

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 mb-6">
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
                disabled={addParticipantMutation.isPending}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="year">Year (1, 2, or 3)</Label>
              <Input
                type="number"
                id="year"
                placeholder="e.g., 1"
                value={newYear === "" ? "" : newYear} 
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                        setNewYear("");
                    } else {
                        const numVal = parseInt(val, 10);
                         if (!isNaN(numVal) && [1, 2, 3].includes(numVal)) {
                            setNewYear(numVal as 1 | 2 | 3);
                        } else if (val.length <=1 && !isNaN(numVal) && numVal >=0 && numVal <=9) { 
                             setNewYear(val as any); 
                        }
                    }
                }}
                min="1"
                max="3"
                required
                disabled={addParticipantMutation.isPending}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="photo">Photo</Label>
              <Input
                type="file"
                id="photo"
                onChange={(e) => setNewPhoto(e.target.files ? e.target.files[0] : null)}
                accept="image/*"
                disabled={addParticipantMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={addParticipantMutation.isPending}>
              {addParticipantMutation.isPending ? "Adding..." : "Add Participant"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Participant List</CardTitle>
          <CardDescription>
            A list of all participants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingParticipants ? (
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(participant.id)}
                        disabled={deleteParticipantMutation.isPending && deleteParticipantMutation.variables === participant.id}
                      >
                        {(deleteParticipantMutation.isPending && deleteParticipantMutation.variables === participant.id) ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {participants.length === 0 && !isLoadingParticipants && (
            <p className="text-center text-muted-foreground py-8">No participants found. Add some using the form above!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
