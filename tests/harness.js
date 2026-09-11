import { spawn } from "child_process";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SERVER_PATH = join(__dirname, "..", "server", "index.js");
const TEST_PORT = 3098;
const TEST_DATA_DIR = join(tmpdir(), `pm-tools-test-${Date.now()}`);

function seedTestData() {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  writeFileSync(join(TEST_DATA_DIR, "reviews.json"), "[]");
  writeFileSync(join(TEST_DATA_DIR, "prds.json"), "[]");
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function run() {
  const testScript = process.argv[2] || "smoke";

  console.log(`\n  Setting up isolated test environment...`);
  console.log(`  Data dir: ${TEST_DATA_DIR}`);
  console.log(`  Port: ${TEST_PORT}\n`);

  seedTestData();

  const server = spawn("node", [SERVER_PATH], {
    env: {
      ...process.env,
      DATA_DIR: TEST_DATA_DIR,
      PORT: String(TEST_PORT),
      ANTHROPIC_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d));
  server.stderr.on("data", (d) => (serverOutput += d));

  try {
    const base = `http://localhost:${TEST_PORT}`;
    await waitForServer(base);
    console.log("  Server started.\n");

    const testModule = await import(`./${testScript}.js`);
    const exitCode = await testModule.default(base);

    server.kill("SIGTERM");
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    process.exit(exitCode);
  } catch (err) {
    console.error("\n  Harness error:", err.message);
    console.error("  Server output:", serverOutput);
    server.kill("SIGTERM");
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    process.exit(1);
  }
}

run();
