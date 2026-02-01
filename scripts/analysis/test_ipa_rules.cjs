/**
 * Test script for IPA generation rules
 */
const fs = require('fs');
const path = require('path');

const rules = {
    crh: (text) => {
        const map = {
            'a': 'a', 'b': 'b', 'c': 'dʒ', 'ç': 'tʃ', 'd': 'd',
            'e': 'e', 'f': 'f', 'g': 'g', 'ğ': 'ɣ', 'h': 'x',
            'ı': 'ɯ', 'i': 'i', 'j': 'ʒ', 'k': 'k', 'l': 'l',
            'm': 'm', 'n': 'n', 'ñ': 'ŋ', 'o': 'o', 'ö': 'ø',
            'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 'ş': 'ʃ',
            't': 't', 'u': 'u', 'ü': 'y', 'v': 'v', 'y': 'j',
            'z': 'z', 'â': 'a'
        };
        return text.toLowerCase().split('').map(char => map[char] || char).join('');
    },
    uk: (text) => {
        const map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'ɦ', 'ґ': 'g',
            'д': 'd', 'е': 'ɛ', 'є': 'jɛ', 'ж': 'ʒ', 'з': 'z',
            'и': 'ɪ', 'і': 'i', 'ї': 'ji', 'й': 'j', 'к': 'k',
            'л': 'l', 'м': 'm', 'н': 'n', 'о': 'ɔ', 'п': 'p',
            'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
            'х': 'x', 'ц': 'ts', 'ч': 'tʃ', 'ш': 'ʃ', 'щ': 'ʃtʃ',
            'ь': 'ʲ', 'ю': 'ju', 'я': 'ja', "'": ""
        };
        return text.toLowerCase().split('').map(char => map[char] || char).join('');
    },
    de: (text) => {
        let t = text.toLowerCase();
        t = t.replace(/sch/g, 'ʃ')
            .replace(/ch/g, 'ç')
            .replace(/ei/g, 'aɪ')
            .replace(/ie/g, 'iː')
            .replace(/eu/g, 'ɔʏ')
            .replace(/äu/g, 'ɔʏ')
            .replace(/eh/g, 'eː')
            .replace(/ah/g, 'aː')
            .replace(/oh/g, 'oː')
            .replace(/uh/g, 'uː')
            .replace(/ng/g, 'ŋ')
            .replace(/st/g, 'ʃt')
            .replace(/sp/g, 'ʃp')
            .replace(/v/g, 'f')
            .replace(/w/g, 'v')
            .replace(/z/g, 'ts')
            .replace(/ß/g, 's')
            .replace(/ä/g, 'ɛ')
            .replace(/ö/g, 'ø')
            .replace(/ü/g, 'y')
            .replace(/i(?=[b-df-hj-np-tv-z]{2})/g, 'ɪ')
            .replace(/u(?=[b-df-hj-np-tv-z]e)/g, 'uː')
            .replace(/e(r|n|l)?($|\s)/g, 'ə$1');
        return t;
    },
    nl: (text) => {
        let t = text.toLowerCase();
        t = t.replace(/ij/g, 'ɛi')
            .replace(/ei/g, 'ɛi')
            .replace(/ui/g, 'œy')
            .replace(/oe/g, 'u')
            .replace(/auw/g, 'ɑu')
            .replace(/ouw/g, 'ɑu')
            .replace(/au/g, 'ɑu')
            .replace(/ou/g, 'ɑu')
            .replace(/eu/g, 'øː')
            .replace(/ie/g, 'i')
            .replace(/aa/g, 'aː')
            .replace(/ee/g, 'eː')
            .replace(/oo/g, 'oː')
            .replace(/uu/g, 'yː')
            .replace(/ch/g, 'x')
            .replace(/sch/g, 'sx')
            .replace(/ng/g, 'ŋ')
            .replace(/nj/g, 'ɲ')
            .replace(/je($|\s)/g, 'jə')
            .replace(/en($|\s)/g, 'ə')
            .replace(/o($|\s)/g, 'ɔ');
        const map = { 'j': 'j', 'y': 'i', 'v': 'v', 'w': 'ʋ', 'z': 'z', 'g': 'ɣ', 'c': 'k' };
        return t.split('').map(c => map[c] || c).join('');
    }
};

const testCases = {
    crh: [
        ['selâm', 'selam'],
        ['bağ', 'baɣ'],
        ['sağlıq', 'saɣlɯq'],
        ['çöl', 'tʃøl'],
        ['yıldız', 'jɯldɯz'],
        ['tañ', 'taŋ'],
        ['gece', 'gedʒe'],
        ['köşe', 'køʃe']
    ],
    uk: [
        ['яблуко', 'jablukɔ'],
        ['хліб', 'xlib'],
        ['море', 'mɔrɛ'],
        ['їжа', 'jiʒa'],
        ['щастя', 'ʃtʃastja'],
        ['сонце', 'sɔntsɛ'],
        ['ягода', 'jaɦɔda'],
        ['обличчя', 'ɔblɪtʃtʃja']
    ],
    de: [
        ['schule', 'ʃuːlə'],
        ['deutsch', 'dɔʏtʃ'],
        ['wasser', 'vassər'],
        ['liebe', 'liːbə'],
        ['zehn', 'tseːn'],
        ['apfel', 'apfəl'],
        ['stehen', 'ʃteːən'],
        ['zimmer', 'tsɪmmər']
    ],
    nl: [
        ['school', 'sxoːl'],
        ['huis', 'hœis'],
        ['kijken', 'kɛikə'],
        ['meisje', 'mɛisjə'],
        ['vrouw', 'vrɑu'],
        ['kleuren', 'kløːrə'],
        ['auto', 'ɑutɔ']
    ]
};

console.log('--- IPA Rules Verification ---');
let passed = 0;
let total = 0;

Object.entries(testCases).forEach(([lang, cases]) => {
    console.log(`\nLanguage: ${lang.toUpperCase()}`);
    cases.forEach(([input, expected]) => {
        const actual = rules[lang](input);
        const isOk = actual === expected;
        total++;
        if (isOk) passed++;
        console.log(`${isOk ? '✅' : '❌'} ${input} -> ${actual} ${isOk ? '' : '(Expected: ' + expected + ')'}`);
    });
});

console.log(`\nSummary: ${passed}/${total} passed.`);
if (passed < total) process.exit(1);