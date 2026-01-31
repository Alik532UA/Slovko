/**
 * Початковий набір слів для вивчення
 * У майбутньому: замінити на API/localStorage
 */
import type { WordPair } from '../types';

export const wordPairs: WordPair[] = [
    { id: '1', ukrainian: 'коли', english: 'when' },
    { id: '2', ukrainian: 'класти', english: 'put' },
    { id: '3', ukrainian: 'могли б', english: 'could' },
    { id: '4', ukrainian: 'помідор', english: 'tomato' },
    { id: '5', ukrainian: 'старий', english: 'old' },
    { id: '6', ukrainian: 'новий', english: 'new' },
    { id: '7', ukrainian: 'книга', english: 'book' },
    { id: '8', ukrainian: 'вода', english: 'water' },
    { id: '9', ukrainian: 'хліб', english: 'bread' },
    { id: '10', ukrainian: 'молоко', english: 'milk' },
    { id: '11', ukrainian: 'яблуко', english: 'apple' },
    { id: '12', ukrainian: 'дім', english: 'house' },
    { id: '13', ukrainian: 'кіт', english: 'cat' },
    { id: '14', ukrainian: 'собака', english: 'dog' },
    { id: '15', ukrainian: 'дерево', english: 'tree' },
    { id: '16', ukrainian: 'сонце', english: 'sun' },
    { id: '17', ukrainian: 'місяць', english: 'moon' },
    { id: '18', ukrainian: 'зірка', english: 'star' },
    { id: '19', ukrainian: 'небо', english: 'sky' },
    { id: '20', ukrainian: 'земля', english: 'earth' },
    { id: '21', ukrainian: 'вогонь', english: 'fire' },
    { id: '22', ukrainian: 'час', english: 'time' },
    { id: '23', ukrainian: 'день', english: 'day' },
    { id: '24', ukrainian: 'ніч', english: 'night' },
    { id: '25', ukrainian: 'ранок', english: 'morning' },
    { id: '26', ukrainian: 'вечір', english: 'evening' },
    { id: '27', ukrainian: 'друг', english: 'friend' },
    { id: '28', ukrainian: 'любов', english: 'love' },
    { id: '29', ukrainian: 'життя', english: 'life' },
    { id: '30', ukrainian: 'робота', english: 'work' },
    { id: '31', ukrainian: 'школа', english: 'school' },
    { id: '32', ukrainian: 'місто', english: 'city' },
    { id: '33', ukrainian: 'країна', english: 'country' },
    { id: '34', ukrainian: 'їжа', english: 'food' },
    { id: '35', ukrainian: 'гроші', english: 'money' },
    { id: '36', ukrainian: 'серце', english: 'heart' },
    { id: '37', ukrainian: 'голова', english: 'head' },
    { id: '38', ukrainian: 'рука', english: 'hand' },
    { id: '39', ukrainian: 'нога', english: 'leg' },
    { id: '40', ukrainian: 'око', english: 'eye' }
];

/**
 * Отримати випадкові пари слів
 * @param count - кількість пар
 * @param excludeIds - ID пар, які вже використовуються
 */
export function getRandomPairs(count: number, excludeIds: Set<string> = new Set()): WordPair[] {
    const available = wordPairs.filter((p) => !excludeIds.has(p.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
