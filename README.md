# Adaptive Palette

This project builds a palette that empowers AAC(Augmentative and Alternative
Communication) users with the ability to personalize it according to their
specific requirements, thereby enhancing their communication capabilities with
others.

The front end of the project is built with [Preact](https://preactjs.com/).

## Install

To work on the project, you need to install [NodeJS and NPM](https://nodejs.org/en/download/)
for your operating system.

Then, clone the project from GitHub. [Create a fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)
with your GitHub account, then enter the following in your command line
(make sure to replace `your-username` with your username):

```bash
git clone https://github.com/your-username/adaptive-palette
```

From the root of the cloned project, enter the following in your command line
to install dependencies:

```bash
npm ci
```

## Development

### Start a Development Server

To start a local web server for development that every change to the source code
will be watched and redeployed,
run:

```bash
npm run dev
```

The website will be available at [http://localhost:3000](http://localhost:3000).

### Lint

To lint the source code, run:

```bash
npm run lint
```

### Run Tests

To run tests, run:

```bash
npm test
```

## Production Build

To generate a production build, run:

```bash
npm run build
```

Upon completion, you'll have a new dist/ folder which can be deployed directly
to a server.

To preview the production build, run:

```bash
npm run preview
```
