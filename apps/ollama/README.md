# Ollama Chat Web-App

The following instructions describe how to set up a local Ollama service such
that the locally hosted Ollama chat web-app can send queries, and show the
ollama service's responses from querying one or more LLMs.

A reason for running the service and the applications on `localhost` is privacy.
 Since the user's prompts are handled by an LLM or LLMs running locally, no user
information is sent to the cloud; it all remains on the user's local machine.

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

The `ollama.html` web-app uses the [Ollama browser API](https://github.com/ollama/ollama-js/?tab=readme-ov-file#browser-usage)
for communication with the Ollama service, using the library's `chat()`
function. The response from `chat()`  is an array of JSON structures each
containing a part of the textual response from the LLM.  These are streamed from
ollama and added incrementally to the display area(s) on the web page as the
LLM(s) provides them.

In the adaptive palette main directory, execute this command line instruction to
install the ollama JavaScript package:

```text
npm install ollama
```

Launch the web-app chat client using the command:

```text
npm run serveLocalApps
```

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:5173/apps/ollama/ollama.html`](http://localhost:5173/apps/ollama/ollama.html)

## How to Chat

The following describes how to use the features of the web-app.

There is a pull-down menu near the top of the "LLM Settings" that selects the
language model to use for the chat. If no action is taken, the language model
shown will be the one that is used. If no language models are shown in the
pull-down, follow Ollama's [Model Library](https://github.com/ollama/ollama?tab=readme-ov-file#model-library)
instructions to install language models.

Alternatively, check the checkbox labelled "Show results for all models".  Any
prompts sent to the chatbot will send the same prompt to multiple LLMs so their
responses can be compared.

Enter a system prompt in the text area just below the checkbox.  This prompt
will be supplied to the language model(s) as a overall system prompt describing
the nature of the chat.  This prompt is optional, and the text area can be left
blank.

Individual prompts are entered into the text area labelled "What does this
express: ?".  There are two ways to chat with an LLM.  All text added to the
text area is prefixed with the question "What does this express:"
That is, if the text box contains:

```text
Horse brown eat quickly oats dried
```

then the full prompt sent to the LLM is:

```text
What does this express: "Horse brown eat quickly oats dried"?
```

Pressing the "Ask" button will send the query exactly as shown above.  The reply
will likely be somewhat wordy.  The language model will offer an analysis of the
chat query, how the query might be improved, and it will end with a response.

If the "Answer with a single grammatically correct sentence" button is pressed,
then the query sent to the LLM is modified in an attempt to have the LLM
return a single sentence, like so:

```text
What does this express: "Horse brown eat quickly oats dried"?  Answer
with a single grammatically correct sentence.
```

Ollama will likely respond with a single sentence for this query.  The response
is incrementally added to the web page as parts of it are provided by ollama.
