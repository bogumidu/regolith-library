import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";

import { paths } from "./bbSettings.js";

const settings = process.argv[2] ? JSON.parse(process.argv[2]) : {};
let initialFiles = 0;
let finalFiles = 0;

for (const p of paths) {
  combineJsonFiles(p.path, `${p.path}/${settings.prefix ?? ''}/${p.keyShort}_board.ac`, p.key, p.mode);
}
console.log(`Bundling complete. Initial file count: ${initialFiles}, Final file count: ${finalFiles}`);

function combineJsonFiles(dir, outFile, key, mode) {
  const files = getFilesRecursive(dir);
  let combinedData;

  if (mode === "object") {
    combinedData = [];
    files.forEach((file) => {
      const rawData = fs.readFileSync(file, "utf8");
      const jsonData = JSON.parse(stripJsonComments(rawData));
      if (!jsonData.hasOwnProperty('format_version')) {
        throw new Error(`Invalid JSON file. Missing "format_version" property at ${file}`);
      }
      const formatV = combinedData['format_version'] !== undefined ? combinedData['format_version'] : jsonData['format_version'];
      let currentFormat = combinedData.find((x) => x.format_version === formatV);
      if (currentFormat === undefined) {
        currentFormat = { format_version: formatV };
        combinedData.push(currentFormat);
      }
      if (jsonData.hasOwnProperty(key)) {
        currentFormat[key] = { ...currentFormat[key], ...jsonData[key] };
      }
      fs.unlink(file, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
      initialFiles++;
    });
  } else if (mode === "array") {
    combinedData = [];
    files.forEach((file) => {
      const rawData = fs.readFileSync(file, "utf8");
      const jsonData = JSON.parse(stripJsonComments(rawData));
      if (!jsonData.hasOwnProperty('format_version')) {
        throw new Error(`Invalid JSON file. Missing "format_version" property at ${file}`);
      }
      const formatV = combinedData['format_version'] !== undefined ? combinedData['format_version'] : jsonData['format_version'];
      let currentFormat = combinedData.find((x) => x.format_version === formatV);
      if (currentFormat === undefined) {
        currentFormat = { format_version: formatV, [key]: []};
        combinedData.push(currentFormat);
      }
      if (jsonData.hasOwnProperty(key)) {
        currentFormat[key] = [...currentFormat[key], ...jsonData[key]];
      }
      fs.unlink(file, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
      initialFiles++;
    });
  } else {
    throw new Error('Invalid mode. Use "object" or "array".');
  }
  ensureDirectoryExistence(outFile);
  for (const f of combinedData) {
    fs.writeFileSync(outFile + '.' + f['format_version'] + '.json', JSON.stringify(f, null, 2));
    finalFiles++;
  }
}

function getFilesRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      // Recurse into subdirectory
      results = results.concat(getFilesRecursive(file));
    } else {
      // Check if file is a JSON file
      if (path.extname(file) === ".json") {
        results.push(file);
      } else if (path.extname(file) === '.templ') {
        console.warn(`JSONTE files are not supported, run this filter after JSONTE. Skipping "${file}"`)
      } else {
        console.warn(`Non-JSON file found. Skipping "${file}"`);
      }
    }
  });
  return results;
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};
