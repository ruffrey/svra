## Shaping vocal response amplitudes

Available at http://svra.aws.af.cm.

PhD dissertation research for Jessica Gamba.

![app home screen](http://i.imgur.com/Ff0bfre.png)

## Score and experiment screen
![experiment finished](http://i.imgur.com/Bakzbwl.png)

## Data manager
Uses HTML5 `localStorage` for data persistence. Download `.csv` of experiment trial data.
![data manager](http://i.imgur.com/UE7ZCsA.png)

## Development

You'll need [git](http://git-scm.com), [Node.js with npm](http://nodejs.org), and [grunt](http://gruntjs.com/).

From the terminal:

    git clone https://github.com/ruffrey/svra
    cd svra
    npm install
    node app

then go to [localhost:3333](http://localhost:3333/).


## Code documentation

Generate docs from command line with `grunt dox` and view at [/docs](http://localhost:3333/docs/) - or http://svra.aws.af.cm

## Building for windows or mac desktop

Just run `grunt`. Uses [node-webkit](https://github.com/rogerwang/node-webkit) via [grunt-node-webkit-builder](https://www.npmjs.org/package/grunt-node-webkit-builder).


## Contributers

- Jessica Gamba
- Jeff Parrish

## License

GPL v3
