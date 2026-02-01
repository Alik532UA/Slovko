
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

const TOPICS = [
    {
        id: "education_work",
        name: "Education & Work",
        description: "Everything related to studying and professional life",
        words: ["school", "university", "student", "teacher", "professor", "lesson", "homework", "exam", "test", "class", "course", "library", "job", "work", "office", "business", "company", "manager", "boss", "career", "salary", "interview_job", "employee", "employer", "profession", "skill", "training_course"]
    },
    {
        id: "abstract_concepts",
        name: "Abstract Concepts",
        description: "Ideas, feelings, and complex notions",
        words: ["life", "love", "happiness", "freedom", "justice", "peace", "war", "future", "past", "present_time", "idea", "thought", "mind", "opinion", "truth", "success", "failure", "luck", "ability", "advantage", "attitude", "benefit", "consequence", "courage", "patience", "priority"]
    },
    {
        id: "society_law",
        name: "Society & Law",
        description: "Politics, government, and legal system",
        words: ["society", "nation", "government", "politics", "president", "law", "court", "police", "criminal", "crime", "prison", "security", "rights", "vote", "citizen", "army", "soldier", "union"]
    },
    {
        id: "phrasal_verbs",
        name: "Phrasal Verbs",
        description: "Common English phrasal verbs",
        words: ["ask_for", "be_over", "break_down_machine", "bring_up_child", "call_back", "carry_on", "check_in", "check_out", "clean_up", "come_back", "come_in", "fill_in_form", "find_out", "get_back", "get_off_transport", "get_on_transport", "get_up", "give_back", "give_up_habit", "go_out", "grow_up", "look_after", "look_at", "look_for", "pick_up_object", "put_on_clothes", "sit_down", "stand_up", "take_off_clothes", "throw_away", "try_on_clothes", "turn_off_device", "turn_on_device", "wake_up", "write_down", "break_up_pair", "call_off_event", "calm_down", "catch_up_with", "cheer_up", "count_on_someone", "figure_out", "get_along_with", "get_over_illness", "give_in_surrender", "let_down_disappoint", "look_up_word", "make_up_story", "put_off_event", "put_up_with", "run_out_of", "set_off_journey", "take_after_relative", "take_up_hobby"]
    },
    {
        id: "adverbs_prepositions",
        name: "Adverbs & Prepositions",
        description: "Words that connect and describe actions",
        words: ["always", "never", "often", "sometimes", "usually", "early", "late", "here", "there", "where", "everywhere", "somewhere", "nowhere", "in", "on", "at", "to", "from", "with", "without", "for", "about", "under", "above", "behind", "between", "during", "since", "until", "quickly", "slowly", "well", "badly"]
    }
];

const TOPIC_METADATA = {
    education_work: {
        uk: { name: "Освіта та Робота", description: "Все, що стосується навчання та професійного життя" },
        crh: { name: "Tahsil ve İş", description: "Oquv ve zenaat ayatı ile bağlı er şey" },
        de: { name: "Bildung & Arbeit", description: "Alles rund um Studium und Berufsleben" },
        nl: { name: "Onderwijs & Werk", description: "Alles wat te maken heeft met studie en werk" }
    },
    abstract_concepts: {
        uk: { name: "Абстрактні поняття", description: "Ідеї, почуття та складні поняття" },
        crh: { name: "Mucerret Mevhumlar", description: "Fikirler, duyğular ve murekkep añlamlar" },
        de: { name: "Abstrakte Konzepte", description: "Ideen, Gefühle und komplexe Begriffe" },
        nl: { name: "Abstracte Concepten", description: "Ideeën, gevoelens en complexe begrippen" }
    },
    society_law: {
        uk: { name: "Суспільство та Закон", description: "Політика, уряд та правова система" },
        crh: { name: "Cemiyet ve Qanun", description: "Siyaset, ükümet ve uquq sisteması" },
        de: { name: "Gesellschaft & Recht", description: "Politik, Regierung und Rechtssystem" },
        nl: { name: "Samenleving & Recht", description: "Politiek, overheid en rechtssysteem" }
    },
    phrasal_verbs: {
        uk: { name: "Фразові дієслова", description: "Популярні англійські фразові дієслова" },
        crh: { name: "İbareli Fiiller", description: "İngiliz tilinde sıq qullanılğan ibareli fiiller" },
        de: { name: "Phrasal Verbs", description: "Häufige englische Phrasal Verbs" },
        nl: { name: "Frasale Werkwoorden", description: "Veelvoorkomende Engelse frasale werkwoorden" }
    },
    adverbs_prepositions: {
        uk: { name: "Прислівники та Прийменники", description: "Слова, що з'єднують та описують дії" },
        crh: { name: "Zarflar ve Edatlar", description: "Areketlerni bağlağan ve tarif etken sözler" },
        de: { name: "Adverbien & Präpositionen", description: "Wörter, die Handlungen verbinden und beschreiben" },
        nl: { name: "Bijwoorden & Voorzetsels", description: "Woorden die acties verbinden en beschrijven" }
    }
};

function createTopics() {
    TOPICS.forEach(topic => {
        const topicPath = path.join(DATA_DIR, 'words/topics', `${topic.id}.json`);
        fs.writeFileSync(topicPath, JSON.stringify(topic, null, 4));

        ['en', 'uk', 'crh', 'de', 'nl'].forEach(lang => {
            const transPath = path.join(DATA_DIR, 'translations', lang, 'topics', `${topic.id}.json`);
            const metadata = TOPIC_METADATA[topic.id]?.[lang] || { name: topic.name, description: topic.description };
            const transData = { id: topic.id, name: metadata.name, description: metadata.description };
            fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));
        });
    });
    console.log("Final batch of topics created.");
}

createTopics();
