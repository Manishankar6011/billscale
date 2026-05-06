/**
 * Converts a number into Indian Rupees words.
 */
export const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (n: number): string => {
        if ((n = Math.floor(n)) === 0) return '';
        if (n < 20) return a[n]!;
        if (n < 100) return b[Math.floor(n / 10)]! + ' ' + a[n % 10]!;
        if (n < 1000) return inWords(n / 100) + 'hundred ' + inWords(n % 100);
        if (n < 100000) return inWords(n / 1000) + 'thousand ' + inWords(n % 1000);
        if (n < 10000000) return inWords(n / 100000) + 'lakh ' + inWords(n % 100000);
        return inWords(n / 10000000) + 'crore ' + inWords(n % 10000000);
    };

    const wholePart = Math.floor(num);
    const fractionalPart = Math.round((num - wholePart) * 100);

    let res = inWords(wholePart) + 'Rupees ';
    if (fractionalPart > 0) {
        res += 'and ' + inWords(fractionalPart) + 'Paise ';
    }
    return res.toUpperCase() + 'ONLY';
};
