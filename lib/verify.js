'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { sep } = require('path');
const { print, getHashType, hashFile,
        constants: { kFile, kDirectory }} = require('./util.js');;

module.exports = verify;


/**
 * Verification file structure:
 *  ["<sha1>",
 *  {
 *    total_files: <number>,
 *    total_size: <number>,
 *    files_list: {
 *      type: <number>,   // 0 - file; 1 - directory
 *      mtime: <number>,  // epoch
 *      perms: <number>,  // file or directory permissions
 *      size: <number>,   // file byte size (file only)
 *      hash: <string>,   // sha1 (file only)
 *      list: <object>,   // list of files in a directory (directory only)
 *    }
 *  }]
 *
 *  The JSON object at vfpath (verification file path) is an array with the
 *  first element being the sha1 of the JSON file where sha1 is all zeros. The
 *  sha1 of the file is written to the Buffer after the sha1 has been generated.
 */
function verify(vfpath, dir, options) {
  const vfjson = verifyPrelim(vfpath);
  const { files_list, total_size, total_files } = vfjson;

  if (Math.trunc(total_files) !== total_files || total_files < 0)
    throw new Error(`total_files invalid value (${total_files})`);
  if (Math.trunc(total_size) !== total_size || total_size < 0)
    throw new Error(`total_size invalid value (${total_size})`);
  if (typeof vfjson.files_list !== 'object' || vfjson.files_list === null)
    throw new Error('files_list invalid value');

  checkFilesList(vfjson.files_list);

  walkAndCheckDir(vfjson.files_list, fs.realpathSync(dir));
}


function verifyPrelim(vfpath) {
  const vfile = fs.readFileSync(vfpath);
  const sha = getShaAndFill(vfile);
  const vfile_sha = crypto.createHash('sha1').update(vfile).digest('hex');
  if (sha !== vfile_sha)
    throw new Error(`sha's did not match (${sha}) (${vfile_sha})`);
  return JSON.parse(vfile)[1];
}


function getShaAndFill(vfile) {
  const start = vfile.indexOf('"') + 1;
  const end = vfile.indexOf('"', start);
  if (end - start !== 40)
    throw new Error('length of sha1 is invalid');
  const part = vfile.slice(start, end);
  const sha = part.toString();
  if (!/^[0-9a-fA-F]*$/.test(sha))
    throw new Error(`invalid sha (${sha})`);
  // Sha looks good. Now fill sha space with '0' for hashing.
  part.fill('0');
  return sha;
}


function checkFilesList(obj) {
  if (typeof obj !== 'object' || obj === null)
    throw new Error(`invalid obj type (${obj})`);
  if (Math.trunc(obj.mtime) !== obj.mtime || obj.mtime < 0)
    throw new Error(`invalid mtime (${obj.mtime})`);
  if (Math.trunc(obj.perm) !== obj.perm || obj.perm < 0 || obj.perms > 0o777)
    throw new Error(`invalid perms (0${obj.perm.toString(8)})`);

  switch (obj.type) {
    case kFile:
      if (Math.trunc(obj.size) !== obj.size || obj.size < 0)
        throw new Error(`invalid size (${obj.size})`);
      if (typeof obj.hash !== 'string')
        throw new Error(`invalid hash (${obj.hash})`);
      break;

    case kDirectory:
      checkFilesList(obj.list);
      break;

    default:
      throw new Error(`invalid type (${obj.type})`);
  }
}


function walkAndCheckDir(list, path) {
  for (const key in list) {
    const obj = list[key];
    const epath = path + sep + key;
    if (obj.type === kDirectory) {
      walkAndCheckDir(obj, epath);
      continue;
    }

    const hash_type = getHashType(obj.hash);
    const digest = hashFile(epath, hash_type);
    if (obj.hash !== digest)
      print(`hash for ${epath} invalid (${obj.hash}) (${digest})\n`);
  }
}
