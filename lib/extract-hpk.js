import * as fileSys from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

import report from './reporter.js';

function readUInt32LE(buffer, offset) {
    return buffer.readUInt32LE(offset);
}

function readCString(buffer, offset) {
    let end = offset;
    while (buffer[end] !== 0) end++;
    return buffer.slice(offset, end).toString('utf8');
}

function extractHpkFile(filePath, outPath) {
    const hpkData = fileSys.readFileSync(filePath);

    if(hpkData.toString('utf8', 0, 4) !== 'HPK\0') {
        report.error(`hpk.extract`,`Invalid file format. Not a valid HPK file.`);
        process.exit(1);
    }

    // The Magic Offset (Not So Magic)
    let offset = 4;

    const version1 = readUInt32LE(hpkData, offset); offset += 4;
    const filesCount = readUInt32LE(hpkData, offset); offset += 4;
    const firstFilePos = readUInt32LE(hpkData, offset); offset += 4;
    const version2 = readUInt32LE(hpkData, offset); offset += 4;
    const nTableSize = readUInt32LE(hpkData, offset); offset += 4;
    const nTableZSize = readUInt32LE(hpkData, offset); offset += 4;
    const nTableOffset = offset;

    const nTableComp = Buffer.from(hpkData.subarray(nTableOffset, nTableOffset + nTableZSize));
    
    let nameTable;
    try {
        nameTable = zlib.inflateSync(nTableComp);
    } catch (err) {
        report.error(`hpk.extract`,`Failed to decompress name table: ${err.message}`);
        process.exit(1);
    }

    // Bypass the Table...
    offset += nTableZSize;

    // Loop through the archived files...
    let manifestFiles = [];
    let nameOffset = 0;
    for(let i = 0; i < filesCount; i++) {
        try {
            const fileName = readCString(nameTable, nameOffset);
            nameOffset += fileName.length + 1;

            const zSize = readUInt32LE(hpkData, offset); offset += 4;
            const fileOffset = readUInt32LE(hpkData, offset); offset += 4;
            const size = readUInt32LE(hpkData, offset); offset += 4;
            const crc = readUInt32LE(hpkData, offset); offset += 4;
            const nul = readUInt32LE(hpkData, offset); offset += 4;

            // Strange Size Inconsistencies in HPK format
            let fileData;
            if(zSize !== size) {
                const compressedData = Buffer.from(hpkData.subarray(fileOffset, fileOffset + zSize));
                try {
                    fileData = zlib.inflateSync(compressedData);
                } catch(e) {
                    report.error(`hpk.extract`,`Failed to decompress file '${fileName}': ${e.message}`);
                    process.exit(0);
                }
            } else {
                fileData = Buffer.from(hpkData.subarray(fileOffset, fileOffset + size));
            }
            // Export the Actual File
            const outFilePath = path.join(outPath, fileName);
            const outPathFinal = path.dirname(outFilePath);
            fileSys.mkdirSync(outPathFinal, { recursive: true });
            fileSys.writeFileSync(outFilePath, fileData);

            manifestFiles.push({fileName: fileName, size: size, zSize: zSize, crc: crc})

            const fileCount = (`${i + 1}/${filesCount}`);
            report.info(`hpk.extract`,`Extracted "${fileName}" (${size} bytes) [File ${fileCount}]`);
        } catch(e) {
            report.error(`hpk.extract`,`Failed to extract file '${fileName}': ${e.message}`);
        }
    }
    // Export a Manifest of the File to a JSON
    fileSys.writeFileSync(path.join(outPath, "manifest.json"), JSON.stringify({
        sourceFile: path.basename(filePath),
        version1: version1,
        version2: version2,
        filesCount: filesCount,
        firstFilePos: firstFilePos,
        nameTableSize: nTableSize,
        nameTableZSize: nTableZSize,
        nameTable: nameTable,
        nameTableOffset: nTableOffset,
        files: manifestFiles
    }, null, 4));

    report.success(`hpk.extract`,`Extraction completed successfully.`);
}

export default extractHpkFile;
