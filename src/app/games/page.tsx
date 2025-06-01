
"use client";

import { useEffect, useState } from "react";
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
import { getStoredData, storeData, GAMES_STORAGE_KEY } from "@/lib/storage";

const initialMockGames: Game[] = [
  { id: "game1", name: "Obstacle Course", description: "Navigate a series of physical challenges.", category: "Physical" },
  { id: "game2", name: "Logic Puzzles", description: "Solve a set of brain teasers.", category: "Mental" },
  { id: "game3", name: "Speed Bonus", description: "Complete a task under a tight time limit for bonus.", category: "Extra" },
];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGameName, setNewGameName] = useState("");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newGameCategory, setNewGameCategory] = useState<GameCategory>("Physical");
  const { toast } = useToast();

  useEffect(() => {
    const storedGames = getStoredData<Game>(GAMES_STORAGE_KEY, []);
    if (storedGames.length > 0) {
      setGames(storedGames);
    } else {
      // Only init with mocks if local storage for games is truly empty (key does not exist)
      if (localStorage.getItem(GAMES_STORAGE_KEY) === null) {
        setGames(initialMockGames);
        storeData<Game>(GAMES_STORAGE_KEY, initialMockGames);
      } else {
        setGames([]); // if localStorage had something (maybe empty array string "[]")
      }
    }
    setLoading(false);
  }, []);

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

    const newGame: Game = {
      id: Date.now().toString(),
      name: newGameName,
      description: newGameDescription,
      category: newGameCategory,
    };

    setGames(prevGames => {
      const updatedGames = [...prevGames, newGame];
      storeData<Game>(GAMES_STORAGE_KEY, updatedGames);
      return updatedGames;
    });

    toast({
      title: "Game Added",
      description: `${newGame.name} has been added to the ${newGame.category} category.`,
    });

    setNewGameName("");
    setNewGameDescription("");
    setNewGameCategory("Physical");
  };

  const handleDelete = (gameId: string) => {
    const gameToDelete = games.find(g => g.id === gameId);
    setGames(prevGames => {
      const updatedGames = prevGames.filter(g => g.id !== gameId);
      storeData<Game>(GAMES_STORAGE_KEY, updatedGames);
      return updatedGames;
    });
    toast({
      title: "Game Deleted",
      description: `${gameToDelete?.name || 'Game'} has been removed.`,
      variant: "destructive",
    });
     // Note: This does not remove game times from existing scores.
     // That would require iterating through all scores and is a more complex operation.
     // For now, we assume if a game is deleted, its times become orphaned in scores,
     // or the UI for recording/displaying scores would simply not show inputs/data for deleted games.
  };

  return (
    <>
      <PageHeader
        title="Manage Games"
        description="Add, view, and manage games for the competition."
      >
        <Puzzle className="w-8 h-8 text-primary" />
      </PageHeader>

      <Card className="shadow-lg mb-6">
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
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameDescription">Description</Label>
              <Textarea
                id="gameDescription"
                placeholder="Brief description of the game"
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="gameCategory">Category</Label>
              <Select value={newGameCategory} onValueChange={(value) => setNewGameCategory(value as GameCategory)}>
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
            <Button type="submit">Add Game</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Game List</CardTitle>
          <CardDescription>
            A list of all defined games.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {games.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">No games found. Add some using the form above!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
