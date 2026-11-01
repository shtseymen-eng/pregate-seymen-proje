import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";


const execFileAsync = promisify(execFile);


async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}


export async function extractReferenceAssets(referencePptx, workDir) {
  await fs.mkdir(workDir, { recursive: true });
  const coverPath = path.join(workDir, "poliport-pregate-cover.jfif");
  if (await exists(coverPath)) {
    return { coverPath };
  }
  if (!referencePptx) {
    throw new Error("Kapak görseli bulunamadı; ilk çalıştırmada --reference gereklidir.");
  }
  const { stdout } = await execFileAsync(
    "unzip",
    ["-p", referencePptx, "ppt/media/image4.jfif"],
    { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
  );
  await fs.writeFile(coverPath, stdout);
  return { coverPath };
}
