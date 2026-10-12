const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'src', 'lib', 'i18n', 'translations');

const translations = {
  uk: {
    toast: "Схоже, цей браузер не підтримує озвучення слів 😕",
    moreDetails: "Детальніше",
    modalTitle: "Помилка озвучення 😕",
    modalDesc1: "Slovko не має вбудованої озвучки, а використовує системні можливості вашого пристрою.",
    modalDesc2: "На жаль, ваш поточний браузер або операційна система не підтримують синтез мовлення для {lang} мови.",
    modalDesc3: "Спробуйте скористатися іншим браузером (наприклад, Chrome чи Safari) або перевірте системні налаштування."
  },
  en: {
    toast: "Looks like this browser doesn't support speech synthesis 😕",
    moreDetails: "More details",
    modalTitle: "Speech Error 😕",
    modalDesc1: "Slovko doesn't have built-in voice acting, but uses the system capabilities of your device.",
    modalDesc2: "Unfortunately, your current browser or operating system does not support speech synthesis for the {lang} language.",
    modalDesc3: "Try using another browser (like Chrome or Safari) or check your system settings."
  },
  pl: {
    toast: "Wygląda na to, że ta przeglądarka nie obsługuje syntezy mowy 😕",
    moreDetails: "Więcej szczegółów",
    modalTitle: "Błąd wymowy 😕",
    modalDesc1: "Slovko nie ma wbudowanego lektora, wykorzystuje możliwości systemowe Twojego urządzenia.",
    modalDesc2: "Niestety Twoja obecna przeglądarka lub system operacyjny nie obsługuje syntezy mowy dla języka {lang}.",
    modalDesc3: "Spróbuj użyć innej przeglądarki (np. Chrome lub Safari) lub sprawdź ustawienia systemowe."
  },
  de: {
    toast: "Dieser Browser scheint keine Sprachsynthese zu unterstützen 😕",
    moreDetails: "Mehr Details",
    modalTitle: "Sprachfehler 😕",
    modalDesc1: "Slovko hat keine eingebaute Sprachausgabe, sondern nutzt die Systemfunktionen Ihres Geräts.",
    modalDesc2: "Leider unterstützt Ihr aktueller Browser oder Ihr Betriebssystem keine Sprachsynthese für die Sprache {lang}.",
    modalDesc3: "Versuchen Sie, einen anderen Browser (wie Chrome oder Safari) zu verwenden, oder überprüfen Sie Ihre Systemeinstellungen."
  },
  nl: {
    toast: "Deze browser lijkt spraaksynthese niet te ondersteunen 😕",
    moreDetails: "Meer details",
    modalTitle: "Spraakfout 😕",
    modalDesc1: "Slovko heeft geen ingebouwde stem, maar gebruikt de systeemfuncties van je apparaat.",
    modalDesc2: "Helaas ondersteunt je huidige browser of besturingssysteem geen spraaksynthese voor de {lang} taal.",
    modalDesc3: "Probeer een andere browser (zoals Chrome of Safari) of controleer je systeeminstellingen."
  },
  el: {
    toast: "Φαίνεται ότι αυτό το πρόγραμμα περιήγησης δεν υποστηρίζει σύνθεση ομιλίας 😕",
    moreDetails: "Περισσότερες λεπτομέρειες",
    modalTitle: "Σφάλμα Ομιλίας 😕",
    modalDesc1: "Το Slovko δεν έχει ενσωματωμένη φωνή, αλλά χρησιμοποιεί τις δυνατότητες συστήματος της συσκευής σας.",
    modalDesc2: "Δυστυχώς, το τρέχον πρόγραμμα περιήγησης ή λειτουργικό σας σύστημα δεν υποστηρίζει σύνθεση ομιλίας για τη γλώσσα {lang}.",
    modalDesc3: "Δοκιμάστε να χρησιμοποιήσετε διαφορετικό πρόγραμμα περιήγησης (όπως Chrome ή Safari) ή ελέγξτε τις ρυθμίσεις του συστήματός σας."
  },
  crh: {
    toast: "Alay körüne, bu brauzer nutuq sintezini desteklemey 😕",
    moreDetails: "Tafsilât",
    modalTitle: "Nutuq hatası 😕",
    modalDesc1: "Slovko'nıñ öz sesi yoq, o cihazıñıznıñ sistem imkânlarını qullana.",
    modalDesc2: "Teessüf ki, şimdiki brauzeriñiz yaki operatsion sisteması {lang} tili içün nutuq sintezini desteklemey.",
    modalDesc3: "Başqa bir brauzer (meselâ Chrome yaki Safari) qullanmağa tırışıñız yaki sistem sazlamalarını teşkeriñiz."
  }
};

const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  const filePath = path.join(i18nDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.errors) data.errors = {};
  
  data.errors.speech = translations[lang] || translations.en;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n', 'utf8');
  console.log(`Updated ${file}`);
}
