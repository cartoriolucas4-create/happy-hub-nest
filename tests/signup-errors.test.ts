import { expect, test } from "bun:test";
import { signupErrorMessage } from "../src/lib/signup-errors";

test("network errors retain the original diagnostic", () => {
  expect(signupErrorMessage(new TypeError("Failed to fetch"), "auth")).toContain("Detalhe: Failed to fetch");
});

test("RPC errors are not reported as successful or unavailable slugs", () => {
  expect(signupErrorMessage({ message: "permission denied for function slug_disponivel" }, "slug")).toContain("permission denied for function slug_disponivel");
});

test("Auth errors retain the returned cause", () => {
  expect(signupErrorMessage({ message: "Email rate limit exceeded" }, "auth")).toContain("Email rate limit exceeded");
});