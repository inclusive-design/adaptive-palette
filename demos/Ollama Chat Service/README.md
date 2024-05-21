# Ollama Chat Service Demo

There are two demonstrations of the chat web-app that uses Ollama as an LLM chat
service.  The following instructions describe how to set up a local Ollama
service with which the web-app can interact, send queries, and show the chat
service's responses.

## Ollama Service

First, set up the Ollama service. Follow the directions found in the [Ollama
Github project](https://github.com/ollama/ollama?tab=readme-ov-file).  The demo
web-apps used the Phi-3 language model.  Follow the instructions given in
Ollama's [Model
Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library) to
install and run that language model.

Once the Ollama Service is installed, launched and running, proceed to the next
steps.

## Chat Web-App

There are two versions of the web-app.  They appear identical within the browser
window, but the details of how they interact with the Ollama service are
different.  Instructions for running each is given in what follows.

### What is Expressed?

The `whatExpress.html` web-app uses the browser's built-in `fetch()` function to
send queries to the Ollama service.  Nothing further needs to be installed.
However, the demo web-app must be launched in the same way as the main Adaptive
Palette application:

```text
npm run dev
```

See the [Start a Development Server](../../README.md#start-a-development-server)
section in the main README document for more details.

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:3000/demos/Ollama%20Chat%20Service/whatExpress.html`](http://localhost:3000/demos/Ollama%20Chat%20Service/whatExpress.html)

### Ollama Chat

The `ollama.html` web-app uses the [Ollama browser API](https://github.com/ollama/ollama-js/?tab=readme-ov-file#browser-usage)
for communication with the Ollama service.  In order to run this version of the
web-app, the above library must be installed.

In the adaptive palette main directory, execute this command line instruction to
install the ollama JavaScript package:

</code>
$ npm install ollama
</code>

As with the previous version of the web-app, the web-app chat client needs to be
launched:

```text
npm run dev
```

See the [Start a Development Server](../../README.md#start-a-development-server)
section in the main README document for more details.

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:3000/demos/Ollama%20Chat%20Service/ollama.html`](http://localhost:3000/demos/Ollama%20Chat%20Service/ollama.html)

## How to Chat

There are two ways to chat with Ollama.  Any text added to the text field of the
chat web-app client is prefixed with the question "What does this express:"
That is, if the text box contains:

```text
Horse brown eat quickly oats dried
```

then the full prompt sent to the LLM is:

```text
What does this express: "Horse brown eat quickly oats dried"?
```

Pressing the "Ask" button, will send the query exactly as shown above.  If the
"Answer with a single grammatically correct sentence" button is pressed, then
the query sent to the LLM service is modified in an attempt to have it return a
single sentence, like so:

```text
What does this express: "Horse brown eat quickly oats dried"?  Answer
with a single grammatically correct sentence.
```
