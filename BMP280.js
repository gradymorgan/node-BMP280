var i2c = require('i2c');

// http://www.adafruit.com/datasheets/BST-BMP280-DS001-11.pdf

var BMP280 = function(options) {
    options = options || {};
    options.device = options.device || '/dev/i2c-1';
    options.debug = options.debug || false;
  
    var address = BMP280.I2C_ADDRESS_A;
    if ('address' in options)
        address = options.address;

    this.wire = new i2c(address, options);
};

BMP280.prototype.startup = function(callback) {
    var sensor = this;
    
    this.wire.readBytes(BMP280.REGISTER_CHIPID, 1, function(err, buffer) {
        if ( err ) 
            callback(err);
        else if (buffer[0] != BMP280.CHIP_ID) 
            callback(10); //TODO: real error
        else
            readCoefficients(function(cal) {
                sensor.calibration = cal;
            
                sensor.wire.writeBytes(BMP280.REGISTER_CONTROL, [0x3F], function(err) {
                    callback(err);
                });
            });
    });
};

BMP280.I2C_ADDRESS_A               = 0x76;
BMP280.I2C_ADDRESS_B               = 0x77;
BMP280.CHIP_ID                     = 0x58;

BMP280.REGISTER_DIG_T1             = 0x88;
BMP280.REGISTER_DIG_T2             = 0x8A;
BMP280.REGISTER_DIG_T3             = 0x8C;

BMP280.REGISTER_DIG_P1             = 0x8E;
BMP280.REGISTER_DIG_P2             = 0x90;
BMP280.REGISTER_DIG_P3             = 0x92;
BMP280.REGISTER_DIG_P4             = 0x94;
BMP280.REGISTER_DIG_P5             = 0x96;
BMP280.REGISTER_DIG_P6             = 0x98;
BMP280.REGISTER_DIG_P7             = 0x9A;
BMP280.REGISTER_DIG_P8             = 0x9C;
BMP280.REGISTER_DIG_P9             = 0x9E;

BMP280.REGISTER_CHIPID             = 0xD0;
BMP280.REGISTER_VERSION            = 0xD1;
BMP280.REGISTER_SOFTRESET          = 0xE0;

BMP280.REGISTER_CAL26              = 0xE1;  // R calibration stored in 0xE1-0xF

BMP280.REGISTER_CONTROL            = 0xF4;
BMP280.REGISTER_CONFIG             = 0xF5;
BMP280.REGISTER_PRESSUREDATA       = 0xF7;
BMP280.REGISTER_TEMPDATA           = 0xFA;


function int16(msb, lsb) {
    var val = uint16(msb, lsb); 
    if (val > 32767) val -= 65536;
    return val;
}

function uint16(msb, lsb) {
    return msb << 8 | lsb;
}

function unit20(msb, lsb, xlsb) {
    return ((msb << 8 | lsb) << 8 | xlsb) >> 4;
}

BMP280.prototype.readCoefficients = function(callback) {
    this.wire.readBytes(BMP280.REGISTER_DIG_T1, 24, function(err, buffer) {
        var calibration = {
            dig_T1: uint16( buffer[1], buffer[0] ),
            dig_T2: int16( buffer[3], buffer[2] ),
            dig_T3: int16( buffer[5], buffer[4] ),

            dig_P1: uint16( buffer[7], buffer[6] ),
            dig_P2: int16( buffer[9], buffer[8] ),
            dig_P3: int16( buffer[11], buffer[10] ),
            dig_P4: int16( buffer[13], buffer[12] ),
            dig_P5: int16( buffer[15], buffer[14] ),
            dig_P6: int16( buffer[17], buffer[16] ),
            dig_P7: int16( buffer[19], buffer[18] ),
            dig_P8: int16( buffer[21], buffer[20] ),
            dig_P9: int16( buffer[23], buffer[22] )
        };

        callback(calibration);
    });
};

BMP280.prototype.readPressureAndTemparature = function(callback) {
    var calibration = this.calibration;

    //read temp and pressure data in one stream;
    this.wire.readBytes(BMP280.REGISTER_PRESSUREDATA, 6, function(err, res) {
        var rawPressure = uint20(buffer[0], buffer[1], buffer[2]);
        var rawTemp = uint20(buffer[3], buffer[4], buffer[5]);

        var temperature, t_fine = compensateTemperature(rawTemp, calibration);
        var pressure = compensatePressure(rawPressure, temp, calibration);
        callback(pressure, temperature);
    });
};

// part 1 of temperature compensation
// result is for internal use only
BMP280.compensateTemperature = function(adc_T, cal) {
    var var1 = (((adc_T>>3) – (cal.dig_T1<<1)) * cal.dig_T2) >> 11;
    var var2 = (((((adc_T>>4) – (cal.dig_T1)) * ((adc_T>>4) – (cal.dig_T1))) >> 12) * (cal.dig_T3)) >> 14; 
    var t_fine = var1 + var2;
    return t_fine;
};

// part 2 of temperature compensation
//returns temp in degC
BMP280.compensateTemperature2 = function(t_fine, cal) {    
    return ((t_fine*5+128)>>8)/100.0;
};

//returns pressure in Pa
BMP280.compensatePressure = function(adc_P, t_fine, cal) {
    var var1 = t_fine - 128000;
    var var2 = var1 * var1 * cal.dig_P6;
    var2 = var2 + ((var1*cal.dig_P5)<<17);
    var2 = var2 + ((cal.dig_P4)<<35);
    var1 = ((var1 * var1 * cal.dig_P3)>>8) + ((var1 * cal.dig_P2)<<12);
    var1 = ((((1)<<47)+var1))*(cal.dig_P1)>>33;

    if (var1 === 0)
        return 0;  // avoid exception caused by division by zero

    var p = 1048576 - adc_P;
    p = (((p<<31) - var2)*3125) / var1;
    var1 = ((cal.dig_P9) * (p>>13) * (p>>13)) >> 25;
    var2 = ((cal.dig_P8) * p) >> 19;

    p = ((p + var1 + var2) >> 8) + ((cal.dig_P7)<<4);
    return p / 256.0;
};
