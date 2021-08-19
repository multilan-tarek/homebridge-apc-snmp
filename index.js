var snmp = require("net-snmp");
var inherits = require('util').inherits;

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
            "bat_capacity": "1.3.6.1.4.1.318.1.1.1.2.2.1.0",
            "bat_status": "1.3.6.1.4.1.318.1.1.1.2.1.1.0",
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.CommunityTypes = require('hap-nodejs-community-types')(api);
        this.name = config.name;

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "American Power Conversion (APC)")

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


        //this.batteryService = new this.Service.BatteryService(this.name)
        //this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
        //    .onGet(this.getLowBatteryHandler.bind(this))
        //this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel)
        //    .onGet(this.getBatteryLevelHandler.bind(this));
        //this.batteryService.getCharacteristic(this.Characteristic.ChargingState)
        //    .onGet(this.getBatteryChargingStateHandler.bind(this));

        this.switchService = new this.Service.Switch(this.name);
        this.switchService.getCharacteristic(this.Characteristic.On)
            .onGet(this.getPowerStateHandler.bind(this))
            .onSet(this.setPowerStateHandler.bind(this));

        const PowerService = function (displayName, subtype) {
            that.Service.call(this, displayName, '00000001-0000-1000-8000-135D67EC4377', subtype)
            this.addCharacteristic(that.CommunityTypes.Volts)
            //this.addCharacteristic(that.CommunityTypes.BatteryVoltageDC)
            //this.addCharacteristic(that.CommunityTypes.UPSLoadPercent)
            //this.addCharacteristic(that.CommunityTypes.Volts)
            //this.addCharacteristic(that.CommunityTypes.VoltAmperes)
            //this.addOptionalCharacteristic(that.CommunityTypes.Watts)
            //this.addOptionalCharacteristic(that.CommunityTypes.KilowattHours)
            //this.addOptionalCharacteristic(that.CommunityTypes.OutputVoltageAC)
            //this.addOptionalCharacteristic(that.CommunityTypes.OutputVoltAmperes)
            //this.addOptionalCharacteristic(that.Characteristic.CurrentTemperature)
            //this.addCharacteristic(that.CommunityTypes.EveResetTotal)
        }
        inherits(PowerService, this.Service)

        this.powerService = new PowerService()
        this.powerService.getCharacteristic(this.CommunityTypes.Volts)

            .onGet(this.getInputVoltageHandler.bind(this))
        //this.powerService
        //    .getCharacteristic(CommunityTypes.BatteryVoltageDC)
        //    .on('get', this.getBatteryVoltageDC.bind(this))
        //this.powerService
        //    .getCharacteristic(CommunityTypes.UPSLoadPercent)
        //    .on('get', this.getUPSLoadPercent.bind(this))
        //this.powerService
        //    .getCharacteristic(CommunityTypes.Volts)
        //    .on('get', this.getVolts.bind(this))
        //this.powerService
        //    .getCharacteristic(CommunityTypes.VoltAmperes)
        //    .on('get', this.getVoltAmperes.bind(this))
        //this.powerService
        //    .getCharacteristic(CommunityTypes.EveResetTotal)
        //    .on('get', this.getEveResetTotal.bind(this))
        //    .on('set', this.setEveResetTotal.bind(this))
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
            this.powerService,
            this.informationService,
            //this.batteryService,
            this.switchService,

        ];
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
        return 2
    }

    async getInputVoltageHandler() {
        this.log.info('Triggered GET getInputVoltageHandler');
        return 230;
    }
}