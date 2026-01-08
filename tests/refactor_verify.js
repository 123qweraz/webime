const getActiveSegment = (buffer) => {
    if (!buffer) return { activeSegment: "", precedingBuffer: "" };
    if (buffer.includes(" ")) {
        const segments = buffer.split(/\s+/);
        const lastSeg = segments[segments.length - 1];
        const preceding = buffer.substring(0, buffer.length - lastSeg.length);
        return { activeSegment: lastSeg, precedingBuffer: preceding };
    }
    return { activeSegment: buffer, precedingBuffer: "" }; // Simplified for test
};

console.log("Testing Multi-segment Parsing...");

const test1 = getActiveSegment("ni hao");
console.log(`'ni hao' -> Active: '${test1.activeSegment}', Preceding: '${test1.precedingBuffer}'`);
if (test1.activeSegment === "hao" && test1.precedingBuffer === "ni ") console.log("Test 1 PASSED");
else console.log("Test 1 FAILED");

const test2 = getActiveSegment("wo xiang yao ");
console.log(`'wo xiang yao ' -> Active: '${test2.activeSegment}', Preceding: '${test2.precedingBuffer}'`);
if (test2.activeSegment === "" && test2.precedingBuffer === "wo xiang yao ") console.log("Test 2 PASSED");
else console.log("Test 2 FAILED");

const test3 = getActiveSegment("pinyin");
console.log(`'pinyin' -> Active: '${test3.activeSegment}', Preceding: '${test3.precedingBuffer}'`);
if (test3.activeSegment === "pinyin" && test3.precedingBuffer === "") console.log("Test 3 PASSED");
else console.log("Test 3 FAILED");
