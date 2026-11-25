import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  wakeTarget: '07:00',
  sleepTarget: '23:00',
  sleepPrepStart: '22:20',
  workStart: '08:30',
  workEnd: '17:00',
  lunchStart: '11:30',
  lunchEnd: '13:30',
  commuteMin: 25,
  gymCommuteMin: 10,
  readingFreqPerWeek: 6,
  englishFreqPerWeek: 3,
  itaiFreqPerWeek: 4,
  lowEnergy: {
    reading: 5,
    itai: 15,
    english: 10,
    exercise: 10
  },
  theme: 'system'
};
