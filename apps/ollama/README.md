# Ollama Chat Web-App

The following instructions describe how to set up a local Ollama
service with which Ollama chat web-app can send queries, and show the ollama
service's responses.

## Ollama Service Set Up

First, set up the Ollama service. Follow the directions found in the [Ollama
Github project](https://github.com/ollama/ollama?tab=readme-ov-file).  Either
download and install the version of Ollama for your OS, or use the
[Docker](https://github.com/ollama/ollama?tab=readme-ov-file#docker) approach.

Secondly, follow the instructions given in Ollama's [Model Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library)
to install and run a language model.

Finally launch the ollama service.  For example, if the command-line version of
Ollama was downloaded, then for macOS, in a terminal execute `ollama serve`.
See the Ollama documentation for more information.

Once the Ollama Service is installed, launched and running, proceed to the next
steps.

## Chat Web-App

There are two versions of the web-app.  They appear identical within the browser
window, differing in the details of how they interact with the Ollama service.
The differences between the two, and the instructions for running each is given
in the next sections.

### Chat using `fetch()`

The `whatExpress.html` web-app uses the browser's built-in `fetch()` function to
send queries to the Ollama service.  The advantage is that no other support
library or code needs to be installed.  The disadvantages are that setting up
the parameters for `fetch()` and managing the response are a little more
involved.  In terms of the request, it is necessary to provide the request
headers, specify that it is a `POST` request, make the request of the correct
Ollama service endpoint, set the `Content-Type`, and properly set up the body
payload. For the chat end-point, the response is a special type of JSON, namely
`json-nd` that must be parsed and processed to retrieve the actual AI's text to
show on the web page. The second web-app, discussed in the next section, uses a
library that hides a lot of these details when interacting with the Ollama
service.

The demo web-app is launched in the same way as the main Adaptive Palette
application:

```text
npm run dev
```

See the [Start a Development Server](../../README.md#start-a-development-server)
section in the main README document for more details.

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:3000/apps/ollama/ollama.html`](http://localhost:3000/apps/ollama/ollama.html)

### Chat using Ollama Client Library

The `ollama.html` web-app uses the [Ollama browser API](https://github.com/ollama/ollama-js/?tab=readme-ov-file#browser-usage)
for communication with the Ollama service, using the library's `chat()`
function.  The response from `chat()` in this case is an array of JSON
structures each containing a part of the textual response from the LLM.  These
are concatenated together and then displayed on the web page.

In the adaptive palette main directory, execute this command line instruction to
install the ollama JavaScript package:

```text
npm install ollama
```

Launch the web-app chat client using the command:

```text
npm run dev
```

See the [Start a Development Server](../../README.md#start-a-development-server)
section in the main README document for more details.

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:3000/demos/Ollama%20Chat%20Service/ollama.html`](http://localhost:3000/demos/Ollama%20Chat%20Service/ollama.html)

## How to Chat

The following describes how to use the web-app regardless of which one is
tested.

Near the top is a pull-down menu for selecting the language model to use for the
chat. If no action is taken, the language model shown will be the one that is
used. If no language models are shown in the pull-down, follow
Ollama's [Model Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library)
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

The checkbox labelled "Show results for all models", if checked, will cause the
app to query all available models, and show the results of each within its own
section on the web app's page.
