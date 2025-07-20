---
sidebar_position: 1
---

# Sending Requests

Here you can see a collection of examples showing how to interact with all available auto generated endpoints in **Arkos** for you prisma models, here using the Post prisma model as an example.

## Base URL

```
http://localhost:8000/api
```

## GET Requests

### List All Posts

```
GET /api/posts
```

**Authorization:** `Bearer YOUR_API_TOKEN` if the endpoints requires it, remember that it can also be sent through cookies which is set automatically when login depending on your configs passed to `arkos.init()`, [read more](/docs/core-concepts/built-in-authentication-system)

**Response:**

```json
{
  "total": 42,
  "results": 10,
  "data": [
    {
      "id": "1",
      "title": "Getting Started with Our API",
      "content": "This is a getting started guide...",
      "authorId": "123",
      "published": true,
      "createdAt": "2025-04-05T14:23:45.123Z",
      "updatedAt": "2025-04-05T14:23:45.123Z"
    }
  ]
}
```

> **Note:** For detailed information about request query parameters, filtering, sorting, and pagination options, please refer to the [Advanced Guide: Request Query Parameters](/docs/guide/request-query-parameters).

### Get a Single Post

```
GET /api/posts/1
```

**Response:**

```json
{
  "data": {
    "id": "1",
    "title": "Getting Started with Our API",
    "content": "This is a getting started guide...",
    "authorId": "123",
    "published": true,
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T14:23:45.123Z"
  }
}
```

## POST Requests

### Create a Single Post

```
POST /api/posts
```

**Request Body:**

```json
{
  "title": "My New Blog Post",
  "content": "This is the content of my new blog post",
  "authorId": "123",
  "published": false,
  "tags": ["technology", "programming"]
}
```

**Response:**

```json
{
  "data": {
    "id": "42",
    "title": "My New Blog Post",
    "content": "This is the content of my new blog post",
    "authorId": "123",
    "published": false,
    "tags": ["technology", "programming"],
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T14:23:45.123Z"
  }
}
```

### Create Multiple Posts

```
POST /api/posts/many
```

**Request Body:**

```json
[
  {
    "title": "First Post",
    "content": "Content for first post",
    "authorId": "123"
  },
  {
    "title": "Second Post",
    "content": "Content for second post",
    "authorId": "123"
  }
]
```

**Response:**

```json
{
  "total": 2,
  "results": 2,
  "data": [
    {
      "id": "43",
      "title": "First Post",
      "content": "Content for first post",
      "authorId": "123",
      "createdAt": "2025-04-05T14:23:45.123Z",
      "updatedAt": "2025-04-05T14:23:45.123Z"
    },
    {
      "id": "44",
      "title": "Second Post",
      "content": "Content for second post",
      "authorId": "123",
      "createdAt": "2025-04-05T14:23:45.123Z",
      "updatedAt": "2025-04-05T14:23:45.123Z"
    }
  ]
}
```

## PATCH Requests

### Update a Single Post

```
PATCH /api/posts/1
```

**Request Body:**

```json
{
  "title": "Updated Post Title",
  "published": true
}
```

**Response:**

```json
{
  "data": {
    "id": "1",
    "title": "Updated Post Title",
    "content": "This is a getting started guide...",
    "authorId": "123",
    "published": true,
    "createdAt": "2025-04-05T14:23:45.123Z",
    "updatedAt": "2025-04-05T15:30:12.456Z"
  }
}
```

### Update Multiple Posts

```
PATCH /api/posts/many?authorId=123&published=false
```

**Request Body:**

```json
{
  "published": true
}
```

**Response:**

```json
{
  "total": 5,
  "results": 5,
  "data": [
    {
      "id": "2",
      "title": "Draft Post",
      "published": true,
      "updatedAt": "2025-04-05T15:30:12.456Z"
    }
  ]
}
```

## DELETE Requests

### Delete a Single Post

```
DELETE /api/posts/1
```

**Response:** (204 No Content)

### Delete Multiple Posts

```
DELETE /api/posts/many?authorId=123&published=false
```

**Response:**

```json
{
  "total": 3,
  "results": 3,
  "data": [
    {
      "id": "7",
      "title": "Deleted Draft Post"
    }
  ]
}
```

## Error Responses

### Not Found (404)

```json
{
  "status": "error",
  "message": "Resource with id '999' not found."
}
```

### Bad Request (400)

```json
{
  "status": "error",
  "message": "Filter criteria not provided for bulk deletion."
}
```

You read about other errors that can occur during this operatorions under the [global error handler section](/docs/core-concepts/global-error-handler)

## Request Data Validation

**Arkos** allows data validation without effort, it supports `zod` and also `class-validator` you can choose accordingly to your bussines and application logic, to know how to add request data validation [click here](/docs/core-concepts/request-data-validation)
