import test from "node:test";
import assert from "node:assert/strict";
import { attachProtectedRequestToken, documentUploadError } from "./protectedRequests.js";

test("document uploads carry login without leaking it to other sites", () => {
  const backend = "https://tsc-backend-v2.onrender.com";
  const upload = attachProtectedRequestToken({ url: "/api/upload/doc" }, backend, () => "test-session");
  assert.equal(upload.headers.Authorization, "Bearer test-session");
  const thirdParty = attachProtectedRequestToken({ url: "https://example.com/api/upload/doc" }, backend, () => "test-session");
  assert.equal(thirdParty.headers, undefined);
  const publicPage = attachProtectedRequestToken({ url: backend + "/api/act/cards" }, backend, () => "test-session");
  assert.equal(publicPage.headers, undefined);
});

test("document errors explain sign-in and size restrictions", () => {
  assert.match(documentUploadError({ response: { status: 401 } }), /sign in/i);
  assert.equal(documentUploadError({ response: { status: 413, data: { message: "Please choose a file smaller than 20 MB." } } }), "Please choose a file smaller than 20 MB.");
});
