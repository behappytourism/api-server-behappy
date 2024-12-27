function numberToWord(num) {
    const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const tens = [
        "",
        "ten",
        "twenty",
        "thirty",
        "forty",
        "fifty",
        "sixty",
        "seventy",
        "eighty",
        "ninety",
    ];
    const teens = [
        "eleven",
        "twelve",
        "thirteen",
        "fourteen",
        "fifteen",
        "sixteen",
        "seventeen",
        "eighteen",
        "nineteen",
    ];
    const thousands = [
        "",
        "thousand",
        "million",
        "billion",
        "trillion",
        "quadrillion",
        "quintillion",
    ];

    if (num === 0) return "zero";

    let word = "";
    let i = 0;

    while (num > 0) {
        if (num % 1000 !== 0) {
            let temp = "";
            if (num % 100 < 10) {
                temp = ones[num % 100];
                num = Math.floor(num / 100);
            } else if (num % 100 < 20) {
                temp = teens[(num % 10) - 1];
                num = Math.floor(num / 100);
            } else {
                temp = ones[num % 10];
                num = Math.floor(num / 10);

                temp = tens[num % 10] + temp;
                num = Math.floor(num / 10);
            }

            word = temp + thousands[i] + " " + word;
        }

        i++;
        num = Math.floor(num / 1000);
    }

    return word.trim();
}

module.exports = numberToWord;
