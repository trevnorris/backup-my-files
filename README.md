### Backup My Files

This is a simple file backer-upper that can also write out backup information
for all files in JSON.

Currently it's just one CLI script, but I'll be changing it to actually have a
proper API in the future.


#### CLI

Here are the commands that can be passed to the script:

```
Usage:
 backup-my-files [options] SRC DEST
 -v, --verbose         increase verbosity
 -r, --recursive       recurse into directories
 -c, --checksum        skip files based on checksum or generate hash for
                       files when using --only-scan
 -u, --update          skip files that are newer on the receiver
 -t, --ctime           skip files that have newer ctime.
 -p, --perms           preserve permissions
 -x, --xxhash64        use 64 bit xxhash instead of sha1 for checksum
                       (requires setting --checksum)
 -y, --xxhash32        use 32 bit xxhash instead of sha1 for checksum
                       (requires setting --checksum)
 -s, --only-scan       only scan SRC and generate file informaion; DEST
                       is ignored
 -o, --output=FILE     file destination for file data, default stdout
                       if set for SRC to DEST copy then the JSON data will
                       still be generated and written to disk
 -b, --buf-size=NUM    size of buffer in bytes to read in files when
                       generating sha1, default 32MB
 -i, --include-hidden  include hidden files in scan
 -t, --status-bar      display status bar while generating hashes; make sure
                       to use --output of using this option
```

While it says to call `backup-my-files` currently `main.js` needs to be called
directly. e.g. `node main [options] SRC DEST`.


#### Notes

The library `xxhash` is not necessary for this to run and is set as an optional
dependency.
