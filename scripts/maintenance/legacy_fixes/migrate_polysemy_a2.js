import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, "../src/lib/data/translations");
const WORDS_DIR = path.join(__dirname, "../src/lib/data/words");
const TRANSCRIPTIONS_DIR = path.join(
	__dirname,
	"../src/lib/data/transcriptions",
);

const LANGUAGES = ["uk", "en", "de", "crh", "nl"];

const MIGRATION_MAP_A2 = {
	speak: {
		speak: {
			en: "speak",
			uk: "говорити",
			de: "sprechen",
			crh: "laflamaq",
			nl: "spreken",
		},
	},
	right: {
		right_correct: {
			en: "right",
			uk: "правильний",
			de: "richtig",
			crh: "doğru",
			nl: "juist",
		},
		right_direction: {
			en: "right",
			uk: "правий",
			de: "rechts",
			crh: "oñ",
			nl: "rechts",
		},
	},
	station: {
		station: {
			en: "station",
			uk: "станція",
			de: "Bahnhof",
			crh: "stantsiya",
			nl: "station",
		},
	},
	alone: {
		alone: {
			en: "alone",
			uk: "сам",
			de: "allein",
			crh: "yalıñız",
			nl: "alleen",
		},
	},
	bottom: {
		bottom: { en: "bottom", uk: "дно", de: "Boden", crh: "tüp", nl: "bodem" },
	},
	break: {
		break_damage: {
			en: "break",
			uk: "ламати",
			de: "brechen",
			crh: "sındırmaq",
			nl: "breken",
		},
		break_pause: {
			en: "break",
			uk: "перерва",
			de: "Pause",
			crh: "tenefüs",
			nl: "pauze",
		},
	},
	call: {
		call_phone: {
			en: "call",
			uk: "дзвонити",
			de: "anrufen",
			crh: "telefon etmek",
			nl: "bellen",
		},
		call_shout: {
			en: "call",
			uk: "кликати",
			de: "rufen",
			crh: "çağırmaq",
			nl: "roepen",
		},
	},
	clean: {
		clean_pure: {
			en: "clean",
			uk: "чистий",
			de: "sauber",
			crh: "temiz",
			nl: "schoon",
		},
		clean_wash: {
			en: "clean",
			uk: "чистити",
			de: "putzen",
			crh: "temizlemek",
			nl: "schoonmaken",
		},
	},
	climb: {
		climb: {
			en: "climb",
			uk: "підніматися",
			de: "klettern",
			crh: "tırmanmaq",
			nl: "klimmen",
		},
	},
	cream: {
		cream_dairy: {
			en: "cream",
			uk: "вершки",
			de: "Sahne",
			crh: "qaymaq",
			nl: "room",
		},
		cream_cosmetic: {
			en: "cream",
			uk: "крем",
			de: "Creme",
			crh: "krem",
			nl: "crème",
		},
	},
	date: {
		date_calendar: {
			en: "date",
			uk: "дата",
			de: "Datum",
			crh: "tarih",
			nl: "datum",
		},
		date_romantic: {
			en: "date",
			uk: "побачення",
			de: "Date",
			crh: "körüşüv",
			nl: "afspraakje",
		},
	},
	different: {
		different: {
			en: "different",
			uk: "різний",
			de: "verschieden",
			crh: "farqlı",
			nl: "verschillend",
		},
	},
	dream: {
		dream_goal: {
			en: "dream",
			uk: "мрія",
			de: "Traum",
			crh: "hayal",
			nl: "droom",
		},
		dream_sleep: {
			en: "dream",
			uk: "сон",
			de: "Traum",
			crh: "tüş",
			nl: "droom",
		},
	},
	exercise: {
		exercise: {
			en: "exercise",
			uk: "вправа",
			de: "Übung",
			crh: "alıştırma",
			nl: "oefening",
		},
	},
	fail: {
		fail: {
			en: "fail",
			uk: "провалити",
			de: "scheitern",
			crh: "muvafaqiyetsiz olmaq",
			nl: "falen",
		},
	},
	fall: {
		fall_drop: {
			en: "fall",
			uk: "падати",
			de: "fallen",
			crh: "yığılmaq",
			nl: "vallen",
		},
		fall_autumn: {
			en: "fall",
			uk: "осінь",
			de: "Herbst",
			crh: "küz",
			nl: "herfst",
		},
	},
	fat: {
		fat_obese: {
			en: "fat",
			uk: "товстий",
			de: "fett",
			crh: "semiz",
			nl: "dik",
		},
		fat_oil: { en: "fat", uk: "жир", de: "Fett", crh: "yağ", nl: "vet" },
	},
	fight: {
		fight_action: {
			en: "fight",
			uk: "битися",
			de: "kämpfen",
			crh: "kürüşmek",
			nl: "vechten",
		},
		fight_event: {
			en: "fight",
			uk: "бійка",
			de: "Kampf",
			crh: "kürüş",
			nl: "gevecht",
		},
	},
	fine: {
		fine_good: {
			en: "fine",
			uk: "чудовий",
			de: "fein",
			crh: "yahşı",
			nl: "fijn",
		},
		fine_penalty: {
			en: "fine",
			uk: "штраф",
			de: "Bußgeld",
			crh: "ceza",
			nl: "boete",
		},
	},
	flat: {
		flat_apartment: {
			en: "flat",
			uk: "квартира",
			de: "Wohnung",
			crh: "daire",
			nl: "appartement",
		},
		flat_surface: {
			en: "flat",
			uk: "плаский",
			de: "flach",
			crh: "tüz",
			nl: "plat",
		},
	},
	fly: {
		fly_action: {
			en: "fly",
			uk: "літати",
			de: "fliegen",
			crh: "uçmaq",
			nl: "vliegen",
		},
		fly_insect: {
			en: "fly",
			uk: "муха",
			de: "Fliege",
			crh: "sın",
			nl: "vlieg",
		},
	},
	free: {
		free_liberty: {
			en: "free",
			uk: "вільний",
			de: "frei",
			crh: "azat",
			nl: "vrij",
		},
		free_cost: {
			en: "free",
			uk: "безкоштовний",
			de: "kostenlos",
			crh: "bedava",
			nl: "gratis",
		},
	},
	glass: {
		glass_material: {
			en: "glass",
			uk: "скло",
			de: "Glas",
			crh: "cam",
			nl: "glas",
		},
		glass_cup: {
			en: "glass",
			uk: "стакан",
			de: "Glas",
			crh: "stakan",
			nl: "glas",
		},
	},
	gun: {
		gun: { en: "gun", uk: "зброя", de: "Waffe", crh: "tüfek", nl: "geweer" },
	},
	hall: {
		hall: { en: "hall", uk: "зал", de: "Halle", crh: "salon", nl: "hal" },
	},
	hard: {
		hard_tough: {
			en: "hard",
			uk: "твердий",
			de: "hart",
			crh: "qattı",
			nl: "hard",
		},
		hard_difficult: {
			en: "hard",
			uk: "важкий",
			de: "schwer",
			crh: "ağır",
			nl: "zwaar",
		},
	},
	heat: {
		heat: { en: "heat", uk: "спека", de: "Hitze", crh: "sıcaq", nl: "hitte" },
	},
	holiday: {
		holiday_celebration: {
			en: "holiday",
			uk: "свято",
			de: "Feiertag",
			crh: "bayram",
			nl: "feestdag",
		},
		holiday_vacation: {
			en: "holiday",
			uk: "відпустка",
			de: "Urlaub",
			crh: "tatil",
			nl: "vakantie",
		},
	},
	hope: {
		hope: { en: "hope", uk: "надія", de: "Hoffnung", crh: "umüt", nl: "hoop" },
	},
	hurt: {
		hurt_pain: {
			en: "hurt",
			uk: "боліти",
			de: "weh tun",
			crh: "ağrımaq",
			nl: "pijn doen",
		},
		hurt_injury: {
			en: "hurt",
			uk: "поранити",
			de: "verletzen",
			crh: "yaralamaq",
			nl: "verwonden",
		},
	},
	keep: {
		keep: {
			en: "keep",
			uk: "тримати",
			de: "behalten",
			crh: "saqlamaq",
			nl: "houden",
		},
	},
	kind: {
		kind_nice: {
			en: "kind",
			uk: "добрий",
			de: "nett",
			crh: "merametli",
			nl: "aardig",
		},
		kind_type: { en: "kind", uk: "вид", de: "Art", crh: "tür", nl: "soort" },
	},
	lie: {
		lie_false: {
			en: "lie",
			uk: "брехати",
			de: "lügen",
			crh: "yalan söylemek",
			nl: "liegen",
		},
		lie_position: {
			en: "lie",
			uk: "лежати",
			de: "liegen",
			crh: "yatmaq",
			nl: "liggen",
		},
	},
	lift: {
		lift_elevator: {
			en: "lift",
			uk: "ліфт",
			de: "Aufzug",
			crh: "asansör",
			nl: "lift",
		},
		lift_action: {
			en: "lift",
			uk: "піднімати",
			de: "heben",
			crh: "kötürmek",
			nl: "tillen",
		},
	},
	light: {
		light_brightness: {
			en: "light",
			uk: "світло",
			de: "Licht",
			crh: "yarıq",
			nl: "licht",
		},
		light_weight: {
			en: "light",
			uk: "легкий",
			de: "leicht",
			crh: "yengil",
			nl: "licht",
		},
	},
	lock: {
		lock: { en: "lock", uk: "замок", de: "Schloss", crh: "kilid", nl: "slot" },
	},
	lose: {
		lose: {
			en: "lose",
			uk: "втрачати",
			de: "verlieren",
			crh: "coymaq",
			nl: "verliezen",
		},
	},
	love: {
		love: {
			en: "love",
			uk: "любити",
			de: "lieben",
			crh: "sevmek",
			nl: "liefhebben",
		},
	},
	manage: {
		manage: {
			en: "manage",
			uk: "керувати",
			de: "verwalten",
			crh: "idare etmek",
			nl: "beheren",
		},
	},
	match: {
		match_game: {
			en: "match",
			uk: "матч",
			de: "Spiel",
			crh: "maç",
			nl: "wedstrijd",
		},
		match_fire: {
			en: "match",
			uk: "сірник",
			de: "Streichholz",
			crh: "sernik",
			nl: "lucifer",
		},
	},
	matter: {
		matter: {
			en: "matter",
			uk: "справа",
			de: "Angelegenheit",
			crh: "iş",
			nl: "zaak",
		},
	},
	mind: {
		mind: { en: "mind", uk: "розум", de: "Verstand", crh: "aqıl", nl: "geest" },
	},
	miss: {
		miss_sad: {
			en: "miss",
			uk: "сумувати",
			de: "vermissen",
			crh: "sağınmaq",
			nl: "missen",
		},
		miss_action: {
			en: "miss",
			uk: "пропускати",
			de: "verpassen",
			crh: "qaçırmaq",
			nl: "missen",
		},
	},
	nice: {
		nice: { en: "nice", uk: "гарний", de: "nett", crh: "dülgü", nl: "leuk" },
	},
	off: {
		off: { en: "off", uk: "вимкнено", de: "aus", crh: "qapalı", nl: "uit" },
	},
	oil: {
		oil: { en: "oil", uk: "олія", de: "Öl", crh: "yağ", nl: "olie" },
	},
	old: {
		old: { en: "old", uk: "старий", de: "alt", crh: "eski", nl: "oud" },
	},
	on: {
		on: { en: "on", uk: "на", de: "auf", crh: "üstünde", nl: "op" },
	},
	orange: {
		orange_color: {
			en: "orange",
			uk: "помаранчевий",
			de: "orange",
			crh: "sarı-qırmızı",
			nl: "oranje",
		},
		orange_fruit: {
			en: "orange",
			uk: "апельсин",
			de: "Orange",
			crh: "portaqal",
			nl: "sinaasappel",
		},
	},
	out: {
		out: { en: "out", uk: "зовні", de: "aus", crh: "tışarı", nl: "uit" },
	},
	over: {
		over: { en: "over", uk: "над", de: "über", crh: "üstünde", nl: "over" },
	},
	parent: {
		parent: {
			en: "parent",
			uk: "батько",
			de: "Elternteil",
			crh: "ana-baba",
			nl: "ouder",
		},
	},
	person: {
		person: {
			en: "person",
			uk: "людина",
			de: "Person",
			crh: "insan",
			nl: "persoon",
		},
	},
	point: {
		point: { en: "point", uk: "точка", de: "Punkt", crh: "noqta", nl: "punt" },
	},
	present: {
		present_gift: {
			en: "present",
			uk: "подарунок",
			de: "Geschenk",
			crh: "bahiş",
			nl: "cadeau",
		},
		present_time: {
			en: "present",
			uk: "теперішній",
			de: "Gegenwart",
			crh: "şimdiki",
			nl: "tegenwoordige",
		},
	},
	put: {
		put: { en: "put", uk: "класти", de: "legen", crh: "qoymaq", nl: "leggen" },
	},
	quite: {
		quite: {
			en: "quite",
			uk: "цілком",
			de: "ziemlich",
			crh: "bayağı",
			nl: "vrij",
		},
	},
	rest: {
		rest: {
			en: "rest",
			uk: "відпочинок",
			de: "Pause",
			crh: "raat",
			nl: "rust",
		},
	},
	ride: {
		ride: {
			en: "ride",
			uk: "кататися",
			de: "fahren",
			crh: "minmek",
			nl: "rijden",
		},
	},
	ring: {
		ring_jewel: {
			en: "ring",
			uk: "кільце",
			de: "Ring",
			crh: "yüzük",
			nl: "ring",
		},
		ring_sound: {
			en: "ring",
			uk: "дзвонити",
			de: "klingeln",
			crh: "çalmaq",
			nl: "bellen",
		},
	},
	rock: {
		rock_stone: {
			en: "rock",
			uk: "камінь",
			de: "Stein",
			crh: "taş",
			nl: "rots",
		},
		rock_music: { en: "rock", uk: "рок", de: "Rock", crh: "rok", nl: "rock" },
	},
	save: {
		save_rescue: {
			en: "save",
			uk: "рятувати",
			de: "retten",
			crh: "qurtarmaq",
			nl: "redden",
		},
		save_store: {
			en: "save",
			uk: "зберігати",
			de: "sparen",
			crh: "saqlamaq",
			nl: "opslaan",
		},
	},
	second: {
		second_ord: {
			en: "second",
			uk: "другий",
			de: "zweite",
			crh: "ekinci",
			nl: "tweede",
		},
		second_time: {
			en: "second",
			uk: "секунда",
			de: "Sekunde",
			crh: "saniye",
			nl: "seconde",
		},
	},
	set: {
		set: { en: "set", uk: "набір", de: "Set", crh: "set", nl: "set" },
	},
	smell: {
		smell_sense: {
			en: "smell",
			uk: "запах",
			de: "Geruch",
			crh: "qoqu",
			nl: "geur",
		},
		smell_action: {
			en: "smell",
			uk: "нюхати",
			de: "riechen",
			crh: "qoqulamaq",
			nl: "ruiken",
		},
	},
	smoke: {
		smoke_gas: {
			en: "smoke",
			uk: "дим",
			de: "Rauch",
			crh: "tütün",
			nl: "rook",
		},
		smoke_action: {
			en: "smoke",
			uk: "палити",
			de: "rauchen",
			crh: "tütün içmek",
			nl: "roken",
		},
	},
	space: {
		space_cosmos: {
			en: "space",
			uk: "космос",
			de: "Weltraum",
			crh: "kosmos",
			nl: "ruimte",
		},
		space_area: {
			en: "space",
			uk: "простір",
			de: "Raum",
			crh: "feza",
			nl: "ruimte",
		},
	},
	spend: {
		spend: {
			en: "spend",
			uk: "витрачати",
			de: "ausgeben",
			crh: "harcamaq",
			nl: "uitgeven",
		},
	},
	square: {
		square_shape: {
			en: "square",
			uk: "квадрат",
			de: "Quadrat",
			crh: "kare",
			nl: "vierkant",
		},
		square_place: {
			en: "square",
			uk: "площа",
			de: "Platz",
			crh: "meydan",
			nl: "plein",
		},
	},
	too: {
		too_also: { en: "too", uk: "також", de: "auch", crh: "de", nl: "ook" },
		too_much: { en: "too", uk: "занадто", de: "zu", crh: "pek", nl: "te" },
	},
	turn: {
		turn: {
			en: "turn",
			uk: "повертати",
			de: "drehen",
			crh: "döndürmek",
			nl: "draaien",
		},
	},
	uncle: {
		uncle: { en: "uncle", uk: "дядько", de: "Onkel", crh: "dayı", nl: "oom" },
	},
	without: {
		without: {
			en: "without",
			uk: "без",
			de: "ohne",
			crh: "-sız",
			nl: "zonder",
		},
	},
	you: {
		you: { en: "you", uk: "ти", de: "du", crh: "sen", nl: "jij" },
	},
	your: {
		your: { en: "your", uk: "твій", de: "dein", crh: "seniñ", nl: "jouw" },
	},
};

async function migrateA2() {
	const fileName = "A2.json";
	const category = "levels";

	console.log(`🚀 Початок міграції для ${category}/${fileName}...\n`);

	// 1. Оновити words
	const wordsPath = path.join(WORDS_DIR, category, fileName);
	if (fs.existsSync(wordsPath)) {
		const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
		const newWords = [];

		for (const wordKey of wordsData.words) {
			if (MIGRATION_MAP_A2[wordKey]) {
				newWords.push(...Object.keys(MIGRATION_MAP_A2[wordKey]));
			} else {
				newWords.push(wordKey);
			}
		}

		wordsData.words = [...new Set(newWords)]; // Унікальні ключі
		fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 4));
		console.log(`✅ Оновлено: ${wordsPath}`);
	}

	// 2. Оновити translations
	for (const lang of LANGUAGES) {
		const transPath = path.join(TRANSLATIONS_DIR, lang, category, fileName);
		if (fs.existsSync(transPath)) {
			const transData = JSON.parse(fs.readFileSync(transPath, "utf-8"));
			const newTransData = {};

			// Спочатку копіюємо існуючі, але замінюємо ті що в мапі
			for (const [key, value] of Object.entries(transData)) {
				if (MIGRATION_MAP_A2[key]) {
					const newKeys = MIGRATION_MAP_A2[key];
					for (const [newKey, translations] of Object.entries(newKeys)) {
						newTransData[newKey] = translations[lang];
					}
				} else {
					newTransData[key] = value;
				}
			}

			fs.writeFileSync(transPath, JSON.stringify(newTransData, null, 4));
			console.log(`✅ Оновлено: ${transPath}`);
		}
	}

	// 3. Оновити transcriptions
	const transcPath = path.join(TRANSCRIPTIONS_DIR, category, fileName);
	if (fs.existsSync(transcPath)) {
		const transcData = JSON.parse(fs.readFileSync(transcPath, "utf-8"));
		const newTranscData = {};

		for (const [key, value] of Object.entries(transcData)) {
			if (MIGRATION_MAP_A2[key]) {
				const newKeys = MIGRATION_MAP_A2[key];
				for (const newKey of Object.keys(newKeys)) {
					newTranscData[newKey] = value;
				}
			} else {
				newTranscData[key] = value;
			}
		}

		fs.writeFileSync(transcPath, JSON.stringify(newTranscData, null, 4));
		console.log(`✅ Оновлено: ${transcPath}`);
	}

	console.log("\n✅ Міграція A2 завершена!");
}

migrateA2().catch(console.error);
