/*
 * grunt-targethtml
 * https://github.com/changer/grunt-targethtml
 *
 * Copyright (c) 2012 Ruben Stolk
 * Licensed under the MIT license.
 */

'use strict';

var esprima = require('esprima');

function ConditionalParser (conditions) {
  this.conditions = conditions;
  this.parse = function(expression) {
    console.log(expression);
    switch(expression.type) {
      case 'BinaryExpression':
        switch(expression.operator) {
          case '==': return this.parse(expression.left) == this.parse(expression.right);
          case '===': return this.parse(expression.left) === this.parse(expression.right);
          case '>=': return this.parse(expression.left) >= this.parse(expression.right);
          case '>': return this.parse(expression.left) > this.parse(expression.right);
          case '<=': return this.parse(expression.left) <= this.parse(expression.right);
          case '<': return this.parse(expression.left) < this.parse(expression.right);
          case '!=': return this.parse(expression.left) != this.parse(expression.right);
          case '!==': return this.parse(expression.left) !== this.parse(expression.right);
          default: throw new Error('Syntax is not supported');
        }
        return this.parse(expression.left, expression.right);
      case 'LogicalExpression':
        
        switch(expression.operator) {
          case '||': return this.parse(expression.left) || this.parse(expression.right);
          case '&&': return this.parse(expression.left) && this.parse(expression.right);
          default: throw new Error('Syntax is not supported');
        }
      case 'UnaryExpression':
        if (expression.operator !== '!') {
          throw new Error('Syntax not supported');
        }
        return !this.parse(expression.argument);
      case 'Identifier':
        console.log(this.conditions[expression.name] || expression.name);
        return this.conditions[expression.name] || expression.name;
      case 'Literal':
        console.log(expression.value);
        return expression.value;
      default :
        throw new Error('Syntax not supported');
    }
  }

  return this;
}

module.exports = function(grunt) {

  grunt.registerMultiTask('targethtml', 'Produces html-output depending on grunt release version', function() {

    var target = this.target,
        path = require('path'),
        options = this.options({
          curlyTags: {},
          conditions: {}
        }),
        conditions = options.conditions;
        conditions.target = target;
        var conditionLib = new ConditionalParser(conditions);

    this.files.forEach(function(file) {
      file.src.forEach(function(src) {
        var dest, statement;

        if (!grunt.file.exists(src)) {
          grunt.log.error('Source file "' + src + '" not found.');
        }

        if  (grunt.file.isDir(file.dest)) {
          dest = file.dest + path.basename(src);
        } else {
          dest = file.dest;
        }

        var contents = grunt.file.read(src);

        if (contents) {
          contents = contents.replace(new RegExp('<!--[\\[\\(]if\\s?(\\S*)\\s?([\\&\\|\\=\\s]*)\\s?(.*)[\\]\\)]>(<!-->)?([\\s\\S]*?)(<!--)?<![\\[\\(]endif[\\]\\)]-->', 'g'), function(match, $1, $2, $3, $4, $5) {
            // check if it's really targeted
          console.log('$1=' + $1);
          console.log('$2=\'' + $2 + '\'');
          console.log('$3=' + $3);
          console.log('$4=' + $4);
          console.log('$5=' + $5);
          var operator = $2,
              expr, 
              targ = $1,
              negative = '';
          if($3.indexOf('!') !== -1) {
            negative = '!';
            $3 = $3.replace('!', '');
          }
          
          if(operator === '') operator = '==';
          
          expr = negative + '(' + targ + operator + '(' + $3 + '))';

          console.log(expr + ' ' + conditionLib.parse(esprima.parse(expr).body[0].expression));

          if (!conditionLib.parse(esprima.parse(expr).body[0].expression)) {
            return '';
          }


            // Process any curly tags in content
            return $5.replace(/\{\{([^{}]*)\}\}/g, function(match, search) {
              var replace = options.curlyTags[search];
              return ('string' === typeof replace) ? replace : match;
            });
          });
          grunt.file.write(dest, contents);
        }

        grunt.log.ok('File "' + dest + '" created.');

        });
    });

    if (this.errorCount) { return false; }
  });
};
