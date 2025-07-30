# InstaMastadonGram

Set the following environment variables:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL
- MONGO_URI
- SESSION_SECRET

## To run client

```
npm run dev/prod
```

## Postman: Test Login

```
http://localhost:8000/auth/google
```

## Postman: Test Fedify Endpoint

1. **Set the request URL:**

```
GET http://localhost:8000/users/test
```

2. **Add the HTTP Header:**

| Key    | Value                     |
|--------|---------------------------|
| Accept | application/activity+json |

3. **Send the request**

You should receive a JSON response describing the user as an ActivityPub `Person`.