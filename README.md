# bmp-280 
> cool

## Installation

```sh
$ npm install --save bmp-280
```

## Usage

```js
var BMP280 = require('bmp-280');

var barometer = new BMP280();

barometer.begin(function() {
    console.info('barometer running');

    setInterval(function() {
        barometer.readPressureAndTemparature(function(err, pressure, temperature) {
            console.info('barometer: ', pressure, temperature);
        });
    }, 1000);
});
```
## License

MIT © [Grady Morgan]()
