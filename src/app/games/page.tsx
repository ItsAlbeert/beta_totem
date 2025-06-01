
"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Game, GameCategory } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Puzzle } from "lucide-react";
import { getGames, addGame, deleteGame } from "@/lib/firestore-services";

export default function GamesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newGameName, setNewGameName] = useState("");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newGameCategory, setNewGameCategory] = useState<GameCategory>("Physical");

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const addGameMutation = useMutation({
    mutationFn: addGame,
    onSuccess: (newGame) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      toast({
        title: "Game Added",
        description: `${newGame.name} has been added to the ${newGame.category} category.`,
      });
      setNewGameName("");
      setNewGameDescription("");
      setNewGameCategory("Physical");
    },
    onError: (error) => {
      toast({
        title: "Error adding game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: deleteGame,
    onSuccess: (_, deletedGameId) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      const deletedName = games.find(g => g.id === deletedGameId)?.name || "Game";
      toast({
        title: "Game Deleted",
        description: `${deletedName} has been removed.`,
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newGameName || !newGameCategory) {
      toast({
        title: "Error",
        description: "Game name and category are required.",
        variant: "destructive",
      });
      return;
    }

    const newGameData: Omit<Game, "id"> = {
      name: newGameName,
      description: newGameDescription,
      category: newGameCategory,
    };
    addGameMutation.mutate(newGameData);
  };

  const handleDelete = (gameId: string) => {
    deleteGameMutation.mutate(gameId);
  };

  return (
    <>
      <PageHeader
        title="Manage Games"
        description="Add, view, and manage games for the competition."
      >
        <Puzzle className="w-8 h-8 text-primary" />
      </PageHeader>

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 mb-6">
        <CardHeader>
          <CardTitle>Add New Game</CardTitle>
          <CardDescription>
            Fill in the details below to add a new game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameName">Name</Label>
              <Input
                type="text"
                id="gameName"
                placeholder="Game Name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                required
                disabled={addGameMutation.isPending}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameDescription">Description</Label>
              <Textarea
                id="gameDescription"
                placeholder="Brief description of the game"
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                disabled={addGameMutation.isPending}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameCategory">Category</Label>
              <Select 
                value={newGameCategory} 
                onValueChange={(value) => setNewGameCategory(value as GameCategory)}
                disabled={addGameMutation.isPending}
              >
                <SelectTrigger id="gameCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Mental">Mental</SelectItem>
                  <SelectItem value="Extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addGameMutation.isPending}>
              {addGameMutation.isPending ? "Adding..." : "Add Game"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Game List</CardTitle>
          <CardDescription>
            A list of all defined games.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGames ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">{game.name}</TableCell>
                    <TableCell>{game.description}</TableCell>
                    <TableCell>{game.category}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(game.id)}
                        disabled={deleteGameMutation.isPending && deleteGameMutation.variables === game.id}
                      >
                        {(deleteGameMutation.isPending && deleteGameMutation.variables === game.id) ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {games.length === 0 && !isLoadingGames && (
            <p className="text-center text-muted-foreground py-8">No games found. Add some using the form above!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
