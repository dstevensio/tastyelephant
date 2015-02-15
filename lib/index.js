var Bossy = require('bossy');
var fs = require('fs');
var path = require('path');
var readline = require('readline');
var moment = require('moment');
var _ = require('lodash');

var definition = {
    h: {
        description: 'Show help',
        alias: 'help',
        type: 'boolean'
    },
    i: {
        description: 'Delicious HTML File to Import',
        alias: 'infile'
    },
    o: {
      description: 'Output Directory for Evernote enex File',
      alias: 'outputdir'
    }
};

var args = Bossy.parse(definition);

if (args instanceof Error) {
    console.error(args.message);
    return;
}

if (args.h || !args.i) {
    console.log(Bossy.usage(definition, 'tastyelephant -i <PATH_TO_DELICIOUS_HTML_FILE> [-o <PATH_TO_OUTPUT_DIRECTORY>]'));
    return;
}

console.log('Fetching delicious HTML file from ' + args.i + '...');
var input = fs.createReadStream(args.i);

var dir = args.o || './';
var outfile = path.resolve(dir, './deliciousimport.enex');
var out = fs.createWriteStream(outfile);
var rl = readline.createInterface({
    input: input
});

setupOutfileHeaders();

function setupOutfileHeaders () {
  out.write('<?xml version="1.0" encoding="UTF-8"?>');
  out.write('<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">');
  out.write('<en-export export-date="20150213T213538Z" application="Evernote" version="Evernote Mac 6.0.6 (451290)">');
  convertByLine();
}

function finalizeOutfile () {
  out.end('</en-export>');
  console.log('Finished.');
}

function convertByLine() {

  rl.on('line', function (line) {
    if (!(/<DT/).test(line)) return;

    var newline = convert(line);
    if (newline) out.write(newline);
  });

  rl.on('close', function () {
    console.log('Writing enex file...');
    finalizeOutfile();
  });

}

function convert(line) {

  var m = line.match(/<DT><A HREF="([^"]+)" ADD_DATE="([0-9]+)" PRIVATE="[0-9]+" TAGS="([A-Za-z0-9,-\s:\._'#]*)?">(.+)<\/A>/);
  if (!m) {
    console.log('failed: ' + line);
    return;
  }

  var tags;
  if (m[3]) {
    var t = m[3];
    if (t.indexOf(',') !== -1) {
      tags = t.split(',');
    } else if (t.indexOf(' ') !== -1) {
      tags = t.split(' ');
    }
  }

  var title = _.escape(m[4]);
  var uri = _.escape(m[1]);
  var bookmarkDate = moment(m[2]+'', 'X').format('YYYYMMDDTHHMMss') + 'Z';

  var xmlNode = '<note>';
  xmlNode += '<title>' + title + '</title><content><![CDATA[   <en-note>' + title + '<br /><a href="' + uri + '">' + uri + '</a></en-note>]]></content>';
  xmlNode += '<created>' + bookmarkDate + '</created>';
  xmlNode += '<updated>' + bookmarkDate + '</updated>';
  xmlNode += '<tag>deliciousimport</tag>';
  if (tags && tags.length) {
    tags.forEach(function (tag) {
      xmlNode += '<tag>' + _.escape(tag) + '</tag>';
    });
  }
  xmlNode += '<note-attributes><source>desktop.mac</source><source-url>' + uri + '</source-url><reminder-order>0</reminder-order></note-attributes>';
  xmlNode += '</note>';

  return xmlNode;

}
