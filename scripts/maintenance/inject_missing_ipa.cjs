const fs = require('fs');
const path = require('path');

const ipaDict = {
    "accustomed": "/əˈkʌstəmd/",
    "emission": "/ɪˈmɪʃən/",
    "collision": "/kəˈlɪʒən/",
    "wage": "/weɪdʒ/",
    "adequate": "/ˈædɪkwət/",
    "adopt": "/əˈdɒpt/",
    "advance": "/ədˈvɑːns/",
    "famine": "/ˈfæmɪn/",
    "good_morning": "/ˌɡʊd ˈmɔːnɪŋ/",
    "pasta": "/ˈpæstə/",
    "advert": "/ˈædvɜːt/",
    "advertising": "/ˈædvətaɪzɪŋ/",
    "alright": "/ɔːlˈraɪt/",
    "as_well": "/əz ˈwel/",
    "athlete": "/ˈæθliːt/",
    "bad_luck": "/ˌbæd ˈlʌk/",
    "bake": "/beɪk/",
    "balloon": "/bəˈluːn/",
    "baseball": "/ˈbeɪsbɔːl/",
    "based": "/beɪst/",
    "basket": "/ˈbɑːskɪt/",
    "basketball": "/ˈbɑːskɪtbɔːl/",
    "bean": "/biːn/",
    "beard": "/bɪəd/",
    "behaviour": "/bɪˈheɪvjə/",
    "billion": "/ˈbɪljən/",
    "bin": "/bɪn/",
    "biology": "/baɪˈɒlədʒi/",
    "blog": "/blɒɡ/",
    "blonde": "/blɒnd/",
    "builder": "/ˈbɪldə/",
    "businessman": "/ˈbɪznəsmæn/",
    "buyer": "/ˈbaɪə/",
    "cabinet": "/ˈkæbɪnət/",
    "camping": "/ˈkæmpɪŋ/",
    "candle": "/ˈkændl/",
    "careless": "/ˈkeələs/",
    "cartoon": "/kɑːˈtuːn/",
    "celebration": "/ˌselɪˈbreɪʃən/",
    "cell": "/sel/",
    "channel": "/ˈtʃænl/",
    "chat": "/tʃæt/",
    "chemist": "/ˈkemɪst/",
    "chest": "/tʃest/",
    "chief": "/tʃiːf/",
    "cigarette": "/ˌsɪɡəˈret/",
    "clerk": "/klɑːk/",
    "clinic": "/ˈklɪnɪk/",
    "closely": "/ˈkləʊsli/",
    "cloth": "/klɒθ/",
    "clothing": "/ˈkləʊðɪŋ/",
    "coal": "/kəʊl/",
    "colorful": "/ˈkʌləfl/",
    "column": "/ˈkɒləm/",
    "comedy": "/ˈkɒmədi/",
    "complaint": "/kəmˈpleɪnt/",
    "towel": "/ˈtaʊəl/"
};

const transDir = path.join(__dirname, '../../src/lib/data/translations/en/levels');
const ipaDir = path.join(__dirname, '../../src/lib/data/transcriptions/en/levels');

let files;
try {
    files = fs.readdirSync(transDir).filter(f => f.endsWith('.json'));
} catch (e) {
    console.error('Error reading translation directory', e);
    process.exit(1);
}

let addedCount = 0;

for (const [word, ipa] of Object.entries(ipaDict)) {
    let foundFile = null;
    
    // Find the file where this word is stored
    for (const file of files) {
        const fullPath = path.join(transDir, file);
        let content = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
        const data = JSON.parse(content);
        if (data[word] !== undefined) {
            foundFile = file;
            break;
        }
    }
    
    if (foundFile) {
        const ipaFilePath = path.join(ipaDir, foundFile);
        let ipaData = {};
        if (fs.existsSync(ipaFilePath)) {
            let content = fs.readFileSync(ipaFilePath, 'utf8').replace(/^\uFEFF/, '');
            ipaData = JSON.parse(content);
        }
        
        ipaData[word] = ipa;
        
        // Sort keys alphabetically
        const sortedData = {};
        Object.keys(ipaData).sort().forEach(k => {
            sortedData[k] = ipaData[k];
        });
        
        fs.writeFileSync(ipaFilePath, JSON.stringify(sortedData, null, '\t') + '\n', 'utf8');
        console.log(`Added ${word} -> ${ipa} to ${foundFile}`);
        addedCount++;
    } else {
        console.warn(`WARNING: Could not find translation file for word: ${word}`);
    }
}

console.log(`Successfully added ${addedCount} transcriptions.`);
