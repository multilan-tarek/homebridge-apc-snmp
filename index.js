var snmp = require("net-snmp");


module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};

class UPS {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.session = snmp.createSession("10.0.30.3", "private");
        this.oids = {
            "model": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
            "manufacturer": "APC",
            "serial_number": "1.3.6.1.4.1.318.1.1.1.1.2.3.0",
            "firmware_rev": "1.3.6.1.4.1.318.1.1.1.1.2.1.0",
            "out_volt": "1.3.6.1.4.1.318.1.1.1.4.2.1.0",
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.name = config.name;

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "APC")

        var that = this
        this.log("UPS Info:");
        for (const [key, value] of Object.entries(this.oids)) {
            if (key === "model" || key === "serial_number" || key === "firmware_rev") {
                this.session.get([value], function (error, varbinds) {
                    if (error) {
                        console.error(error);
                    } else {
                        if (snmp.isVarbindError(varbinds[0])) {
                            console.error(snmp.varbindError(varbinds[0]));
                        } else {
                            if (key === "model") {
                                that.model = varbinds[0].value.toString();
                                that.log("Model: " + that.model);
                                that.informationService.setCharacteristic(that.Characteristic.Model, "SmartUPS 750 RM");
                                //that.informationService.setCharacteristic(that.Characteristic.Name, that.model);
                            } else if (key === "serial_number") {
                                that.serial_number = varbinds[0].value.toString();
                                that.log("Serial Number: " + that.serial_number);
                                //that.informationService.setCharacteristic(that.Characteristic.SerialNumber, that.serial_number);
                            } else if (key === "firmware_rev") {
                                that.firmware_rev = varbinds[0].value.toString();
                                that.log("Firmware Rev.: " + that.firmware_rev);
                                //that.informationService.setCharacteristic(that.Characteristic.FirmwareRevision, that.firmware_rev);
                            }
                        }
                    }
                });
            }
        }


        this.batteryService =new this.Service.BatteryService(this.name)
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.getLowBatteryHandler.bind(this))
            .onGet(this.getBatteryLevelHandler.bind(this));


        this.switchService = new this.Service.Switch(this.name);
        this.switchService.getCharacteristic(this.Characteristic.On)
            .onGet(this.getPowerStateHandler.bind(this))
            .onSet(this.setPowerStateHandler.bind(this));
    }

    getSnmp(oid) {
        let value = ""
        this.session.get([oid], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    console.log(varbinds[0].oid + "|" + varbinds[0].value);
                    value = varbinds[0].value;
                }
            }
        });
        return value;
    }

    setSnmp(oid, type, value) {
        this.session.set([{oid, type, value}], function (error, varbinds) {
            if (error) {
                console.error(error.toString());
            } else {
                for (let i = 0; i < varbinds.length; i++) {
                    if (snmp.isVarbindError(varbinds[i]))
                        console.error(snmp.varbindError(varbinds[i]));
                    else
                        console.log(varbinds[i].oid + "|" + varbinds[i].value);
                }
            }
        });
    }


    /**
     * REQUIRED - This must return an array of the services you want to expose.
     * This method must be named "getServices".
     */
    getServices() {
        return [
            this.informationService,
            this.batteryService,
            this.switchService,
        ];
    }

    async getPowerStateHandler() {
        var that = this
        this.session.get([this.oids.out_volt], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    that.out_volt = varbinds[0].value.toString();
                }
            }
        });
        return this.out_volt >= 10;
    }

    async setPowerStateHandler(value) {
        if (value === true) {
            this.setSnmp(this.oids.turn_on.oid, this.oids.turn_on.type, this.oids.turn_on.value);
        } else {
            this.setSnmp(this.oids.turn_off.oid, this.oids.turn_off.type, this.oids.turn_off.value);
        }
    }

    async getLowBatteryHandler() {
        this.log.debug('Triggered GET StatusLowBattery');

        // set this to a valid value for StatusLowBattery
        return this.Characteristic.BATTERY_LEVEL_LOW;
    }

    async getBatteryLevelHandler() {
        this.log.debug('Triggered GET getBatteryLevelHandler');

        // set this to a valid value for StatusLowBattery
        return this.Characteristic.BATTERY_LEVEL_NORMAL;
    }

}