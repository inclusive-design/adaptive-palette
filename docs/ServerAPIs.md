# Server APIs

This document outlines the supported server APIs.

## Check Server Health (GET `/health`)

### Description

This endpoint is used to check if the server is up and running.

### Response

A JSON object indicating the server's health status. For example:

```json
{
  "status": "healthy"
}
```

The `status` field currently only returns the value `"healthy"`.

### Possible HTTP Status Codes

- `200 OK`: The server is healthy.
- `503 Service Unavailable`: The server is experiencing issues and cannot handle the request.

### Example cURL Request

```bash
curl -X GET http://localhost:3000/health
```
