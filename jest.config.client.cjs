module.exports = {
  setupFiles: ["./setupFetchForJest.ts"],
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: [
    "<rootDir>/src/client/**/*.test.ts"
  ],
  clearMocks: true,
  transform: {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.mjs$": "babel-jest",
    "^.+\\.(ts|tsx)?$": ["ts-jest", {
      tsconfig: "tsconfig.client.json"
    }],
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/dist/"],
  transformIgnorePatterns: ["<rootDir>/dist/"],
  moduleFileExtensions: ["mjs", "js", "jsx", "ts", "tsx", "json", "node"],
  moduleNameMapper: {
    "^.+\\.(css|less|scss)$": "babel-jest"
  },
};
