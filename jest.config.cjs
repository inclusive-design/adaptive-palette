module.exports = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  clearMocks: true,
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|js?|tsx?|ts?)$",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.mjs$": "babel-jest",
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/dist/"],
  transformIgnorePatterns: ["<rootDir>/dist/"],
  moduleFileExtensions: ["mjs", "js", "jsx", "ts", "tsx", "json", "node"]
};
