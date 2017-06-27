'use strict';

const fs = require('fs');
const path = require('path');
const { genFilesList, hashFile, newHash } = require('./util.js');
const sep = path.sep;

module.exports = onlyScan;


function onlyScan() {
  let run_time = process.hrtime();
  genFilesList(src_realpath, fs_files.files_list);
  fs.writeSync(2, `Found ${fs_files.total_files} files containing ` +
                  `${fs_files.total_size} bytes\n`);
  if (checksum) {
    fs.writeSync(2, 'Generating hashes for files...\n');
    let bar = null;
    if (status_bar) {
      bar = new (require('progress'))(
        '[:bar] :percent :etas',
        { total: fs_files.total_size, width: 40 });
    }
    genHashs(fs_files.files_list, bar, src_realpath);
  }
  printJSON(fs_files);
  run_time = process.hrtime(run_time);
  fs.writeSync(1,
    `Operation took ${(run_time[0] + run_time[1] / 1e9).toFixed(2)}s\n`);
}


// Print output to stdout or write to file.
// TODO(trevnorris): Support JSON files larger than natively supported.
function printJSON(obj) {
  if (output_fd === 1) {
    fs.writeSync(1, JSON.stringify(obj, 2, 2));
    return;
  }
  const buf = Buffer.from(JSON.stringify(obj));
  fs.writeSync(1, `Writing JSON to ${output}\n`);
  fs.writeSync(output_fd, buf, 0, buf.byteLength, 0);
  fs.closeSync(output_fd);
}


function genHashs(obj, bar, cum_path) {
  cum_path = cum_path === undefined ? '' : cum_path + sep;
  for (let entry in obj) {
    if (obj[entry].type === 'd')
      genHashs(obj[entry].list, bar, cum_path + entry);
    else
      obj[entry].hash = hashFile(cum_path + entry, bar);
  }
}
