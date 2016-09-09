var assert = require('assert')
var fs = require('fs')
var sgf = require('../modules/sgf')
var gametree = require('../modules/gametree')

describe('sgf', function() {
    describe('tokenize', function() {
        it('should work on multiple nodes', function() {
            assert.deepEqual(sgf.tokenize('(;B[aa]SZ[19];AB[cc][dd:ee])'), [
                ['parenthesis', '('],
                ['semicolon', ';'],
                ['prop_ident', 'B'], ['c_value_type', '[aa]'],
                ['prop_ident', 'SZ'], ['c_value_type', '[19]'],
                ['semicolon', ';'],
                ['prop_ident', 'AB'], ['c_value_type', '[cc]'], ['c_value_type', '[dd:ee]'],
                ['parenthesis', ')']
            ])
        })
        it('should take escaping values into account', function() {
            assert.deepEqual(sgf.tokenize('(;C[hello\\]world];C[hello\\\\];C[hello])'), [
                ['parenthesis', '('],
                ['semicolon', ';'],
                ['prop_ident', 'C'], ['c_value_type', '[hello\\]world]'],
                ['semicolon', ';'],
                ['prop_ident', 'C'], ['c_value_type', '[hello\\\\]'],
                ['semicolon', ';'],
                ['prop_ident', 'C'], ['c_value_type', '[hello]'],
                ['parenthesis', ')']
            ])
            assert.deepEqual(sgf.tokenize('(;C[\\];B[aa];W[bb])'), [
                ['parenthesis', '('],
                ['semicolon', ';'],
                ['prop_ident', 'C'], ['c_value_type', '[\\];B[aa]'],
                ['semicolon', ';'],
                ['prop_ident', 'W'], ['c_value_type', '[bb]'],
                ['parenthesis', ')']
            ])
        })
        it('should allow lower case properties', function() {
            assert.deepEqual(sgf.tokenize('(;CoPyright[blah])'), [
                ['parenthesis', '('],
                ['semicolon', ';'],
                ['prop_ident', 'CoPyright'], ['c_value_type', '[blah]'],
                ['parenthesis', ')']
            ])
        })
    })

    describe('parse', function() {
        it('should parse multiple nodes', function() {
            assert.equal(gametree.getJson(sgf.parse([
                ['parenthesis', '('],
                ['semicolon', ';'],
                ['prop_ident', 'B'], ['c_value_type', '[aa]'],
                ['prop_ident', 'SZ'], ['c_value_type', '[19]'],
                ['semicolon', ';'],
                ['prop_ident', 'AB'], ['c_value_type', '[cc]'], ['c_value_type', '[dd:ee]'],
                ['parenthesis', ')']
            ])), gametree.getJson({
                nodes: [],
                subtrees: [
                    {
                        nodes: [
                            { B: ['aa'], SZ: ['19'] },
                            { AB: ['cc', 'dd:ee'] }
                        ],
                        subtrees: []
                    }
                ]
            }))
        })
        it('should parse variations', function() {
            assert.equal(
                gametree.getJson(sgf.parse(sgf.tokenize('(;B[hh](;W[ii])(;W[hi]C[h]))'))),
                gametree.getJson({
                    nodes: [],
                    subtrees: [
                        {
                            nodes: [{ B: ['hh'] }],
                            subtrees: [
                                {
                                    nodes: [{ W: ['ii'] }],
                                    subtrees: []
                                },
                                {
                                    nodes: [{ W: ['hi'], C: ['h'] }],
                                    subtrees: []
                                }
                            ]
                        }
                    ]
                })
            )
        })
        it('should convert lower case properties', function() {
            assert.equal(
                gametree.getJson(sgf.parse(sgf.tokenize('(;CoPyright[hello](;White[ii])(;White[hi]Comment[h]))'))),
                gametree.getJson({
                    nodes: [],
                    subtrees: [
                        {
                            nodes: [{ CP: ['hello'] }],
                            subtrees: [
                                {
                                    nodes: [{ W: ['ii'] }],
                                    subtrees: []
                                },
                                {
                                    nodes: [{ W: ['hi'], C: ['h'] }],
                                    subtrees: []
                                }
                            ]
                        }
                    ]
                })
            )
        })
        it('should parse a relatively complex file', function() {
            var contents = fs.readFileSync(__dirname + '/complex.sgf', 'utf8')
            var tokens = sgf.tokenize(contents)
            var tree = sgf.parse(tokens)

            assert.equal(tree.subtrees.length, 1)
        })
        it('should ignore empty subtrees', function() {
            assert.equal(
                gametree.getJson(sgf.parse(sgf.tokenize('(;B[hh]()(;W[ii])()(;W[hi]C[h]))'))),
                gametree.getJson({
                    nodes: [],
                    subtrees: [
                        {
                            nodes: [{ B: ['hh'] }],
                            subtrees: [
                                {
                                    nodes: [{ W: ['ii'] }],
                                    subtrees: []
                                },
                                {
                                    nodes: [{ W: ['hi'], C: ['h'] }],
                                    subtrees: []
                                }
                            ]
                        }
                    ]
                })
            )
        })
    })

    describe('encoding', function() {
        it('should be able to read out the CA property', function() {
            assert.equal(
                sgf.parse(sgf.tokenize('(;CA[UTF-8])')).subtrees[0].nodes[0].CA[0],
                'UTF-8')
        })
        it('should be able to decode non-UTF-8 text nodes', function() {
            assert.equal(
                sgf.parse(sgf.tokenize(
                    fs.readFileSync(__dirname + '/chinese.sgf', {encoding: 'binary'})))
                    .subtrees[0].nodes[2].C[0],
                '围棋 is fun'
            )
        })
        it('should be able to go back and re-parse attributes set before CA', function() {
            assert.equal(
                sgf.parse(sgf.tokenize(
                    fs.readFileSync(__dirname + '/chinese.sgf', {encoding: 'binary'})))
                    .subtrees[0].nodes[0].PW[0],
                '柯洁'
            )
            assert.equal(
                sgf.parse(sgf.tokenize(
                    fs.readFileSync(__dirname + '/chinese.sgf', {encoding: 'binary'})))
                    .subtrees[0].nodes[0].PB[0],
                '古力'
            )
        })
        it('should save SGFs back to UTF-8 regardless of input encoding', function() {
            var parsed_sgf = sgf.parse(sgf.tokenize(
                fs.readFileSync(__dirname + '/chinese.sgf', {encoding: 'binary'})))
            var saved_sgf = sgf.stringify(parsed_sgf)
            assert.equal('GB2312', parsed_sgf.subtrees[0].nodes[0].CA[0])
            assert.equal('UTF-8', sgf.parse(sgf.tokenize(saved_sgf)).subtrees[0].nodes[0].CA[0])
        })
    })

    describe('string2dates', function() {
        it('should parse comma-separated dates', function() {
            assert.deepEqual(sgf.string2dates('1996-12-27,1997-01-03'), [
                [1996, 12, 27], [1997, 1, 3]
            ])
        })
        it('should be able to handle empty strings', function() {
            assert.deepEqual(sgf.string2dates(''), [])
        })
        it('should handle short-hand notation', function() {
            assert.deepEqual(sgf.string2dates('1996-05,06'), [
                [1996, 5], [1996, 6]
            ])
            assert.deepEqual(sgf.string2dates('1996-05,06-01'), [
                [1996, 5], [1996, 6, 1]
            ])
            assert.deepEqual(sgf.string2dates('1996-05,1997'), [
                [1996, 5], [1997]
            ])
            assert.deepEqual(sgf.string2dates('1996-05-06,07,08'), [
                [1996, 5, 6], [1996, 5, 7], [1996, 5, 8]
            ])
            assert.deepEqual(sgf.string2dates('1996,1997'), [
                [1996], [1997]
            ])
            assert.deepEqual(sgf.string2dates('1996-12-27,28,1997-01-03,04'), [
                [1996, 12, 27], [1996, 12, 28], [1997, 1, 3], [1997, 1, 4]
            ])
        })
    })

    describe('dates2string', function() {
        it('should work', function() {
            assert.equal(sgf.dates2string([
                [1996, 5], [1996, 6]
            ]), '1996-05,06')
            assert.equal(sgf.dates2string([
                [1996, 5], [1996, 6, 1]
            ]), '1996-05,06-01')
            assert.equal(sgf.dates2string([
                [1996, 5], [1997]
            ]), '1996-05,1997')
            assert.equal(sgf.dates2string([
                [1996, 5, 6], [1996, 5, 7], [1996, 5, 8]
            ]), '1996-05-06,07,08')
            assert.equal(sgf.dates2string([
                [1996], [1997]
            ]), '1996,1997')
            assert.equal(sgf.dates2string([
                [1996, 12, 27], [1996, 12, 28], [1997, 1, 3], [1997, 1, 4]
            ]), '1996-12-27,28,1997-01-03,04')
        })
        it('should be able to handle empty strings', function() {
            assert.equal(sgf.dates2string([]), '')
        })
        it('should be inverse to string2dates', function() {
            assert.deepEqual(sgf.string2dates(sgf.dates2string([
                [1996, 5], [1996, 6]
            ])), [
                [1996, 5], [1996, 6]
            ])
            assert.deepEqual(sgf.string2dates(sgf.dates2string([
                [1996, 5, 6], [1996, 5, 7], [1996, 5, 8]
            ])), [
                [1996, 5, 6], [1996, 5, 7], [1996, 5, 8]
            ])
            assert.deepEqual(sgf.string2dates(sgf.dates2string([
                [1996], [1997]
            ])), [
                [1996], [1997]
            ])
            assert.deepEqual(sgf.string2dates(sgf.dates2string([
                [1996, 12, 27], [1996, 12, 28], [1997, 1, 3], [1997, 1, 4]
            ])), [
                [1996, 12, 27], [1996, 12, 28], [1997, 1, 3], [1997, 1, 4]
            ])

            assert.equal(sgf.dates2string(sgf.string2dates('1996-05,06')), '1996-05,06')
            assert.equal(sgf.dates2string(sgf.string2dates('1996-05-06,07,08')), '1996-05-06,07,08')
            assert.equal(sgf.dates2string(sgf.string2dates('1996,1997')), '1996,1997')
            assert.equal(sgf.dates2string(sgf.string2dates('1996-12-27,28,1997-01-03,04')), '1996-12-27,28,1997-01-03,04')
        })
    })

    describe('point2vertex', function() {
        it('should return [-1, -1] when passing string with length > 2', function() {
            assert.deepEqual(sgf.point2vertex(''), [-1, -1])
            assert.deepEqual(sgf.point2vertex('d'), [-1, -1])
            assert.deepEqual(sgf.point2vertex('blah'), [-1, -1])
        })
        it('should work', function() {
            assert.deepEqual(sgf.point2vertex('bb'), [1, 1])
            assert.deepEqual(sgf.point2vertex('jj'), [9, 9])
            assert.deepEqual(sgf.point2vertex('jf'), [9, 5])
            assert.deepEqual(sgf.point2vertex('fa'), [5, 0])
            assert.deepEqual(sgf.point2vertex('fA'), [5, 26])
            assert.deepEqual(sgf.point2vertex('AB'), [26, 27])
        })
        it('should be left inverse to vertex2point', function() {
            var tests = [[-1, -1], [10, 5], [9, 28], [30, 27], [0, 0]]
            tests.forEach(test => assert.deepEqual(sgf.point2vertex(sgf.vertex2point(test)), test))
        })
    })

    describe('vertex2point', function() {
        it('should return empty string when passing negative values', function() {
            assert.equal(sgf.vertex2point([-4, -5]), '')
            assert.equal(sgf.vertex2point([-4, 5]), '')
            assert.equal(sgf.vertex2point([4, -5]), '')
        })
        it('should return empty string when passing too big values', function() {
            assert.equal(sgf.vertex2point([100, 100]), '')
            assert.equal(sgf.vertex2point([100, 1]), '')
            assert.equal(sgf.vertex2point([1, 100]), '')
        })
        it('should work', function() {
            assert.equal(sgf.vertex2point([1, 1]), 'bb')
            assert.equal(sgf.vertex2point([9, 9]), 'jj')
            assert.equal(sgf.vertex2point([9, 5]), 'jf')
            assert.equal(sgf.vertex2point([5, 0]), 'fa')
            assert.equal(sgf.vertex2point([5, 26]), 'fA')
            assert.equal(sgf.vertex2point([26, 27]), 'AB')
        })
        it('should be left inverse to point2vertex', function() {
            var tests = ['', 'df', 'AB', 'fA', 'fa']
            tests.forEach(test => assert.equal(sgf.vertex2point(sgf.point2vertex(test)), test))
        })
    })

    describe('compressed2list', function() {
        it('should handle points normally', function() {
            assert.deepEqual(sgf.compressed2list('ce'), [sgf.point2vertex('ce')])
            assert.deepEqual(sgf.compressed2list('aa'), [sgf.point2vertex('aa')])
            assert.deepEqual(sgf.compressed2list('Az'), [sgf.point2vertex('Az')])
        })
        it('should handle one point compressions', function() {
            assert.deepEqual(sgf.compressed2list('ce:ce'), [sgf.point2vertex('ce')])
            assert.deepEqual(sgf.compressed2list('aa:aa'), [sgf.point2vertex('aa')])
            assert.deepEqual(sgf.compressed2list('Az:Az'), [sgf.point2vertex('Az')])
        })
        it('should handle compressions', function() {
            assert.deepEqual(sgf.compressed2list('aa:bb'), [[0, 0], [0, 1], [1, 0], [1, 1]])
            assert.deepEqual(sgf.compressed2list('bb:aa'), [[0, 0], [0, 1], [1, 0], [1, 1]])
        })
    })

    describe('stringify', function() {
        it('should produce some sgf', function() {
            var gametree = {
                nodes: [],
                subtrees: [
                    {
                        nodes: [
                            { B: ['ee'], SZ: [19] },
                            { W: ['dd'] }
                        ],
                        subtrees: []
                    }
                ]
            }

            var content = [
                '(;B[ee]SZ[19]',
                ';W[dd]',
                ')'
            ].join('\n')

            assert.equal(sgf.stringify(gametree), content)
        })
        it('should handle empty properties', function() {
            var gametree = {
                nodes: [],
                subtrees: [
                    {
                        nodes: [{ HS: [] }],
                        subtrees: []
                    }
                ]
            }

            assert.equal(sgf.stringify(gametree), '(;HS[]\n)')
        })
        it('should handle variations', function() {
            var gametree = {
                nodes: [],
                subtrees: [
                    {
                        nodes: [{ B: ['hh'] }],
                        subtrees: [
                            {
                                nodes: [{ W: ['ii'] }],
                                subtrees: []
                            },
                            {
                                nodes: [{ W: ['hi'], C: ['h'] }],
                                subtrees: []
                            }
                        ]
                    }
                ]
            }

            var content = [
                '(;B[hh]',
                '(;W[ii]',
                ')(;W[hi]C[h]',
                '))'
            ].join('\n')

            assert.equal(sgf.stringify(gametree), content)
        })
    })

    describe('escapeString', function() {
        it('should escape backslashes', function() {
            assert.equal(sgf.escapeString('hello\\world'), 'hello\\\\world')
        })
        it('should escape right brackets', function() {
            assert.equal(sgf.escapeString('hello]world'), 'hello\\]world')
        })
        it('should not escape left brackets', function() {
            assert.equal(sgf.escapeString('hello[world'), 'hello[world')
        })
    })

    describe('unescapeString', function() {
        it('should ignore escaped linebreaks', function() {
            assert.equal(sgf.unescapeString('hello\\\nworld'), 'helloworld')
            assert.equal(sgf.unescapeString('hello\\\rworld'), 'helloworld')
            assert.equal(sgf.unescapeString('hello\\\n\rworld'), 'helloworld')
            assert.equal(sgf.unescapeString('hello\\\r\nworld'), 'helloworld')
        })
        it('should unescape backslashes and right brackets', function() {
            assert.equal(sgf.unescapeString('hello wor\\]ld'), 'hello wor]ld')
            assert.equal(sgf.unescapeString('hello wor\\\\ld'), 'hello wor\\ld')
            assert.equal(sgf.unescapeString('he\\]llo wor\\\\ld'), 'he]llo wor\\ld')
        })
        it('should ignore other backslashes', function() {
            assert.equal(sgf.unescapeString('h\\e\\llo world'), 'hello world')
            assert.equal(sgf.unescapeString('hello\\ world'), 'hello world')
        })
        it('should normalize line endings', function() {
            assert.equal(sgf.unescapeString('hello\nworld'), 'hello\nworld')
            assert.equal(sgf.unescapeString('hello\r\nworld'), 'hello\nworld')
            assert.equal(sgf.unescapeString('hello\n\rworld'), 'hello\nworld')
            assert.equal(sgf.unescapeString('hello\rworld'), 'hello\nworld')
        })
        it('should be left inverse to escapeString', function() {
            var texts = [
                'He()llo Wor\\\\[Foo;Bar]ld\\',
                'Hello\\! []World!'
            ]

            texts.forEach(function(text) {
                assert.equal(sgf.unescapeString(sgf.escapeString(text)), text)
            })
        })
    })
})
