
const calculateFee = (assetInWan, standard) => {
    if (!assetInWan || isNaN(assetInWan)) return 0;
    
    const tiers = standard.tiers;
    for (let tier of tiers) {
        if (assetInWan <= tier.limit) {
            if (tier.fee !== undefined) {
                return tier.fee;
            } else {
                // Formula: BaseFee + (Asset_Wan - Threshold_Wan) * (Rate_Promille / 1000 * 10000)
                // Simplified: BaseFee + (Asset_Wan - Threshold_Wan) * (Rate_Promille * 10)
                return tier.base + (assetInWan - tier.threshold) * (tier.rate * 10);
            }
        }
    }
    const lastTier = tiers[tiers.length - 1];
    return lastTier.base + (assetInWan - lastTier.threshold) * (lastTier.rate * 10);
};

const standard = {
    id: 'annual',
    name: '会计年报审计',
    tiers: [
        { limit: 100, fee: 4000 },
        { limit: 400, fee: 6000 },
        { limit: 1000, fee: 8000 },
        { limit: 5000, fee: 15000 },
        { limit: Infinity, base: 15000, threshold: 5000, rate: 0.2 }
    ]
};

const tests = [
    { input: 50, expected: 4000 },     // 100万以下
    { input: 100, expected: 4000 },    // 100万边界
    { input: 150, expected: 6000 },    // 100-400
    { input: 400, expected: 6000 },    // 400边界
    { input: 500, expected: 8000 },    // 400-1000
    { input: 1000, expected: 8000 },   // 1000边界
    { input: 2000, expected: 15000 },  // 1000-5000
    { input: 5000, expected: 15000 },  // 5000边界
    { input: 6000, expected: 17000 },  // 5000以上 (15000 + 1000*0.0002*10000 = 15000 + 2000)
    { input: 10000, expected: 25000 }, // 15000 + 5000*0.0002*10000 = 15000 + 10000
];

console.log("Starting Audit Fee Calculation Tests...");
let failed = 0;
tests.forEach((t, i) => {
    const result = calculateFee(t.input, standard);
    if (result === t.expected) {
        console.log(`Test ${i + 1} PASSED: Input ${t.input}万 -> ${result}元`);
    } else {
        console.log(`Test ${i + 1} FAILED: Input ${t.input}万 -> Expected ${t.expected}, but got ${result}`);
        failed++;
    }
});

if (failed === 0) {
    console.log("\nAll math tests passed successfully!");
} else {
    console.log(`\n${failed} tests failed.`);
    process.exit(1);
}
