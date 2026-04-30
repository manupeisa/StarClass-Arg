import { promises as fs } from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "starclass.json");

export async function readStarclassData() {
  const file = await fs.readFile(dataPath, "utf8");
  return JSON.parse(file);
}

export async function writeStarclassData(data) {
  await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
