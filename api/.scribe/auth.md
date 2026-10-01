# Authenticating requests

To authenticate requests, include an **`Authorization`** header with the value **`"Bearer {YOUR_AUTH_TOKEN}"`**.

All authenticated endpoints are marked with a `requires authentication` badge in the documentation below.

Obtain a token from `POST /api/v1/auth/login` or `POST /api/v1/auth/register`, then send it as `Authorization: Bearer {token}` on every subsequent request.
