var snmp = require("net-snmp");

module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};


class UPS {
    getServices() {
        return [
            this.informationService,
            this.batteryService,
            this.switchService,

        ];
    }

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
            "bat_capacity": "1.3.6.1.4.1.318.1.1.1.2.2.1.0",
            "bat_status": "1.3.6.1.4.1.318.1.1.1.2.1.1.0",
            "time_on_bat": "1.3.6.1.4.1.318.1.1.1.2.1.2.0",
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.name = config.name;

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "APC")
            .setCharacteristic(that.api.hap.Characteristic.Manufacturer, "test");

        var that = this
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
                                that.log("Model: " + varbinds[0].value.toString());
                                that.log("Manufacturer: " + "APC")
                                //that.informationService.setCharacteristic(that.api.hap.Characteristic.Manufacturer, varbinds[0].value.toString());
                            } else if (key === "serial_number") {
                                that.log("Serial Number: " + varbinds[0].value.toString());
                            } else if (key === "firmware_rev") {
                                that.log("Firmware Rev.: " + varbinds[0].value.toString());
                            }
                        }
                    }
                });
            }
        }








        //this.informationService.setCharacteristic(this.Characteristic.Name, this.model);
        //this.informationService.setCharacteristic(this.Characteristic.SerialNumber, this.serial_number);
        //this.informationService.setCharacteristic(this.Characteristic.FirmwareRevision, this.firmware_rev);

        this.batteryService = new this.Service.BatteryService(this.name)
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.getLowBatteryHandler.bind(this))
        this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel)
            .onGet(this.getBatteryLevelHandler.bind(this));
        this.batteryService.getCharacteristic(this.Characteristic.ChargingState)
            .onGet(this.getBatteryChargingStateHandler.bind(this));

        this.switchService = new this.Service.Switch(this.name);
        this.switchService.getCharacteristic(this.Characteristic.On)
            .onGet(this.getPowerStateHandler.bind(this))
            .onSet(this.setPowerStateHandler.bind(this));
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

    async getPowerStateHandler() {
        this.log.debug('Triggered GET getPowerStateHandler');
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
        this.log.debug('Triggered SET setPowerStateHandler');
        if (value === true) {
            this.setSnmp(this.oids.turn_on.oid, this.oids.turn_on.type, this.oids.turn_on.value);
        } else {
            this.setSnmp(this.oids.turn_off.oid, this.oids.turn_off.type, this.oids.turn_off.value);
        }
    }

    async getLowBatteryHandler() {
        this.log.debug('Triggered GET getLowBatteryHandler');

        var that = this
        this.session.get([this.oids.bat_status], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    that.bat_status = varbinds[0].value.toString();
                }
            }
        });

        if (this.bat_status <= 2) {
            return 0
        } else if (this.bat_status === 3) {
            return 1
        }
    }

    async getBatteryLevelHandler() {
        this.log.debug('Triggered GET getBatteryLevelHandler');
        var that = this
        this.session.get([this.oids.bat_capacity], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    that.bat_capacity = varbinds[0].value.toString();
                }
            }
        });
        return this.bat_capacity
    }

    async getBatteryChargingStateHandler() {
        this.log.debug('Triggered GET getBatteryChargingStateHandler');
        var that = this
        this.session.get([this.oids.time_on_bat], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    that.time_on_bat = varbinds[0].value.toString();
                }
            }
        });
        if (this.time_on_bat === "0") {
            return 1;

        } else {
            return 0;
        }
    }
}