# Ollama Chat Service Demo

This folder contains a demonstration of a chat web-app that uses Ollama as an
LLM chat service.  The following instructions describe how to set up a local
Ollama service with which the web-app demo can interact, send queries, and show
the chat service's responses.

## Ollama Service

First, set up the Ollama service. Follow the directions found in the [Ollama
Github project](https://github.com/ollama/ollama?tab=readme-ov-file). Follow the
instructions given in Ollama's [Model Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library)
to install and run a language model.

Once the Ollama Service is installed, launched and running, proceed to the next
steps.

## Chat Web-App

There are two ways to make requests of the Ollama service. The demo uses the
browsers' built-in `fetch()` function.  The other method is to use the Ollama
client library.  These are discussed in the next two sections.

### Chat using `fetch()`

The `whatExpress.html` web-app uses `fetch()` to send queries to the Ollama
service.  The advantage is that no other support library or code needs to be
installed.  The disadvantages are that setting up the parameters for `fetch()`
and managing the response are a little more involved.  In terms of the request,
it is necessary to:

- provide the request headers,
- specify that it is a `POST` request,
- make the request of the correct Ollama service endpoint,
- set the `Content-Type`, and
- properly set up the body payload.

For the chat end-point, the response is a special type of JSON, namely `json-nd`
that must be parsed and processed to retrieve the actual AI's text to show on
the web page. Using a client library, briefly discussed in the next section,
hides a lot of these details when interacting with Ollama.

The demo web-app is launched using the following command:

```text
npm run serveAppsDemos
```

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:5173/demos/Ollama%20Chat%20Service/whatExpress.html`](http://localhost:5174/demos/Ollama%20Chat%20Service/whatExpress.html)

### Chat using Ollama Client Library

There is an [Ollama browser API](https://github.com/ollama/ollama-js/?tab=readme-ov-file#browser-usage)
for communication with the Ollama service, using the library's `chat()` function
instead of making raw requests using `fetch()`. The advantage of this
approach is that sending a query, or different types of queries, is more
straightforward that involves passing an object that is essentially the body
of the request.  The response from `chat()` in this case is an array of strings
that can be concatenated to show the AI's text on the web page.  Alternatively,
the library provides a streaming response such that as the LLM provides further
output, it can be taken and added incrementally to the display instead of
waiting for the LLM to finish and displaying the response all at once.

The disadvantages are that Ollama's browser library must be
installed, and the necessary objects and functions must be included using
`import` statements in the app's JavaScript code.

Using the library is exemplified by the "Using Ollama with LLMs Running Locally"
web app in the [`apps/ollama`](../../apps/ollama) folder.  See its
[README](../../apps/ollama/README.md) for further instructions.

## How to Chat

Near the top of the demo is a pull-down menu for selecting the language model to
use for the chat. If no action is taken, the language model shown will be the
one that is used. If no language models are shown in the pull-down, follow
Ollama's [Model
Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library)
instructions to install language models.

There are two ways to chat with Ollama.  All text added to the text field of the
chat web-app client is prefixed with the question "What does this express:"
That is, if the text box contains:

```text
Horse brown eat quickly oats dried
```

then the full prompt sent to the LLM is:

```text
What does this express: "Horse brown eat quickly oats dried"?
```

Pressing the "Ask" button will send the query exactly as shown above.  The reply
will likely be somewhat wordy.  Ollama will offer an analysis of the chat query,
how the query might be improved, and it will end with a response.

If the "Answer with a single grammatically correct sentence" button is pressed,
then the query sent to the LLM service is modified in an attempt to have the LLM
return a single sentence, like so:

```text
What does this express: "Horse brown eat quickly oats dried"?  Answer
with a single grammatically correct sentence.
```

Ollama will likely respond with a single sentence for this query.
