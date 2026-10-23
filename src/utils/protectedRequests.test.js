import test from "node:test";
import assert from "node:assert/strict";
import { attachProtectedRequestToken } from "./protectedRequests.js";

test("document uploads carry login without leaking it to other sites", () => {
  const backend = "https://tsc-backend-v2.onrender.com";
  const upload = attachProtectedRequestToken({ url: "/api/upload/doc" }, backend, () => "test-session");
  assert.equal(upload.headers.Authorization, "Bearer test-session");
  const thirdParty = attachProtectedRequestToken({ url: "https://example.com/api/upload/doc" }, backend, () => "test-session");
  assert.equal(thirdParty.headers, undefined);
  const publicPage = attachProtectedRequestToken({ url: backend + "/api/act/cards" }, backend, () => "test-session");
  assert.equal(publicPage.headers, undefined);
});
