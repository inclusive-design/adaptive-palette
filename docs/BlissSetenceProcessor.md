# Bliss Sentence Processor

This processor can:

1. Translates Bliss sentences received from the adaptive palette into natural language sentences.
2. If adaptive palette askes for the next word prediction, respond with the requested number of predictions.

The processor uses a rule-based engine to handle semantic grounding at the word level, and a language model handles
linguistic fluency and grammar at the sentence level.

## Blissymbolics Fundamental Rules - Symbol Types

See [The Fundamental Rules of Blissymbolics](https://www.blissymbolics.org/images/bliss-fundamental-rules-2020-06-16.pdf)

* **Classifier and Specifier**: In a multi-character Bliss-word, the first symbol is the "classifier," which sets the
semantic category. Subsequent characters are "specifiers" that refine the meaning.
* **Indicators**: These are small symbols placed above a Bliss-word to denote grammatical information like part of
speech (noun, verb, adjective), tense (past, present, future), or plurality.
* **Modifiers**: A special set of Bliss-characters is used as prefixes and suffixes to modify the meaning of Bliss-words.

## Additional rules for tech purposes

* The composition sequence: any number of modifiers + one classifier + one indicator + any number of
specifiers/modifiers. Only the classifier is required in this sequence.
* Classifiers can be nouns or verbs or adjectives or adverbs
* Symbols with wrong POS in spreadsheet

## Two primary modules

Part 1: Bliss Engine (Rule-Based): Translates Bliss IDs and compositions into a language-independent semantic representation.
Part 2: Language Adapters (LLM-Based): Transforms semantic data into grammatically correct natural language.

## API

### Accepted Parameters

| Parameter | Type | Descriptions |
| --------- | ---- | ------------ |
| sequence | Array | a mix of integers (Bliss IDs) and arrays (representing composed symbols). For example: “8559 [13639, “/”, 15927, “/”, 24899] 14463” |
| language code | String | For example: “en”, “fr” etc |
| request type | String | “complete_sentence”, or, “next_word_prediction” |
| top N | Integer | Number of predictions to return if type is “next_word_prediction”. |

### Return

* When the request type is “complete_sentence”: return the complete sentence in the requested language.
* When the request type is “next_word_prediction” with a number N: return the top N predictions of the next word to
continue the current sentence. These predictions should be in the requested language.

## Workflow

When the processor receives a request, it processes it in three stages:

1. Decomposition (Word Level): The sequence of Bliss IDs is passed to the Bliss Engine. The engine identifies if an ID
is a single symbol represented by one single integer of BCI-AV ID, or a composed symbol represented by an array of
BCI-AV IDs.
2. Semantic Mapping: The engine replaces IDs with either a text "gloss" (for simple terms) or a structured Semantic
JSON object (for complex compositions).
3. Linguistic Synthesis (Sentence Level): The mapped sequence is passed to the Language Adapter. The adapter inserts
this data into a prompt template and queries the LLM to generate the final natural language output.

### Part 1: Bliss Engine - a language independent rule-based module

The Bliss Engine is a language-independent module that performs word-level semantic extraction. It converts Bliss IDs
into "Glosses" (simple word labels) or detailed JSON semantic structures.

#### Workflow

1. **Dictionary Lookup**: If the ID exists in the standard Bliss dictionary, it returns the associated gloss.
2. **Composition Analysis**: If a symbol is composed of multiple IDs (e.g., Building + Medicine + Plural), the engine
decomposes it into its semantic primitives.

**Use Cases**
*Use case 1*:
If the input is a Bliss ID or an existing composition, it returns the glosses and its explanation.

*Use case 2*:
If the input is a new composition, the module analyzes the component Bliss IDs and returns their combined semantic information.

For example, the composition for “many hospitals” contains:
A classifier ID: “building”
A specifier ID: “medicine”
A Indicator ID: plural
A modifier ID:  a group of, many

The module loops through the composing IDs, extract their semantics, and output something like:
{
  classifier: "building"
  specifiers: ["medicine”],
  semantics: [
    {"NUMBER": "plural"},
    {"QUANTIFIER": "many"}
  ]
}

*Use case 3*:
If the input is a semantic JSON, the module returns the Bliss ID or a Bliss composition.
The input looks like:
{
  classifier: "building"
  specifiers: ["medicine”],
  semantics: [
    {"NUMBER": "plural"},
    {"QUANTIFIER": "many"}
  ]
}

The output is a Bliss composition: [ 17506, 8998, 14183, 14947 ]. “/” and “;” are not included. These rendering
components should be handled by a different module.

### Part 2: Language specific adapters

This module performs sentence-level processing by converting the Bliss Engine's output into a natural language prompt
for an LLM.

#### Input

An array containing strings (glosses) and JSON objects (semantic data).

#### Workflow

1. The adapter injects the semantic data into a language-specific Prompt Template.
2. The template instructs the LLM to respect the grammar, tense, and syntax of the target language.
