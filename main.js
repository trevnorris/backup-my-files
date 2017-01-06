'use strict';

const fs = require('fs');
const path = require('path');
const sep = path.sep;
const print = process._rawDebug;

// Usage:
//  backup-my-files [options] SRC DEST
//  -v, --verbose         increase verbosity
//  -r, --recursive       recurse into directories
//  -c, --checksum        skip files based on checksum or generate hash for
//                        files when using --only-scan
//  -u, --update          skip files that are newer on the receiver
//  -t, --ctime           skip files that have newer ctime.
//  -p, --perms           preserve permissions
//  -x, --xxhash64        use 64 bit xxhash instead of sha1 for checksum
//                        (requires setting --checksum)
//  -y, --xxhash32        use 32 bit xxhash instead of sha1 for checksum
//                        (requires setting --checksum)
//  -s, --only-scan       only scan SRC and generate file informaion; DEST
//                        is ignored
//  -o, --output=FILE     file destination for file data, default stdout
//                        if set for SRC to DEST copy then the JSON data will
//                        still be generated and written to disk
//  -b, --buf-size=NUM    size of buffer in bytes to read in files when
//                        generating sha1, default 32MB
//  -i, --include-hidden  include hidden files in scan
//  -t, --status-bar      display status bar while generating hashes; make sure
//                        to use --output of using this option
//  -e, --verify=FILE     use JSON FILE to verify files in SRC
//                        TODO(trevnorris): Implement this
const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['v', 'verbose', 'r', 'recursive', 'c', 'checksum', 'u', 'update',
            't', 'ctime', 'p', 'perms', 'x', 'xxhash64', 'y', 'xxhash32',
            's', 'only-scan', 'g', 'gen-hash', 'i', 'include-hidden',
            't', 'status-bar']
});
const verbose = !!(argv['verbose'] || argv.v);
const recursive = !!(argv['recursive'] || argv.r);
const checksum = !!(argv['checksum'] || argv.c);
const update = !!(argv['update'] || argv.u);
const ctime = !!(argv['ctime'] || argv.t);
const perms = !!(argv['perms'] || argv.p);
const xxhash64 = !!(argv['xxhash64'] || argv.x);
const xxhash32 = !!(argv['xxhash32'] || argv.y);
const only_scan = !!(argv['only-scan'] || argv.s);
const include_hidden = !!(argv['include-hidden'] || argv.i);
const status_bar = !!(argv['status-bar'] || argv.t);

const output = argv['output'] || argv.o || null;
const buf_size = Math.floor(argv['buf-size'] || argv.b) || 0x2000000;

if (!argv._[0])
  throw new Error('SRC must be defined');
if (!only_scan && !argv._[1])
  throw new Error('DEST must be defined if not scanning');

const src_path = path.normalize(argv._[0]);
const src_realpath = fs.realpathSync(src_path);
const dest_path = !only_scan ? path.normalize(argv._[1]) : null;
const dest_realpath = dest_path ? fs.realpathSync(dest_path) : null;

if (src_realpath === dest_realpath && !only_scan)
  throw new Error('SRC and DEST cannot be the same');

{
  const src_stat = fs.lstatSync(src_realpath);
  // TODO(trevnorris): Support symlinks
  if (!src_stat.isDirectory())
    throw new TypeError('SRC must be a directory');
  if (!only_scan) {
    const dest_stat = fs.lstatSync(dest_realpath);
    if (!dest_stat.isDirectory())
      throw new TypeError('DEST must be a directory');
  }
}

// Open fd to output early to make sure we can have access to it.
const output_fd = output === null ? 1 : fs.openSync(output, 'w+');

// NOTE: hash of length 40 is sha1, 16 is xxhash64 and 8 is xxhash32. Use this
// when reading in a JSON later for verification.

const hashBuf = Buffer.alloc(buf_size);
const fs_files = { total_size: 0, total_files: 0, files_list: {} };

/**
 * future options:
 * - follow symlinks
 * - store sha's of all files, allow running a check on all saved files
 */

if (only_scan) {
  let run_time = process.hrtime();
  genFilesList(src_realpath, fs_files.files_list);
  process.stderr.write(`Found ${fs_files.total_files} files containing `+
                       `${fs_files.total_size} bytes\n`);
  if (checksum) {
    process.stderr.write('Generating hashes for files...\n');
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
  process.stdout.write(
    `Operation took ${(run_time[0] + run_time[1] / 1e9).toFixed(2)}s\n`);
  process.exit();
}

throw new Error('only directory scanning is currently supported');

// TODO finish this

process.stdout.write(
  `Copying files from ${src_realpath} to ${dest_realpath}\n` +
  'Please make sure no backup files are written to during this time\n');

// First generate object of files
genFilesList(src_realpath, fs_files.files_list);

process.stdout.write(
  `Detected ${fs_files.total_files} files at ${fs_files.total_size} bytes\n`);

(function copyFiles(files_list, cum_path) {
  for (let entry in files_list) {
    const entry_path = cum_entry + sep + entry;

    // Handle directories.
    if (files_list[entry].type === 'd') {
      // Create directory if it doesn't exist.
      // TODO(trevnorris): Need much better error recovery.
      try {
        const entry_stats = fs.lstatSync(entry_path);
        // Does exist. Update perms if --perms was passed.
        if (perms && entry_stats.mode & 0o777 !== file_list[entry].perms)
          fs.chmodSync(entry_path, file_list[entry].perms);
      } catch (e) {
        if (e.code !== 'ENOENT')
          throw new Error('unexepcted error: ' + e.message);
        // Directory doesn't exist. Create it.
        const new_perms = perms ? files_list[entry].perms : undefined;
        fs.mkdirSync(entry_path, new_perms);
      }
      copyFiles(files_list[entry].list, entry_path);
      continue;
    }

    // Handle files.
    // XXX TODO left off implementing file copy support.
    try {
      const entry_stats = fs.lstatSync(cum_path + sep + entry);
      if (!checksum && !update && !ctime) {
      }
      if (checksum) {
        continue;
      }
      if (update) {
        continue;
      }
    } catch (e) {
      if (e.code !== 'ENOENT')
        throw new Error('unexpected error: ' + e.message);
    }
  }
})(fs_files.files_list, dest_realpath);


function copyFile(cum_path) {
  const src_fd = fs.openSync(src_realpath + sep + cum_path, 'r');
  const dest_fd = fs.openSync(dest_realpath + sep + cum_path, 'w');
  let bytesRead = 0;
  let cumRead = 0;
  do {
    bytesRead = fs.readSync(src_fd, hashBuf, 0, hashBuf.byteLength, cumRead);
    fs.writeSync(dest_fd, hashBuf.slice(0, bytesRead), 0, bytesRead, cumRead);
    cumRead += bytesRead;
  } while (bytesRead >= hashBuf.byteLength);
}


// Recursively create an object of files for a given path.
// TODO(trevnorris): deal with situation if the file can't be read. like
// print to a log file or something.
function genFilesList(path, files_obj) {
  // Fist correct the path using realpath.
  path = fs.realpathSync(path);

  // First get list of all files from path.
  const file_list = fs.readdirSync(path);

  for (let file of file_list) {
    // Skip hidden files.
    if (file.charAt(0) === '.')
      continue;

    const stats = fs.lstatSync(path + sep + file);

    if (stats.isFile()) {
      files_obj[file] = {
        type: 'f',  // file
        mtime: new Date(stats.mtime).valueOf(),
        ctime: new Date(stats.ctime).valueOf(),
        size: stats.size,
        perms: stats.mode & 0o777,
      };
      fs_files.total_size += stats.size;
      fs_files.total_files++;
      continue;
    }

    if (stats.isSymbolicLink()) {
      // TODO(trevnorris): Not currently supported.
      continue;
    }

    if (stats.isDirectory() && recursive) {
      files_obj[file] = {
        type: 'd',  // directory
        perms: stats.mode & 0o777,
        list: {},
      };
      genFilesList(path + sep + file, files_obj[file].list);
    }
  }

  return files_obj;
}


// Print output to stdout or write to file.
// TODO(trevnorris): Support JSON files larger than natively supported.
function printJSON(obj) {
  if (output_fd === 1) {
    process.stdout.write(JSON.stringify(obj, 2, 2));
    return;
  }
  const buf = Buffer.from(JSON.stringify(obj));
  process.stdout.write(`Writing JSON to ${output}\n`);
  fs.writeSync(output_fd, buf, 0, buf.byteLength, 0);
  fs.closeSync(output_fd);
}


// Return new hash object based on parameters.
function newHash() {
  if (!xxhash64 && !xxhash32) return require('crypto').createHash('sha1');
  if (xxhash64) return new (require('xxhash').XXHash64)(0xdeadface);
  return new (require('xxhash'))(0xdeadface);
}


function updateHash(hash, data, bar) {
  hash.update(data);
  if (status_bar && bar)
    bar.tick(data.byteLength);
}


function hashFile(path, bar) {
  const fd = fs.openSync(path, 'r');
  const hash = newHash();
  let bytesRead = 0;
  let cumRead = 0;
  do {
    bytesRead = fs.readSync(fd, hashBuf, 0, hashBuf.byteLength, cumRead);
    updateHash(hash, hashBuf.slice(0, bytesRead), bar);
    cumRead += bytesRead;
  } while (bytesRead >= hashBuf.byteLength);
  fs.closeSync(fd);
  const digest = hash.digest();
  // xxhash32 is number, others are Buffer.
  return digest.toString(typeof digest === 'number' ? 16 : 'hex');
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
