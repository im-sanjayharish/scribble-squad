import fs from 'fs';
import path from 'path';
import { TopicPack } from '../../shared/types';

let topics: TopicPack[] = [];

export function loadTopics() {
  try {
    const dataPath = path.join(__dirname, '../data/topics.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    topics = parsed.topics;
    console.log(`Loaded ${topics.length} topic packs`);
  } catch (err) {
    console.error('Failed to load topics', err);
  }
}

export function getTopics(): TopicPack[] {
  return topics;
}

export function getWordsForTopic(topicId: string, customWords: string[]): string[] {
  if (topicId === 'custom') {
    return customWords;
  }
  const pack = topics.find(t => t.id === topicId);
  return pack ? pack.words : [];
}

export function getRandomWords(words: string[], count: number): string[] {
  if (words.length === 0) return ["Apple", "Banana", "Cat"].slice(0, count);
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
