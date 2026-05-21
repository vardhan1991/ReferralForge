import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ApplicationRecord, CandidateProfile, JobData, MatchAnalysis, UserProfileMemory } from "../shared/types.ts";

export interface StoreData {
  jobs: JobData[];
  candidates: CandidateProfile[];
  analyses: MatchAnalysis[];
  applications: ApplicationRecord[];
  profile?: UserProfileMemory;
}

const defaultData: StoreData = {
  jobs: [],
  candidates: [],
  analyses: [],
  applications: []
};

export class JsonStore {
  private readonly filePath: string;

  constructor(filePath = join(process.cwd(), "data", "referralforge.store.json")) {
    this.filePath = filePath;
  }

  async read(): Promise<StoreData> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as StoreData;
    } catch {
      return structuredClone(defaultData);
    }
  }

  async write(data: StoreData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }

  async mutate(mutator: (data: StoreData) => void): Promise<StoreData> {
    const data = await this.read();
    mutator(data);
    await this.write(data);
    return data;
  }
}
