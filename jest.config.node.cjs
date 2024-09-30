module.exports = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/server/**/*.test.ts"
  ],
  clearMocks: true,
  transform: {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.mjs$": "babel-jest",
    "^.+\\.(ts|tsx)?$": ["ts-jest", {
      tsconfig: "tsconfig.node.json"
    }],
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/dist/"],
  transformIgnorePatterns: ["<rootDir>/dist/"],
  moduleFileExtensions: ["mjs", "js", "jsx", "ts", "tsx", "json", "node"],
  moduleNameMapper: {
    "^.+\\.(css|less|scss)$": "babel-jest"
  }
};
