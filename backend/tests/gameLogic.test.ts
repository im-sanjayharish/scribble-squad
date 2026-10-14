import { calculateScore, isCloseGuess, isCorrectGuess, getHintIndices } from '../src/gameLogic';

describe('Game Logic', () => {
  it('should calculate score based on time left', () => {
    expect(calculateScore(60000, 60000)).toBe(500);
    expect(calculateScore(30000, 60000)).toBe(300);
    expect(calculateScore(0, 60000)).toBe(100);
  });

  it('should detect correct guesses', () => {
    expect(isCorrectGuess(' Apple ', 'apple')).toBe(true);
    expect(isCorrectGuess('appl', 'apple')).toBe(false);
  });

  it('should detect close guesses (1 edit distance)', () => {
    expect(isCloseGuess('appl', 'apple')).toBe(true); 
    expect(isCloseGuess('aple', 'apple')).toBe(true); 
    expect(isCloseGuess('app', 'apple')).toBe(false); 
    expect(isCloseGuess('apple', 'apple')).toBe(false); // exact is not close
  });

  it('should reveal hints without exceeding max ratio and ignore spaces', () => {
    const word = 'Spider Man'; // 9 non-space characters
    let revealed: number[] = [];
    
    const idx1 = getHintIndices(word, revealed, 0.4);
    if (idx1 !== -1) revealed.push(idx1);
    
    const idx2 = getHintIndices(word, revealed, 0.4);
    if (idx2 !== -1) revealed.push(idx2);
    
    const idx3 = getHintIndices(word, revealed, 0.4);
    if (idx3 !== -1) revealed.push(idx3);
    
    // maxReveal for 0.4 is Math.floor(9 * 0.4) = 3
    const idx4 = getHintIndices(word, revealed, 0.4);
    expect(idx4).toBe(-1); // Should hit limit
    
    // Should never reveal the space at index 6
    expect(revealed).not.toContain(6);
  });
});
