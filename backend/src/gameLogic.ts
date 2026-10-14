import levenshtein from 'fast-levenshtein';

export function calculateScore(timeLeft: number, totalTime: number): number {
  const ratio = Math.max(0, timeLeft / totalTime);
  return Math.floor(100 + ratio * 400);
}

export function isCloseGuess(guess: string, word: string): boolean {
  const g = guess.trim().toLowerCase();
  const w = word.trim().toLowerCase();
  if (g === w) return false;
  return levenshtein.get(g, w) <= 1;
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}

export function generateHintSpaces(word: string): boolean[] {
  return word.split('').map(c => c === ' ');
}

// maxRevealRatio: how many letters can be revealed at most (e.g., 0.5)
export function getHintIndices(word: string, currentRevealed: number[], maxRevealRatio: number): number {
  const unrevealed = [];
  let nonSpaceCount = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ') {
      nonSpaceCount++;
      if (!currentRevealed.includes(i)) {
        unrevealed.push(i);
      }
    }
  }
  
  if (unrevealed.length === 0) return -1;
  
  // Example: if word is 5 letters, maxRevealRatio 0.4 means 2 letters max.
  const maxToReveal = Math.floor(nonSpaceCount * maxRevealRatio);
  
  // If we already revealed the maximum allowed for this ratio, don't reveal more
  if (currentRevealed.length >= maxToReveal) return -1;
  
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
}
