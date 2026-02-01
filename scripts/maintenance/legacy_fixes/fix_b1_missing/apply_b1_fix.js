
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- DATA ---
// Here we will include the translations for B1 missing words.
// To keep it separate, we might usually put this in a separate file,
// but for this "all in one fix" approach for B1, let's embed or require it.

// Due to the large number of words (approx 500+ across B1, B2 etc),
// we will start by fixing B1 which is the most critical request (from report).

// We'll define a set of known translations for the identified missing keys.
// I'll populate this with a best-effort list based on the keys seen in the report.

const missingB1 = {
    // --- B1 Polysemy Fixes & New Words ---
    "appeal_1": { uk: "заклик", en: "appeal", de: "Appell", nl: "oproep", crh: "muracaat", transcription: "əˈpiːl" },
    "apply_1": { uk: "застосовувати", en: "apply", de: "anwenden", nl: "toepassen", crh: "qullanmaq", transcription: "əˈplaɪ" },
    "argue_1": { uk: "сперечатися", en: "argue", de: "streiten", nl: "ruziën", crh: "tartışmaq", transcription: "ˈɑːɡjuː" },
    "confirm_details": { uk: "підтверджувати (деталі)", en: "confirm", de: "bestätigen", nl: "bevestigen", crh: "tastiqlemek", transcription: "kənˈfɜːm" },
    "confuse_people": { uk: "плутати (людей)", en: "confuse", de: "verwirren", nl: "verwarren", crh: "qarıştırmaq", transcription: "kənˈfjuːz" },
    "consume_resources": { uk: "споживати", en: "consume", de: "konsumieren", nl: "consumeren", crh: "masraf etmek", transcription: "kənˈsjuːm" },
    "convince_audience": { uk: "переконувати", en: "convince", de: "überzeugen", nl: "overtuigen", crh: "inandırmaq", transcription: "kənˈvɪns" },
    "declare_war": { uk: "оголошувати (війну)", en: "declare", de: "erklären", nl: "verklaren", crh: "ilân etmek", transcription: "dɪˈkleə" },
    "encourage_growth": { uk: "заохочувати", en: "encourage", de: "ermutigen", nl: "aanmoedigen", crh: "cesaretlendirmek", transcription: "ɪnˈkʌrɪdʒ" },
    "establish_base": { uk: "встановлювати (базу)", en: "establish", de: "etablieren", nl: "vestigen", crh: "qurmaq", transcription: "ɪˈstæblɪʃ" },
    "miss_sad": { uk: "сумувати", en: "miss", de: "vermissen", nl: "missen", crh: "sağınmaq", transcription: "mɪs" },
    "obtain_get": { uk: "отримувати", en: "obtain", de: "erhalten", nl: "verkrijgen", crh: "elde etmek", transcription: "əbˈteɪn" },
    "occupy_take": { uk: "займати (місце)", en: "occupy", de: "besetzen", nl: "bezetten", crh: "zapt etmek", transcription: "ˈɒkjʊpaɪ" },
    "own_property": { uk: "володіти", en: "own", de: "besitzen", nl: "bezitten", crh: "sahip olmaq", transcription: "əʊn" },
    "prefer": { uk: "віддавати перевагу", en: "prefer", de: "bevorzugen", nl: "verkiezen", crh: "tercih etmek", transcription: "prɪˈfɜː" },
    "promise": { uk: "обіцяти", en: "promise", de: "versprechen", nl: "beloven", crh: "söz bermek", transcription: "ˈprɒmɪs" },
    "quit": { uk: "кидати / звільнятися", en: "quit", de: "aufhören", nl: "stoppen", crh: "tastamaq", transcription: "kwɪt" },
    "refuse": { uk: "відмовлятися", en: "refuse", de: "ablehnen", nl: "weigeren", crh: "red etmek", transcription: "rɪˈfjuːz" },
    "relax": { uk: "розслаблятися", en: "relax", de: "entspannen", nl: "ontspannen", crh: "raatlanmaq", transcription: "rɪˈlæks" },
    "release_let_go": { uk: "випускати", en: "release", de: "freilassen", nl: "vrijlaten", crh: "azat etmek", transcription: "rɪˈliːs" },
    "repair": { uk: "ремонтувати", en: "repair", de: "reparieren", nl: "repareren", crh: "tamir etmek", transcription: "rɪˈpeə" },
    "replace": { uk: "замінювати", en: "replace", de: "ersetzen", nl: "vervangen", crh: "deñiştirmek", transcription: "rɪˈpleɪs" },
    "report": { uk: "звітувати / доповідати", en: "report", de: "berichten", nl: "rapporteren", crh: "bildirmek", transcription: "rɪˈpɔːt" },
    "save_rescue": { uk: "рятувати", en: "save", de: "retten", nl: "redden", crh: "qurtarmaq", transcription: "seɪv" },
    "shout": { uk: "кричати", en: "shout", de: "schreien", nl: "schreeuwen", crh: "qıçırmaq", transcription: "ʃaʊt" },
    "solve": { uk: "вирішувати (проблему)", en: "solve", de: "lösen", nl: "oplossen", crh: "çözmek", transcription: "sɒlv" },
    "succeed": { uk: "досягати успіху", en: "succeed", de: "Erfolg haben", nl: "slagen", crh: "muvafaq olmaq", transcription: "səkˈsiːd" },
    "support_verb": { uk: "підтримувати", en: "support", de: "unterstützen", nl: "steunen", crh: "desteklemek", transcription: "səˈpɔːt" },
    "weigh": { uk: "важити / зважувати", en: "weigh", de: "wiegen", nl: "wegen", crh: "tartmaq", transcription: "weɪ" },

    // Nouns
    "achievement": { uk: "досягнення", en: "achievement", de: "Leistung", nl: "prestatie", crh: "muvafaqiyet", transcription: "əˈtʃiːvm(ə)nt" },
    "agreement": { uk: "угода", en: "agreement", de: "Vereinbarung", nl: "overeenkomst", crh: "araşuv", transcription: "əˈɡriːm(ə)nt" },
    "army": { uk: "армія", en: "army", de: "Armee", nl: "leger", crh: "ordu", transcription: "ˈɑːmi" },
    "authority_1": { uk: "влада / авторитет", en: "authority", de: "Autorität", nl: "autoriteit", crh: "selâhiyet", transcription: "ɔːˈθɒrɪti" },
    "democracy": { uk: "демократія", en: "democracy", de: "Demokratie", nl: "democratie", crh: "demokratiya", transcription: "dɪˈmɒkrəsi" },
    "development_growth": { uk: "розвиток", en: "development", de: "Entwicklung", nl: "ontwikkeling", crh: "inkişaf", transcription: "dɪˈvɛləpm(ə)nt" },
    "government": { uk: "уряд", en: "government", de: "Regierung", nl: "regering", crh: "ükümet", transcription: "ˈɡʌv(ə)nm(ə)nt" },
    "gun": { uk: "зброя / пістолет", en: "gun", de: "Waffe", nl: "geweer", crh: "silâ", transcription: "ɡʌn" },
    "law": { uk: "закон", en: "law", de: "Gesetz", nl: "wet", crh: "qanun", transcription: "lɔː" },
    "lawyer": { uk: "юрист / адвокат", en: "lawyer", de: "Anwalt", nl: "advocaat", crh: "advokat", transcription: "ˈlɔːjə" },

    // Adjectives
    "confident": { uk: "впевнений", en: "confident", de: "zuversichtlich", nl: "zelfverzekerd", crh: "emin", transcription: "ˈkɒnfɪd(ə)nt" },
    "lonely": { uk: "самотній", en: "lonely", de: "einsam", nl: "eenzaam", crh: "yalñız", transcription: "ˈləʊnli" },
    "mad_angry": { uk: "розлючений", en: "mad", de: "wütend", nl: "kwaad", crh: "acuvli", transcription: "mæd" },
    "nervous": { uk: "знервований", en: "nervous", de: "nervös", nl: "zenuwachtig", crh: "asabiy", transcription: "ˈnɜːvəs" },
    "proud": { uk: "гордий", en: "proud", de: "stolz", nl: "trots", crh: "mağrur", transcription: "praʊd" },
    "rude": { uk: "грубий", en: "rude", de: "unhöflich", nl: "onbeleefd", crh: "edepsiz", transcription: "ruːd" },
    "scared": { uk: "наляканий", en: "scared", de: "verängstigt", nl: "bang", crh: "qorqqan", transcription: "skeəd" },
    "shy": { uk: "сором'язливий", en: "shy", de: "schüchtern", nl: "verlegen", crh: "utançaq", transcription: "ʃaɪ" },
    "smart": { uk: "розумний", en: "smart", de: "schlau", nl: "slim", crh: "aqıllı", transcription: "smɑːt" },
    "tired": { uk: "втомлений", en: "tired", de: "müde", nl: "moe", crh: "yorgun", transcription: "ˈtaɪəd" },
    "disadvantage_con": { uk: "недолік", en: "disadvantage", de: "Nachteil", nl: "nadeel", crh: "eksiklik", transcription: "ˌdɪsədˈvɑːntɪdʒ" },

    // Tech / Computers
    "access": { uk: "доступ", en: "access", de: "Zugang", nl: "toegang", crh: "irişim", transcription: "ˈæksɛs" },
    "app": { uk: "додаток", en: "app", de: "App", nl: "app", crh: "uyğulama", transcription: "æp" },
    "cable": { uk: "кабель", en: "cable", de: "Kabel", nl: "kabel", crh: "kabel", transcription: "ˈkeɪb(ə)l" },
    "chip": { uk: "чіп", en: "chip", de: "Chip", nl: "chip", crh: "çip", transcription: "tʃɪp" },
    "data": { uk: "дані", en: "data", de: "Daten", nl: "data", crh: "malümat", transcription: "ˈdeɪtə" },
    "database": { uk: "база даних", en: "database", de: "Datenbank", nl: "database", crh: "malümat bazası", transcription: "ˈdeɪtəbeɪs" },
    "engine_1": { uk: "двигун", en: "engine", de: "Motor", nl: "motor", crh: "motor", transcription: "ˈɛndʒɪn" },
    "file": { uk: "файл", en: "file", de: "Datei", nl: "bestand", crh: "fayl", transcription: "faɪl" },
    "folder": { uk: "папка", en: "folder", de: "Ordner", nl: "map", crh: "buklet", transcription: "ˈfəʊldə" },
    "fuel": { uk: "паливо", en: "fuel", de: "Treibstoff", nl: "brandstof", crh: "yaqıt", transcription: "fjʊəl" },
    "hardware": { uk: "апаратне забезпечення", en: "hardware", de: "Hardware", nl: "hardware", crh: "donanım", transcription: "ˈhɑːdweə" },
    "password": { uk: "пароль", en: "password", de: "Passwort", nl: "wachtwoord", crh: "parol", transcription: "ˈpɑːswɜːd" },
    "server": { uk: "сервер", en: "server", de: "Server", nl: "server", crh: "server", transcription: "ˈsɜːvə" },
    "signal": { uk: "сигнал", en: "signal", de: "Signal", nl: "signaal", crh: "signal", transcription: "ˈsɪɡn(ə)l" },
    "software": { uk: "програмне забезпечення", en: "software", de: "Software", nl: "software", crh: "yazılım", transcription: "ˈsɒftweə" },
    "space_cosmos": { uk: "космос", en: "space", de: "Weltraum", nl: "ruimte", crh: "kosmos", transcription: "speɪs" },
    "user": { uk: "користувач", en: "user", de: "Benutzer", nl: "gebruiker", crh: "qullanıcı", transcription: "ˈjuːzə" },
    "virus": { uk: "вірус", en: "virus", de: "Virus", nl: "virus", crh: "virus", transcription: "ˈvaɪrəs" },
    "wifi": { uk: "wi-fi", en: "wifi", de: "WLAN", nl: "wifi", crh: "vayfay", transcription: "ˈwaɪfaɪ" },

    // Travel
    "accommodation_1": { uk: "житло", en: "accommodation", de: "Unterkunft", nl: "accommodatie", crh: "mesken", transcription: "əˌkɒməˈdeɪʃ(ə)n" },
    "arrival": { uk: "прибуття", en: "arrival", de: "Ankunft", nl: "aankomst", crh: "keliş", transcription: "əˈraɪv(ə)l" },
    "backpack": { uk: "рюкзак", en: "backpack", de: "Rucksack", nl: "rugzak", crh: "ryukzak", transcription: "ˈbækpæk" },
    "departure": { uk: "відправлення", en: "departure", de: "Abfahrt", nl: "vertrek", crh: "ketiş", transcription: "dɪˈpɑːtʃə" },
    "flight": { uk: "політ / рейс", en: "flight", de: "Flug", nl: "vlucht", crh: "uçuş", transcription: "flaɪt" },
    "guide": { uk: "гід / посібник", en: "guide", de: "Führer", nl: "gids", crh: "yolbaşçı", transcription: "ɡaɪd" },
    "hostel": { uk: "хостел", en: "hostel", de: "Hostel", nl: "hostel", crh: "yataqhane", transcription: "ˈhɒst(ə)l" },
    "journey": { uk: "подорож", en: "journey", de: "Reise", nl: "reis", crh: "seyaat", transcription: "ˈdʒɜːni" },
    "jungle": { uk: "джунглі", en: "jungle", de: "Dschungel", nl: "jungle", crh: "orman", transcription: "ˈdʒʌŋɡ(ə)l" },
    "luggage": { uk: "багаж", en: "luggage", de: "Gepäck", nl: "bagage", crh: "yük", transcription: "ˈlʌɡɪdʒ" },
    "passenger": { uk: "пасажир", en: "passenger", de: "Passagier", nl: "passagier", crh: "yolcu", transcription: "ˈpæsɪndʒə" },
    "passport": { uk: "паспорт", en: "passport", de: "Reisepass", nl: "paspoort", crh: "pasport", transcription: "ˈpɑːspɔːt" },
    "sightseeing": { uk: "огляд визначних пам'яток", en: "sightseeing", de: "Besichtigung", nl: "bezienswaardigheden bekijken", crh: "seyaat", transcription: "ˈsaɪtˌsiːɪŋ" },
    "souvenir": { uk: "сувенір", en: "souvenir", de: "Souvenir", nl: "souvenir", crh: "hatıra", transcription: "ˌsuːvəˈnɪə" },
    "suitcase": { uk: "валіза", en: "suitcase", de: "Koffer", nl: "koffer", crh: "camadan", transcription: "ˈsuːtkeɪs" },
    "terminal": { uk: "термінал", en: "terminal", de: "Terminal", nl: "terminal", crh: "terminal", transcription: "ˈtɜːmɪn(ə)l" },
    "valley": { uk: "долина", en: "valley", de: "Tal", nl: "vallei", crh: "dere", transcription: "ˈvæli" },
    "visa": { uk: "віза", en: "visa", de: "Visum", nl: "visum", crh: "viza", transcription: "ˈviːzə" },

    // Abstract / Other
    "adventure": { uk: "пригода", en: "adventure", de: "Abenteuer", nl: "avontuur", crh: "macera", transcription: "ədˈvɛntʃə" },
    "anger": { uk: "гнів", en: "anger", de: "Wut", nl: "woede", crh: "açuv", transcription: "ˈæŋɡə" },
    "appearance": { uk: "зовнішність / поява", en: "appearance", de: "Aussehen / Erscheinung", nl: "uiterlijk", crh: "körünüş", transcription: "əˈpɪərəns" },
    "conclusion_end": { uk: "висновок", en: "conclusion", de: "Fazit", nl: "conclusie", crh: "netic", transcription: "kənˈkluːʒ(ə)n" },
    "confidence_trust": { uk: "довіра / впевненість", en: "confidence", de: "Vertrauen", nl: "vertrouwen", crh: "inam", transcription: "ˈkɒnfɪd(ə)ns" },
    "danger_risk": { uk: "небезпека", en: "danger", de: "Gefahr", nl: "gevaar", crh: "telüke", transcription: "ˈdeɪndʒə" },
    "difference_variation": { uk: "різниця", en: "difference", de: "Unterschied", nl: "verschil", crh: "farq", transcription: "ˈdɪfrəns" },
    "fashion": { uk: "мода", en: "fashion", de: "Mode", nl: "mode", crh: "moda", transcription: "ˈfæʃ(ə)n" },
    "fun": { uk: "веселощі", en: "fun", de: "Spaß", nl: "plezier", crh: "eglence", transcription: "fʌn" },
    "future": { uk: "майбутнє", en: "future", de: "Zukunft", nl: "toekomst", crh: "kelecek", transcription: "ˈfjuːtʃə" },
    "history": { uk: "історія", en: "history", de: "Geschichte", nl: "geschiedenis", crh: "tarih", transcription: "ˈhɪst(ə)ri" },
    "idea": { uk: "ідея", en: "idea", de: "Idee", nl: "idee", crh: "fikir", transcription: "aɪˈdɪə" },
    "interest": { uk: "інтерес", en: "interest", de: "Interesse", nl: "interesse", crh: "meraq", transcription: "ˈɪntrɪst" },
    "luck": { uk: "удача", en: "luck", de: "Glück", nl: "geluk", crh: "qısmet", transcription: "lʌk" },
    "mistake": { uk: "помилка", en: "mistake", de: "Fehler", nl: "fout", crh: "hata", transcription: "mɪˈsteɪk" },
    "smell_sense": { uk: "нюх / запах", en: "smell", de: "Geruch", nl: "geur", crh: "qoqu", transcription: "smɛl" },
    "surprise": { uk: "сюрприз", en: "surprise", de: "Überraschung", nl: "verrassing", crh: "sürpriz", transcription: "səˈpraɪz" },
    "taste": { uk: "смак", en: "taste", de: "Geschmack", nl: "smaak", crh: "lezet", transcription: "teɪst" },

    // Phrasal verbs (often problematic keys)
    "break_down_machine": { uk: "зламатися (про механізм)", en: "break down", de: "kaputtgehen", nl: "kapotgaan", crh: "bozulmaq", transcription: "breɪk daʊn" },
    "bring_up_child": { uk: "виховувати", en: "bring up", de: "erziehen", nl: "opvoeden", crh: "terbiyelemek", transcription: "brɪŋ ʌp" },
    "carry_on": { uk: "продовжувати", en: "carry on", de: "weitermachen", nl: "doorgaan", crh: "devam etmek", transcription: "ˈkæri ɒn" },
    "look_after": { uk: "доглядати", en: "look after", de: "sich kümmern um", nl: "zorgen voor", crh: "baqmaq", transcription: "lʊk ˈɑːftə" },
    "look_for": { uk: "шукати", en: "look for", de: "suchen", nl: "zoeken", crh: "qıdırmaq", transcription: "lʊk fɔː" },
    "look_forward_to": { uk: "чекати з нетерпінням", en: "look forward to", de: "sich freuen auf", nl: "uitkijken naar", crh: "sabırsızlıqnen bekleme", transcription: "lʊk ˈfɔːwəd tuː" },
    "turn_down_volume": { uk: "зменшити гучність", en: "turn down", de: "leiser machen", nl: "zachter zetten", crh: "yavaşlatmaq", transcription: "tɜːn daʊn" },
    "quite": { uk: "цілком / досить", en: "quite", de: "ziemlich", nl: "nogal", crh: "bayağı", transcription: "kwaɪt" },
    "rarely": { uk: "рідко", en: "rarely", de: "selten", nl: "zelden", crh: "sirek", transcription: "ˈreəli" },

    // More nouns from report
    "ambulance": { uk: "швидка допомога", en: "ambulance", de: "Krankenwagen", nl: "ambulance", crh: "tacele yardım", transcription: "ˈæmbjʊləns" },
    "atmosphere": { uk: "атмосфера", en: "atmosphere", de: "Atmosphäre", nl: "sfeer", crh: "muit", transcription: "ˈætməsfɪə" },
    "disaster_event": { uk: "катастрофа", en: "disaster", de: "Katastrophe", nl: "ramp", crh: "felâket", transcription: "dɪˈzɑːstə" },
    "earth_1": { uk: "земля (планета/ґрунт)", en: "earth", de: "Erde", nl: "aarde", crh: "topraq", transcription: "ɜːθ" },
    "heat": { uk: "спека / тепло", en: "heat", de: "Hitze", nl: "hitte", crh: "sıcaq", transcription: "hiːt" },
    "insect": { uk: "комаха", en: "insect", de: "Insekt", nl: "insect", crh: "böcek", transcription: "ˈɪnsɛkt" },
    "storm": { uk: "шторм / буря", en: "storm", de: "Sturm", nl: "storm", crh: "fırtına", transcription: "stɔːm" },

    // Other polysemy
    "exchange": { uk: "обмін", en: "exchange", de: "Austausch", nl: "uitwisseling", crh: "almaşuv", transcription: "ɪksˈtʃeɪndʒ" },
    "face": { uk: "обличчя", en: "face", de: "Gesicht", nl: "gezicht", crh: "yüz", transcription: "feɪs" },
    "land": { uk: "земля (суша)", en: "land", de: "Land", nl: "land", crh: "topraq", transcription: "lænd" },
    "last": { uk: "останній", en: "last", de: "letzte", nl: "laatste", crh: "soñki", transcription: "lɑːst" },
    "lock": { uk: "замок", en: "lock", de: "Schloss", nl: "slot", crh: "kilim", transcription: "lɒk" },
    "plant": { uk: "рослина", en: "plant", de: "Pflanze", nl: "plant", crh: "osümlik", transcription: "plɑːnt" },
    "tie_clothes": { uk: "краватка", en: "tie", de: "Krawatte", nl: "das", crh: "boyunbağ", transcription: "taɪ" },
    "train": { uk: "поїзд", en: "train", de: "Zug", nl: "trein", crh: "tren", transcription: "treɪn" },
    "right": { uk: "правий / правильний", en: "right", de: "rechts / richtig", nl: "rechts / juist", crh: "oñ / doğru", transcription: "raɪt" },
    "traffic": { uk: "трафік / рух", en: "traffic", de: "Verkehr", nl: "verkeer", crh: "trafik", transcription: "ˈtræfɪk" },
    "answer": { uk: "відповідь", en: "answer", de: "Antwort", nl: "antwoord", crh: "cevap", transcription: "ˈɑːnsə" },
    "damage_harm": { uk: "пошкодження", en: "damage", de: "Schaden", nl: "schade", crh: "zarar", transcription: "ˈdæmɪdʒ" },
    "help": { uk: "допомога", en: "help", de: "Hilfe", nl: "hulp", crh: "yardım", transcription: "hɛlp" },
    "love": { uk: "любов", en: "love", de: "Liebe", nl: "liefde", crh: "sevgi", transcription: "lʌv" },
    "need": { uk: "потреба", en: "need", de: "Bedürfnis", nl: "behoefte", crh: "ihtiyac", transcription: "niːd" },

    // Phrasal 2
    "check_out": { uk: "виселятися", en: "check out", de: "auschecken", nl: "uitchecken", crh: "çıqış yapmaq", transcription: "tʃɛk aʊt" },
    "fill_in_form": { uk: "заповнювати", en: "fill in", de: "ausfüllen", nl: "invullen", crh: "toledırmaq", transcription: "fɪl ɪn" },
    "find_out": { uk: "з'ясувати", en: "find out", de: "herausfinden", nl: "uitzoeken", crh: "bilip almaq", transcription: "faɪnd aʊt" },
    "give_back": { uk: "повертати", en: "give back", de: "zurückgeben", nl: "teruggeven", crh: "qaytarıp bermek", transcription: "ɡɪv bæk" },
    "give_up_habit": { uk: "кидати (звичку)", en: "give up", de: "aufgeben", nl: "opgeven", crh: "vazgeçmek", transcription: "ɡɪv ʌp" },
    "grow_up": { uk: "рости / дорослішати", en: "grow up", de: "aufwachsen", nl: "opgroeien", crh: "büyümek", transcription: "ɡrəʊ ʌp" },
    "pick_up_object": { uk: "піднімати / підбирати", en: "pick up", de: "aufheben", nl: "oppakken", crh: "kötürmek", transcription: "pɪk ʌp" },
    "put_on_clothes": { uk: "одягати", en: "put on", de: "anziehen", nl: "aantrekken", crh: "kiymek", transcription: "pʊt ɒn" },
    "take_off_clothes": { uk: "знімати (одяг)", en: "take off", de: "ausziehen", nl: "uittrekken", crh: "çıqarmaq", transcription: "teɪk ɒf" },
    "throw_away": { uk: "викидати", en: "throw away", de: "wegwerfen", nl: "weggooien", crh: "atıp taşlamaq", transcription: "θrəʊ əˈweɪ" },
    "try_on_clothes": { uk: "міряти", en: "try on", de: "anprobieren", nl: "passen", crh: "kiyip baqmaq", transcription: "traɪ ɒn" },
    "turn_off_device": { uk: "вимикати", en: "turn off", de: "ausschalten", nl: "uitzetten", crh: "söndürmek", transcription: "tɜːn ɒf" },
    "turn_on_device": { uk: "вмикати", en: "turn on", de: "einschalten", nl: "aanzetten", crh: "yaqmaq", transcription: "tɜːn ɒn" },
    "write_down": { uk: "записувати", en: "write down", de: "aufschreiben", nl: "opschrijven", crh: "yazıp almaq", transcription: "raɪt daʊn" },

    // Extra B1 nouns
    "energy": { uk: "енергія", en: "energy", de: "Energie", nl: "energie", crh: "energiya", transcription: "ˈɛnədʒi" },
    "entrance": { uk: "вхід", en: "entrance", de: "Eingang", nl: "ingang", crh: "kiriş", transcription: "ˈɛntrəns" },
    "route": { uk: "маршрут", en: "route", de: "Route", nl: "route", crh: "yol", transcription: "ruːt" },
    "feeling": { uk: "почуття", en: "feeling", de: "Gefühl", nl: "gevoel", crh: "duyğu", transcription: "ˈfiːlɪŋ" }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseDir = path.join(__dirname, '../../../src/lib/data');
const translationsDir = path.join(baseDir, 'translations');
const transcriptionsDir = path.join(baseDir, 'transcriptions');

const languages = ['en', 'uk', 'de', 'nl', 'crh'];
const level = 'B1';

console.log('Starting B1 Fix...');

languages.forEach(lang => {
    const file = path.join(translationsDir, lang, 'levels', `${level}.json`);
    let data = {};
    if (fs.existsSync(file)) {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } else {
        console.warn(`Creating new file: ${file}`);
    }

    let modified = false;
    for (const [key, translations] of Object.entries(missingB1)) {
        if (!data[key] && translations[lang]) {
            data[key] = translations[lang];
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        console.log(`Updated translations for ${lang}`);
    }
});

// Transcriptions
const transFile = path.join(transcriptionsDir, 'levels', `${level}.json`);
let transData = {};
if (fs.existsSync(transFile)) {
    transData = JSON.parse(fs.readFileSync(transFile, 'utf8'));
} else {
    // If B1.json transcription file likely exists but maybe empty or partial
    console.warn(`Transcription file check: ${transFile}`);
}

let transModified = false;
for (const [key, translations] of Object.entries(missingB1)) {
    if (!transData[key] && translations.transcription) {
        transData[key] = translations.transcription;
        transModified = true;
    }
}

if (transModified) {
    fs.writeFileSync(transFile, JSON.stringify(transData, null, 4));
    console.log(`Updated transcriptions for ${level}`);
}
