# Server APIs

This document outlines the supported server APIs.

## Check Server Health (GET `/health`)

### Description

This endpoint is used to check if the server is up and running.

### Request

* **Method**: GET

* **URL**: http://[host-url]/health

* **Example cURL Request**

```bash
curl -X GET http://localhost:3000/health
```

### Response

A JSON object indicating the server's health status. For example:

```json
{
  "status": "healthy"
}
```

The `status` field currently only returns the value `"healthy"`.

## Query Pre-loaded Vector Store (POST `/query-vector`)

### Description

This endpoint allows you to query the vector store used in the application. It's primarily intended for testing
and verification purposes, not for client-side use. The endpoint accepts a query string and returns the top 4 matches
from the database.

### Pre-requisites

Before using this endpoint, make sure you've completed one-time setup that enables RAG in the system by following the
instruction in the [Enable RAG](../README.md#enable-rag) section in the README.

### Request

* **Method**: POST

* **URL**: http://[host-url]/query-vector

* **Headers**:
  * Content-Type: application/json

* **Body**:

```json
{
  "query": "your search query here"
}
```

* **Example cURL Request**

```bash
curl -H "Content-Type: application/json" -X POST -d '{"query":"high school"}' http://localhost:3000/query-vector
```

### Response

The endpoint returns a JSON object containing the top 4 matches for the given query:

```json
{
  "results": [
    {
      "pageContent": "string",
      "metadata": {
        "source": "string",
        "loc": {
          "lines": {
            "from": number,
            "to": number
          }
        }
      }
    },
    // ... (3 more similar objects)
  ]
}```
