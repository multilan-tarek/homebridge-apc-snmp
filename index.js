
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
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };


        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        console.log(this.getSnmp(this.oids.model));
        this.model = this.getSnmp(this.oids.model);
        this.serial_number = this.getSnmp(this.oids.serial_number);
        this.firmware_rev = this.getSnmp(this.oids.firmware_rev);

        this.log("UPS Info:");
        this.log("Model: " + this.model);
        this.log("Serial Number: " + this.serial_number);
        this.log("Firmware Rev.: " + this.firmware_rev);

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "APC")
            .setCharacteristic(this.api.hap.Characteristic.Model, this.model)
            .setCharacteristic(this.api.hap.Characteristic.Name, this.model)
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.serial_number)
            .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, this.firmware_rev);


        this.switchService = new this.api.hap.Service.Switch(this.name);

        // link methods used when getting or setting the state of the service
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
    }

    getSnmp(oid) {
        let z = "test"
        this.session.get([oid], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                } else {
                    console.log(varbinds[0].oid + "|" + varbinds[0].value);
                    console.log(z)
                    z = varbinds[0].value;
                    console.log(z)
                }
            }
        });
        return z;
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