import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Reference: https://github.com/projectkudu/kudu/wiki/Azure-runtime-environment
 * Reference: https://stackoverflow.com/a/39240447
 */

export function createTempRuleFile(ruleFileContent: string): string {
    return createTempFile("ruleset.yaml", ruleFileContent);
}

export function createTempFile(fileName: string, fileContent: string): string {
    const tempFilePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tempFilePath, fileContent, { encoding: "utf8" });

    return tempFilePath;
}

export async function fetchFile(url: string): Promise<string> {
    const response = await fetch(url);
  
    if (!response.ok) {
      throw new Error(`Failed to fetch file from ${url}. Status: ${response.status}`);
    }
  
    const data = await response.text();
    return data;
}

export function isJson(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

