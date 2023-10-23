# homebridge-apc-snmp
### APC UPS SNMP plugin for homebridge - Version 1.1.0
https://www.npmjs.com/package/homebridge-apc-snmp
#### **This is an early version!**
#### Tested with an APC SmartUPS 750 RM (SUA750RMI2U) with the AP9606 Web/SNMP Card


## Getting Started
1. Install "homebridge-apc-snmp" using the Web UI or "npm install homebridge-apc-snmp"
2. Create a new accessory config entry
3. Set the *accessory* setting to *ups*
4. Choose a name for your accessory using the *name* setting, for example *UPS*
5. Add an *address* entry and set it to your address of the SNMP host, for example *10.0.30.3*
6. Add a *community* entry and set it to a community that has **write access**, for example *private*
7. (You can add multiple entries, if you have more than one UPS)
8. Save the config and restart Homebridge

## Config Flags

`accessory` - Has to be *ups*

`name` - Friendly name of the accessory

`community` - SNMP community name

`address` - IP address of the SNMP device

`enable_non_graceful`** - *Non Graceful* power switch function

`enable_graceful`** - *Graceful* power switch function

`enable_alarm`** - Switch for enabling or disabling the alarm

`enable_self_test`** - Switch for starting a self test

`enable_temp`** - Internal temperature function

`enable_battery`** - Battery state of charge indicator

** Values are enabled by default

## Example Config
```json
{
  "accessory": "ups",                
  "name": "UPS",                     
  "community": "private",             
  "address": "10.0.30.3"
}
```

*Boolean switches are by default *true*
