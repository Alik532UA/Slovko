import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- B2 DATA CORRECTION ---
const missingB2 = {
	// Verbs
	exam: {
		uk: "іспит",
		en: "exam",
		de: "Prüfung",
		nl: "examen",
		crh: "imtian",
		transcription: "ɪɡˈzæm",
	},
	account_for_verb: {
		uk: "пояснювати / складати (частку)",
		en: "account for",
		de: "ausmachen / erklären",
		nl: "verklaren / goed zijn voor",
		crh: "izaat etmek",
		transcription: "əˈkaʊnt fɔː",
	},
	address_verb: {
		uk: "звертатися / вирішувати",
		en: "address",
		de: "ansprechen",
		nl: "aanspreken",
		crh: "muracaat etmek",
		transcription: "əˈdrɛs",
	},
	applaud_verb: {
		uk: "аплодувати",
		en: "applaud",
		de: "applaudieren",
		nl: "applaudisseren",
		crh: "alğışlamaq",
		transcription: "əˈplɔːd",
	},
	characterise_verb: {
		uk: "характеризувати",
		en: "characterise",
		de: "charakterisieren",
		nl: "karakteriseren",
		crh: "tasevir etmek",
		transcription: "ˈkærəktəraɪz",
	},
	circulate_verb: {
		uk: "циркулювати / поширюватися",
		en: "circulate",
		de: "zirkulieren",
		nl: "cirkuleren",
		crh: "aylanmaq",
		transcription: "ˈsɜːkjʊleɪt",
	},
	cite_verb: {
		uk: "цитувати",
		en: "cite",
		de: "zitieren",
		nl: "citeren",
		crh: "iktibas etmek",
		transcription: "saɪt",
	},
	cooperate_verb: {
		uk: "співпрацювати",
		en: "cooperate",
		de: "kooperieren",
		nl: "samenwerken",
		crh: "işbirligi yapmaq",
		transcription: "kəʊˈɒpəreɪt",
	},
	criticise_verb: {
		uk: "критикувати",
		en: "criticise",
		de: "kritisieren",
		nl: "bekritiseren",
		crh: "tenqit etmek",
		transcription: "ˈkrɪtɪsaɪz",
	},
	dramatise_verb: {
		uk: "драматизувати",
		en: "dramatise",
		de: "dramatisieren",
		nl: "dramatiseren",
		crh: "dramatizirlemek",
		transcription: "ˈdræmətaɪz",
	},
	eject_verb: {
		uk: "викидати / виганяти",
		en: "eject",
		de: "auswerfen",
		nl: "uitwerpen",
		crh: "çıqarıp atmaq",
		transcription: "ɪˈdʒɛkt",
	},
	realise_verb: {
		uk: "усвідомлювати",
		en: "realise",
		de: "realisieren / bemerken",
		nl: "realiseren",
		crh: "añlamaq",
		transcription: "ˈrɪəlaɪz",
	},
	recognise_verb: {
		uk: "розпізнавати / визнавати",
		en: "recognise",
		de: "erkennen",
		nl: "herkennen",
		crh: "tanımaq",
		transcription: "ˈrɛkəɡnaɪz",
	},
	regulate_verb: {
		uk: "регулювати",
		en: "regulate",
		de: "regulieren",
		nl: "reguleren",
		crh: "idare etmek",
		transcription: "ˈrɛɡjʊleɪt",
	},
	rid_verb: {
		uk: "позбавляти",
		en: "rid",
		de: "befreien",
		nl: "bevrijden",
		crh: "qurtulmaq",
		transcription: "rɪd",
	},
	unify_verb: {
		uk: "об'єднувати",
		en: "unify",
		de: "vereinen",
		nl: "verenigen",
		crh: "birleştirmek",
		transcription: "ˈjuːnɪfaɪ",
	},

	// Nouns - Abstract & Society
	acknowledgement: {
		uk: "визнання / підтвердження",
		en: "acknowledgement",
		de: "Anerkennung",
		nl: "erkenning",
		crh: "tanılma",
		transcription: "əkˈnɒlɪdʒm(ə)nt",
	},
	characteristic_noun: {
		uk: "характеристика",
		en: "characteristic",
		de: "Eigenschaft",
		nl: "kenmerk",
		crh: "hususiyet",
		transcription: "ˌkærəktəˈrɪstɪk",
	},
	communication_noun: {
		uk: "спілкування / комунікація",
		en: "communication",
		de: "Kommunikation",
		nl: "communicatie",
		crh: "bağ",
		transcription: "kəˌmjuːnɪˈkeɪʃ(ə)n",
	},
	construction_noun: {
		uk: "будівництво / конструкція",
		en: "construction",
		de: "Konstruktion",
		nl: "constructie",
		crh: "qurucılıq",
		transcription: "kənˈstrʌkʃ(ə)n",
	},
	convenience: {
		uk: "зручність",
		en: "convenience",
		de: "Bequemlichkeit",
		nl: "gemak",
		crh: "qolaylıq",
		transcription: "kənˈviːniəns",
	},
	cooperation_noun: {
		uk: "співпраця",
		en: "cooperation",
		de: "Zusammenarbeit",
		nl: "samenwerking",
		crh: "işbirligi",
		transcription: "kəʊˌɒpəˈreɪʃ(ə)n",
	},
	culprit: {
		uk: "винуватець",
		en: "culprit",
		de: "Täter",
		nl: "dader",
		crh: "qabaatlı",
		transcription: "ˈkʌlprɪt",
	},
	decision_noun: {
		uk: "рішення",
		en: "decision",
		de: "Entscheidung",
		nl: "beslissing",
		crh: "qarar",
		transcription: "dɪˈsɪʒ(ə)n",
	},
	demonstration_noun: {
		uk: "демонстрація",
		en: "demonstration",
		de: "Demonstration",
		nl: "demonstratie",
		crh: "numayış",
		transcription: "ˌdɛmənˈstreɪʃ(ə)n",
	},
	discrimination: {
		uk: "дискримінація",
		en: "discrimination",
		de: "Diskriminierung",
		nl: "discriminatie",
		crh: "ayırımcılıq",
		transcription: "dɪˌskrɪmɪˈneɪʃ(ə)n",
	},
	dispute_noun: {
		uk: "суперечка",
		en: "dispute",
		de: "Streit",
		nl: "geschil",
		crh: "münaqaşa",
		transcription: "dɪˈspjuːt",
	},
	distinction: {
		uk: "відмінність",
		en: "distinction",
		de: "Unterscheidung",
		nl: "onderscheid",
		crh: "farq",
		transcription: "dɪˈstɪŋkʃ(ə)n",
	},
	diversity: {
		uk: "різноманіття",
		en: "diversity",
		de: "Vielfalt",
		nl: "diversiteit",
		crh: "çeşitlilik",
		transcription: "daɪˈvɜːsɪti",
	},
	dominance: {
		uk: "домінування",
		en: "dominance",
		de: "Dominanz",
		nl: "dominantie",
		crh: "hakimiyet",
		transcription: "ˈdɒmɪnəns",
	},
	ecology_noun: {
		uk: "екологія",
		en: "ecology",
		de: "Ökologie",
		nl: "ecologie",
		crh: "ekologiya",
		transcription: "ɪˈkɒlədʒi",
	},
	economy_noun: {
		uk: "економіка",
		en: "economy",
		de: "Wirtschaft",
		nl: "economie",
		crh: "iqtisat",
		transcription: "ɪˈkɒnəmi",
	},
	efficiency_noun: {
		uk: "ефективність",
		en: "efficiency",
		de: "Effizienz",
		nl: "efficiëntie",
		crh: "semere",
		transcription: "ɪˈfɪʃ(ə)nsi",
	},
	election_noun: {
		uk: "вибори",
		en: "election",
		de: "Wahl",
		nl: "verkiezing",
		crh: "saylav",
		transcription: "ɪˈlɛkʃ(ə)n",
	},
	element_noun: {
		uk: "елемент",
		en: "element",
		de: "Element",
		nl: "element",
		crh: "unsur",
		transcription: "ˈɛlɪm(ə)nt",
	},
	elimination: {
		uk: "усунення / ліквідація",
		en: "elimination",
		de: "Beseitigung",
		nl: "eliminatie",
		crh: "yoq etüv",
		transcription: "ɪˌlɪmɪˈneɪʃ(ə)n",
	},
	emphasis: {
		uk: "акцент / наголос",
		en: "emphasis",
		de: "Betonung",
		nl: "nadruk",
		crh: "urğu",
		transcription: "ˈɛmfəsɪs",
	},
	employment: {
		uk: "зайнятість / працевлаштування",
		en: "employment",
		de: "Beschäftigung",
		nl: "werkgelegenheid",
		crh: "iş",
		transcription: "ɪmˈplɔɪm(ə)nt",
	},
	environment_noun: {
		uk: "навколишнє середовище",
		en: "environment",
		de: "Umwelt",
		nl: "milieu",
		crh: "müit",
		transcription: "ɪnˈvaɪərənm(ə)nt",
	},
	equality: {
		uk: "рівність",
		en: "equality",
		de: "Gleichheit",
		nl: "gelijkheid",
		crh: "musavylik",
		transcription: "i(ː)ˈkwɒlɪti",
	},
	equation_noun: {
		uk: "рівняння",
		en: "equation",
		de: "Gleichung",
		nl: "vergelijking",
		crh: "teñleme",
		transcription: "ɪˈkweɪʒ(ə)n",
	},
	establishment_noun: {
		uk: "установа / заснування",
		en: "establishment",
		de: "Einrichtung / Gründung",
		nl: "oprichting / vestiging",
		crh: "müessise",
		transcription: "ɪˈstæblɪʃm(ə)nt",
	},
	ethics: {
		uk: "етика",
		en: "ethics",
		de: "Ethik",
		nl: "ethiek",
		crh: "etica",
		transcription: "ˈɛθɪks",
	},
	evaluation: {
		uk: "оцінка",
		en: "evaluation",
		de: "Bewertung",
		nl: "evaluatie",
		crh: "qıymet kesüv",
		transcription: "ɪˌvæljʊˈkeɪʃ(ə)n",
	},

	// Action Verbs (B2)
	administer_justice: {
		uk: "здійснювати правосуддя",
		en: "administer justice",
		de: "Recht sprechen",
		nl: "recht spreken",
		crh: "adaletni yerine ketirmek",
		transcription: "ədˈmɪnɪstə ˈdʒʌstɪs",
	},
	advocate_cause: {
		uk: "відстоювати справу",
		en: "advocate",
		de: "befürworten",
		nl: "pleiten voor",
		crh: "qorçalamaq",
		transcription: "ˈædvəkeɪt",
	},
	allocate_budget: {
		uk: "виділяти (бюджет)",
		en: "allocate",
		de: "zuweisen",
		nl: "toewijzen",
		crh: "ayırmaq",
		transcription: "ˈæləkeɪt",
	},
	anticipate_future: {
		uk: "передбачати",
		en: "anticipate",
		de: "vorhersehen",
		nl: "voorzien",
		crh: "tahmin etmek",
		transcription: "ænˈtɪsɪpeɪt",
	},
	assess_value: {
		uk: "оцінювати (вартість)",
		en: "assess",
		de: "beurteilen",
		nl: "beoordelen",
		crh: "qıymetlemek",
		transcription: "əˈsɛs",
	},
	assign_role: {
		uk: "призначати (роль)",
		en: "assign",
		de: "zuweisen",
		nl: "toewijzen",
		crh: "tayin etmek",
		transcription: "əˈsaɪn",
	},
	boost_economy: {
		uk: "піднімати / стимулювати",
		en: "boost",
		de: "ankurbeln",
		nl: "stimuleren",
		crh: "küçlendirmek",
		transcription: "buːst",
	},
	capture: {
		uk: "захоплювати / ловити",
		en: "capture",
		de: "erfassen / fangen",
		nl: "vangen",
		crh: "tutıp almaq",
		transcription: "ˈkæptʃə",
	},
	cease: {
		uk: "припиняти",
		en: "cease",
		de: "aufhören",
		nl: "ophouden",
		crh: "toqtatmaq",
		transcription: "siːs",
	},
	clarify_position: {
		uk: "прояснювати",
		en: "clarify",
		de: "klären",
		nl: "verduidelijken",
		crh: "aydınlatmaq",
		transcription: "ˈklærɪfaɪ",
	},
	coincide: {
		uk: "співпадати",
		en: "coincide",
		de: "übereinstimmen",
		nl: "samenvallen",
		crh: "tesadüf etmek",
		transcription: "ˌkəʊɪnˈsaɪd",
	},
	collaborate_project: {
		uk: "співпрацювати",
		en: "collaborate",
		de: "zusammenarbeiten",
		nl: "samenwerken",
		crh: "beraber çalışmaq",
		transcription: "kəˈlæbəreɪt",
	},
	compensate_loss: {
		uk: "компенсувати",
		en: "compensate",
		de: "kompensieren",
		nl: "compenseren",
		crh: "tölemek",
		transcription: "ˈkɒmpɛnseɪt",
	},
	comprehend_text: {
		uk: "зрозуміти / осягнути",
		en: "comprehend",
		de: "begreifen",
		nl: "begrijpen",
		crh: "añlamaq",
		transcription: "ˌkɒmprɪˈhɛnd",
	},
	conceal_evidence: {
		uk: "приховувати",
		en: "conceal",
		de: "verbergen",
		nl: "verbergen",
		crh: "gizlemek",
		transcription: "kənˈsiːl",
	},
	concede: {
		uk: "поступатися / визнавати",
		en: "concede",
		de: "zugeben",
		nl: "toegeven",
		crh: "qabul etmek",
		transcription: "kənˈsiːd",
	},
	concentrate: {
		uk: "зосереджуватися",
		en: "concentrate",
		de: "konzentrieren",
		nl: "concentreren",
		crh: "diqqat toplamaq",
		transcription: "ˈkɒns(ə)ntreɪt",
	},
	conclude: {
		uk: "робити висновок / завершувати",
		en: "conclude",
		de: "folgern / abschließen",
		nl: "concluderen",
		crh: "neticelenmek",
		transcription: "kənˈkluːd",
	},
	condemn_action: {
		uk: "засуджувати",
		en: "condemn",
		de: "verurteilen",
		nl: "veroordelen",
		crh: "qınalamaq",
		transcription: "kənˈdɛm",
	},
	confine_area: {
		uk: "обмежувати",
		en: "confine",
		de: "begrenzen",
		nl: "beperken",
		crh: "sıñırlamaq",
		transcription: "kənˈfaɪn",
	},
	confirm_details: {
		uk: "підтверджувати",
		en: "confirm",
		de: "bestätigen",
		nl: "bevestigen",
		crh: "tastiqlemek",
		transcription: "kənˈfɜːm",
	},
	confront_issue: {
		uk: "протистояти / стикатися",
		en: "confront",
		de: "konfrontieren",
		nl: "confronteren",
		crh: "qarşılaşmaq",
		transcription: "kənˈfrʌnt",
	},
	conquer_territory: {
		uk: "завойовувати",
		en: "conquer",
		de: "erobern",
		nl: "veroveren",
		crh: "fet etmek",
		transcription: "ˈkɒŋkə",
	},
	consider: {
		uk: "розглядати / вважати",
		en: "consider",
		de: "betrachten / überlegen",
		nl: "overwegen",
		crh: "tüşünmek",
		transcription: "kənˈsɪdə",
	},
	consist: {
		uk: "складатися (з)",
		en: "consist",
		de: "bestehen (aus)",
		nl: "bestaan (uit)",
		crh: "ibaret olmaq",
		transcription: "kənˈsɪst",
	},

	// More B2
	generate: {
		uk: "генерувати / створювати",
		en: "generate",
		de: "erzeugen",
		nl: "genereren",
		crh: "istisal etmek",
		transcription: "ˈdʒɛnəreɪt",
	},
	identify: {
		uk: "ідентифікувати / розпізнавати",
		en: "identify",
		de: "identifizieren",
		nl: "identificeren",
		crh: "tanımaq",
		transcription: "aɪˈdɛntɪfaɪ",
	},
	indicate: {
		uk: "вказувати",
		en: "indicate",
		de: "anzeigen / hinweisen",
		nl: "aangeven",
		crh: "köstermek",
		transcription: "ˈɪndɪkeɪt",
	},
	influence: {
		uk: "впливати",
		en: "influence",
		de: "beeinflussen",
		nl: "beïnvloeden",
		crh: "tesir etmek",
		transcription: "ˈɪnflʊəns",
	},
	inform: {
		uk: "інформувати",
		en: "inform",
		de: "informieren",
		nl: "informeren",
		crh: "haber bermek",
		transcription: "ɪnˈfɔːm",
	},
	install: {
		uk: "встановлювати",
		en: "install",
		de: "installieren",
		nl: "installeren",
		crh: "qurmaq",
		transcription: "ɪnˈstɔːl",
	},
	perform: {
		uk: "виконувати / виступати",
		en: "perform",
		de: "aufführen / leisten",
		nl: "uitvoeren",
		crh: "icra etmek",
		transcription: "pəˈfɔːm",
	},
	predict: {
		uk: "прогнозувати",
		en: "predict",
		de: "vorhersagen",
		nl: "voorspellen",
		crh: "tahmin etmek",
		transcription: "prɪˈdɪkt",
	},
	prevent: {
		uk: "запобігати",
		en: "prevent",
		de: "verhindern",
		nl: "voorkomen",
		crh: "olunı almaq",
		transcription: "prɪˈvɛnt",
	},
	promote: {
		uk: "просувати / підвищувати",
		en: "promote",
		de: "fördern",
		nl: "promoten",
		crh: "tarqatmaq",
		transcription: "prəˈməʊt",
	},
	protect: {
		uk: "захищати",
		en: "protect",
		de: "schützen",
		nl: "beschermen",
		crh: "qorçalamaq",
		transcription: "prəˈtɛkt",
	},
	prove: {
		uk: "доводити",
		en: "prove",
		de: "beweisen",
		nl: "bewijzen",
		crh: "isbat etmek",
		transcription: "pruːv",
	},
	provide: {
		uk: "забезпечувати / надавати",
		en: "provide",
		de: "bereitstellen",
		nl: "voorzien",
		crh: "temin etmek",
		transcription: "prəˈvaɪd",
	},
	publish: {
		uk: "публікувати",
		en: "publish",
		de: "veröffentlichen",
		nl: "publiceren",
		crh: "neşir etmek",
		transcription: "ˈpʌblɪʃ",
	},
	react: {
		uk: "реагувати",
		en: "react",
		de: "reagieren",
		nl: "reageren",
		crh: "cevap bermek",
		transcription: "ri(ː)ˈækt",
	},
	recommend: {
		uk: "рекомендувати",
		en: "recommend",
		de: "empfehlen",
		nl: "aanbevelen",
		crh: "tavsiye etmek",
		transcription: "ˌrɛkəˈmɛnd",
	},
	reduce: {
		uk: "зменшувати",
		en: "reduce",
		de: "reduzieren",
		nl: "verminderen",
		crh: "eksilmek",
		transcription: "rɪˈdjuːs",
	},
	remove: {
		uk: "видаляти",
		en: "remove",
		de: "entfernen",
		nl: "verwijderen",
		crh: "yoq etmek",
		transcription: "rɪˈmuːv",
	},

	// Abstract / Adjectives
	aware: {
		uk: "свідомий / обізнаний",
		en: "aware",
		de: "bewusst",
		nl: "bewust",
		crh: "haberdar",
		transcription: "əˈweə",
	},
	commercial: {
		uk: "комерційний",
		en: "commercial",
		de: "kommerziell",
		nl: "commercieel",
		crh: "ticariy",
		transcription: "kəˈmɜːʃ(ə)l",
	},
	complex: {
		uk: "складний",
		en: "complex",
		de: "komplex",
		nl: "complex",
		crh: "mürekkep",
		transcription: "ˈkɒmplɛks",
	},
	constant: {
		uk: "постійний",
		en: "constant",
		de: "konstant",
		nl: "constant",
		crh: "daimiy",
		transcription: "ˈkɒnstənt",
	},
	current: {
		uk: "поточний",
		en: "current",
		de: "aktuell",
		nl: "huidig",
		crh: "şimdiki",
		transcription: "ˈkʌrənt",
	},
	essential: {
		uk: "важливий / суттєвий",
		en: "essential",
		de: "wesentlich",
		nl: "essentieel",
		crh: "mühim",
		transcription: "ɪˈsɛnʃ(ə)l",
	},
	global: {
		uk: "глобальний",
		en: "global",
		de: "global",
		nl: "globaal",
		crh: "dünyağa ait",
		transcription: "ˈɡləʊb(ə)l",
	},
	legal: {
		uk: "законний / юридичний",
		en: "legal",
		de: "legal",
		nl: "legaal",
		crh: "qanuniy",
		transcription: "ˈliːɡ(ə)l",
	},
	mental: {
		uk: "розумовий",
		en: "mental",
		de: "geistig",
		nl: "mentaal",
		crh: "aqliy",
		transcription: "ˈmɛnt(ə)l",
	},
	necessary: {
		uk: "необхідний",
		en: "necessary",
		de: "notwendig",
		nl: "noodzakelijk",
		crh: "kerek",
		transcription: "ˈnɛsɪsəri",
	},
	official: {
		uk: "офіційний",
		en: "official",
		de: "offiziell",
		nl: "officieel",
		crh: "resmiy",
		transcription: "əˈfɪʃ(ə)l",
	},
	political: {
		uk: "політичний",
		en: "political",
		de: "politisch",
		nl: "politiek",
		crh: "siyasiy",
		transcription: "pəˈlɪtɪk(ə)l",
	},
	significant: {
		uk: "значний",
		en: "significant",
		de: "bedeutend",
		nl: "aanzienlijk",
		crh: "emiyetli",
		transcription: "sɪɡˈnɪfɪkənt",
	},
	similar: {
		uk: "схожий",
		en: "similar",
		de: "ähnlich",
		nl: "soortgelijk",
		crh: "ogşaş",
		transcription: "ˈsɪmɪlə",
	},
	social: {
		uk: "соціальний",
		en: "social",
		de: "sozial",
		nl: "sociaal",
		crh: "içtimaiy",
		transcription: "ˈsəʊʃ(ə)l",
	},
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Script is in scripts/maintenance/apply_b2_fix.js
// so ../../src/lib/data is correct
const baseDir = path.join(__dirname, "../../src/lib/data");
const translationsDir = path.join(baseDir, "translations");
const transcriptionsDir = path.join(baseDir, "transcriptions");

const languages = ["en", "uk", "de", "nl", "crh"];
const level = "B2";

console.log("Starting B2 Fix (Simplified Path)...");

languages.forEach((lang) => {
	// translations/en/levels/B2.json
	const file = path.join(translationsDir, lang, "levels", `${level}.json`);
	let data = {};
	if (fs.existsSync(file)) {
		data = JSON.parse(fs.readFileSync(file, "utf8"));
	} else {
		console.warn(`Creating new file: ${file}`);
	}

	let modified = false;
	for (const [key, translations] of Object.entries(missingB2)) {
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
const transFile = path.join(transcriptionsDir, "levels", `${level}.json`);
let transData = {};
if (fs.existsSync(transFile)) {
	transData = JSON.parse(fs.readFileSync(transFile, "utf8"));
} else {
	// If doesn't exist, we start empty
	console.warn(`Transcription file check: ${transFile}`);
}

let transModified = false;
for (const [key, translations] of Object.entries(missingB2)) {
	if (!transData[key] && translations.transcription) {
		transData[key] = translations.transcription;
		transModified = true;
	}
}

if (transModified) {
	fs.writeFileSync(transFile, JSON.stringify(transData, null, 4));
	console.log(`Updated transcriptions for ${level}`);
}
