const fs = require('fs');
const updates = {
  crh: {
    'profile.leaderboardGuestMessage': 'Reytingde kösterilmek ve başqalarıman yarışmaq içün kirtiniñiz.',
    'leaderboard.limitHint': 'Diger qullanıcılar sizi körmesi içün {required} {unit} qazanmalısıñız',
    'leaderboard.unitDays': 'kün devamında',
    'leaderboard.unitCorrect': 'doğru cevap',
    'leaderboard.unitAttempts': 'cevap',
    'leaderboard.unitCorrectStreak': 'sıradaki doğru cevap',
    'leaderboard.unitActiveDays': 'faal kün'
  },
  de: {
    'profile.leaderboardGuestMessage': 'Melden Sie sich an, um in der Bestenliste zu erscheinen und sich mit anderen zu messen!',
    'leaderboard.limitHint': 'Damit andere Benutzer Sie sehen können, müssen Sie {required} {unit} erreichen',
    'leaderboard.unitDays': 'Tage in Folge',
    'leaderboard.unitCorrect': 'richtige Antworten',
    'leaderboard.unitAttempts': 'Antworten',
    'leaderboard.unitCorrectStreak': 'richtige Antworten in Folge',
    'leaderboard.unitActiveDays': 'aktive Tage'
  },
  el: {
    'profile.leaderboardGuestMessage': 'Συνδεθείτε για να εμφανιστείτε στον πίνακα κατάταξης και να ανταγωνιστείτε με άλλους!',
    'leaderboard.limitHint': 'Για να σας δουν άλλοι χρήστες, πρέπει να κερδίσετε {required} {unit}',
    'leaderboard.unitDays': 'ημέρες στη σειρά',
    'leaderboard.unitCorrect': 'σωστές απαντήσεις',
    'leaderboard.unitAttempts': 'απαντήσεις',
    'leaderboard.unitCorrectStreak': 'σωστές απαντήσεις στη σειρά',
    'leaderboard.unitActiveDays': 'ενεργές ημέρες'
  },
  nl: {
    'profile.leaderboardGuestMessage': 'Log in om in de ranglijst te verschijnen und met anderen te concurreren!',
    'leaderboard.limitHint': 'Om door andere gebruikers gezien te worden, moet je {required} {unit} verdienen',
    'leaderboard.unitDays': 'dagen op rij',
    'leaderboard.unitCorrect': 'correcte antwoorden',
    'leaderboard.unitAttempts': 'pogingen',
    'leaderboard.unitCorrectStreak': 'correcte antwoorden op rij',
    'leaderboard.unitActiveDays': 'actieve dagen'
  },
  pl: {
    'profile.leaderboardGuestMessage': 'Zaloguj się, aby pojawić się w rankingu i rywalizować z innymi!'
  }
};

function updateJson(lang) {
  const path = 'src/lib/i18n/translations/' + lang + '.json';
  const data = updates[lang];
  let json;
  try {
    const raw = fs.readFileSync(path, 'utf8');
    // Remove potential BOM or garbage
    const clean = raw.trim().replace(/^\uFEFF/, '');
    json = JSON.parse(clean);
  } catch (e) {
    console.error('Error reading ' + lang + ': ' + e.message);
    return;
  }
  
  for (const key in data) {
    const parts = key.split('.');
    let obj = json;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = data[key];
  }
  
  fs.writeFileSync(path, JSON.stringify(json, null, '\t') + '\n', 'utf8');
}

for (const lang in updates) {
  updateJson(lang);
}
console.log('UI translations updated successfully.');
