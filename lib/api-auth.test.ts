import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateBearer, safeEqual } from "./api-auth";

test("bearer secret fails closed in production when unset", () => {
  assert.equal(evaluateBearer(undefined, null, true), "unconfigured");
  assert.equal(evaluateBearer(undefined, "Bearer x", false), "allow");
});

test("bearer secret rejects a wrong token and accepts the right one", () => {
  assert.equal(evaluateBearer("s3cret", "Bearer no", true), "unauthorized");
  assert.equal(evaluateBearer("s3cret", "Bearer s3cret", true), "allow");
  assert.equal(evaluateBearer("s3cret", null, true), "unauthorized");
});

test("safeEqual rejects different lengths", () => {
  assert.equal(safeEqual("a", "ab"), false);
  assert.equal(safeEqual("ab", "ab"), true);
});
