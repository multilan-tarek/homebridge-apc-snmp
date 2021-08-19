'use strict';
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
            "manufacturer": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
            "serial_number": "1.3.6.1.4.1.318.1.1.1.1.2.3.0",
            "firmware_rev": "1.3.6.1.4.1.318.1.1.1.1.2.1.0",
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };


        var service = this.api.hap.Service;
        var characteristic = this.api.hap.Characteristic;

        var informationService = new this.service.AccessoryInformation()
            .setCharacteristic(characteristic.Manufacturer, "APC")

        for (const [key, value] of Object.entries(this.oids)) {
            if (key === "model" || key === "serial_number" || key === "firmware_rev") {
                this.session.get([value], function (error, varbinds) {
                    if (error) {
                        console.error(error);
                    } else {
                        if (snmp.isVarbindError(varbinds[0])) {
                            console.error(snmp.varbindError(varbinds[0]));
                        } else {
                            console.log(varbinds[0].oid + " = " + varbinds[0].value);
                            if (key === "model") {
                                informationService
                                    .setCharacteristic(characteristic.Model, varbinds[0].value)
                                    .setCharacteristic(characteristic.Name, varbinds[0].value)
                            } else if (key === "serial_number") {
                                informationService.setCharacteristic(characteristic.SerialNumber, varbinds[0].value)
                            } else if (key === "firmware_rev") {
                                informationService.setCharacteristic(characteristic.FirmwareRevision, varbinds[0].value)
                            }
                        }
                    }
                });
            }
        }


        //this.model = this.getSNMP(this.oids.model);
        //this.serial_number = this.getSNMP(this.oids.serial_number);
        //this.firmware_rev = this.getSNMP(this.oids.firmware_rev);
//
        //this.log("UPS Info:");
        //this.log("Model: " + this.model);
        //this.log("Serial Number: " + this.serial_number);
        //this.log("Firmware Rev.: " + this.firmware_rev);


        this.switchService = new this.api.hap.Service.Switch(this.name);

        // link methods used when getting or setting the state of the service
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
    }

    async getSNMP(oid) {
        let session = this.session
        console.log(await function () {
            return new Promise(function (resolve) {
                session.get([oid], function (error, varbinds) {
                    if (error) {
                        console.error(error);
                    } else {
                        if (snmp.isVarbindError(varbinds[0])) {
                            console.error(snmp.varbindError(varbinds[0]));
                        } else {
                            console.log(varbinds[0].oid + " = " + varbinds[0].value);
                            resolve(varbinds[0].value);
                        }
                    }
                });
            })
        })
    }


    setSnmp(oid, type, value) {
        this.session.set([{oid, type, value}], function (error, varbinds) {
            if (error) {
                console.error(error.toString());
                return false;
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                    return false;
                } else {
                    console.log(varbinds[0].oid + "|" + varbinds[0].value);
                    return true;
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
            this.switchService,
        ];
    }

    async getOnHandler() {
        this.log.info('Getting switch state');

        // get the current value of the switch in your own code
        return false;
    }

    async setOnHandler(value) {
        if (value === true) {
            this.setSnmp(this.oids.turn_on.oid, this.oids.turn_on.type, this.oids.turn_on.value);
        } else {
            this.setSnmp(this.oids.turn_off.oid, this.oids.turn_off.type, this.oids.turn_off.value);
        }
    }


}