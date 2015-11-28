# bmp-280 
> cool

## Installation

```sh
$ npm install --save node-bmp280
```

## Usage

```js
var BMP280 = require('node-bmp280');

var barometer = new BMP280();

barometer.begin(function(err) {
	if (err) {
		console.info('error initializing barometer', err);
		return;
	}

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
