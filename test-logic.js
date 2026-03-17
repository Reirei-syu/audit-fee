
const normalizeNumberString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    return String(value).replace(/[,，\s]/g, '');
};

const parseNumber = (value) => {
    const normalized = normalizeNumberString(value);
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : NaN;
};

const calculateFee = (assetValue, standard, unit = 'wan', method = 'excess') => {
    let val = parseNumber(assetValue);
    if (!val || isNaN(val) || val <= 0) return 0;
    
    if (unit === 'yuan') {
        val = val / 10000;
    }
    
    let totalFee = 0;
    const tiers = standard.tiers;
    
    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const prevLimit = i === 0 ? 0 : tiers[i-1].limit;
        
        if (tier.limit === Infinity) {
            const excess = val - tier.threshold;
            return totalFee + (excess * tier.rate * 10);
        }

        if (val > tier.limit) {
            if (tier.fee !== undefined) {
                totalFee += tier.fee;
            }
        } else {
            if (i === 0) {
                return tier.fee;
            }

            if (method === 'full') {
                return totalFee + tier.fee;
            }
            
            const range = tier.limit - prevLimit;
            const excessInTier = val - prevLimit;
            const fraction = excessInTier / range;
            return totalFee + (fraction * tier.fee);
        }
    }
    
    return totalFee;
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
    // 超额累进（默认）
    { input: 50, expected: 4000, method: 'excess' },      // 100万以下
    { input: 100, expected: 4000, method: 'excess' },     // 100万边界
    { input: 150, expected: 5000, method: 'excess' },     // 100-400 插值
    { input: 400, expected: 10000, method: 'excess' },    // 400边界
    { input: 500, expected: 11333.333333333334, method: 'excess' }, // 400-1000 插值
    { input: 1000, expected: 18000, method: 'excess' },   // 1000边界
    { input: 2000, expected: 21750, method: 'excess' },   // 1000-5000 插值
    { input: 5000, expected: 33000, method: 'excess' },   // 5000边界
    { input: 6000, expected: 35000, method: 'excess' },   // 5000以上
    { input: 10000, expected: 43000, method: 'excess' },  // 5000以上
    // 全额累进
    { input: 150, expected: 10000, method: 'full' },      // 100-400
    { input: 500, expected: 18000, method: 'full' },      // 400-1000
    { input: 2000, expected: 33000, method: 'full' },     // 1000-5000
    { input: 6000, expected: 35000, method: 'full' },     // 5000以上
];

console.log("Starting Audit Fee Calculation Tests...");
let failed = 0;
const approxEqual = (a, b, epsilon = 1e-6) => Math.abs(a - b) <= epsilon;
tests.forEach((t, i) => {
    const result = calculateFee(t.input, standard, 'wan', t.method);
    if (approxEqual(result, t.expected)) {
        console.log(`Test ${i + 1} PASSED: Input ${t.input}万 (${t.method}) -> ${result}元`);
    } else {
        console.log(`Test ${i + 1} FAILED: Input ${t.input}万 (${t.method}) -> Expected ${t.expected}, but got ${result}`);
        failed++;
    }
});

if (failed === 0) {
    console.log("\nAll math tests passed successfully!");
} else {
    console.log(`\n${failed} tests failed.`);
    process.exit(1);
}
