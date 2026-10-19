import fs from 'fs';
import path from 'path';
import { TopicPack } from '../../shared/types';

export const FALLBACK_AVENGERS = [
  "Iron Man", "Captain America", "Thor", "Hulk", "Black Widow", "Hawkeye", "Spider-Man",
  "Black Panther", "Doctor Strange", "Captain Marvel", "Ant-Man", "Wasp", "Scarlet Witch",
  "Vision", "Falcon", "Winter Soldier", "War Machine", "Loki", "Thanos", "Groot",
  "Rocket Raccoon", "Star-Lord", "Gamora", "Drax", "Nebula", "Mantis", "Wolverine",
  "Deadpool", "Cyclops", "Storm", "Rogue", "Gambit", "Beast", "Professor X", "Magneto",
  "Mystique", "Nightcrawler", "Jean Grey", "Colossus", "Iceman", "Venom", "Green Goblin",
  "Doctor Octopus", "Sandman", "Electro", "Vulture", "Mysterio", "Kingpin", "Daredevil",
  "Punisher", "Ghost Rider", "Silver Surfer", "Galactus", "Ultron", "Red Skull", "Hela",
  "Nick Fury", "Shang-Chi", "Moon Knight", "Ms. Marvel", "She-Hulk", "Miles Morales",
  "Valkyrie", "Okoye", "Shuri", "Namor", "Dormammu", "Kang", "Odin", "Heimdall",
  "Bucky Barnes", "Agent Coulson"
];

export const FALLBACK_BEN10 = [
  "Heatblast", "Four Arms", "XLR8", "Diamondhead", "Upgrade", "Ripjaws", "Ghostfreak",
  "Wildmutt", "Grey Matter", "Stinkfly", "Cannonbolt", "Wildvine", "Blitzwolfer",
  "Snare-oh", "Frankenstrike", "Upchuck", "Ditto", "Eye Guy", "Way Big", "Arctiguana",
  "Buzzshock", "Swampfire", "Humungousaur", "Big Chill", "Chromastone", "Jetray",
  "Spidermonkey", "Goop", "Brainstorm", "Echo Echo", "Alien X", "Lodestar", "Rath",
  "Nanomech", "Water Hazard", "AmpFibian", "Armodrillo", "Terraspin", "NRG", "Fasttrack",
  "ChamAlien", "Eatle", "Clockwork", "Juryrigg", "Shocksquatch", "Feedback", "Gravattack",
  "Bloxx", "Crashhopper", "Ball Weevil", "Pesky Dust", "Walkatrout", "Mole-Stache",
  "The Worst", "Kickin Hawk", "Toepick", "Astrodactyl", "Bullfrag", "Atomix", "Gutrot",
  "Whampire", "Ultimate Humungousaur", "Ultimate Echo Echo", "Ultimate Swampfire",
  "Ultimate Spidermonkey", "Ultimate Big Chill", "Ultimate Cannonbolt"
];

let topics: TopicPack[] = [];

function findTopicsFile(): string | null {
  const candidates = [
    path.join(process.cwd(), 'data', 'topics.json'),
    path.join(process.cwd(), 'backend', 'data', 'topics.json'),
    path.join(process.cwd(), 'topics.json'),
    path.join(process.cwd(), '..', 'topics.json'),
    path.join(__dirname, '..', '..', '..', 'data', 'topics.json'),
    path.join(__dirname, '..', '..', '..', 'backend', 'data', 'topics.json'),
    path.join(__dirname, '..', '..', '..', 'topics.json'),
    path.join(__dirname, '..', '..', '..', '..', 'topics.json'),
    path.join(__dirname, '..', 'data', 'topics.json'),
    path.join(__dirname, 'data', 'topics.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export function loadTopics() {
  try {
    const dataPath = findTopicsFile();
    if (dataPath) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      topics = parsed.topics || [];
      console.log(`Loaded ${topics.length} topic packs from ${dataPath}`);
    } else {
      console.warn('topics.json not found in filesystem candidates, using built-in fallbacks');
      topics = [
        { id: 'avengers', title: 'Avengers', emoji: '🦸', words: FALLBACK_AVENGERS },
        { id: 'marvel', title: 'Marvel Characters', emoji: '🦸', words: FALLBACK_AVENGERS },
        { id: 'ben10', title: 'Ben 10 Aliens', emoji: '👽', words: FALLBACK_BEN10 },
      ];
    }
  } catch (err) {
    console.error('Failed to parse topics JSON, using built-in fallbacks', err);
    topics = [
      { id: 'avengers', title: 'Avengers', emoji: '🦸', words: FALLBACK_AVENGERS },
      { id: 'marvel', title: 'Marvel Characters', emoji: '🦸', words: FALLBACK_AVENGERS },
      { id: 'ben10', title: 'Ben 10 Aliens', emoji: '👽', words: FALLBACK_BEN10 },
    ];
  }
}

export function getTopics(): TopicPack[] {
  if (!topics || topics.length === 0) {
    loadTopics();
  }
  return topics;
}

export function getWordsForTopic(topicId: string, customWords: string[]): string[] {
  if (!topics || topics.length === 0) {
    loadTopics();
  }

  const cleanId = (topicId || 'avengers').toLowerCase().trim();

  if (cleanId === 'custom') {
    return customWords && customWords.length > 0 ? customWords : FALLBACK_AVENGERS;
  }

  // Handle Avengers and Marvel aliases
  if (cleanId === 'avengers' || cleanId === 'marvel' || cleanId === 'avenger') {
    const pack = topics.find(t => t.id === 'avengers' || t.id === 'marvel');
    if (pack && pack.words && pack.words.length > 0) return pack.words;
    return FALLBACK_AVENGERS;
  }

  // Handle Ben 10 aliases
  if (cleanId === 'ben10' || cleanId === 'ben 10' || cleanId === 'aliens') {
    const pack = topics.find(t => t.id === 'ben10');
    if (pack && pack.words && pack.words.length > 0) return pack.words;
    return FALLBACK_BEN10;
  }

  const pack = topics.find(t => t.id.toLowerCase() === cleanId);
  if (pack && pack.words && pack.words.length > 0) {
    return pack.words;
  }

  return FALLBACK_AVENGERS;
}

export function getRandomWords(words: string[], count: number = 3): string[] {
  const pool = words && words.length > 0 ? words : FALLBACK_AVENGERS;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
