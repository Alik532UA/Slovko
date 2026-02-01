/**
 * NL Transcription Rules (Dutch)
 */

export function generateNlIPA(text: string): string {
    let t = text.toLowerCase();
    
    // Diphthongs & digraphs order matters
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

    const map: Record<string, string> = {
        'j': 'j', 'y': 'i', 'v': 'v', 'w': 'ʋ', 'z': 'z', 'g': 'ɣ',
        'c': 'k'
    };

    return t.split('').map(c => map[c] || c).join('');
}
