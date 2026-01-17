#include <EEPROM.h>
#include <Arduino.h>

#include "configManager.h"

//class functions
bool config::begin(int numBytes)
{
    EEPROM.begin(numBytes);

    uint32_t storedVersion;
    uint8_t checksumData = 0;
    uint8_t checksumInternal = 0;

    reset();

    EEPROM.get(0, internal);
    EEPROM.get(SIZE_INTERNAL, checksumInternal);
    EEPROM.get(SIZE_INTERNAL + 1, storedVersion);
    configDataPersist *persistData = (configDataPersist *)&data;
    EEPROM.get(SIZE_INTERNAL + 5, *persistData);
    EEPROM.get(SIZE_INTERNAL + 5 + sizeof(*persistData), checksumData);

    bool returnValue = true;

    //reset configuration data if checksum mismatch
    if (checksumData != checksum(reinterpret_cast<uint8_t*>(persistData), sizeof(*persistData)) || storedVersion != configVersion)
    {
        Serial.println(PSTR("Config data checksum mismatch"));
        reset();
        returnValue = false;
    }

    //reset internal data if checksum mismatch
    if (checksumInternal != checksum(reinterpret_cast<uint8_t*>(&internal), sizeof(internal)))
    {
        Serial.println(PSTR("Internal data checksum mismatch"));
        internal = internalData();
        requestSave = true;
        returnValue = false;
    }

    return returnValue;        
}

void config::reset()
{
    memcpy_P(&data, &defaults, sizeof(data));
}

void config::saveRaw(uint8_t bytes[])
{
    memcpy(&data,bytes,sizeof(data));
    requestSave = true;
}

void config::saveExternal(configData *extData)
{
    memcpy(&data, extData, sizeof(data));
    requestSave = true;
}

void config::save()
{
    EEPROM.put(0, internal);

    //save checksum for internal data
    EEPROM.put(SIZE_INTERNAL, checksum(reinterpret_cast<uint8_t*>(&internal), sizeof(internal)));

    configDataPersist *persistData = (configDataPersist *)&data;
    EEPROM.put(SIZE_INTERNAL + 1, configVersion);
    EEPROM.put(SIZE_INTERNAL + 5, *persistData);

    //save checksum for configuration data
    EEPROM.put(SIZE_INTERNAL + 5 + sizeof(*persistData), checksum(reinterpret_cast<uint8_t *>(persistData), sizeof(*persistData)));

    EEPROM.commit();

    if ( _configsavecallback != NULL) {
        _configsavecallback();
    }
}

void config::setConfigSaveCallback( std::function<void()> func ) {
  _configsavecallback = func;
}

void config::loop()
{
    if (requestSave)
    {
        requestSave = false;
        save();
    }
}

uint8_t config::checksum(uint8_t *byteArray, unsigned long length)
{
    uint8_t value = 0;
    unsigned long counter;

    for (counter=0; counter<length; counter++)
    {
        value += *byteArray;
        byteArray++;
    }

    return (uint8_t)(256-value);

}

config configManager;