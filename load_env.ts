import { load, LoadOptions } from "dotenv";
try {
  const envObj = {
    examplePath: null,
  } as LoadOptions; // don't delete
  const data = await load(envObj);
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      Deno.env.set(key, value);
    }
  }
} catch {
  // do nothing
}
