
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Game, GameCategory, ExtraGameType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Puzzle } from "lucide-react";
import { getGames, addGame, deleteGame, updateGame } from "@/lib/firestore-services";

export default function GamesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState("");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newGameCategory, setNewGameCategory] = useState<GameCategory>("Physical");
  const [newGameExtraType, setNewGameExtraType] = useState<ExtraGameType>("opcional");


  const { data: games = [], isLoading: isLoadingGames, error: errorGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: getGames,
  });

  const gameMutation = useMutation({
    mutationFn: async (gameData: { id?: string; data: Omit<Game, "id">}) => {
      if (gameData.id) {
        await updateGame(gameData.id, gameData.data);
        return { ...gameData.data, id: gameData.id }; // Return the updated game structure
      } else {
        return addGame(gameData.data);
      }
    },
    onSuccess: (mutatedGame) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] }); // Invalidate scores as game definitions affect calculations
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboardData"] });
      queryClient.invalidateQueries({ queryKey: ["trendsData"] });
      queryClient.invalidateQueries({ queryKey: ["comparisonsData"] });
      queryClient.invalidateQueries({ queryKey: ["calculationsData"] });
      
      toast({
        title: isEditing ? "Game Updated" : "Game Added",
        description: `${mutatedGame.name} has been ${isEditing ? 'updated' : 'added'}.`,
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: isEditing ? "Error updating game" : "Error adding game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: deleteGame,
    onSuccess: (_, deletedGameId) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboardData"] });
      queryClient.invalidateQueries({ queryKey: ["trendsData"] });
      queryClient.invalidateQueries({ queryKey: ["comparisonsData"] });
      queryClient.invalidateQueries({ queryKey: ["calculationsData"] });

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

  const resetForm = () => {
    setIsEditing(false);
    setEditingGameId(null);
    setNewGameName("");
    setNewGameDescription("");
    setNewGameCategory("Physical");
    setNewGameExtraType("opcional");
  };
  
  const handleEdit = (game: Game) => {
    setIsEditing(true);
    setEditingGameId(game.id);
    setNewGameName(game.name);
    setNewGameDescription(game.description);
    setNewGameCategory(game.category);
    if (game.category === 'Extra') {
      setNewGameExtraType(game.extraType || 'opcional');
    } else {
      setNewGameExtraType('opcional'); // Reset if not extra
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


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

    const gameData: Omit<Game, "id"> = {
      name: newGameName,
      description: newGameDescription,
      category: newGameCategory,
    };

    if (newGameCategory === "Extra") {
      gameData.extraType = newGameExtraType;
    } else {
      delete gameData.extraType; // Ensure extraType is not set for non-Extra games
    }
    
    gameMutation.mutate({ id: editingGameId || undefined, data: gameData });
  };

  const handleDelete = (gameId: string) => {
    deleteGameMutation.mutate(gameId);
  };
  
  if (errorGames) {
    return <p className="text-destructive text-center py-8">Error loading games: {(errorGames as Error).message}</p>;
  }


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
          <CardTitle>{isEditing ? "Edit Game" : "Add New Game"}</CardTitle>
          <CardDescription>
            {isEditing ? "Update the details of the game below." : "Fill in the details below to add a new game."}
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
                disabled={gameMutation.isPending}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="gameDescription">Description</Label>
              <Textarea
                id="gameDescription"
                placeholder="Brief description of the game"
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                disabled={gameMutation.isPending}
                className="max-w-full sm:max-w-md md:max-w-lg" 
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameCategory">Category</Label>
              <Select 
                value={newGameCategory} 
                onValueChange={(value) => setNewGameCategory(value as GameCategory)}
                disabled={gameMutation.isPending}
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

            {newGameCategory === "Extra" && (
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="gameExtraType">Extra Game Type</Label>
                <Select
                  value={newGameExtraType}
                  onValueChange={(value) => setNewGameExtraType(value as ExtraGameType)}
                  disabled={gameMutation.isPending}
                >
                  <SelectTrigger id="gameExtraType">
                    <SelectValue placeholder="Select extra type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opcional">Opcional</SelectItem>
                    <SelectItem value="obligatoria">Obligatoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex space-x-2">
                <Button type="submit" disabled={gameMutation.isPending}>
                {gameMutation.isPending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Game" : "Add Game")}
                </Button>
                {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={gameMutation.isPending}>
                    Cancel Edit
                </Button>
                )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Game List</CardTitle>
          <CardDescription>
            A list of all defined games. Click "Edit" to modify a game.
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
                   <Skeleton className="h-8 w-[120px] ml-auto" />
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
                  <TableHead>Type (Extra)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">{game.name}</TableCell>
                    <TableCell className="max-w-xs truncate" title={game.description}>{game.description}</TableCell>
                    <TableCell>{game.category}</TableCell>
                    <TableCell>{game.category === 'Extra' ? game.extraType : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(game)}
                        disabled={gameMutation.isPending || deleteGameMutation.isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(game.id)}
                        disabled={deleteGameMutation.isPending && deleteGameMutation.variables === game.id || gameMutation.isPending}
                      >
                        {(deleteGameMutation.isPending && deleteGameMutation.variables === game.id) ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {games.length === 0 && !isLoadingGames && !errorGames && (
            <p className="text-center text-muted-foreground py-8">No games found. Add some using the form above!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
