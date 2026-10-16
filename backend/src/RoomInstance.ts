import { Server } from 'socket.io';
import { Player, Room, RoomState, RoomSettings } from '../../shared/types';
import { getWordsForTopic, getRandomWords } from './topics';
import { calculateScore, isCorrectGuess, isCloseGuess, generateHintSpaces, getHintIndices } from './gameLogic';

export class RoomInstance {
  public data: Room;
  public io: Server;
  public lastActivity: number;
  private turnTimer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private timeTotalForTurn: number = 0;
  
  // Track players who haven't drawn in this round
  private remainingDrawersThisRound: string[] = [];

  constructor(id: string, io: Server, hostPlayer: Player) {
    this.io = io;
    this.lastActivity = Date.now();
    this.data = {
      id,
      hostId: hostPlayer.id,
      state: 'waiting',
      settings: {
        topicPack: 'marvel', // default
        rounds: 3,
        drawTime: 60,
        customWords: [],
      },
      players: [hostPlayer],
      currentRound: 0,
      currentTurnPlayerId: null,
      turnEndTime: null,
      wordToGuess: null,
      wordChoices: [],
      hintRevealed: [],
      drawnPathEvents: []
    };
  }

  public touch() {
    this.lastActivity = Date.now();
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.data.players.find(p => p.id === playerId);
  }

  public join(player: Player) {
    this.touch();
    // Reconnect logic
    const existing = this.getPlayer(player.id);
    if (existing) {
      existing.socketId = player.socketId;
      existing.name = player.name; // maybe update name
    } else {
      this.data.players.push(player);
    }
    
    // Auto-host if no host (e.g. host left)
    if (!this.data.hostId || !this.getPlayer(this.data.hostId)) {
      this.data.hostId = player.id;
    }
  }

  public removePlayer(playerId: string) {
    this.touch();
    const idx = this.data.players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      this.data.players.splice(idx, 1);
    }
    
    // Assign new host if host left
    if (this.data.hostId === playerId && this.data.players.length > 0) {
      this.data.hostId = this.data.players[0].id;
    }

    // If game is active and drawer left
    if (this.data.state === 'drawing' || this.data.state === 'picking') {
      if (this.data.currentTurnPlayerId === playerId) {
        this.io.to(this.data.id).emit('chat_message', {
          senderId: 'system',
          senderName: 'System',
          text: 'Drawer left the game! Skipping turn...',
          isSystem: true
        });
        this.endTurn();
      }
    }
    
    // Check if round should end because everyone guessed (and drawer is still there but guesser left)
    if (this.data.state === 'drawing' && this.allGuessersGuessed()) {
      this.endTurn();
    }
  }

  public updateSettings(settings: Partial<RoomSettings>) {
    this.touch();
    if (this.data.state === 'waiting') {
      this.data.settings = { ...this.data.settings, ...settings };
      this.broadcastState();
    }
  }

  public startGame() {
    this.touch();
    if (this.data.players.length < 2) return; // Need at least 2
    
    // Reset scores
    this.data.players.forEach(p => p.score = 0);
    this.data.currentRound = 1;
    this.data.drawnPathEvents = [];
    
    this.startRound();
    this.io.to(this.data.id).emit('game_started');
  }

  private startRound() {
    if (this.data.currentRound > this.data.settings.rounds) {
      this.endGame();
      return;
    }
    
    // Everyone plays once per round
    this.remainingDrawersThisRound = this.data.players.map(p => p.id);
    this.nextTurn();
  }

  private nextTurn() {
    this.clearTimers();
    this.data.drawnPathEvents = []; // clear drawing
    this.data.wordToGuess = null;
    this.data.hintRevealed = [];
    this.data.players.forEach(p => {
      p.state = 'waiting';
      p.hasGuessed = false;
      p.scoreThisTurn = 0;
    });

    if (this.remainingDrawersThisRound.length === 0) {
      // Round is over
      this.data.currentRound++;
      this.startRound();
      return;
    }

    // Pick next drawer
    const drawerId = this.remainingDrawersThisRound.shift()!;
    const drawer = this.getPlayer(drawerId);
    if (!drawer) {
      this.nextTurn(); // drawer disconnected
      return;
    }

    this.data.currentTurnPlayerId = drawerId;
    this.data.state = 'picking';
    
    // Select words
    const wordsPool = getWordsForTopic(this.data.settings.topicPack, this.data.settings.customWords);
    this.data.wordChoices = getRandomWords(wordsPool, 3);

    // End time for picking
    const pickTime = 10000;
    this.data.turnEndTime = Date.now() + pickTime;
    
    // Broadcast state
    this.broadcastState();

    this.io.to(this.data.id).emit('turn_picking', {
      drawerId,
      endTime: this.data.turnEndTime,
      wordChoices: this.data.wordChoices,
    });

    // Auto-pick if time expires
    this.turnTimer = setTimeout(() => {
      this.onWordPicked(this.data.wordChoices[0]); // Pick first word by default
    }, pickTime);
  }

  public onWordPicked(word: string) {
    if (this.data.state !== 'picking') return;
    this.touch();
    this.clearTimers();
    
    this.data.wordToGuess = word;
    this.data.state = 'drawing';
    const drawer = this.getPlayer(this.data.currentTurnPlayerId!);
    if (drawer) {
      drawer.state = 'drawing';
    }

    this.data.players.forEach(p => {
      if (p.id !== this.data.currentTurnPlayerId) {
        p.state = 'guessing';
      }
    });

    this.timeTotalForTurn = this.data.settings.drawTime * 1000;
    this.data.turnEndTime = Date.now() + this.timeTotalForTurn;

    this.broadcastState(); // Updates room state

    const isWordSpace = word.split('').map(c => c === ' ' || c === '-');
    this.io.to(this.data.id).emit('turn_drawing', {
      drawerId: this.data.currentTurnPlayerId!,
      endTime: this.data.turnEndTime,
      hintLength: word.length,
      isWordSpace,
    });

    // Set turn timer
    this.turnTimer = setTimeout(() => {
      this.endTurn();
    }, this.timeTotalForTurn);

    // Set hint timer
    this.scheduleNextHint(0.4); // first hint at 40% time elapsed
  }

  private scheduleNextHint(ratioElapsed: number) {
    if (this.data.state !== 'drawing' || !this.data.wordToGuess) return;
    
    const timeToWait = this.timeTotalForTurn * ratioElapsed - (Date.now() - (this.data.turnEndTime! - this.timeTotalForTurn));
    
    if (timeToWait > 0) {
      this.hintTimer = setTimeout(() => {
        this.revealHint(ratioElapsed);
      }, timeToWait);
    } else {
      this.revealHint(ratioElapsed);
    }
  }

  private revealHint(currentRatio: number) {
    if (!this.data.wordToGuess) return;
    
    let maxReveal = 0;
    if (currentRatio >= 0.7) {
      maxReveal = 0.5; // Up to 50% letters revealed at 70% time
    } else if (currentRatio >= 0.4) {
      maxReveal = 0.25; // Up to 25% letters revealed at 40% time
    }

    const idx = getHintIndices(this.data.wordToGuess, this.data.hintRevealed, maxReveal);
    if (idx !== -1) {
      this.data.hintRevealed.push(idx);
      this.io.to(this.data.id).emit('hint_updated', { index: idx, letter: this.data.wordToGuess[idx] });
    }

    if (currentRatio === 0.4) {
      this.scheduleNextHint(0.7);
    }
  }

  public onGuess(playerId: string, text: string) {
    if (this.data.state !== 'drawing' || !this.data.wordToGuess) return;
    const player = this.getPlayer(playerId);
    if (!player || player.state !== 'guessing' || player.hasGuessed) return;
    this.touch();

    if (isCorrectGuess(text, this.data.wordToGuess)) {
      // Score
      const timeLeft = this.data.turnEndTime! - Date.now();
      const points = calculateScore(timeLeft, this.timeTotalForTurn);
      
      // Bonus for first guesser
      const firstGuesser = this.data.players.find(p => p.hasGuessed) ? false : true;
      const finalPoints = points + (firstGuesser ? 50 : 0);
      
      player.hasGuessed = true;
      player.scoreThisTurn = finalPoints;
      player.score += finalPoints;
      player.state = 'guessed';

      // Drawer points
      const drawer = this.getPlayer(this.data.currentTurnPlayerId!);
      if (drawer) {
        drawer.scoreThisTurn += 50;
        drawer.score += 50;
      }

      this.io.to(this.data.id).emit('player_guessed', { playerId });
      this.io.to(this.data.id).emit('chat_message', {
        senderId: 'system',
        senderName: 'System',
        text: `${player.name} guessed it!`,
        isSystem: true
      });

      if (this.allGuessersGuessed()) {
        this.endTurn();
      }
    } else if (isCloseGuess(text, this.data.wordToGuess)) {
      this.io.to(player.socketId).emit('close_guess', { text: "So close!" });
      // Still show their guess to others
      this.io.to(this.data.id).emit('chat_message', {
        senderId: player.id,
        senderName: player.name,
        text
      });
    } else {
      // Regular chat
      this.io.to(this.data.id).emit('chat_message', {
        senderId: player.id,
        senderName: player.name,
        text
      });
    }
  }

  private allGuessersGuessed(): boolean {
    const guessers = this.data.players.filter(p => p.id !== this.data.currentTurnPlayerId);
    if (guessers.length === 0) return true; // Just drawer left
    return guessers.every(p => p.hasGuessed);
  }

  private endTurn() {
    this.clearTimers();
    this.data.state = 'turn_result';
    
    const scores = this.data.players.map(p => ({
      playerId: p.id,
      scoreAdded: p.scoreThisTurn,
      totalScore: p.score
    }));

    this.io.to(this.data.id).emit('turn_result', {
      word: this.data.wordToGuess || '',
      scores
    });

    this.broadcastState();

    setTimeout(() => {
      this.nextTurn();
    }, 5000); // Show results for 5 seconds
  }

  private endGame() {
    this.data.state = 'podium';
    this.broadcastState();

    const podium = [...this.data.players].sort((a, b) => b.score - a.score);
    this.io.to(this.data.id).emit('game_over', {
      podium,
      gallery: [] // TODO: Add replay logic later
    });
  }

  public broadcastState() {
    // Hide wordChoices and wordToGuess from non-drawers before sending
    // Create a sanitized copy of Room
    const sanitizedRoom: Room = { ...this.data, players: [...this.data.players] };
    
    // Instead of broadcasting everything simply, we could iterate clients and send.
    // For now, Socket.IO allows emitting to room. We will send the sanitized version,
    // and let the client handle it, OR send a custom state per player.
    // Given requirements: "the word must never appear in any payload sent to non-drawers"
    
    // Send specifically to each player
    this.data.players.forEach(p => {
      const pRoom = JSON.parse(JSON.stringify(this.data)) as Room;
      if (this.data.state === 'picking' && p.id !== this.data.currentTurnPlayerId) {
        pRoom.wordChoices = [];
      }
      if ((this.data.state === 'drawing' || this.data.state === 'picking') && p.id !== this.data.currentTurnPlayerId) {
        pRoom.wordToGuess = null;
      }
      if (this.data.wordToGuess) {
        pRoom.hintLength = this.data.wordToGuess.length;
        pRoom.isWordSpace = this.data.wordToGuess.split('').map(c => c === ' ' || c === '-');
      }
      this.io.to(p.socketId).emit('room_update', pRoom);
    });
  }

  public clearTimers() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.hintTimer) clearTimeout(this.hintTimer);
  }
}
