const results = { passed: 0, failed: 0, errors: [] };

async function test(method, path, base, { body, expectedStatus, description } = {}) {
  const expected = expectedStatus || 200;
  const label = description || `${method} ${path}`;
  const opts = { method };
  if (body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${base}${path}`, opts);
    if (res.status === expected) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(`FAIL [${label}] — expected ${expected}, got ${res.status}`);
    }
  } catch (err) {
    results.failed++;
    results.errors.push(`FAIL [${label}] — ${err.message}`);
  }
}

export default async function smoke(base) {
  console.log(`  Smoke tests against ${base}\n`);

  await test("GET", "/api/health", base, { description: "Health check" });
  await test("GET", "/", base, { description: "Main page" });
  await test("GET", "/api/reviews", base, { description: "Get reviews" });
  await test("GET", "/api/prds", base, { description: "Get PRDs" });

  await test("POST", "/api/reviews", base, {
    body: {
      id: "test-1",
      type: "code-review",
      title: "Test Review",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      data: {},
    },
    expectedStatus: 201,
    description: "Create review",
  });

  await test("GET", "/api/reviews/test-1", base, { description: "Get single review" });
  await test("GET", "/api/reviews/nonexistent", base, {
    expectedStatus: 404,
    description: "Get missing review returns 404",
  });

  await test("POST", "/api/prds", base, {
    body: {
      id: "test-prd-1",
      type: "prd",
      title: "Test PRD",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      data: {},
    },
    expectedStatus: 201,
    description: "Create PRD",
  });

  await test("GET", "/api/prds/test-prd-1", base, { description: "Get single PRD" });

  await test("POST", "/api/ai", base, {
    body: { prompt: "test", systemPrompt: "test" },
    expectedStatus: 503,
    description: "AI endpoint returns 503 without API key",
  });

  console.log(`\n  Results: ${results.passed} passed, ${results.failed} failed\n`);
  if (results.errors.length) {
    results.errors.forEach((e) => console.error(`  ${e}`));
  }
  return results.failed > 0 ? 1 : 0;
}
