'use strict';

const { createHash } = require('crypto');
const { closeSync, lstatSync, openSync, readdirSync, readSync, realpathSync,
        writeSync } = require('fs');
const { format } = require('util');
const stdout = process.stdout.fd;

const kFile = 0;
const kDirectory = 1;

module.exports = {
  genFilesList,
  hashFile,
  newHash,
  getHashType,
  print,
  constants: {
    kFile,
    kDirectory,
  },
};


function print() {
  writeSync(stdout, format.apply(null, arguments));
}


// Return new hash object based on parameters.
function newHash(type) {
  if (type === 'xxhash64') return new (require('xxhash').XXHash64)(0xdeadface);
  if (type === 'xxhash32') return new (require('xxhash'))(0xdeadface);
  return createHash('sha1');
}


function hashFile(path, type, cb) {
  const fd = openSync(path, 'r');
  const hash = newHash();
  let bytesRead = 0;
  let cumRead = 0;
  do {
    bytesRead = readSync(fd, hashBuf, 0, hashBuf.byteLength, cumRead);
    hash.update(hashBuf.slice(0, bytesRead));
    cumRead += bytesRead;
    if (typeof cb === 'function') cb(bytesRead);
  } while (bytesRead >= hashBuf.byteLength);
  closeSync(fd);
  const digest = hash.digest();
  // xxhash32 is number, others are Buffer.
  return digest.toString(typeof digest === 'number' ? 16 : 'hex');
}


// hash lenth 40 is sha1
// hash length 16 is xxhash64
// hash length 8 is xxhash32
function getHashType(hash) {
  if (typeof hash !== 'string') throw new TypeError(`invalid hash (${hash})`);
  if (hash.length === 40) return 'sha1';
  if (hash.length === 16) return 'xxhash64';
  if (hash.length === 8) return 'xxhash32';
  throw new Error('invalid hash length');
}


function updateHash(hash, data, bar, status_bar) {
  hash.update(data);
  //if (status_bar && bar)
    //bar.tick(data.byteLength);
}


// Recursively create an object of files for a given path.
// TODO(trevnorris): deal with situation if the file can't be read. like
// print to a log file or something.
function genFilesList(path, files_obj) {
  // Fist correct the path using realpath.
  path = realpathSync(path);

  // First get list of all files from path.
  const file_list = readdirSync(path);

  for (let file of file_list) {
    // Skip hidden files.
    if (file.charAt(0) === '.' && !include_hidden)
      continue;

    const stats = lstatSync(path + sep + file);

    if (stats.isFile()) {
      files_obj[file] = {
        type: kFile,  // file
        mtime: new Date(stats.mtime).valueOf(),
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
        type: kDirectory,  // directory
        perms: stats.mode & 0o777,
        list: {},
      };
      genFilesList(path + sep + file, files_obj[file].list);
    }
  }

  return files_obj;
}
