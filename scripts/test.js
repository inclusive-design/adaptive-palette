import { BlissSVGBuilder } from "bliss-svg-builder";

BlissSVGBuilder.define({
  "1219": { codeString: "B297;B81/B1012/B401" },
  "6436": { type: "indicator", codeString: "B6436" }
});

// const builder = new BlissSVGBuilder("B216/XOH;;B99");
// console.log(builder.warnings);
// console.log(builder.errors);

// [
//   {
//     code: 'NON_INDICATOR_AS_WORD_INDICATOR',
//     message: 'Word-level indicator "6436" after ;; is not an indicator; it is ignored. A ;; code must be an indicator (e.g. B81).',
//     source: '6436'
//   }
// ]
// const builder = new BlissSVGBuilder("1219;;6436");
// console.log(builder.warnings);

const builder = new BlissSVGBuilder("B297;6434/B1012/B401");
console.log(builder.warnings);

// const builder = new BlissSVGBuilder("B297;B81/B1012/B401;;B904");
// builder.group(0).applyIndicators("B904", {flatten: true});

console.log(builder.toString({flattenIndicators: true}));
