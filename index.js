module.exports = (api) => {
    api.registerAccessory('ExampleBatteryPlugin', ExampleBatteryAccessory);
};

class ExampleBatteryAccessory {

    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        // extract name from config
        this.name = config.name;

        // create a new Battery service
        this.service = new this.Service(this.Service.Battery);

        // create handlers for required characteristics
        this.service.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.handleStatusLowBatteryGet.bind(this));

    }

    /**
     * Handle requests to get the current value of the "Status Low Battery" characteristic
     */
    handleStatusLowBatteryGet() {
        this.log.debug('Triggered GET StatusLowBattery');

        // set this to a valid value for StatusLowBattery
        const currentValue = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

        return currentValue;
    }
}