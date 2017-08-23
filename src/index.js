#!/usr/bin/env node

'use strict';

// nohup.js - https://gist.github.com/supersha/6913695
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const tildify = require('tildify');
const untildify = require('untildify');
const username = require('username');

const DEFAULT_EXCLUDES = [
  'bower_components',
  'build',
  'dist',
  '.eyeglass_cache',
  '.gradle',
  'node_modules',
  '.pemberlyrc',
  'tmp'
];

const options = {
  option: ['o'],
  exclude: ['e'],
  source: ['s'],
  target: ['t'],
  host: ['h'],
  user: ['u']
};

const argv = require('yargs')
  .demand(['o'])
  .strict()
  .alias(options)
  .argv;

if (argv.o === 'start' || argv.o === 'stop') {
  let source;
  let target;
  argv.s = untildify(argv.s);

  if (path.isAbsolute(argv.s)) {
    source = argv.s;
  } else {
    source = path.join(process.cwd(), argv.s);
  }

  if (argv.t) {
    argv.t = untildify(argv.t);
    if (path.isAbsolute(argv.t)) {
      target = argv.t;
    } else {
      target = path.join(process.cwd(), argv.t);
    }
  } else {
    target = source;
  }

  target = tildify(target);

  try {
    fs.accessSync(source, fs.F_OK);
  } catch (error) {
    console.log('source directory does not exist');
    process.exit(1);
  }

  let ssh = '';
  const user = argv.u || username.sync();
  const hostname = argv.h;

  let exclude;
  // https://askubuntu.com/questions/320458/how-to-exclude-multiple-directories-with-rsync#answer-525513
  if (argv.e) {
    exclude = `--exclude={${argv.e}}`
  } else {
    exclude = `--exclude={${DEFAULT_EXCLUDES.join(',')}}`
  }

  if (hostname) {
    target = `${user}@${hostname}:${target}`;
    ssh = 'ssh';
  }

  // https://www.digitalocean.com/community/tutorials/how-to-use-rsync-to-sync-local-and-remote-directories-on-a-vps
  const command = `'rsync -azOte ${ssh} --inplace --delete ${exclude} ${tildify(source)}/ ${target}'`;
  const watcher = path.join(__dirname, '../node_modules/.bin/watch-and-exec');

  if (argv.o === 'start') {
    exec(`nohup ${watcher} -d=${source} -c=${command} > /dev/null 2>&1 &`, () => {
      console.log(`watching ${source} for changes`);
      console.log(`via ${watcher}`);
      console.log(`to excute ${command}`);
    });
  }

  if (argv.o === 'stop') {
    exec(`ps -ef | grep ${source} | grep -v grep | awk '{print $2}' | xargs kill -9`, error => {
      if (!error) {
        console.log(`not watching ${source} for changes`);
      }
    });
  }
}

if (argv.o === 'list') {
  // http://stackoverflow.com/questions/31570240/nodejs-get-process-id-from-within-shell-script-exec
  // http://stackoverflow.com/questions/12941083/get-the-output-of-a-shell-command-in-node-js
  exec(`ps -ef | grep watch-and-rsync/node_modules/.bin/watch-and-exec | grep -v grep | awk '{print $2"\t"substr($10,4)}'`, (error, stdout) => {
    if (!error && stdout) {
      console.log('PID\tDIR');
      console.log(stdout);
    }
  });
}
