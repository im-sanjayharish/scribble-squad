export type PlayerState = 'waiting' | 'guessing' | 'drawing' | 'guessed';
export type RoomState = 'waiting' | 'picking' | 'drawing' | 'turn_result' | 'podium';

export interface Player {
  id: string;
  name: string;
  score: number;
  state: PlayerState;
  socketId: string;
  hasGuessed: boolean;
  scoreThisTurn: number;
}

export interface RoomSettings {
  topicPack: string;
  rounds: number;
  drawTime: number; 
  customWords: string[]; 
}

export interface Room {
  id: string;
  hostId: string;
  state: RoomState;
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  currentTurnPlayerId: string | null; 
  turnEndTime: number | null; 
  wordToGuess: string | null;
  wordChoices: string[]; 
  hintRevealed: number[]; 
  drawnPathEvents: any[]; 
  hintLength?: number;
  isWordSpace?: boolean[];
}

export interface TopicPack {
  id: string;
  title: string;
  emoji: string;
  words: string[];
}

export interface ClientToServerEvents {
  "join_room": (data: { roomId: string; name: string }, callback: (res: { success: boolean; error?: string; room?: Room; me?: Player }) => void) => void;
  "reconnect_room": (data: { roomId: string; playerId: string }, callback: (res: { success: boolean; error?: string; room?: Room }) => void) => void;
  "update_settings": (data: Partial<RoomSettings>) => void;
  "start_game": () => void;
  "pick_word": (data: { word: string }) => void;
  "guess": (data: { text: string }) => void;
  "chat": (data: { text: string }) => void;
  
  "draw_stroke_start": (data: { x: number; y: number; color: string; size: number }) => void;
  "draw_points": (data: { points: { x: number; y: number }[] }) => void;
  "draw_stroke_end": () => void;
  "draw_undo": () => void;
  "draw_clear": () => void;
  "draw_fill": (data: { color: string }) => void;
}

export interface ServerToClientEvents {
  "room_update": (room: Room) => void; 
  "player_joined": (player: Player) => void;
  "player_left": (data: { playerId: string; hostId: string }) => void;
  "game_started": () => void;
  "turn_picking": (data: { drawerId: string; endTime: number; wordChoices?: string[] }) => void;
  "turn_drawing": (data: { drawerId: string; endTime: number; hintLength: number; isWordSpace: boolean[] }) => void;
  "hint_updated": (data: { index: number; letter: string }) => void;
  "player_guessed": (data: { playerId: string }) => void; 
  "chat_message": (data: { senderId: string; senderName: string; text: string; isSystem?: boolean }) => void;
  "close_guess": (data: { text: string }) => void; 
  "turn_result": (data: { word: string; scores: { playerId: string; scoreAdded: number; totalScore: number }[] }) => void;
  "game_over": (data: { podium: Player[]; gallery: any[] }) => void;
  "error": (data: { message: string }) => void;

  "draw_stroke_start": (data: { x: number; y: number; color: string; size: number }) => void;
  "draw_points": (data: { points: { x: number; y: number }[] }) => void;
  "draw_stroke_end": () => void;
  "draw_undo": () => void;
  "draw_clear": () => void;
  "draw_fill": (data: { color: string }) => void;
}
