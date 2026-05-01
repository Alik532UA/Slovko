import fs from 'fs';
import path from 'path';

const TRANSCRIPTIONS_DIR = 'src/lib/data/transcriptions/en/levels';

const a1Transcriptions = {
    "actress": "/ˈæktrəs/",
    "age": "/eɪdʒ/",
    "all": "/ɔːl/",
    "any": "/ˈeni/",
    "august": "/ˈɔːɡəst/",
    "band": "/bænd/",
    "be": "/biː/",
    "boyfriend": "/ˈbɔɪfrend/",
    "break": "/breɪk/",
    "bye": "/baɪ/",
    "can": "/kæn/",
    "cent": "/sent/",
    "centre": "/ˈsentə/",
    "cinema": "/ˈsɪnəmə/",
    "club": "/klʌb/",
    "dear": "/dɪə/",
    "december": "/dɪˈsembə/",
    "do": "/duː/",
    "doll": "/dɒl/",
    "double": "/ˈdʌbl/",
    "e_mail": "/ˈiːmeɪl/",
    "else": "/els/",
    "every": "/ˈevri/",
    "everyday": "/ˈevrideɪ/",
    "excuse": "/ɪkˈskjuːs/",
    "farmer": "/ˈfɑːmə/",
    "favourite": "/ˈfeɪvərɪt/",
    "february": "/ˈfebruəri/",
    "fifth": "/fɪfθ/",
    "final": "/ˈfaɪnl/",
    "football": "/ˈfʊtbɔːl/",
    "french": "/frentʃ/",
    "german": "/ˈdʒɜːmən/",
    "girlfriend": "/ˈɡɜːlfrend/",
    "grandparent": "/ˈɡrænpεərənt/",
    "greek": "/ɡriːk/",
    "guitar": "/ɡɪˈtɑː/",
    "gym": "/dʒɪm/",
    "have": "/hæv/",
    "hers": "/hɜːz/",
    "january": "/ˈdʒænjuəri/",
    "july": "/dʒuˈlaɪ/",
    "june": "/dʒuːn/",
    "let": "/let/",
    "lot": "/lɒt/",
    "march": "/mɑːtʃ/",
    "may": "/meɪ/",
    "meaning": "/ˈmiːnɪŋ/",
    "men": "/men/",
    "more": "/mɔː/",
    "most": "/məʊst/",
    "much": "/mʌtʃ/",
    "must": "/mʌst/",
    "none": "/nʌn/",
    "november": "/nəʊˈvembə/",
    "october": "/ɒkˈtəʊbə/",
    "oh": "/əʊ/",
    "online": "/ˌɒnˈlaɪn/",
    "ours": "/ˈaʊəz/",
    "pair": "/peə/",
    "pet": "/pet/",
    "photograph": "/ˈfəʊtəɡrɑːf/",
    "phrase": "/freɪz/",
    "piano": "/piˈænə/",
    "pound": "/paʊnd/",
    "reader": "/ˈriːdə/",
    "reading": "/ˈriːdɪŋ/",
    "september": "/sepˈtembə/",
    "shopping": "/ˈʃɒpɪŋ/",
    "singer": "/ˈsɪŋə/",
    "singing": "/ˈsɪŋɪŋ/",
    "smoking": "/ˈsməʊkɪŋ/",
    "spanish": "/ˈspænɪʃ/",
    "spelling": "/ˈspelɪŋ/",
    "sudden": "/ˈsʌdn/",
    "swimming": "/ˈswɪmɪŋ/",
    "the": "/ðə/",
    "worse": "/wɜːs/",
    "worst": "/wɜːst/",
    "writing": "/ˈraɪtɪŋ/",
    "yours": "/jɔːz/"
};

function run() {
    const level = 'A1';
    const generalPath = path.join(TRANSCRIPTIONS_DIR, `${level}_general.json`);
    
    if (!fs.existsSync(generalPath)) {
        fs.writeFileSync(generalPath, "{}\n", "utf8");
    }
    
    const data = JSON.parse(fs.readFileSync(generalPath, "utf8").replace(/^\uFEFF/, '').trim());
    let count = 0;

    for (const [key, ipa] of Object.entries(a1Transcriptions)) {
        // We only add if not present in any file of this level
        const files = fs.readdirSync(TRANSCRIPTIONS_DIR).filter(f => f.startsWith(`${level}_`));
        let found = false;
        for (const f of files) {
            const content = JSON.parse(fs.readFileSync(path.join(TRANSCRIPTIONS_DIR, f), "utf8").replace(/^\uFEFF/, '').trim());
            if (content[key]) { found = true; break; }
        }

        if (!found) {
            data[key] = ipa;
            count++;
        }
    }

    if (count > 0) {
        fs.writeFileSync(generalPath, JSON.stringify(data, null, "\t") + "\n", "utf8");
        console.log(`✅ A1: Added ${count} transcriptions to A1_general.json`);
    } else {
        console.log(`ℹ️ A1: No new transcriptions added.`);
    }
}

run();
